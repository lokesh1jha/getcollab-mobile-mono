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

export type ChatAttachmentType = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'ARCHIVE' | 'CODE' | 'OTHER'

export interface ChatAttachment {
  id: string
  type: ChatAttachmentType
  url: string
  fileName: string
  mimeType: string
  fileSize: number
}

export interface Message {
  id: string
  content: string
  senderId: string
  roomId: string
  createdAt: string
  type?: 'text' | 'image' | 'file'
  attachmentUrl?: string
  attachments?: ChatAttachment[]
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

// Wallet
export interface WalletSummary {
  balance_minor: number
  held_minor: number
  reserved_minor?: number
  available_minor: number
  currency: string
}

export interface WalletTransaction {
  id: string
  account_id: string
  deal_id?: string | null
  milestone_id?: string | null
  amount_minor: number
  currency: string
  entry_type: string
  idempotency_key?: string | null
  memo: string
  created_by?: string | null
  created_at: string
}

// Relationships
export interface Relationship {
  id: string
  otherParty?: {
    id: string
    name: string
    image?: string
  }
  status: string
  totalCollaborations: number
  totalSpend?: number
  averageRating?: number
  lastInteractionAt?: string
  lastCampaign?: string
}

export interface RelationshipDetail extends Relationship {
  collaborations?: Array<{
    id: string
    campaignTitle: string
    status: string
    startDate?: string
    endDate?: string
  }>
  timeline?: Array<{
    type: string
    createdAt: string
    description?: string
  }>
}

// Invoices
export interface Invoice {
  id: string
  amount: number
  currency: string
  status: string
  description?: string
  createdAt: string
  paidAt?: string
  pdfUrl?: string
}

// Affiliate
export interface RewardRule {
  eventType: string
  rewardType: string
  rewardValue: number
  threshold?: number
  currency?: string
  platformShareBps?: number
}

export interface AffiliateProgram {
  id: string
  name: string
  description: string
  ownerType: string
  fundingSource: string
  screeningMode: string
  status: string
  haltReason?: string | null
  attributionWindowDays: number
  currency: string
  productName: string
  destinationUrl: string
  terms: string
  budget?: {
    totalMinor: number
    reservedMinor: number
    consumedMinor: number
    reservationId?: string | null
  }
  rewardRules?: RewardRule[]
}

export interface AffiliateLink {
  id: string
  programId: string
  influencerId: string
  code: string
  url: string
  status: string
}

export interface AffiliateReward {
  id: string
  programId: string
  status: string
  amountMinor: number
  currency: string
  rejectReason?: string | null
  createdAt: string
}

// Team
export interface TeamMember {
  id: string
  userId: string
  name: string
  email: string
  image?: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
}

export interface TeamInvite {
  id: string
  email: string
  role: string
  status: string
  createdAt: string
}

// Brand Invites
export interface BrandInvite {
  id: string
  influencerId: string
  influencerName?: string
  campaignId?: string
  campaignTitle?: string
  message?: string
  status: string
  createdAt: string
}
