import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '@/src/theme'
import { useChatStore } from '@shared/stores/chat-store'
import { useSubscriptionStore } from '../stores/subscription-store'

import BrandDashboard from '../app/(main)/brand/dashboard'
import BrandCampaigns from '../app/(main)/brand/campaigns'
import BrandCampaignDetails from '../app/(main)/brand/campaigns/[id]'
import CampaignAnalytics from '../app/(main)/brand/campaigns/[id]/analytics'
import CampaignEdit from '../app/(main)/brand/campaigns/[id]/edit'
import CampaignDiscover from '../app/(main)/brand/campaigns/[id]/discover'
import CampaignResponses from '../app/(main)/brand/campaigns/[id]/responses'
import CampaignExecute from '../app/(main)/brand/campaigns/[id]/execute'
import DealReview from '../app/(main)/brand/deals/[id]'
import CampaignOutreach from '../app/(main)/brand/campaigns/[id]/outreach'
import CampaignEscrow from '../app/(main)/brand/campaigns/[id]/escrow'
import CampaignCircle from '../app/(main)/brand/campaigns/[id]/circle'
import CreateCampaign from '../app/(main)/brand/campaigns/create'
import BrandChat from '../app/(main)/brand/chat'
import ChatDetail from '../app/(main)/brand/chat-detail/[id]'
import BrandBids from '../app/(main)/brand/bids'
import BrowseCreators from '../app/(main)/brand/creators'
import CreatorReport from '../app/(main)/brand/creators/[id]/report'
import AnalyticsScreen from '../app/(main)/brand/analytics'
import InviteCreator from '../app/(main)/brand/invite-creator'
import BrandProfile from '../app/(main)/brand/profile'
import WalletScreen from '../app/(main)/brand/wallet'
import RelationshipsScreen from '../app/(main)/brand/relationships'
import RelationshipDetailScreen from '../app/(main)/brand/relationships/[id]'
import InvitesScreen from '../app/(main)/brand/invites'
import AffiliateProgramsScreen from '../app/(main)/brand/affiliate'
import AffiliateLinksScreen from '../app/(main)/brand/affiliate/links'
import AffiliateCommissionsScreen from '../app/(main)/brand/affiliate/commissions'
import AffiliateDetailScreen from '../app/(main)/brand/affiliate/[id]'
import GrowthScreen from '../app/(main)/brand/growth'
import GrowthSetupScreen from '../app/(main)/brand/growth/setup'
import GrowthSeoScreen from '../app/(main)/brand/growth/seo'
import GrowthSearchConsoleScreen from '../app/(main)/brand/growth/search-console'
import GrowthAiVisibilityScreen from '../app/(main)/brand/growth/ai-visibility'
import GrowthOpportunitiesScreen from '../app/(main)/brand/growth/opportunities'
import GrowthRecommendationsScreen from '../app/(main)/brand/growth/recommendations'
import InvoicesScreen from '../app/(main)/brand/invoices'
import DisputesScreen from '../app/(main)/disputes'
import SettingsScreen from '../app/(main)/settings'
import ProfileSettingsScreen from '../app/(main)/settings/profile'
import AccountSettingsScreen from '../app/(main)/settings/account'
import SecuritySettingsScreen from '../app/(main)/settings/security'
import TeamSettingsScreen from '../app/(main)/settings/team'
import BillingSettingsScreen from '../app/(main)/settings/billing'
import NotificationsSettingsScreen from '../app/(main)/settings/notifications'
import NotificationsScreen from '../app/(main)/notifications'
import SubscriptionScreen from '../app/(main)/subscription'
import VerifyEmailScreen from '../app/(main)/verify-email'
import ChangePasswordScreen from '../app/(main)/change-password'
import OnboardingScreen from '../app/(main)/onboarding'
import ProfilePreviewScreen from '../app/(main)/profile-preview'
import { AuthGate } from './AuthGate'
import { useSubscriptionBackgroundRefresh } from '../stores/subscription-store'
import * as Haptics from 'expo-haptics'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

