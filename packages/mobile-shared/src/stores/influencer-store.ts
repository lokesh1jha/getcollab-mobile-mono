import { create } from 'zustand'
import apiService from '@shared/services/api'
import type { Influencer, InfluencerProfile } from '@shared/types'

interface InfluencerState {
  influencers: Influencer[]
  currentInfluencer: Influencer | null
  myProfile: InfluencerProfile | null
  isLoading: boolean
  error: string | null
  page: number
  hasMore: boolean

  fetchInfluencers: (params?: { category?: string; region?: string; page?: number }) => Promise<void>
  fetchInfluencer: (id: string) => Promise<void>
  fetchMyProfile: () => Promise<void>
  updateProfile: (data: Partial<InfluencerProfile>) => Promise<void>
  clearError: () => void
  reset: () => void
}

export const useInfluencerStore = create<InfluencerState>((set) => ({
  influencers: [],
  currentInfluencer: null,
  myProfile: null,
  isLoading: false,
  error: null,
  page: 1,
  hasMore: true,

  fetchInfluencers: async (params) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiService.getInfluencers({
        page: params?.page || 1,
        limit: 20,
        category: params?.category,
        region: params?.region,
      })
      const newPage = params?.page || 1
      const list: Influencer[] = Array.isArray(response.data) ? response.data : Array.isArray(response) ? response : []
      set((state) => ({
        influencers: newPage === 1 ? list : [...state.influencers, ...list],
        page: newPage,
        hasMore: response.hasMore ?? response.data?.hasMore ?? false,
        isLoading: false,
      }))
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch influencers', isLoading: false })
    }
  },

  fetchInfluencer: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const influencer = await apiService.getInfluencer(id)
      set({ currentInfluencer: influencer, isLoading: false })
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch influencer', isLoading: false })
    }
  },

  fetchMyProfile: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiService.getCurrentUser()
      set({ myProfile: response.influencerProfile, isLoading: false })
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED') {
        set({ myProfile: null, isLoading: false, error: null })
      } else {
        set({ error: error.message || 'Failed to fetch profile', isLoading: false })
      }
    }
  },

  updateProfile: async (data: Partial<InfluencerProfile>) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiService.updateProfile(data)
      const profileData = (response as any).influencerProfile || response
      set({ myProfile: profileData as InfluencerProfile, isLoading: false })
    } catch (error: any) {
      set({ error: error.message || 'Failed to update profile', isLoading: false })
      throw error
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    influencers: [],
    currentInfluencer: null,
    myProfile: null,
    isLoading: false,
    error: null,
    page: 1,
    hasMore: true,
  }),
}))
