import { create } from 'zustand'
import apiService from '../services/api'
import type { Notification } from '../types'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchNotifications: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  clearError: () => void
  reset: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiService.getNotifications()
      const notifications = response.data || []
      const unreadCount = notifications.filter((n: Notification) => !n.read).length
      set({ notifications, unreadCount, isLoading: false })
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch notifications',
        isLoading: false,
      })
    }
  },

  markAsRead: async (id: string) => {
    try {
      await apiService.markNotificationAsRead(id)
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }))
    } catch (error: any) {
      set({
        error: error.message || 'Failed to mark notification as read',
      })
    }
  },

  markAllAsRead: async () => {
    try {
      await apiService.markAllNotificationsAsRead()
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }))
    } catch (error: any) {
      set({
        error: error.message || 'Failed to mark all notifications as read',
      })
    }
  },

  clearError: () => set({ error: null }),

  // Reset all state (for logout)
  reset: () => {
    set({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
    })
  },
}))
