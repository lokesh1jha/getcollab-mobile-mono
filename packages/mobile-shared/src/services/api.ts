import { rowsForToggle, toggleStates, type PrefRow } from '../lib/notification-prefs'
import { Alert } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { apiBaseUrlFromEnv } from '../utils/api-url'
import { logger } from './logger'
import * as Haptics from 'expo-haptics'

const API_BASE_URL = apiBaseUrlFromEnv(process.env.EXPO_PUBLIC_API_URL)
const REQUEST_TIMEOUT_MS = 10000

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}
const TOKEN_KEY = 'getcollab_auth_token'
const REFRESH_TOKEN_KEY = 'getcollab_refresh_token'
const DEVICE_ID_KEY = 'getcollab_device_id'
const CREDENTIAL_AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/signin', '/auth/signup']

let cachedDeviceId: string | null = null

async function getOrCreateDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId
  try {
    let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY)
    if (!deviceId) {
      const chars = 'abcdef0123456789'
      let randomStr = ''
      for (let i = 0; i < 32; i++) {
        randomStr += chars[Math.floor(Math.random() * chars.length)]
      }
      deviceId = `mobile_${randomStr}`
      await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId)
    }
    cachedDeviceId = deviceId
    return deviceId
  } catch (error) {
    logger.error('Failed to get/create device id', error)
    return 'mobile_fallback_device_id'
  }
}

function isCredentialAuthEndpoint(endpoint: string): boolean {
  return CREDENTIAL_AUTH_ENDPOINTS.some((path) => endpoint.includes(path))
}

export function isUnauthorizedError(message?: string): boolean {
  if (!message) return false
  return message === 'UNAUTHORIZED' || /unauthorized/i.test(message) || message.includes('401')
}

interface ApiResponse<T> {
  success?: boolean
  message?: string
  error?: string
  user?: T
  data?: T
  token?: string
  refreshToken?: string
}

interface User {
  id: string
  name: string
  email: string
  role: 'brand' | 'influencer'
}

interface SignupData {
  name: string
  email: string
  password: string
  role: 'brand' | 'influencer'
}

interface SigninData {
  email: string
  password: string
}

class ApiService {
  private baseUrl: string
  private onUnauthorized?: () => void
  private refreshPromise: Promise<string | null> | null = null

  constructor() {
    this.baseUrl = API_BASE_URL
    if (__DEV__) console.log('[api] baseUrl:', this.baseUrl)
  }

  getBaseUrl(): string {
    return this.baseUrl
  }