// Screens draw their own large title, so the native bar carries only the back
// button — one title per screen. Screens without an in-screen title override it.
const stackHeaderOptions = {
  headerTitle: '',
  headerBackButtonDisplayMode: 'minimal' as const,
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.text,
  headerTitleStyle: { fontSize: 15, fontWeight: '700' as const },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bg },
}

const tabIndicatorStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  activeBg: {
    width: 40,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.blue,
  },
})

function ActiveTabIndicator() {
  return (
    <View style={tabIndicatorStyles.wrapper}>
      <View style={tabIndicatorStyles.activeBg}>
        <View style={tabIndicatorStyles.dot} />
      </View>
    </View>
  )
}

function MainTabsNavigator() {
  const unreadByRoom = useChatStore((s) => s.unreadByRoom)
  const totalUnread = Object.values(unreadByRoom).reduce((sum, n) => sum + n, 0)
  // Real home-indicator / gesture-bar inset instead of a per-OS guess.
  const bottomInset = Math.max(useSafeAreaInsets().bottom, 8)

  return (
    <Tab.Navigator
            screenListeners={{ tabPress: () => { Haptics.selectionAsync() } }}
            screenOptions={{
              tabBarActiveTintColor: colors.blue,
              tabBarInactiveTintColor: colors.textMuted,
              tabBarStyle: {
                backgroundColor: colors.bg,
                borderTopColor: colors.border,
                borderTopWidth: 1,
                height: 60 + bottomInset,
                paddingBottom: bottomInset,
                paddingTop: 8,
              },
              tabBarLabelStyle: {
                fontSize: 10,
                fontWeight: '600' as const,
                letterSpacing: 0.2,
              },
              headerShown: false,
            }}
          >
            <Tab.Screen
              name="Dashboard"
              component={BrandDashboard}
              options={{
                tabBarLabel: 'Dashboard',
                tabBarAccessibilityLabel: 'Dashboard tab',
                tabBarIcon: ({ color, focused }) => (
                  <View>
                    {focused && <ActiveTabIndicator />}
                    <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} style={{ marginTop: 20 }} />
                  </View>
                ),
              }}
            />
            <Tab.Screen
              name="Campaigns"
              component={BrandCampaigns}
              options={{
                tabBarLabel: 'Campaigns',
                tabBarAccessibilityLabel: 'Campaigns tab',
                tabBarIcon: ({ color, focused }) => (
                  <View>
                    {focused && <ActiveTabIndicator />}
                    <Ionicons name={focused ? 'megaphone' : 'megaphone-outline'} size={22} color={color} style={{ marginTop: 20 }} />
                  </View>
                ),
              }}
            />
            <Tab.Screen
              name="Creators"
              component={BrowseCreators}
              options={{
                tabBarLabel: 'Creators',
                tabBarAccessibilityLabel: 'Creators tab',
                tabBarIcon: ({ color, focused }) => (
                  <View>
                    {focused && <ActiveTabIndicator />}
                    <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} style={{ marginTop: 20 }} />
                  </View>
                ),
              }}
            />
            <Tab.Screen
              name="Chat"
              component={BrandChat}
              options={{
                tabBarLabel: 'Messages',
                tabBarAccessibilityLabel: 'Messages tab',
                tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
                tabBarBadgeStyle: { backgroundColor: colors.blue, fontSize: 10, fontWeight: '700', minWidth: 18, height: 18, lineHeight: 18 },
                tabBarIcon: ({ color, focused }) => (
                  <View>
                    {focused && <ActiveTabIndicator />}
                    <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={22} color={color} style={{ marginTop: 20 }} />
                  </View>
                ),
              }}
            />
            <Tab.Screen
              name="Profile"
              component={BrandProfile}
              options={{
                tabBarLabel: 'Profile',
                tabBarAccessibilityLabel: 'Profile tab',
                tabBarIcon: ({ color, focused }) => (
                  <View>
                    {focused && <ActiveTabIndicator />}
                    <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} style={{ marginTop: 20 }} />
                  </View>
                ),
              }}
            />
          </Tab.Navigator>
  )
}

