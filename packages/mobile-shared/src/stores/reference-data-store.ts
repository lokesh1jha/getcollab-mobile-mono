import { create } from 'zustand'
import apiService from '../services/api'

export type RefItem = { slug: string; label: string; [key: string]: string }

export interface ReferenceData {
  categories:    RefItem[]
  countries:     RefItem[]
  languages:     RefItem[]
  industries:    RefItem[]
  campaignTypes: RefItem[]
  objectives:    RefItem[]
  regions:       RefItem[]
  deliverables:  RefItem[]
}

interface ReferenceDataState {
  data: ReferenceData | null
  loaded: boolean
  fetch: () => Promise<void>
}

export const useReferenceDataStore = create<ReferenceDataState>((set, get) => ({
  data: null,
  loaded: false,
  fetch: async () => {
    if (get().loaded) return // ponytail: fetch once per app session
    try {
      const data = await apiService.getReferenceData()
      set({ data, loaded: true })
    } catch {
      // non-fatal: screens fall back to empty arrays
    }
  },
}))

// Convenience selectors — return slug strings for multi-select pickers
export const selectCategories   = (s: ReferenceDataState) => s.data?.categories?.map(i => i.label) ?? []
export const selectLanguages    = (s: ReferenceDataState) => s.data?.languages ?? []
export const selectIndustries   = (s: ReferenceDataState) => s.data?.industries?.map(i => i.label) ?? []
export const selectCampaignTypes = (s: ReferenceDataState) => s.data?.campaignTypes ?? []
export const selectObjectives   = (s: ReferenceDataState) => s.data?.objectives ?? []
export const selectRegions      = (s: ReferenceDataState) => s.data?.regions?.map(i => i.label) ?? []
export const selectDeliverables = (s: ReferenceDataState) => s.data?.deliverables?.map(i => i.label) ?? []
