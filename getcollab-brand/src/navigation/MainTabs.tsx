import React, { useEffect, useRef } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { colors } from '@shared/constants'
import { useChatStore } from '@shared/stores/chat-store'
import { useSubscriptionStore } from '../stores/subscription-store'

import BrandDashboard from '../app/(main)/brand/dashboard'
import BrandCampaigns from '../app/(main)/brand/campaigns'
import BrandCampaignDetails from '../app/(main)/brand/campaigns/[id]'
import CampaignAnalytics from '../app/(main)/brand/campaigns/[id]/analytics'
import CreateCampaign from '../app/(main)/brand/campaigns/create'
import BrandChat from '../app/(main)/brand/chat'
import ChatDetail from '../app/(main)/brand/chat-detail/[id]'
import BrandBids from '../app/(main)/brand/bids'
import BrowseCreators from '../app/(main)/brand/creators'
import InviteCreator from '../app/(main)/brand/invite-creator'
import BrandProfile from '../app/(main)/brand/profile'
import DisputesScreen from '../app/(main)/disputes'
import SettingsScreen from '../app/(main)/settings'
import NotificationsScreen from '../app/(main)/notifications'
import SubscriptionScreen from '../app/(main)/subscription'
import VerifyEmailScreen from '../app/(main)/verify-email'
import ChangePasswordScreen from '../app/(main)/change-password'
import OnboardingScreen from '../app/(main)/onboarding'
import ProfilePreviewScreen from '../app/(main)/profile-preview'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

function BrandStack() {
  const fetchRooms = useChatStore((s) => s.fetchRooms)
  const fetchSubscription = useSubscriptionStore((s) => s.fetchStatus)
  const unreadByRoom = useChatStore((s) => s.unreadByRoom)
  const totalUnread = Object.values(unreadByRoom).reduce((sum, n) => sum + n, 0)

  const initialised = useRef(false)

  useEffect(() => {
    if (initialised.current) return
    initialised.current = true
    fetchRooms()
    fetchSubscription()
  }, [fetchRooms, fetchSubscription])

  return (
    <Stack.Navigator>
      <Stack.Screen name="MainTabs" options={{ headerShown: false }}>
        {() => (
          <Tab.Navigator
            screenOptions={{
              tabBarActiveTintColor: colors.primary,
              tabBarInactiveTintColor: colors.textMuted,
              tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
              headerShown: false,
            }}
          >
            <Tab.Screen
              name="Dashboard"
              component={BrandDashboard}
              options={{ tabBarLabel: 'Dashboard', tabBarAccessibilityLabel: 'Dashboard tab' }}
            />
            <Tab.Screen
              name="Campaigns"
              component={BrandCampaigns}
              options={{ tabBarLabel: 'Campaigns', tabBarAccessibilityLabel: 'Campaigns tab' }}
            />
            <Tab.Screen
              name="Creators"
              component={BrowseCreators}
              options={{ tabBarLabel: 'Creators', tabBarAccessibilityLabel: 'Creators tab' }}
            />
            <Tab.Screen
              name="Chat"
              component={BrandChat}
              options={{
                tabBarLabel: 'Messages',
                tabBarAccessibilityLabel: 'Messages tab',
                tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
              }}
            />
            <Tab.Screen
              name="Profile"
              component={BrandProfile}
              options={{ tabBarLabel: 'Profile', tabBarAccessibilityLabel: 'Profile tab' }}
            />
          </Tab.Navigator>
        )}
      </Stack.Screen>

      <Stack.Screen
        name="CampaignDetails"
        component={BrandCampaignDetails}
        options={{ headerTitle: 'Campaign Details', headerShown: true, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }}
      />
      <Stack.Screen
        name="ChatDetail"
        component={ChatDetail}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Bids"
        component={BrandBids}
        options={{ headerShown: true, headerTitle: 'Bids', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }}
      />
      <Stack.Screen
        name="CampaignAnalytics"
        component={CampaignAnalytics}
        options={{ headerShown: true, headerTitle: 'Campaign Analytics', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }}
      />
      <Stack.Screen
        name="CreateCampaign"
        component={CreateCampaign}
        options={{ headerShown: true, headerTitle: 'New Campaign', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }}
      />
      <Stack.Screen
        name="InviteCreator"
        component={InviteCreator}
        options={{ headerShown: true, headerTitle: 'Invite Creator', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }}
      />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{ headerShown: true, headerTitle: 'Workspace', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }}
      />
      <Stack.Screen
        name="Disputes"
        component={DisputesScreen}
        options={{ headerShown: true, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: true, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerShown: true, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }}
      />
      <Stack.Screen
        name="VerifyEmail"
        component={VerifyEmailScreen}
        options={{ headerShown: true, headerTitle: 'Verify Email', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ headerShown: true, headerTitle: 'Change Password', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }}
      />
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProfilePreview"
        component={ProfilePreviewScreen}
        options={{ headerShown: true, headerTitle: 'Public Profile', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }}
      />
    </Stack.Navigator>
  )
}

export default function MainTabs() {
  return <BrandStack />
}
