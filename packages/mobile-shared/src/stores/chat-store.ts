import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'
import apiService from '../services/api'
import { logger } from '../services/logger'
import type { ChatRoom, Message } from '../types'

const getSocketUrl = (): string => {
  const baseUrl = apiService.getBaseUrl?.() || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'
  return baseUrl.replace(/\/api\/v\d+$/, '')
}

interface PresenceState {
  online: boolean
  lastSeen?: string
}

interface ChatState {
  rooms: ChatRoom[]
  currentRoom: ChatRoom | null
  messages: Message[]
  isLoading: boolean
  isSending: boolean
  error: string | null
  hasMoreMessages: boolean
  socket: Socket | null
  isSocketConnected: boolean
  listeners: any | null
  typingUsers: Record<string, Set<string>>
  readByUser: Record<string, Record<string, string>>
  presence: Record<string, PresenceState>
  unreadByRoom: Record<string, number>

  fetchRooms: () => Promise<void>
  setCurrentRoom: (room: ChatRoom | null) => void
  fetchMessages: (roomId: string, params?: { before?: string }) => Promise<void>
  sendMessage: (roomId: string, content: string, type?: string, attachmentUrl?: string) => Promise<void>
  sendImage: (roomId: string, base64: string) => Promise<void>
  addMessage: (message: Message) => void
  markRoomRead: (roomId: string) => void
  setTyping: (roomId: string, isTyping: boolean) => void
  initializeSocket: () => Promise<void>
  disconnectSocket: () => void
  clearError: () => void
  reset: () => void
  totalUnread: () => number
}

const ensureSet = (record: Record<string, Set<string>>, roomId: string): Set<string> => {
  if (!record[roomId]) record[roomId] = new Set()
  return record[roomId]
}

