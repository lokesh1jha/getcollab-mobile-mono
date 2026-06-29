import { create } from 'zustand'
import apiService from '../services/api'
import { extractCampaigns } from '../lib/campaign-utils'
import type { Campaign, CampaignWithBids, Bid } from '../types'

interface CampaignState {
  campaigns: Campaign[]
  myCampaigns: Campaign[]
  currentCampaign: CampaignWithBids | null
  myBids: Bid[]
  isLoading: boolean
  error: string | null
  page: number
  hasMore: boolean
  
  // Actions
  fetchCampaigns: (params?: { status?: string; page?: number }) => Promise<void>
  fetchMyCampaigns: (params?: { status?: string; page?: number }) => Promise<void>
  fetchCampaign: (id: string) => Promise<void>
  createCampaign: (data: any) => Promise<Campaign>
  updateCampaign: (id: string, data: any) => Promise<void>
  deleteCampaign: (id: string) => Promise<void>
  fetchMyBids: (params?: { status?: string }) => Promise<void>
  submitBid: (campaignId: string, pitch: string) => Promise<Bid>
  updateBidStatus: (bidId: string, status: 'accepted' | 'rejected') => Promise<void>
  clearError: () => void
  reset: () => void
}

export const useCampaignStore = create<CampaignState>((set, get) => ({
  campaigns: [],
  myCampaigns: [],
  currentCampaign: null,
  myBids: [],
  isLoading: false,
  error: null,
  page: 1,
  hasMore: true,

  fetchCampaigns: async (params) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiService.getCampaigns()
      const campaigns: Campaign[] = Array.isArray(response.data) ? response.data : Array.isArray(response) ? response : []
      const newPage = params?.page || 1
      set((state) => ({
        campaigns: newPage === 1 ? campaigns : [...state.campaigns, ...campaigns],
        page: newPage,
        hasMore: response.hasMore ?? response.data?.hasMore ?? false,
        isLoading: false,
      }))
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch campaigns',
        isLoading: false,
      })
    }
  },

  fetchMyCampaigns: async (params) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiService.getMyCampaigns(params)
      const campaigns = extractCampaigns(response)
      const newPage = params?.page || 1
      set((state) => ({
        myCampaigns: newPage === 1 ? campaigns : [...state.myCampaigns, ...campaigns],
        page: newPage,
        hasMore: response?.pagination?.hasMore ?? response?.hasMore ?? false,
        isLoading: false,
      }))
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch my campaigns',
        isLoading: false,
      })
    }
  },

  fetchCampaign: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const campaign = await apiService.getCampaign(id)
      set({ currentCampaign: campaign, isLoading: false })
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch campaign',
        isLoading: false,
      })
    }
  },

  createCampaign: async (data: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiService.createCampaign(data)
      const campaign = response?.campaign || response?.data?.campaign || response
      set((state) => ({
        myCampaigns: campaign ? [campaign, ...state.myCampaigns] : state.myCampaigns,
        isLoading: false,
      }))
      return campaign
    } catch (error: any) {
      set({
        error: error.message || 'Failed to create campaign',
        isLoading: false,
      })
      throw error
    }
  },

  updateCampaign: async (id: string, data: any) => {
    set({ isLoading: true, error: null })
    try {
      const campaign = await apiService.updateCampaign(id, data)
      set((state) => ({
        campaigns: state.campaigns.map((c) => (c.id === id ? campaign : c)),
        currentCampaign: state.currentCampaign?.id === id ? campaign : state.currentCampaign,
        isLoading: false,
      }))
    } catch (error: any) {
      set({
        error: error.message || 'Failed to update campaign',
        isLoading: false,
      })
      throw error
    }
  },

  deleteCampaign: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await apiService.deleteCampaign(id)
      set((state) => ({
        campaigns: state.campaigns.filter((c) => c.id !== id),
        isLoading: false,
      }))
    } catch (error: any) {
      set({
        error: error.message || 'Failed to delete campaign',
        isLoading: false,
      })
      throw error
    }
  },

  fetchMyBids: async (params) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiService.getBids(params)
      set({ myBids: response.data || [], isLoading: false })
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch bids',
        isLoading: false,
      })
    }
  },

  submitBid: async (campaignId: string, pitch: string) => {
    set({ isLoading: true, error: null })
    try {
      const bid = await apiService.submitBid({ campaignId, pitch })
      set((state) => ({
        myBids: [bid, ...state.myBids],
        isLoading: false,
      }))
      return bid
    } catch (error: any) {
      set({
        error: error.message || 'Failed to submit bid',
        isLoading: false,
      })
      throw error
    }
  },

  updateBidStatus: async (bidId: string, status: 'accepted' | 'rejected') => {
    set({ isLoading: true, error: null })
    try {
      await apiService.updateBidStatus(bidId, status)
      set((state) => ({
        myBids: state.myBids.map((b) => (b.id === bidId ? { ...b, status } : b)),
        currentCampaign: state.currentCampaign
          ? {
              ...state.currentCampaign,
              bids: state.currentCampaign.bids.map((b) =>
                b.id === bidId ? { ...b, status } : b
              ),
            }
          : null,
        isLoading: false,
      }))
    } catch (error: any) {
      set({
        error: error.message || 'Failed to update bid status',
        isLoading: false,
      })
      throw error
    }
  },

  clearError: () => set({ error: null }),

  // Reset all state (for logout)
  reset: () => {
    set({
      campaigns: [],
      myCampaigns: [],
      currentCampaign: null,
      myBids: [],
      isLoading: false,
      error: null,
      page: 1,
      hasMore: true,
    })
  },
}))
