// API Configuration - use apiService singleton for actual calls
// These are now derived from environment variables in api.ts
// Kept here for reference but should not be used directly
// export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
// export const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3000'

// Colors - trendy influencer-focused design system
export const colors = {
  // Primary gradient colors
  primary: '#8B5CF6', // Vibrant Purple
  primaryDark: '#7C3AED',
  primaryLight: '#A78BFA',
  
  // Secondary gradient colors
  secondary: '#EC4899', // Hot Pink
  secondaryDark: '#DB2777',
  secondaryLight: '#F472B6',
  
  // Accent colors
  accent: '#06B6D4', // Cyan
  accentDark: '#0891B2',
  accentLight: '#22D3EE',
  
  // Background gradients
  background: '#0F172A', // Deep Navy
  backgroundGradient: ['#1E293B', '#0F172A'],
  backgroundLight: '#1E293B',
  
  // Surface with gradient effect
  surface: '#1E293B',
  surfaceLight: '#334155',
  surfaceGradient: ['#334155', '#1E293B'],
  
  // Text colors
  text: '#F1F5F9', // Light Gray
  textMuted: '#94A3B8', // Muted Gray
  textDark: '#64748B',
  
  // Social media inspired colors
  instagram: '#E1306C',
  youtube: '#FF0000',
  tiktok: '#000000',
  twitter: '#1DA1F2',
  
  // UI elements
  border: '#334155',
  borderLight: '#475569',
  
  // Status colors
  error: '#EF4444',
  errorDark: '#DC2626',
  success: '#10B981',
  successDark: '#059669',
  warning: '#F59E0B',
  warningDark: '#D97706',
  info: '#3B82F6',
  
  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  
  // Gradient stops for trendy effects
  gradient1: ['#8B5CF6', '#EC4899'],
  gradient2: ['#06B6D4', '#8B5CF6'],
  gradient3: ['#F472B6', '#8B5CF6'],
}

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}

// Typography - Modern, bold typography for influencer app
export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '800' as const, // Extra bold
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700' as const, // Bold
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 24,
    fontWeight: '700' as const, // Bold
    lineHeight: 32,
    letterSpacing: -0.2,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const, // Semi-bold
    lineHeight: 28,
    letterSpacing: -0.1,
  },
  body: {
    fontSize: 16,
    fontWeight: '500' as const, // Medium
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const, // Regular
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const, // Regular
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  // Influencer-style typography
  display: {
    fontSize: 40,
    fontWeight: '900' as const, // Black
    lineHeight: 48,
    letterSpacing: -1,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const, // Semi-bold
    lineHeight: 24,
    letterSpacing: 0.3,
  },
}

// Border Radius
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
}

// Shadows
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
}

// Campaign Regions
export const REGIONS = [
  'All India',
  'Delhi',
  'Mumbai',
  'Bangalore',
  'Chennai',
  'Kolkata',
  'Hyderabad',
  'Pune',
  'Ahmedabad',
  'Jaipur',
  'Other',
]

// Campaign Deliverables
export const DELIVERABLES = [
  'Instagram Post',
  'Instagram Story',
  'Instagram Reel',
  'YouTube Video',
  'YouTube Shorts',
  'TikTok Video',
  'Twitter Post',
  'Facebook Post',
  'Blog Post',
  'Other',
]

// Influencer Categories
export const CATEGORIES = [
  'Fashion',
  'Beauty',
  'Lifestyle',
  'Food',
  'Travel',
  'Fitness',
  'Technology',
  'Gaming',
  'Education',
  'Business',
  'Entertainment',
  'Sports',
  'Health',
  'Parenting',
  'Photography',
  'Art & Design',
]

// Coin Packages for purchase
export const COIN_PACKAGES = [
  { id: '1', coins: 10, price: 100, bonus: 0 },
  { id: '2', coins: 50, price: 450, bonus: 5 },
  { id: '3', coins: 100, price: 850, bonus: 15 },
  { id: '4', coins: 500, price: 4000, bonus: 100 },
  { id: '5', coins: 1000, price: 7500, bonus: 250 },
]

// Notification Types
export const NOTIFICATION_TYPES = {
  NEW_BID: 'new_bid',
  BID_ACCEPTED: 'bid_accepted',
  BID_REJECTED: 'bid_rejected',
  NEW_MESSAGE: 'new_message',
  CAMPAIGN_DEADLINE: 'campaign_deadline',
  PAYMENT_RECEIVED: 'payment_received',
  PROFILE_VIEW: 'profile_view',
  SYSTEM: 'system',
}
