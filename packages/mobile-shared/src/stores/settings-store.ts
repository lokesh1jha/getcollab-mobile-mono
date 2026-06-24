import { create } from 'zustand'
import apiService from '../services/api'
import type { UserSettings } from '../types'

interface SettingsState {
  settings: UserSettings | null
  isLoading: boolean
  error: string | null

  fetchSettings: () => Promise<void>
  updateSettings: (data: Partial<UserSettings>) => Promise<void>
  updateNotificationSettings: (data: { emailNotifications?: boolean; campaignUpdates?: boolean }) => Promise<void>
  clearError: () => void
  reset: () => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  isLoading: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true, error: null })
    try {
      const settings = await apiService.getSettings()
      set({ settings, isLoading: false })
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED') {
        set({ settings: null, isLoading: false, error: null })
      } else {
        set({ error: error.message || 'Failed to fetch settings', isLoading: false })
      }
    }
  },

  updateSettings: async (data: Partial<UserSettings>) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiService.updateSettings(data)
      set({ settings: response, isLoading: false })
    } catch (error: any) {
      set({ error: error.message || 'Failed to update settings', isLoading: false })
      throw error
    }
  },

  updateNotificationSettings: async (data) => {
    set({ isLoading: true, error: null })
    try {
      await apiService.updateNotificationSettings(data)
      set((state) => ({
        settings: state.settings ? { ...state.settings, ...data } : null,
        isLoading: false,
      }))
    } catch (error: any) {
      set({ error: error.message || 'Failed to update notification settings', isLoading: false })
      throw error
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({ settings: null, isLoading: false, error: null }),
}))
