import { NativeStackNavigationProp } from '@react-navigation/native-stack'

export type InfluencerStackParamList = {
  Landing: undefined
  SignIn: { email?: string } | undefined
  SignUp: { email?: string } | undefined
  ForgotPassword: undefined
  ResetPassword: { token?: string } | undefined
  VerifyEmail: { email?: string } | undefined
  Onboarding: undefined
  Main: { screen?: string } | undefined
  MainTabs: undefined
  Dashboard: undefined
  Discover: undefined
  MyCampaigns: undefined
  Chat: undefined
  Profile: undefined
  CampaignDetails: { id: string }
  ChatDetail: { id: string; roomId?: string; chat?: any }
  Earnings: undefined
  Disputes: undefined
  Settings: undefined
  Notifications: undefined
  ChangePassword: undefined
  ProfilePreview: undefined
  Analytics: undefined
  PayoutSettings: undefined
  DealInvites: undefined
  Affiliate: undefined
  Relationships: undefined
  Assets: undefined
  Settlements: undefined
  Collaborations: undefined
  Category: undefined
  ReviewProfile: undefined
  AcceptTerms: undefined
  Terms: undefined
  Privacy: undefined
}

export type InfluencerNavigationProp = NativeStackNavigationProp<InfluencerStackParamList>
