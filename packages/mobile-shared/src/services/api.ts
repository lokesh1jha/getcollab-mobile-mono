import { Alert } from 'react-native'
import * as SecureStore from 'expo-secure-store'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
const TOKEN_KEY = 'getcollab_auth_token'
const REFRESH_TOKEN_KEY = 'getcollab_refresh_token'

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
      console.error('Failed to get token from SecureStore:', error)
      return null
    }
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
    } catch (error) {
      console.error('Failed to get refresh token from SecureStore:', error)
      return null
    }
  }

  async setToken(token: any): Promise<void> {
    try {
      const value = this.extractTokenString(token)
      if (!value) return
      await SecureStore.setItemAsync(TOKEN_KEY, value)
    } catch (error) {
      console.error('Failed to store token in SecureStore:', error)
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
      console.error('Failed to store refresh token:', error)
    }
  }

  async clearTokens(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY)
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
    } catch (error) {
      console.error('Failed to clear tokens:', error)
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

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type')

    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('API Server is under maintenance. Please try again later.')
    }

    let data: any
    try {
      const text = await response.text()
      data = JSON.parse(text)
    } catch (e) {
      throw new Error('API Server is under maintenance. Please try again later.')
    }

    if (!response.ok) {
      if (response.status === 401) {
        await this.clearTokens()
        if (this.onUnauthorized) {
          this.onUnauthorized()
        }
        throw new Error('UNAUTHORIZED')
      }

      const errorMessage = data.error || data.message || 'Something went wrong'
      throw new Error(errorMessage)
    }

    if (data && typeof data === 'object') {
      data = this.sanitizeResponse(data)
    }

    if (data && data.tokens) {
      if (data.tokens.accessToken) data.token = data.tokens.accessToken
      if (data.tokens.refreshToken) data.refreshToken = data.tokens.refreshToken
    }

    if (data && data.data && data.data.user && !data.user) {
      data.user = data.data.user
    }

    return data
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const token = await this.getToken()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
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
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    try {
      response = await fetch(url, { ...config, signal: controller.signal })
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
            const retryResponse = await fetch(url, { ...config, headers })
            return await this.handleResponse<T>(retryResponse)
          }
        }
        await this.handleLogout()
        throw new Error('UNAUTHORIZED')
      }

      return await this.handleResponse<T>(response)
    } catch (error) {
      if (error instanceof Error && error.message !== 'UNAUTHORIZED') {
        try {
          const { logger } = await import('./logger')
          logger.error(`API ${options.method || 'GET'} ${endpoint}`, error, { url })
        } catch {
          console.error('API Error:', error)
        }
      }
      throw error
    }
  }

  // ------- Auth -------
  async signup(data: SignupData): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>('/auth/register', {
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

  async sendChatMessage(roomId: string, content: string, type: string = 'text'): Promise<any> {
    return this.request('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ roomId, content, type }),
    })
  }

  async createDirectChat(influencerId: string, campaignId?: string): Promise<any> {
    return this.request('/chat/direct', {
      method: 'POST',
      body: JSON.stringify({ influencerId, campaignId }),
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
    return this.request('/settings/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    })
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

  async uploadImage(base64Image: string): Promise<any> {
    return this.request('/profile/upload', {
      method: 'POST',
      body: JSON.stringify({ image: base64Image }),
    })
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
  async getSettings(): Promise<any> {
    return this.request('/settings')
  }

  async updateSettings(data: any): Promise<any> {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async updateNotificationSettings(data: any): Promise<any> {
    return this.request('/settings/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ------- Notifications -------
  async getNotifications(): Promise<any> {
    return this.request('/notifications')
  }

  async markNotificationAsRead(id: string): Promise<any> {
    return this.request(`/notifications/${id}/read`, { method: 'POST' })
  }

  async markAllNotificationsAsRead(): Promise<any> {
    return this.request('/notifications/read-all', { method: 'POST' })
  }

  // ------- Earnings (Settlement history) -------
  async getEarnings(): Promise<any> {
    return this.request('/earnings')
  }

  async getSettlements(): Promise<any> {
    // Settlements module was removed in favor of a subscription-only model.
    // Earnings history is served from /earnings now.
    return this.request('/earnings')
  }

  async requestPayout(data: { amount: number; message: string; campaignId?: string }): Promise<any> {
    // No dedicated settlement endpoint exists. Route payout requests through
    // the support module so the team can action them out-of-band.
    return this.request('/disputes', {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Payout Request',
        description: `Payout request: ₹${data.amount}. ${data.message}`.trim(),
        campaignId: data.campaignId,
      }),
    })
  }

  // ------- Disputes -------
  async getDisputes(): Promise<any> {
    return this.request('/disputes')
  }

  async createDispute(data: { campaignId?: string; reason: string; description: string; respondentId?: string }): Promise<any> {
    return this.request('/disputes', {
      method: 'POST',
      body: JSON.stringify(data),
    })
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

  async sendVerificationEmail(): Promise<any> {
    return this.request('/auth/send-verification', { method: 'POST' })
  }

  async verifyEmail(token: string): Promise<any> {
    return this.request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  }

  // ------- Subscriptions (App Store compliant) -------
  async getSubscriptionStatus(): Promise<any> {
    return this.request('/subscriptions/mobile-status')
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
  async submitBrandOnboardingStep1(data: any): Promise<any> {
    return this.request('/onboarding/brand/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async submitBrandOnboardingStep2(data: any): Promise<any> {
    return this.request('/onboarding/brand/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async submitBrandOnboardingStep3(data: any): Promise<any> {
    return this.request('/onboarding/brand/scale', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async submitInfluencerOnboardingStep1(data: any): Promise<any> {
    return this.request('/onboarding/influencer/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async submitInfluencerOnboardingStep2(data: any): Promise<any> {
    return this.request('/onboarding/influencer/socials', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ------- Chat image upload + invitations -------
  async uploadChatImage(base64Image: string): Promise<any> {
    return this.request('/chat/upload', {
      method: 'POST',
      body: JSON.stringify({ image: base64Image }),
    })
  }

  async inviteCreatorToCampaign(campaignId: string, influencerId: string, message?: string): Promise<any> {
    return this.request(`/campaigns/${campaignId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ influencerId, message }),
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

      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) return null

      const data = await response.json()
      const newToken = data.token || data.accessToken || data?.tokens?.accessToken
      const newRefreshToken = data.refreshToken || data?.tokens?.refreshToken

      if (newToken) {
        await this.setToken(newToken)
        if (newRefreshToken) {
          await this.setRefreshToken(newRefreshToken)
        }
        return newToken
      }
      return null
    } catch (error) {
      console.error('Failed to refresh token:', error)
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

export const handleApiError = (error: any, defaultMessage: string = 'An error occurred') => {
  if (error?.message === 'UNAUTHORIZED') {
    return 'UNAUTHORIZED'
  }
  const message = error?.message || defaultMessage
  Alert.alert('Error', message)
  return message
}

export const showSuccessMessage = (message: string) => {
  Alert.alert('Success', message)
}

export default apiService
