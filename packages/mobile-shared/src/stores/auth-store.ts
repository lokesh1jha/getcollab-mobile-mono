import { create } from 'zustand'
import apiService, { isUnauthorizedError } from '../services/api'
import { notificationService } from '../services/notification-service'
import type { User } from '../types'
import { useChatStore } from './chat-store'
import { useCampaignStore } from './campaign-store'
import { useInfluencerStore } from './influencer-store'
import { useSettingsStore } from './settings-store'
import { useNotificationStore } from './notification-store'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string, role: 'brand' | 'influencer') => Promise<void>
  signOut: () => Promise<void>
  updateRole: (role: 'brand' | 'influencer') => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
  fetchCurrentUser: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

   signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiService.signin({ email, password })

      // Store JWT token if returned by backend
      if (response.token) {
        await apiService.setToken(response.token)
      }

      // Store refresh token if returned
      if (response.refreshToken) {
        await apiService.setRefreshToken(response.refreshToken)
      }

      await get().fetchCurrentUser()
    } catch (error: any) {
      set({
        error: error.message || 'Failed to sign in',
        isLoading: false,
      })
      throw error
    }
  },

  signUp: async (name: string, email: string, password: string, role: 'brand' | 'influencer') => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiService.signup({ name, email, password, role })

      if (response.token) {
        await apiService.setToken(response.token)
      }

      if (response.refreshToken) {
        await apiService.setRefreshToken(response.refreshToken)
      }

      await get().fetchCurrentUser()
    } catch (error: any) {
      set({
        error: error.message || 'Failed to sign up',
        isLoading: false,
      })
      throw error
    }
  },

  signOut: async () => {
    set({ isLoading: true })
    try {
      // Clean up notification service
      await notificationService.unregisterPushToken()
      notificationService.cleanup()

      // Disconnect socket
      const chatStore = useChatStore.getState()
      if (chatStore.socket) {
        chatStore.disconnectSocket()
      }

      // Reset all stores completely
      useChatStore.getState().reset()
      useCampaignStore.getState().reset()
      useInfluencerStore.getState().reset()
      useNotificationStore.getState().reset()
      useSettingsStore.getState().reset()

      // Clear stored tokens
      await apiService.clearTokens()
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },

  updateRole: async (role: 'brand' | 'influencer') => {
    set({ isLoading: true, error: null })
    try {
      // Role may already be set at registration — skip the API call to avoid 409.
      if (get().user?.role !== role) {
        await apiService.updateRole(role)
      }
      await get().fetchCurrentUser()
    } catch (error: any) {
      set({
        error: error.message || 'Failed to update role',
        isLoading: false,
      })
      throw error
    }
  },

  updateProfile: async (updates: Partial<User>) => {
    set({ isLoading: true, error: null })
    try {
      const currentUser = get().user
      if (currentUser?.role === 'brand') {
        await apiService.updateGeneralProfile({
          name: updates.name,
          websiteUrl: (updates as any).portfolioUrl,
        })
      } else {
        await apiService.updateProfile(updates)
      }
      if (currentUser) {
        set({
          user: { ...currentUser, ...updates },
          isLoading: false,
        })
      } else {
        set({ isLoading: false })
      }
    } catch (error: any) {
      set({
        error: error.message || 'Failed to update profile',
        isLoading: false,
      })
      throw error
    }
  },

  fetchCurrentUser: async () => {
    set({ isLoading: true, error: null })
    const token = await apiService.getToken()
    if (!token) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
      return
    }

    try {
      const user = await apiService.getCurrentUser()
      set({
        user: user ? {
          ...user,
          phoneNumbers: user.phoneNumbers ?? []
        } as User : null,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error: any) {
      // Not logged in or session expired — show public auth screens.
      if (isUnauthorizedError(error?.message)) {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        })
        return
      }

      const isNetworkError =
        error?.message === 'Network request failed' ||
        error?.name === 'AbortError' ||
        error?.message?.includes('Network')

      // Session exists but API unreachable: still show login, not maintenance.
      if (isNetworkError) {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        })
        return
      }

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error.message || 'Failed to fetch user data'
      })
      throw error
    }
  },

  clearError: () => set({ error: null }),
}))