  setOnUnauthorizedCallback(callback: () => void) {
    this.onUnauthorized = callback
  }

  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY)
    } catch (error) {
      logger.error('Failed to get token from SecureStore', error)
      return null
    }
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
    } catch (error) {
      logger.error('Failed to get refresh token from SecureStore', error)
      return null
    }
  }

  async setToken(token: any): Promise<void> {
    try {
      const value = this.extractTokenString(token)
      if (!value) return
      await SecureStore.setItemAsync(TOKEN_KEY, value)
    } catch (error) {
      logger.error('Failed to store token in SecureStore', error)
      throw error
    }
  }

  private extractTokenString(token: any): string | null {
    if (!token) return null
    if (typeof token === 'string') return token
    // Handle objects: { accessToken }, { access }, { token }, { jwt }
    if (typeof token === 'object') {
      const t = token.accessToken || token.access || token.token || token.jwt
      if (typeof t === 'string') return t
      // Last resort: JSON-encode the object
      return JSON.stringify(token)
    }
    return String(token)
  }

  async setRefreshToken(refreshToken: any): Promise<void> {
    try {
      const value = this.extractTokenString(refreshToken)
      if (!value) return
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, value)
    } catch (error) {
      logger.error('Failed to store refresh token', error)
    }
  }

  async clearTokens(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY)
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
    } catch (error) {
      logger.error('Failed to clear tokens', error)
    }
  }

  private sanitizeResponse(value: any): any {
    if (typeof value === 'string') {
      const lower = value.toLowerCase()
      if (lower === 'true') return true
      if (lower === 'false') return false
      return value
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeResponse(item))
    }
    if (value && typeof value === 'object') {
      const result: Record<string, any> = {}
      for (const key in value) {
        result[key] = this.sanitizeResponse(value[key])
      }
      return result
    }
    return value
  }

  private async handleResponse<T>(response: Response, opts?: { surfaceCredentialError?: boolean }): Promise<T> {
    if (response.status === 204) {
      return { success: true } as unknown as T
    }

    const contentType = response.headers.get('content-type')

    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('GetCollab is under maintenance. Try again later.')
    }

    let data: any
    try {
      const text = await response.text()
      data = JSON.parse(text)
    } catch (e) {
      throw new Error('GetCollab is under maintenance. Try again later.')
    }

    if (!response.ok) {
      if (response.status === 401) {
        const errorMessage = data.error || data.message || 'Invalid email or password'
        if (opts?.surfaceCredentialError) {
          const errObj = new Error(errorMessage) as any
          if (data.code) errObj.code = data.code
          throw errObj
        }
        await this.clearTokens()
        if (this.onUnauthorized) {
          this.onUnauthorized()
        }
        throw new Error('UNAUTHORIZED')
      }

      if (response.status === 429) {
        const lockoutMessage = data.message || data.error || 'Too many attempts. Try again later.'
        throw new Error(lockoutMessage)
      }

      const errorMessage = data.error || data.message || 'Something went wrong'
      const errorObj = new Error(errorMessage) as any
      if (data.code) {
        errorObj.code = data.code
      }
      throw errorObj
    }

    if (data && typeof data === 'object') {
      data = this.sanitizeResponse(data)
    }

    if (data) {
      if (data.access_token && !data.token) data.token = data.access_token
      if (data.refresh_token && !data.refreshToken) data.refreshToken = data.refresh_token
      if (data.tokens) {
        if (data.tokens.accessToken) data.token = data.tokens.accessToken
        if (data.tokens.refreshToken) data.refreshToken = data.tokens.refreshToken
      }
    }

    if (data && data.data && data.data.user && !data.user) {
      data.user = data.data.user
    }

    return data
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const token = await this.getToken()
    const deviceId = await getOrCreateDeviceId()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Device-Id': deviceId,
      ...(options.headers as Record<string, string>),
    }

    if (endpoint.includes('/auth/login')) {
      headers['X-Auth-Transport'] = 'token'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const config: RequestInit = {
      ...options,
      headers,
      credentials: 'omit',
    }

    let response: Response
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      response = await fetch(url, { ...config, signal: controller.signal })
      try {
        const { networkBanner } = await import('../components/NetworkBanner')
        networkBanner.hide()
      } catch {}
    } catch (networkErr: any) {
      try {
        const { networkBanner } = await import('../components/NetworkBanner')
        networkBanner.show('Network unavailable. Check your connection.')
      } catch {}
      throw networkErr
    } finally {
      clearTimeout(timeoutId)
    }

    try {
      if (response.status === 401) {
        const refreshToken = await this.getRefreshToken()
        if (refreshToken) {
          const newToken = await this.refreshAccessToken()
          if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`
            const retryResponse = await fetchWithTimeout(url, { ...config, headers })
            // Intercept retry 401 here — prevents handleResponse from clearing tokens
            // while other concurrent retries are still in-flight with the new token.
            if (retryResponse.status === 401) {
              await this.handleLogout()
              throw new Error('UNAUTHORIZED')
            }
            return await this.handleResponse<T>(retryResponse)
          }
        }
        // No refreshable session on login/register — surface wrong-password errors.
        if (isCredentialAuthEndpoint(endpoint)) {
          return await this.handleResponse<T>(response, { surfaceCredentialError: true })
        }
        await this.clearTokens()
        if (this.onUnauthorized) {
          this.onUnauthorized()
        }
        throw new Error('UNAUTHORIZED')
      }

      return await this.handleResponse<T>(response)
    } catch (error) {
      if (error instanceof Error && !isUnauthorizedError(error.message)) {
        logger.error(`API ${options.method || 'GET'} ${endpoint.split('?')[0]}`, error)
      }
      throw error
    }
  }

  // ------- Auth -------
  async signup(data: SignupData): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async signin(data: SigninData): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ------- Campaigns -------
  async getCampaigns(params?: Record<string, any>): Promise<any> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ''
    return this.request(`/campaigns${queryString}`)
  }

  async getMyCampaigns(params?: Record<string, any>): Promise<any> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ''
    return this.request(`/campaigns/brand${queryString}`)
  }

  async getCampaign(id: string): Promise<any> {
    return this.request(`/campaigns/${id}`)
  }

  async createCampaign(data: any): Promise<any> {
    return this.request('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateCampaign(id: string, data: any): Promise<any> {
    return this.request(`/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async publishCampaign(id: string): Promise<any> {
    return this.request(`/campaigns/${id}/publish`, { method: 'PATCH' })
  }

  async deleteCampaign(id: string): Promise<any> {
    return this.request(`/campaigns/${id}`, { method: 'DELETE' })
  }

  async getCampaignAnalytics(campaignId: string): Promise<any> {
    return this.request(`/analytics?campaignId=${encodeURIComponent(campaignId)}`)
  }

  async getAnalytics(params?: Record<string, any>): Promise<any> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ''
    return this.request(`/analytics${queryString}`)
  }

  async getDashboardStats(): Promise<any> {
    return this.request('/dashboard/stats')
  }

  async getDashboardFeed(params?: Record<string, any>): Promise<any> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ''
    return this.request(`/dashboard/feed${queryString}`)
  }

  // ------- Bids -------
  async getBids(params?: Record<string, any>): Promise<any> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ''
    return this.request(`/bids${queryString}`)
  }

  async getBidsForCampaign(campaignId: string): Promise<any> {
    return this.request(`/bids?campaignId=${encodeURIComponent(campaignId)}`)
  }

  async submitBid(data: any): Promise<any> {
    return this.request('/bids', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateBidStatus(bidId: string, status: string): Promise<any> {
    return this.request('/bids', {
      method: 'PATCH',
      body: JSON.stringify({ bidId, status }),
    })
  }

  // ------- Chat -------
  async getChats(): Promise<any> {
    return this.request('/chat/rooms')
  }

  async getChatRooms(): Promise<any> {
    return this.request('/chat/rooms')
  }

  async getChatRoom(roomId: string): Promise<any> {
    return this.request(`/chat/rooms/${roomId}`)
  }

  async getChatMessages(roomId: string, params?: Record<string, any>): Promise<any> {
    const queryParams = new URLSearchParams({ roomId, ...params })
    return this.request(`/chat/messages?${queryParams.toString()}`)
  }

  async markChatRoomRead(roomId: string): Promise<any> {
    return this.request(`/chat/rooms/${encodeURIComponent(roomId)}/read`, { method: 'POST', body: JSON.stringify({}) })
  }

  async sendChatMessage(roomId: string, content: string, type: string = 'text'): Promise<any> {
    // The API reads `message`; this sent `content`, so every mobile message
    // was saved with an empty body.
    return this.request('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ roomId, message: content, type }),
    })
  }

  async presignChatAttachments(
    roomId: string,
    files: { fileName: string; mimeType: string; fileSize: number }[],
  ): Promise<any> {
    return this.request('/chat/attachments/presign', {
      method: 'POST',
      body: JSON.stringify({ roomId, files }),
    })
  }

  /** blobIds come from presignChatAttachments (uploads[].blobId). */
  async sendChatMessageWithAttachments(roomId: string, message: string, blobIds: string[]): Promise<any> {
    return this.request('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ roomId, message, type: 'file', blob_ids: blobIds }),
    })
  }

  /** Opens (or reuses) the brand's room with a creator. /chat/direct does not
   *  exist; rooms are opened with POST /chat/rooms for the caller's brand
   *  org. influencerId may be the creator's profile or user id. */
  async createDirectChat(influencerId: string, campaignId?: string): Promise<any> {
    const me: any = await this.request('/auth/me')
    const brandOrgId = me?.tenant_id || me?.memberships?.[0]?.org_id
    if (!brandOrgId) throw new Error('Messaging a creator needs a brand workspace')
    return this.request('/chat/rooms', {
      method: 'POST',
      body: JSON.stringify({ brand_org_id: brandOrgId, influencer_id: influencerId, campaign_id: campaignId ?? '' }),
    })
  }

  // ------- Influencers / Discovery -------
  async getInfluencers(params?: Record<string, any>): Promise<any> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ''
    return this.request(`/influencers${queryString}`)
  }

  async getInfluencer(id: string): Promise<any> {
    return this.request(`/influencers/${id}`)
  }

  async getInfluencerByUsername(username: string): Promise<any> {
    return this.request(`/influencer/${encodeURIComponent(username)}`)
  }

  async getMarketplace(params?: Record<string, any>): Promise<any> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ''
    return this.request(`/marketplace${queryString}`)
  }

  async getTrendingCreators(params?: Record<string, any>): Promise<any> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ''
    return this.request(`/trending${queryString}`)
  }

  async getMarketplaceBatch(ids: string[]): Promise<any> {
    return this.request('/batch', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
  }

  async discoverCreators(params?: Record<string, any>): Promise<any> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ''
    return this.request(`/discovery/search${queryString}`)
  }

  async discoverByKeyword(keyword: string, params?: Record<string, any>): Promise<any> {
    const queryParams = new URLSearchParams({ keyword, ...params })
    return this.request(`/discovery/search/keyword?${queryParams.toString()}`)
  }

  // ------- Profile -------
  async getUserProfile(userId: string): Promise<any> {
    return this.request(`/profile?userId=${userId}`)
  }

  async getProfile(): Promise<any> {
    return this.request('/profile')
  }

  async getProfileWithMetrics(): Promise<any> {
    return this.request('/profile/with-metrics')
  }

  async getCurrentUser(): Promise<any> {
    return this.request('/auth/me')
  }

  async updateProfile(data: any): Promise<any> {
    return this.request('/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateGeneralProfile(data: { name?: string; websiteUrl?: string; industry?: string; phoneNumbers?: string[] }): Promise<any> {
    return this.updateAccount(data)
  }

  async updateRole(role: 'brand' | 'influencer'): Promise<any> {
    return this.request('/auth/update-role', {
      method: 'POST',
      body: JSON.stringify({ role }),
    })
  }

  async acceptTerms(): Promise<any> {
    return this.request('/auth/accept-terms', { method: 'POST', body: JSON.stringify({}) })
  }

  async getOnboardingState(): Promise<any> {
    return this.request('/onboarding/state')
  }

  async uploadProfileImage(base64Image: string): Promise<any> {
    return this.request('/profile/upload-image', {
      method: 'POST',
      body: JSON.stringify({ image: base64Image }),
    })
  }

  async uploadCoverImage(base64Image: string): Promise<any> {
    return this.request('/profile/upload-cover', {
      method: 'POST',
      body: JSON.stringify({ image: base64Image }),
    })
  }

  /** Uploads a campaign cover and returns its public URL. /profile/upload,
   *  which this used, does not exist; campaigns have their own upload URL. */
  async uploadCampaignCover(dataUri: string, contentType = 'image/jpeg'): Promise<string> {
    const r: any = await this.request(`/campaigns/upload-url?contentType=${encodeURIComponent(contentType)}`)
    if (!r?.uploadUrl || !r?.publicUrl) throw new Error("Couldn't start the upload. Try again.")
    const blob = await (await fetch(dataUri)).blob()
    const put = await fetch(r.uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: blob as any })
    if (!put.ok) throw new Error("Couldn't upload the cover image. Try again.")
    return r.publicUrl
  }

  async updatePricing(data: any): Promise<any> {
    return this.request('/profile/pricing', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateDemographics(data: any): Promise<any> {
    return this.request('/profile/demographics', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ------- Settings -------
  async getReferenceData(): Promise<any> {
    return this.request('/reference-data/all')
  }

  // /v1/settings (GET/PUT), /settings/notifications and /settings/profile do
  // not exist on the Go API, so every settings screen loaded defaults and
  // every save failed. These keep the screens' shape and compose it from the
  // real endpoints: /auth/me + PATCH /auth/account (name, phone, brand
  // website/industry), /profile (bio, location, website), and
  // /notifications/preferences (per event type, mapped from the toggles).

  private async getPreferenceRows(): Promise<PrefRow[]> {
    const res: any = await this.request('/notifications/preferences')
    return (res?.preferences ?? []).map((p: any) => ({
      event_type: p.eventType, in_app: !!p.inApp, email: !!p.email, web_push: !!p.webPush, mobile_push: !!p.mobilePush,
    }))
  }

  async getSettings(): Promise<any> {
    const [meRes, profile, rows] = await Promise.all([
      this.request('/auth/me') as Promise<any>,
      (this.request('/profile') as Promise<any>).catch(() => null),
      this.getPreferenceRows().catch(() => null),
    ])
    const me = meRes?.user ?? meRes
    const prof = profile?.profile ?? profile ?? {}
    return {
      name: me?.name ?? '',
      email: me?.email ?? '',
      phoneNumbers: me?.phoneNumbers ?? [],
      image: me?.image,
      bio: prof.bio ?? '',
      location: [prof.city, prof.state].filter(Boolean).join(', '),
      websiteUrl: prof.website ?? '',
      industry: prof.industries?.[0] ?? '',
      // Flags a failed read, so callers never treat fallbacks as saved values.
      profileLoaded: profile != null,
      isBrand: Array.isArray(me?.memberships) && me.memberships.length > 0,
      // null (not all-on defaults) when preferences couldn't be read.
      notifications: rows ? toggleStates(rows) : null,
    }
  }

  /** PATCH /auth/account replaces name, phone and (brands) website/industry
   *  together, so unchanged fields are read back first rather than cleared. */
  async updateAccount(changes: { name?: string; phoneNumbers?: string[]; websiteUrl?: string; industry?: string }): Promise<any> {
    const cur = await this.getSettings()
    // A brand's website/industry would be sent blank and overwrite the saved ones.
    if (cur.isBrand && !cur.profileLoaded && (changes.websiteUrl === undefined || changes.industry === undefined)) {
      throw new Error("Couldn't load your current profile. Try again.")
    }
    return this.request('/auth/account', {
      method: 'PATCH',
      body: JSON.stringify({
        name: changes.name ?? cur.name,
        phoneNumbers: changes.phoneNumbers ?? cur.phoneNumbers,
        websiteUrl: changes.websiteUrl ?? cur.websiteUrl,
        industry: changes.industry ?? cur.industry,
      }),
    })
  }

  async updateSettings(data: { phoneNumbers?: string[]; name?: string }): Promise<any> {
    return this.updateAccount(data)
  }

  /** Accepts the screens' toggle keys, e.g. { emailBidAlerts: false }. */
  async updateNotificationSettings(data: Record<string, boolean>): Promise<any> {
    const rows = await this.getPreferenceRows()
    for (const [key, value] of Object.entries(data)) {
      for (const row of rowsForToggle(rows, key, value)) {
        await this.request('/notifications/preferences', { method: 'PUT', body: JSON.stringify(row) })
      }
    }
  }

  // ------- Notifications -------
  async getNotifications(): Promise<any> {
    return this.request('/notifications')
  }

  async markNotificationAsRead(id: string): Promise<any> {
    return this.request(`/notifications/${id}/read`, { method: 'POST' })
  }

  async markAllNotificationsAsRead(): Promise<any> {
    return this.request('/notifications', { method: 'PATCH', body: JSON.stringify({ all: true }) })
  }

  // ------- Earnings, wallet, and settlements -------
  async getEarnings(): Promise<any> {
    return this.request('/earnings')
  }

  async getSettlements(): Promise<any> {
    return this.request('/settlements')
  }

  async getCreatorWallet(): Promise<any> {
    return this.request('/wallet/creator')
  }

  async fetchWalletSummary(currency = 'INR'): Promise<any> {
    return this.request(`/wallet?currency=${currency}`)
  }

  async topUpWallet(payload: { amountMinor: number; currency?: string; idempotencyKey: string; memo?: string }): Promise<any> {
    return this.request('/wallet/topup', {
      method: 'POST',
      body: JSON.stringify({ currency: 'INR', ...payload }),
    })
  }

  async fetchWalletTransactions(currency = 'INR', page = 1, limit = 25): Promise<any> {
    return this.request(`/wallet/transactions?currency=${currency}&page=${page}&limit=${limit}`)
  }

  async requestWalletRefund(payload: { amountMinor: number; currency?: string; reason: string }): Promise<any> {
    return this.request('/wallet/refund-request', {
      method: 'POST',
      body: JSON.stringify({ currency: 'INR', ...payload }),
    })
  }

  async withdrawPayout(data: { amountMinor: number; currency?: string; idempotencyKey: string }): Promise<any> {
    return this.request('/payouts/withdraw', {
      method: 'POST',
      body: JSON.stringify({ currency: 'INR', ...data }),
    })
  }

  async createSettlement(data: { campaignId: string; amount?: number; message?: string }): Promise<any> {
    return this.request('/settlements', { method: 'POST', body: JSON.stringify(data) })
  }

  async getPayoutSettings(): Promise<any> {
    return this.request('/payout-settings')
  }

  async updatePayoutSettings(data: { bankAccount: string; ifscCode: string; panNumber: string; gstNumber?: string }): Promise<any> {
    return this.request('/payout-settings', { method: 'POST', body: JSON.stringify(data) })
  }

  async deleteAccount(): Promise<any> {
    return this.request('/settings/account', { method: 'DELETE', body: JSON.stringify({ confirmation: 'DELETE' }) })
  }

  // ------- Disputes -------
  async getDisputes(): Promise<any> {
    return this.request('/disputes')
  }

  /** Disputes are filed against a deal. This sent campaignId/description,
   *  which the API does not read, so no dispute could be filed. */
  async createDispute(data: { dealId: string; reason: string }): Promise<any> {
    return this.request('/disputes', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ------- Collabs (deal lifecycle, participant side) -------
  async getDeals(params?: Record<string, any>): Promise<any> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ''
    return this.request(`/collabs${queryString}`)
  }

  /** Every collaboration visible to the caller, following cursor pages
   *  (GET /collabs caps a page at 100). campaignId is filtered server-side. */
  async getAllDeals(filter: { campaignId?: string } = {}): Promise<any[]> {
    const all: any[] = []
    const seen = new Set<string>()
    let cursor: string | undefined
    do {
      const res: any = await this.getDeals({
        limit: '100',
        ...(filter.campaignId ? { campaign_id: filter.campaignId } : {}),
        ...(cursor ? { cursor } : {}),
      })
      const list = res?.deals || res?.collabs || res?.data || []
      if (Array.isArray(list)) all.push(...list)
      cursor = res?.pagination?.hasNext ? res.pagination.nextCursor ?? undefined : undefined
      // A repeated cursor would loop forever; stop instead.
      if (cursor && seen.has(cursor)) break
      if (cursor) seen.add(cursor)
    } while (cursor)
    return all
  }

  async getDeal(id: string): Promise<any> {
    return this.request(`/collabs/${encodeURIComponent(id)}`)
  }

  async acceptDealContract(id: string): Promise<any> {
    return this.request(`/collabs/${encodeURIComponent(id)}/contract/accept`, { method: 'POST', body: JSON.stringify({}) })
  }

  async startDeal(id: string): Promise<any> {
    return this.request(`/collabs/${encodeURIComponent(id)}/start`, { method: 'POST', body: JSON.stringify({}) })
  }

  async submitDealScript(id: string, content: string): Promise<any> {
    return this.request(`/collabs/${encodeURIComponent(id)}/assets/script`, { method: 'POST', body: JSON.stringify({ bodyText: content }) })
  }

  async submitDealMedia(id: string, payload: Record<string, any>): Promise<any> {
    return this.request(`/collabs/${encodeURIComponent(id)}/assets/media`, { method: 'POST', body: JSON.stringify(payload) })
  }

  async upsertDealProof(id: string, payload: Record<string, any>): Promise<any> {
    return this.request(`/collabs/${encodeURIComponent(id)}/proof`, { method: 'PUT', body: JSON.stringify(payload) })
  }

  async submitDealProof(id: string, payload: Record<string, any>): Promise<any> {
    return this.request(`/collabs/${encodeURIComponent(id)}/proof/submit`, { method: 'POST', body: JSON.stringify(payload) })
  }

  /** Hand in a script, content or live post link for one deliverable. */
  async submitDeliverableWork(
    dealId: string,
    milestoneId: string,
    body: { kind: 'SCRIPT' | 'CONTENT' | 'LIVE_LINK'; bodyText?: string; blobIds?: string[]; caption?: string; liveUrl?: string },
  ): Promise<any> {
    return this.request(
      `/collabs/${encodeURIComponent(dealId)}/deliverables/${encodeURIComponent(milestoneId)}/submissions`,
      { method: 'POST', body: JSON.stringify(body) },
    )
  }

  /** Brand review of one submission. A note is required to request changes or reject. */
  async reviewSubmission(
    dealId: string,
    submissionId: string,
    body: { action: 'approve' | 'request_changes' | 'reject'; note?: string },
  ): Promise<any> {
    return this.request(
      `/collabs/${encodeURIComponent(dealId)}/submissions/${encodeURIComponent(submissionId)}/review`,
      { method: 'POST', body: JSON.stringify(body) },
    )
  }

  /** Signed URL for a submission's upload (scan-gated for the brand). */
  async getSubmissionFileUrl(dealId: string, submissionId: string, download = false): Promise<any> {
    return this.request(
      `/collabs/${encodeURIComponent(dealId)}/assets/${encodeURIComponent(submissionId)}/url?download=${download ? 1 : 0}`,
    )
  }

  /** The campaign's escrow pool (404 until the brand funds it). */
  async getCampaignPool(campaignId: string): Promise<any> {
    return this.request(`/escrow/campaigns/${encodeURIComponent(campaignId)}/pool`)
  }

  async getDealEvents(dealId: string): Promise<any> {
    return this.request(`/collabs/${encodeURIComponent(dealId)}/events`)
  }

  async fundDeal(dealId: string): Promise<any> {
    return this.request(`/collabs/${encodeURIComponent(dealId)}/fund`, {
      method: 'POST',
      body: JSON.stringify({ idempotencyKey: `fund-${dealId}` }),
    })
  }

  async releaseDealPayment(dealId: string): Promise<any> {
    return this.request(`/collabs/${encodeURIComponent(dealId)}/mark-paid`, { method: 'POST', body: JSON.stringify({}) })
  }

  async getDealShipping(id: string): Promise<any> {
    return this.request(`/collabs/${encodeURIComponent(id)}/shipping`)
  }

  async getDealInvites(params?: Record<string, any>): Promise<any> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ''
    return this.request(`/collabs/invites${queryString}`)
  }

  async acceptDealInvite(id: string): Promise<any> {
    return this.request(`/collabs/invites/${encodeURIComponent(id)}/accept`, { method: 'POST', body: JSON.stringify({}) })
  }

  async declineDealInvite(id: string, reason?: string): Promise<any> {
    return this.request(`/collabs/invites/${encodeURIComponent(id)}/decline`, { method: 'POST', body: JSON.stringify(reason ? { reason } : {}) })
  }

  // NOTE: DELETE /collabs/invites/{id} is brand-org scoped (403 for creators).
  // The influencer app only exposes Accept/Decline actions for invites.

  async getDocuments(dealId: string): Promise<any> {
    return this.request(`/deals/${encodeURIComponent(dealId)}/documents`)
  }

  async signDocument(documentId: string, fullName: string): Promise<any> {
    return this.request(`/documents/${encodeURIComponent(documentId)}/sign`, {
      method: 'POST',
      body: JSON.stringify({ fullName, consent: true }),
    })
  }

  async getDocumentPdf(documentId: string): Promise<any> {
    return this.request(`/documents/${encodeURIComponent(documentId)}/pdf`)
  }

  async getRelationships(params?: Record<string, any>): Promise<any> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ''
    return this.request(`/relationships${queryString}`)
  }

  async getRelationship(id: string): Promise<any> {
    return this.request(`/relationships/${encodeURIComponent(id)}`)
  }

  async createRelationship(data: { targetUserId: string; message?: string }): Promise<any> {
    return this.request('/relationships', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async searchRelationships(q: string, limit = 10): Promise<any> {
    return this.request(`/relationships/search?q=${encodeURIComponent(q)}&limit=${limit}`)
  }

  async getRelationshipCollaborations(relationshipId: string, params?: Record<string, any>): Promise<any> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ''
    return this.request(`/relationships/${encodeURIComponent(relationshipId)}/collaborations${queryString}`)
  }

  async getRelationshipTimeline(relationshipId: string): Promise<any> {
    return this.request(`/relationships/${encodeURIComponent(relationshipId)}/timeline`)
  }

  // ------- Creator circles (a brand's reusable saved-creator lists) -------

  async listCreatorCircles(): Promise<any> {
    return this.request('/creator-circles')
  }

  async createCreatorCircle(payload: {
    name: string
    description?: string
    tags?: string[]
    campaignId?: string
  }): Promise<any> {
    return this.request('/creator-circles', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async getCreatorCircleMembers(circleId: string): Promise<any> {
    return this.request(`/creator-circles/${encodeURIComponent(circleId)}/members`)
  }

  async addCreatorCircleMembers(circleId: string, influencerIds: string[]): Promise<any> {
    return this.request(`/creator-circles/${encodeURIComponent(circleId)}/members`, {
      method: 'POST',
      body: JSON.stringify({ influencerIds }),
    })
  }

  async removeCreatorCircleMember(circleId: string, influencerId: string): Promise<any> {
    return this.request(
      `/creator-circles/${encodeURIComponent(circleId)}/members/${encodeURIComponent(influencerId)}`,
      { method: 'DELETE' },
    )
  }

  // ------- Growth (website SEO, search, and AI-visibility workspace) -------

  async getGrowthSite(): Promise<any> {
    return this.request('/growth/sites')
  }

  async upsertGrowthSite(websiteUrl: string): Promise<any> {
    return this.request('/growth/sites', {
      method: 'POST',
      body: JSON.stringify({ websiteUrl }),
    })
  }

  async analyzeGrowthSite(siteId: string): Promise<any> {
    return this.request(`/growth/sites/${encodeURIComponent(siteId)}/analyze`, { method: 'POST' })
  }

  async getGrowthJob(jobId: string): Promise<any> {
    return this.request(`/growth/jobs/${encodeURIComponent(jobId)}`)
  }

  async getGrowthOverview(siteId: string): Promise<any> {
    return this.request(`/growth/sites/${encodeURIComponent(siteId)}/overview`)
  }

  async getGrowthSeo(siteId: string, severity?: string): Promise<any> {
    const queryString = severity ? `?severity=${encodeURIComponent(severity)}` : ''
    return this.request(`/growth/sites/${encodeURIComponent(siteId)}/seo${queryString}`)
  }

  async getGrowthRecommendations(siteId: string, status?: string): Promise<any> {
    const queryString = status ? `?status=${encodeURIComponent(status)}` : ''
    return this.request(`/growth/sites/${encodeURIComponent(siteId)}/recommendations${queryString}`)
  }

  async setGrowthRecommendationStatus(recommendationId: string, status: string): Promise<any> {
    return this.request(`/growth/recommendations/${encodeURIComponent(recommendationId)}`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    })
  }

  async connectGrowthSearchConsole(siteId: string): Promise<any> {
    return this.request(`/growth/sites/${encodeURIComponent(siteId)}/gsc/connect`, { method: 'POST' })
  }

  async getGrowthSearchConsoleProperties(siteId: string): Promise<any> {
    return this.request(`/growth/sites/${encodeURIComponent(siteId)}/gsc/properties`)
  }

  async selectGrowthSearchConsoleProperty(siteId: string, property: string): Promise<any> {
    return this.request(`/growth/sites/${encodeURIComponent(siteId)}/gsc/properties`, {
      method: 'POST',
      body: JSON.stringify({ property }),
    })
  }

  async syncGrowthSearchConsole(siteId: string): Promise<any> {
    return this.request(`/growth/sites/${encodeURIComponent(siteId)}/gsc/sync`, { method: 'POST' })
  }

  async getGrowthSearchConsole(siteId: string): Promise<any> {
    return this.request(`/growth/sites/${encodeURIComponent(siteId)}/search-console`)
  }

  async getGrowthOpportunities(siteId: string, kind?: string): Promise<any> {
    const queryString = kind ? `?kind=${encodeURIComponent(kind)}` : ''
    return this.request(`/growth/sites/${encodeURIComponent(siteId)}/opportunities${queryString}`)
  }

  async getGrowthAiVisibility(siteId: string): Promise<any> {
    return this.request(`/growth/sites/${encodeURIComponent(siteId)}/ai-visibility`)
  }

  async scanGrowthAiVisibility(siteId: string): Promise<any> {
    return this.request(`/growth/sites/${encodeURIComponent(siteId)}/ai-visibility/scan`, { method: 'POST' })
  }

  async askGrowthCopilot(siteId: string, question: string): Promise<any> {
    return this.request(`/growth/sites/${encodeURIComponent(siteId)}/copilot`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    })
  }

  async getGrowthCreatorHandoff(recommendationId: string): Promise<any> {
    return this.request(`/growth/recommendations/${encodeURIComponent(recommendationId)}/creators`)
  }

  async getAffiliatePrograms(params?: Record<string, any>): Promise<any> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ''
    return this.request(`/affiliate/programs${queryString}`)
  }

  async getAffiliateProgram(id: string): Promise<any> {
    return this.request(`/affiliate/programs/${encodeURIComponent(id)}`)
  }

  async createAffiliateProgram(payload: Record<string, unknown>): Promise<any> {
    return this.request('/affiliate/programs', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async updateAffiliateProgram(id: string, payload: Record<string, unknown>): Promise<any> {
    return this.request(`/affiliate/programs/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  }

  async activateAffiliateProgram(id: string): Promise<any> {
    return this.request(`/affiliate/programs/${encodeURIComponent(id)}/activate`, { method: 'POST' })
  }

  async pauseAffiliateProgram(id: string): Promise<any> {
    return this.request(`/affiliate/programs/${encodeURIComponent(id)}/pause`, { method: 'POST' })
  }

  async resumeAffiliateProgram(id: string): Promise<any> {
    return this.request(`/affiliate/programs/${encodeURIComponent(id)}/resume`, { method: 'POST' })
  }

  async closeAffiliateProgram(id: string): Promise<any> {
    return this.request(`/affiliate/programs/${encodeURIComponent(id)}/close`, { method: 'POST' })
  }

  async increaseAffiliateBudget(id: string, additionalMinor: number): Promise<any> {
    return this.request(`/affiliate/programs/${encodeURIComponent(id)}/budget`, {
      method: 'POST',
      body: JSON.stringify({ additionalMinor }),
    })
  }

  async applyToAffiliateProgram(id: string): Promise<any> {
    return this.request(`/affiliate/programs/${encodeURIComponent(id)}/apply`, { method: 'POST', body: JSON.stringify({}) })
  }

  async getAffiliateLinks(): Promise<any> {
    return this.request('/affiliate/links')
  }

  async getAffiliateRewards(): Promise<any> {
    return this.request('/affiliate/rewards')
  }

  async acceptAffiliateLink(id: string): Promise<any> {
    return this.request(`/affiliate/links/${encodeURIComponent(id)}/accept`, { method: 'POST', body: JSON.stringify({}) })
  }

  async getAffiliateApplications(programId: string): Promise<any> {
    return this.request(`/affiliate/programs/${encodeURIComponent(programId)}/applications`)
  }

  async reviewAffiliateApplication(id: string, approve: boolean, note = ''): Promise<any> {
    return this.request(`/affiliate/applications/${encodeURIComponent(id)}/review`, {
      method: 'POST',
      body: JSON.stringify({ approve, note }),
    })
  }

  // ------- Invoices -------
  async getInvoices(): Promise<any> {
    return this.request('/subscriptions/invoices')
  }

  async downloadInvoice(invoiceId: string): Promise<any> {
    return this.request(`/subscriptions/invoices/${encodeURIComponent(invoiceId)}/download`)
  }

  // ------- Brand Invites -------
  async getBrandInvites(params?: Record<string, any>): Promise<any> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ''
    return this.request(`/brand-invites${queryString}`)
  }

  async createBrandInvite(data: { influencerId: string; campaignId?: string; message?: string }): Promise<any> {
    return this.request('/brand-invites', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async cancelBrandInvite(id: string): Promise<any> {
    return this.request(`/brand-invites/${encodeURIComponent(id)}`, { method: 'DELETE' })
  }

  // ------- Team / Org -------
  async getTeamMembers(orgId?: string): Promise<any> {
    const query = orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''
    return this.request(`/orgs/members${query}`)
  }

  async inviteTeamMember(email: string, orgId?: string): Promise<any> {
    return this.request('/orgs/invites', {
      method: 'POST',
      body: JSON.stringify({ email, ...(orgId ? { orgId } : {}) }),
    })
  }

  async removeTeamMember(memberId: string): Promise<any> {
    return this.request(`/orgs/members/${encodeURIComponent(memberId)}`, { method: 'DELETE' })
  }

  async getMediaLibrary(type?: string): Promise<any> {
    const query = type ? `?type=${encodeURIComponent(type)}` : ''
    return this.request(`/media/library${query}`)
  }

  async startMediaUpload(data: { mime: string; size_bytes: number; width?: number; height?: number }): Promise<any> {
    return this.request('/media/uploads', { method: 'POST', body: JSON.stringify(data) })
  }

  async completeMediaUpload(blobId: string): Promise<any> {
    return this.request(`/media/${encodeURIComponent(blobId)}/complete`, { method: 'POST', body: JSON.stringify({}) })
  }

  // ------- Generic -------
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint)
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async patch<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  // ------- Password reset / email verification -------
  async forgotPassword(email: string): Promise<any> {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  async resetPassword(token: string, password: string): Promise<any> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    })
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<any> {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  }

  async resendEmailOtp(email: string): Promise<any> {
    return this.request('/auth/resend-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  async verifyEmail(email: string, code: string): Promise<any> {
    return this.request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    })
  }

  // ------- Subscriptions (App Store compliant) -------
  async getSubscriptionStatus(): Promise<any> {
    return this.request('/subscriptions/status')
  }

  async getSubscriptionPricing(): Promise<any> {
    return this.request('/subscriptions/pricing')
  }

  async startTrial(): Promise<any> {
    return this.request('/subscriptions/start-trial', {
      method: 'POST',
      body: JSON.stringify({}),
    })
  }

  async syncSubscription(): Promise<any> {
    return this.request('/subscriptions/sync', {
      method: 'POST',
      body: JSON.stringify({}),
    })
  }

  async createSubscription(data: { plan: string; currency?: 'INR' | 'USD' }): Promise<any> {
    return this.request('/subscriptions/create', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async cancelSubscription(): Promise<any> {
    return this.request('/subscriptions/cancel', { method: 'POST' })
  }

  async retrySubscription(): Promise<any> {
    return this.request('/subscriptions/retry', { method: 'POST' })
  }

  async changeSubscriptionPlan(plan: string): Promise<any> {
    return this.request('/subscriptions/change-plan', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    })
  }

  // ------- Onboarding -------
  // Unified step-save: mirrors getcollab web OnboardingService.patch.
  // The legacy /onboarding/brand/* and /onboarding/influencer/* step
  // endpoints were removed from the Go backend — everything flows through
  // PATCH /onboarding ({ role?, step?, patch }) now.
  async patchOnboarding(body: { role?: string; step?: string; patch: Record<string, unknown> }): Promise<any> {
    return this.request('/onboarding', {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  }

  async completeOnboarding(role?: string): Promise<any> {
    return this.request('/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify(role ? { role } : {}),
    })
  }

  async resetOnboarding(): Promise<any> {
    return this.request('/onboarding/reset', { method: 'POST', body: JSON.stringify({}) })
  }

  // ------- Chat image upload + invitations -------
  async uploadChatImage(base64Image: string): Promise<any> {
    return this.request('/chat/upload', {
      method: 'POST',
      body: JSON.stringify({ image: base64Image }),
    })
  }

  /** influencerId is the creator's profile id. /campaigns/{id}/invite does
   *  not exist; invites live under /deals. */
  async inviteCreatorToCampaign(campaignId: string, influencerId: string, message?: string): Promise<any> {
    return this.request('/deals/invites', {
      method: 'POST',
      body: JSON.stringify({ influencerId, campaignId, message: message ?? '' }),
    })
  }

  // ------- Internal: token refresh -------
  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise
    this.refreshPromise = this.doRefresh().finally(() => {
      this.refreshPromise = null
    })
    return this.refreshPromise
  }

  private async doRefresh(): Promise<string | null> {
    try {
      const refreshToken = await this.getRefreshToken()
      if (!refreshToken) return null

      const deviceId = await getOrCreateDeviceId()
      const response = await fetchWithTimeout(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': deviceId,
          'X-Refresh-Token': refreshToken,
        },
      })

      if (!response.ok) return null

      const data = await response.json()
      const newToken = data.access_token || data.token || data.accessToken || data?.tokens?.accessToken
      const newRefreshToken = data.refresh_token || data.refreshToken || data?.tokens?.refreshToken

      if (newToken) {
        await this.setToken(newToken)
        if (newRefreshToken) {
          await this.setRefreshToken(newRefreshToken)
        }
        return newToken
      }
      return null
    } catch (error) {
      logger.error('Failed to refresh token', error)
      return null
    }
  }

  private async handleLogout(): Promise<void> {
    await this.clearTokens()
    if (this.onUnauthorized) {
      this.onUnauthorized()
    }
  }
}

export const apiService = new ApiService()

export const handleApiError = (error: any, defaultMessage: string = 'Something went wrong. Try again.') => {
  if (isUnauthorizedError(error?.message)) {
    return 'UNAUTHORIZED'
  }
  const message = error?.message || defaultMessage
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
  Alert.alert('Error', message)
  return message
}

export const showSignInError = (error: any, onSignUp: () => void) => {
  if (isUnauthorizedError(error?.message)) {
    Alert.alert('Session expired', 'Sign in again to continue.')
    return
  }

  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
  const message = error?.message || ''
  const isLockout = message.toLowerCase().includes('too many') || message.toLowerCase().includes('locked')
  if (isLockout) {
    Alert.alert('Sign in blocked', message)
    return
  }

  Alert.alert(
    "Couldn't sign in",
    'Check your email and password, or sign up.',
    [
      { text: 'OK', onPress: onSignUp },
    ],
  )
}

export const showSuccessMessage = (message: string) => {
  Alert.alert('Success', message)
}

// Direct-to-object-store upload: start (presigned PUT) → PUT bytes →
// complete (enqueue scan). Uses raw fetch for the PUT because the signed
// URL is outside the API base and must not carry auth/JSON headers.
export async function uploadMediaBlob(input: { uri: string; mime: string; sizeBytes: number; width?: number; height?: number }): Promise<any> {
  const started = await apiService.startMediaUpload({
    mime: input.mime,
    size_bytes: Math.max(0, Math.round(input.sizeBytes || 0)),
    width: input.width,
    height: input.height,
  })
  const blobId = started?.blob_id || started?.blobId || started?.id
  const url = started?.url
  if (!blobId || !url) throw new Error("Couldn't start the upload. Try again.")
  const fileRes = await fetch(input.uri)
  const blob = await fileRes.blob()
  const putRes = await fetch(url, {
    method: started?.method || 'PUT',
    headers: { 'Content-Type': input.mime },
    body: blob as any,
  })
  if (!putRes.ok) throw new Error("Couldn't upload the file. Try again.")
  return apiService.completeMediaUpload(String(blobId))
}

export default apiService
