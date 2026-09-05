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

// Stable shared empty — selectors must never return a fresh [] per call,
// otherwise useSyncExternalStore sees a new snapshot every render and React
// throws "The result of getSnapshot should be cached" / infinite-loop.
const EMPTY: string[] = []

// Label arrays are derived from `data`, so cache them per data instance via
// WeakMap: same data → same array reference for the life of that snapshot.
const labelCache = new WeakMap<ReferenceData, Map<string, string[]>>()

function labelsOf(s: ReferenceDataState, key: keyof ReferenceData): string[] {
  const data = s.data
  if (!data) return EMPTY
  let cache = labelCache.get(data)
  if (!cache) {
    cache = new Map()
    labelCache.set(data, cache)
  }
  let labels = cache.get(key)
  if (!labels) {
    labels = ((data[key] as RefItem[]) ?? []).map((i) => i.label)
    cache.set(key, labels)
  }
  return labels
}

// Convenience selectors — return slug strings for multi-select pickers
// NOTE: must return referentially stable values for the same store state.
export const selectCategories   = (s: ReferenceDataState) => labelsOf(s, 'categories')
export const selectLanguages    = (s: ReferenceDataState) => s.data?.languages ?? EMPTY
export const selectIndustries   = (s: ReferenceDataState) => labelsOf(s, 'industries')
export const selectCampaignTypes = (s: ReferenceDataState) => s.data?.campaignTypes ?? EMPTY
export const selectObjectives   = (s: ReferenceDataState) => s.data?.objectives ?? EMPTY
export const selectRegions      = (s: ReferenceDataState) => labelsOf(s, 'regions')
export const selectDeliverables = (s: ReferenceDataState) => labelsOf(s, 'deliverables')
