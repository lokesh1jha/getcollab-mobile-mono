// API Configuration - use apiService singleton for actual calls
// These are now derived from environment variables in api.ts
// Kept here for reference but should not be used directly
// export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
// export const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3000'

// Colors — Linear design system, matches web globals.css dark theme
export const colors = {
  // Primary — Linear indigo
  primary: '#5e6ad2',
  primaryDark: '#4a55c0',
  primaryLight: '#7b85dc',

  // Secondary
  secondary: '#141516',
  secondaryDark: '#0f1011',
  secondaryLight: '#18191a',

  // Accent
  accent: '#5e6ad2',
  accentDark: '#4a55c0',
  accentLight: '#7b85dc',

  // Backgrounds — Linear canvas ladder
  background: '#010102',
  backgroundGradient: ['#0f1011', '#010102'],
  backgroundLight: '#0f1011',

  // Surfaces
  surface: '#0f1011',
  surfaceLight: '#141516',
  surfaceGradient: ['#141516', '#0f1011'],

  // Text
  text: '#f7f8f8',
  textMuted: '#8a8f98',
  textDark: '#4a4f5a',

  // Social media
  instagram: '#E1306C',
  youtube: '#FF0000',
  tiktok: '#ffffff',
  twitter: '#1DA1F2',

  // UI structure
  border: '#23252a',
  borderLight: '#2e3138',

  // Status
  error: '#e5484d',
  errorDark: '#c83f44',
  success: '#27a644',
  successDark: '#1e8436',
  warning: '#F59E0B',
  warningDark: '#D97706',
  info: '#3B82F6',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Gradients
  gradient1: ['#5e6ad2', '#7b85dc'],
  gradient2: ['#4a55c0', '#5e6ad2'],
  gradient3: ['#7b85dc', '#5e6ad2'],
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

// Content languages an influencer can create in.
// Label is shown in UI; code is stored (BCP 47).
export const CONTENT_LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'or', label: 'Odia' },
  { code: 'as', label: 'Assamese' },
  { code: 'ur', label: 'Urdu' },
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
