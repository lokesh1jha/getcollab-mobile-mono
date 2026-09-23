import { create } from 'zustand'
import apiService, { uploadMediaBlob } from '../services/api'
import { logger } from '../services/logger'
import { unwrapArray } from '../utils/unwrap-api'
import type { ChatRoom, Message } from '../types'

export interface PendingAttachmentFile {
  uri: string
  fileName: string
  mimeType: string
  fileSize: number
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
  // Poll handle while a chat screen is open. The backend speaks Sockudo
  // (Pusher protocol), not socket.io, so the socket.io client never
  // connected; chat polls as the web app does. Kept under this name so the
  // screens' `if (!socket) initializeSocket()` still works.
  socket: { timer: ReturnType<typeof setInterval> } | null
  activeRoomId: string | null
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
  sendAttachments: (roomId: string, files: PendingAttachmentFile[], caption?: string) => Promise<void>
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
  activeRoomId: null,
  isSocketConnected: false,
  listeners: null,
  typingUsers: {},
  readByUser: {},
  presence: {},
  unreadByRoom: {},

  // ponytail: polling (5s messages, 60s rooms) like web; move to Sockudo
  // (pusher-js) when push latency matters. Typing and presence are gone: the
  // backend never sent them.
  initializeSocket: async () => {
    if (get().socket) return
    const token = await apiService.getToken()
    if (!token) return
    let tick = 0
    const timer = setInterval(async () => {
      tick++
      const roomId = get().activeRoomId
      if (roomId) {
        try {
          const response = await apiService.getChatMessages(roomId, { limit: 50 })
          const incoming = [...unwrapArray(response, ['data', 'messages'])].reverse() as Message[]
          const known = new Set(get().messages.map((m) => m.id))
          const fresh = incoming.filter((m) => !known.has(m.id))
          if (fresh.length > 0 && get().activeRoomId === roomId) {
            set((state) => ({ messages: [...state.messages, ...fresh] }))
          }
        } catch (error: any) {
          logger.warn('Chat poll failed', { error: error?.message })
        }
      }
      if (tick % 12 === 0) get().fetchRooms().catch(() => {})
    }, 5000)
    set({ socket: { timer }, isSocketConnected: true })
  },

  disconnectSocket: () => {
    const socket = get().socket
    if (socket) clearInterval(socket.timer)
    set({ socket: null, isSocketConnected: false, listeners: null })
  },


  fetchRooms: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiService.getChatRooms()
      const rooms = unwrapArray(response, ['data', 'rooms']) as ChatRoom[]
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
    set({ isLoading: true, error: null, activeRoomId: roomId })
    try {
      const response = await apiService.getChatMessages(roomId, { before: params?.before, limit: 50 })
      const incoming = [...unwrapArray(response, ['data', 'messages'])] as Message[]
      incoming.reverse()
      const currentMessages = get().messages
      set({
        messages: [...incoming, ...currentMessages],
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

    } catch (error: any) {
      set({ error: error?.message || 'Failed to send message', isSending: false })
      throw error
    }
  },

  // Images and files go through the media service (start, PUT, complete) and
  // are sent as blob ids, as on web. These used to call /chat/upload and
  // /profile/upload, which do not exist, and read s3Key/uploadUrl, which the
  // presign endpoint never returned, so nothing could be attached.
  sendImage: async (roomId: string, dataUri: string) => {
    // ponytail: size unknown for a data URI; the server records 0 and the upload still validates.
    await get().sendAttachments(roomId, [{ uri: dataUri, fileName: 'image.jpg', mimeType: 'image/jpeg', fileSize: 0 }])
  },

  sendAttachments: async (roomId: string, files: PendingAttachmentFile[], caption = '') => {
    set({ isSending: true, error: null })
    try {
      const blobIds: string[] = []
      for (const file of files) {
        const done = await uploadMediaBlob({ uri: file.uri, mime: file.mimeType, sizeBytes: file.fileSize })
        const blobId = done?.id || done?.blob_id || done?.blobId
        if (!blobId) throw new Error(`Upload failed for ${file.fileName}`)
        blobIds.push(String(blobId))
      }

      const response = await apiService.sendChatMessageWithAttachments(roomId, caption, blobIds)
      const created = response?.message || response?.data?.message || response
      if (created?.id) {
        const message: Message = {
          id: created.id,
          content: created.message ?? caption,
          senderId: created.senderId,
          roomId,
          createdAt: created.createdAt,
          type: 'file',
          attachments: created.attachments,
        }
        set((state) => ({ messages: [...state.messages, message], isSending: false }))
      } else {
        set({ isSending: false })
      }
    } catch (error: any) {
      set({ error: error?.message || 'Failed to send attachments', isSending: false })
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
    apiService.markChatRoomRead(roomId).catch((error: any) => {
      logger.warn('Mark room read failed', { error: error?.message })
    })
  },

  // No typing indicator on the backend; kept so screens can call it.
  setTyping: () => {},

  clearError: () => set({ error: null }),

  reset: () => {
    const socket = get().socket
    if (socket) clearInterval(socket.timer)
    set({
      activeRoomId: null,
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
