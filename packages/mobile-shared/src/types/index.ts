// User & Role Types
export type UserRole = 'brand' | 'influencer' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  image?: string
  role: UserRole
  phoneNumbers?: string[]
  emailVerified?: boolean
  createdAt?: string
  onboardingCompleted?: boolean
  onboardingCurrentStep?: string | null
  termsAcceptedAt?: string | null
  subscription?: Subscription | null
  [key: string]: any
}

export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'PENDING' | 'NONE'

export interface Subscription {
  id?: string
  status: SubscriptionStatus
  plan?: string
  billing?: string
  trialEndsAt?: string
  currentPeriodStart?: string
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  cancelledAt?: string
  inGracePeriod?: boolean
  graceEndsAt?: string
  daysRemaining?: number | null
  amount?: number
  currency?: 'INR' | 'USD'
}

// Influencer Profile
export interface SocialMetrics {
  followers?: number
  avgLikesPerPost?: number
  avgLikesPerReel?: number
  avgReelViews?: number
  avgViews?: number
  avgEngagement?: number
}

export interface InfluencerProfile {
  id: string
  bio: string
  categories: string[]
  portfolioUrl?: string
  instagramHandle?: string
  youtubeHandle?: string
  tiktokHandle?: string
  twitterHandle?: string
  facebookHandle?: string
  instagramMetrics?: SocialMetrics
  youtubeMetrics?: SocialMetrics
  tiktokMetrics?: SocialMetrics
  twitterMetrics?: SocialMetrics
  facebookMetrics?: SocialMetrics
}

// Campaign Types
export type CampaignStatus = 'draft' | 'active' | 'completed' | 'cancelled'

export interface Campaign {
  id: string
  title: string
  description: string
  region: string
  budget: number
  deliverables: string[]
  startDate: string
  endDate: string
  status: CampaignStatus
  brandId: string
  brand?: {
    id: string
    name: string
    image?: string
  }
  bidCount: number
  createdAt: string
}

export interface CampaignWithBids extends Campaign {
  bids: Bid[]
}

// Bid Types
export type BidStatus = 'pending' | 'accepted' | 'rejected'

export interface Bid {
  id: string
  pitch: string
  status: BidStatus
  campaignId: string
  campaign?: Campaign
  influencerId: string
  influencer?: {
    id: string
    name: string
    email: string
    image?: string
  }
  createdAt: string
}

// Chat Types
export interface ChatRoom {
  id: string
  campaignId: string
  campaign?: {
    id: string
    title: string
  }
  brandId: string
  brand?: {
    id: string
    name: string
    email: string
    image?: string
  }
  influencerId: string
  influencer?: {
    id: string
    name: string
    email: string
    image?: string
  }
  lastMessage?: Message
  createdAt: string
}

export interface Message {
  id: string
  content: string
  senderId: string
  roomId: string
  createdAt: string
  type?: 'text' | 'image' | 'file'
  attachmentUrl?: string
}

// Influencer Discovery
export interface Platform {
  name: string
  followers: number
  url?: string
}

export interface Influencer {
  id: string
  name: string
  avatar: string
  bio: string
  categories: string[]
  audienceSize: number
  engagementRate: number
  location?: string
  platforms: Platform[]
  verified: boolean
  joinedDate: string
  collabCount?: number
  verifiedCollabCount?: number
  topBrands?: Array<{ name: string; logoUrl?: string }>
  portfolioUrl?: string
}

// Notifications
export interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  data?: Record<string, any>
  createdAt: string
}

// Settings
export interface UserSettings {
  twoFactorEnabled: boolean
  emailNotifications: boolean
  campaignUpdates: boolean
  image?: string
  phoneNumbers: string[]
}

// API Response Types
export interface ApiResponse<T> {
  success?: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// Form Types
export interface SignInFormData {
  email: string
  password: string
}

export interface SignUpFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface CreateCampaignFormData {
  title: string
  description: string
  region: string
  budget: number
  deliverables: string[]
  startDate: string
  endDate: string
}

export interface SubmitBidFormData {
  pitch: string
  campaignId: string
}

export interface UpdateProfileFormData {
  name?: string
  bio?: string
  categories?: string[]
  instagramHandle?: string
  youtubeHandle?: string
  tiktokHandle?: string
  twitterHandle?: string
}

// Earnings & Settlements
export interface Settlement {
  id: string
  campaignId: string
  amount: number
  status: 'pending' | 'paid' | 'rejected'
  message?: string
  createdAt: string
  campaign?: {
    title: string
  }
}

export interface SettlementRequest {
  campaignId: string
  amount: number
  message: string
}

// Disputes
export interface Dispute {
  id: string
  campaignId: string | null
  reason: string
  description: string
  status: 'open' | 'resolved' | 'dismissed'
  resolution?: string
  createdAt: string
  campaign?: {
    title: string
  }
}

export interface CreateDisputeData {
  campaignId?: string
  reason: string
  description: string
}