function BrandStackInner() {
  const fetchRooms = useChatStore((s) => s.fetchRooms)
  const fetchSubscription = useSubscriptionStore((s) => s.fetchStatus)
  const initialised = useRef(false)

  useSubscriptionBackgroundRefresh()

  useEffect(() => {
    if (initialised.current) return
    initialised.current = true
    fetchRooms()
    fetchSubscription()
  }, [fetchRooms, fetchSubscription])

  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="MainTabs" component={MainTabsNavigator} options={{ headerShown: false }} />

      <Stack.Screen
        name="CampaignDetails"
        component={BrandCampaignDetails}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="ChatDetail"
        component={ChatDetail}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Bids"
        component={BrandBids}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="CampaignAnalytics"
        component={CampaignAnalytics}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="CampaignEdit"
        component={CampaignEdit}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="CampaignDiscover"
        component={CampaignDiscover}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="CampaignResponses"
        component={CampaignResponses}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="CampaignExecute"
        component={CampaignExecute}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="DealReview"
        component={DealReview}
        options={stackHeaderOptions}
      />
      {/* Notification deep links (/dashboard/collaborations/{id}) resolve to
          "Collaborations"; on the brand app that is the deal review. */}
      <Stack.Screen
        name="Collaborations"
        component={DealReview}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="CampaignOutreach"
        component={CampaignOutreach}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="CampaignEscrow"
        component={CampaignEscrow}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="CampaignCircle"
        component={CampaignCircle}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="CreateCampaign"
        component={CreateCampaign}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="InviteCreator"
        component={InviteCreator}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="Disputes"
        component={DisputesScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileSettingsScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="Account"
        component={AccountSettingsScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="Security"
        component={SecuritySettingsScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="Team"
        component={TeamSettingsScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="Billing"
        component={BillingSettingsScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationsSettingsScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="VerifyEmail"
        component={VerifyEmailScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProfilePreview"
        component={ProfilePreviewScreen}
        options={{ ...stackHeaderOptions, headerTitle: 'Public profile' }}
      />
      <Stack.Screen
        name="Wallet"
        component={WalletScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="Relationships"
        component={RelationshipsScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="RelationshipDetail"
        component={RelationshipDetailScreen}
        options={{ ...stackHeaderOptions, headerTitle: 'Relationship' }}
      />
      <Stack.Screen
        name="Invites"
        component={InvitesScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="Affiliate"
        component={AffiliateProgramsScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="AffiliateDetail"
        component={AffiliateDetailScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="AffiliateLinks"
        component={AffiliateLinksScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="AffiliateCommissions"
        component={AffiliateCommissionsScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="CreatorReport"
        component={CreatorReport}
        options={{ ...stackHeaderOptions, headerTitle: 'Creator report' }}
      />
      <Stack.Screen
        name="Growth"
        component={GrowthScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="GrowthSetup"
        component={GrowthSetupScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="GrowthSeo"
        component={GrowthSeoScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="GrowthSearchConsole"
        component={GrowthSearchConsoleScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="GrowthAiVisibility"
        component={GrowthAiVisibilityScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="GrowthOpportunities"
        component={GrowthOpportunitiesScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="GrowthRecommendations"
        component={GrowthRecommendationsScreen}
        options={stackHeaderOptions}
      />
      <Stack.Screen
        name="Invoices"
        component={InvoicesScreen}
        options={stackHeaderOptions}
      />
    </Stack.Navigator>
  )
}

function BrandStack() {
  return (
    <AuthGate>
      <BrandStackInner />
    </AuthGate>
  )
}

export default function MainTabs() {
  return <BrandStack />
}
