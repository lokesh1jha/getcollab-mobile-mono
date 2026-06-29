import type { Campaign, CampaignStatus } from '../types'

export function normalizeCampaignStatus(status?: string | null): CampaignStatus {
  const value = (status || 'draft').toLowerCase()
  if (value === 'active' || value === 'completed' || value === 'cancelled' || value === 'draft') {
    return value
  }
  return 'draft'
}

export function normalizeCampaign<T extends Record<string, any>>(campaign: T): T & { status: CampaignStatus } {
  return {
    ...campaign,
    status: normalizeCampaignStatus(campaign.status),
  }
}

export function normalizeCampaignList(campaigns: any[]): Campaign[] {
  if (!Array.isArray(campaigns)) return []
  return campaigns.map((campaign) => normalizeCampaign(campaign))
}

export function extractCampaigns(response: any): Campaign[] {
  const list =
    response?.campaigns ??
    response?.data?.campaigns ??
    (Array.isArray(response?.data) ? response.data : null) ??
    (Array.isArray(response) ? response : [])
  return normalizeCampaignList(list)
}
