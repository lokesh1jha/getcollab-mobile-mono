import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Platform } from 'react-native'
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
import { AuthGate } from './AuthGate'
import { useAuthRedirect } from './useAuthRedirect'
import { useSubscriptionBackgroundRefresh } from '../stores/subscription-store'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

const TabBarHeight = Platform.OS === 'ios' ? 88 : 70

const stackHeaderOptions = {
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
  useAuthRedirect()
  const unreadByRoom = useChatStore((s) => s.unreadByRoom)
  const totalUnread = Object.values(unreadByRoom).reduce((sum, n) => sum + n, 0)

  return (
    <Tab.Navigator
            screenOptions={{
              tabBarActiveTintColor: colors.blue,
              tabBarInactiveTintColor: colors.textMuted,
              tabBarStyle: {
                backgroundColor: colors.bg,
                borderTopColor: colors.border,
                borderTopWidth: 1,
                height: TabBarHeight,
                paddingBottom: Platform.OS === 'ios' ? 28 : 8,
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
        options={{ headerTitle: 'Campaign Details', ...stackHeaderOptions }}
      />
      <Stack.Screen
        name="ChatDetail"
        component={ChatDetail}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Bids"
        component={BrandBids}
        options={{ headerTitle: 'Bids', ...stackHeaderOptions }}
      />
      <Stack.Screen
        name="CampaignAnalytics"
        component={CampaignAnalytics}
        options={{ headerTitle: 'Campaign Analytics', ...stackHeaderOptions }}
      />
      <Stack.Screen
        name="CreateCampaign"
        component={CreateCampaign}
        options={{ headerTitle: 'New Campaign', ...stackHeaderOptions }}
      />
      <Stack.Screen
        name="InviteCreator"
        component={InviteCreator}
        options={{ headerTitle: 'Invite Creator', ...stackHeaderOptions }}
      />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{ headerTitle: 'Workspace', ...stackHeaderOptions }}
      />
      <Stack.Screen
        name="Disputes"
        component={DisputesScreen}
        options={{ headerTitle: 'Disputes', ...stackHeaderOptions }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerTitle: 'Settings', ...stackHeaderOptions }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerTitle: 'Notifications', ...stackHeaderOptions }}
      />
      <Stack.Screen
        name="VerifyEmail"
        component={VerifyEmailScreen}
        options={{ headerTitle: 'Verify Email', ...stackHeaderOptions }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ headerTitle: 'Change Password', ...stackHeaderOptions }}
      />
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProfilePreview"
        component={ProfilePreviewScreen}
        options={{ headerTitle: 'Public Profile', ...stackHeaderOptions }}
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