export const useChatStore = create<ChatState>((set, get) => ({
  rooms: [],
  currentRoom: null,
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,
  hasMoreMessages: true,
  socket: null,
  isSocketConnected: false,
  listeners: null,
  typingUsers: {},
  readByUser: {},
  presence: {},
  unreadByRoom: {},

  initializeSocket: async () => {
    try {
      const token = await apiService.getToken()
      if (!token) return

      const currentSocket = get().socket
      if (currentSocket) currentSocket.disconnect()

      const socket = io(getSocketUrl(), {
        auth: { token: `Bearer ${token}` },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      })

      const onConnect = () => set({ isSocketConnected: true })
      const onDisconnect = () => set({ isSocketConnected: false })

      const onReceiveMessage = (message: Message) => {
        get().addMessage(message)
        const isCurrent = get().currentRoom?.id === message.roomId
        if (!isCurrent) {
          set((state) => ({
            unreadByRoom: {
              ...state.unreadByRoom,
              [message.roomId]: (state.unreadByRoom[message.roomId] || 0) + 1,
            },
          }))
        }
      }

      const onReadReceipt = (data: { roomId: string; userId: string; messageId: string; readAt?: string }) => {
        set((state) => ({
          readByUser: {
            ...state.readByUser,
            [data.userId]: {
              ...(state.readByUser[data.userId] || {}),
              [data.roomId]: data.messageId,
            },
          },
        }))
      }

      const onTyping = (data: { roomId: string; userId: string; isTyping: boolean }) => {
        set((state) => {
          const next = { ...state.typingUsers }
          const set_ = ensureSet(next, data.roomId)
          if (data.isTyping) set_.add(data.userId)
          else set_.delete(data.userId)
          return { typingUsers: next }
        })
      }

      const onPresence = (data: { userId: string; online: boolean; lastSeen?: string }) => {
        set((state) => ({
          presence: {
            ...state.presence,
            [data.userId]: { online: data.online, lastSeen: data.lastSeen },
          },
        }))
      }

      const onError = (error: any) => {
        logger.warn('Socket error', { error: error?.message })
      }

      socket.on('connect', onConnect)
      socket.on('disconnect', onDisconnect)
      socket.on('receiveMessage', onReceiveMessage)
      socket.on('readReceipt', onReadReceipt)
      socket.on('typing', onTyping)
      socket.on('presence', onPresence)
      socket.on('error', onError)

      set({
        socket,
        listeners: { onConnect, onDisconnect, onReceiveMessage, onReadReceipt, onTyping, onPresence, onError },
      })
    } catch (error) {
      logger.warn('Socket init failed', { error: (error as any)?.message })
    }
  },

  disconnectSocket: () => {
    const socket = get().socket
    const listeners = get().listeners
    if (socket) {
      if (listeners) {
        Object.entries(listeners).forEach(([event, fn]) => {
          socket.off(event.replace(/^on/, '').replace(/^./, (c) => c.toLowerCase()), fn as any)
        })
      }
      socket.disconnect()
      set({ socket: null, isSocketConnected: false, listeners: null })
    }
  },

  fetchRooms: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiService.getChatRooms()
      const rooms = response?.data || response?.rooms || (Array.isArray(response) ? response : [])
      const unreadByRoom: Record<string, number> = {}
      rooms.forEach((r: any) => {
        if (r.unreadCount) unreadByRoom[r.id] = r.unreadCount
      })
      set({ rooms, unreadByRoom, isLoading: false })
    } catch (error: any) {
      set({ error: error?.message || 'Failed to fetch chat rooms', isLoading: false })
    }
  },

  setCurrentRoom: (room: ChatRoom | null) => {
    set({ currentRoom: room, messages: [], hasMoreMessages: true })
    if (room) {
      get().fetchMessages(room.id)
      get().markRoomRead(room.id)
    }
  },

  fetchMessages: async (roomId: string, params) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiService.getChatMessages(roomId, { before: params?.before, limit: 50 })
      const incoming = response?.data || response?.messages || []
      const currentMessages = get().messages
      set({
        messages: [...incoming.reverse(), ...currentMessages],
        hasMoreMessages: !!response?.hasMore,
        isLoading: false,
      })
    } catch (error: any) {
      set({ error: error?.message || 'Failed to fetch messages', isLoading: false })
    }
  },

  sendMessage: async (roomId: string, content: string, type: string = 'text', attachmentUrl?: string) => {
    set({ isSending: true, error: null })
    try {
      const message = await apiService.sendChatMessage(roomId, content, type)
      const finalMessage = attachmentUrl ? { ...message, attachmentUrl, type } : message
      set((state) => ({ messages: [...state.messages, finalMessage], isSending: false }))

      const socket = get().socket
      if (socket && socket.connected) {
        socket.emit('sendMessage', { roomId, content, type, attachmentUrl })
      }
    } catch (error: any) {
      set({ error: error?.message || 'Failed to send message', isSending: false })
      throw error
    }
  },

  sendImage: async (roomId: string, base64: string) => {
    set({ isSending: true, error: null })
    try {
      let imageUrl = ''
      try {
        const response = await apiService.uploadChatImage(base64)
        imageUrl = response?.url || response?.imageUrl || response?.data?.url || ''
      } catch (uploadErr) {
        // Fallback to profile upload route if chat upload not available
        const response = await apiService.uploadImage(base64)
        imageUrl = response?.url || response?.imageUrl || response?.data?.url || ''
      }
      if (!imageUrl) throw new Error('Upload returned no URL')
      await get().sendMessage(roomId, imageUrl, 'image', imageUrl)
    } catch (error: any) {
      set({ error: error?.message || 'Failed to send image', isSending: false })
      throw error
    }
  },

  addMessage: (message: Message) => {
    set((state) => ({ messages: [...state.messages, message] }))
  },

  markRoomRead: (roomId: string) => {
    set((state) => {
      const { [roomId]: _, ...rest } = state.unreadByRoom
      return { unreadByRoom: rest }
    })
    const socket = get().socket
    if (socket && socket.connected) {
      socket.emit('markRead', { roomId })
    }
  },

  setTyping: (roomId: string, isTyping: boolean) => {
    const socket = get().socket
    if (socket && socket.connected) {
      socket.emit('typing', { roomId, isTyping })
    }
  },

  clearError: () => set({ error: null }),

  reset: () => {
    const socket = get().socket
    if (socket) socket.disconnect()
    set({
      rooms: [],
      currentRoom: null,
      messages: [],
      isLoading: false,
      isSending: false,
      error: null,
      hasMoreMessages: true,
      socket: null,
      isSocketConnected: false,
      listeners: null,
      typingUsers: {},
      readByUser: {},
      presence: {},
      unreadByRoom: {},
    })
  },

  totalUnread: () => {
    const state = get()
    return Object.values(state.unreadByRoom).reduce((sum, n) => sum + n, 0)
  },
}))
