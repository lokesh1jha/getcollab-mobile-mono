import React, { useEffect, useRef } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@shared/constants'
import { useChatStore } from '@shared/stores/chat-store'

import InfluencerDashboard from '../app/(main)/influencer/dashboard'
import InfluencerDiscover from '../app/(main)/influencer/discover'
import InfluencerCampaigns from '../app/(main)/influencer/campaigns'
import InfluencerCampaignDetails from '../app/(main)/influencer/campaign-details/[id]'
import InfluencerChat from '../app/(main)/influencer/chat'
import InfluencerChatDetail from '../app/(main)/influencer/chat-detail/[id]'
import InfluencerProfile from '../app/(main)/influencer/profile'
import EarningsScreen from '../app/(main)/earnings'
import DisputesScreen from '../app/(main)/disputes'
import SettingsScreen from '../app/(main)/settings'
import NotificationsScreen from '../app/(main)/notifications'
import VerifyEmailScreen from '../app/(main)/verify-email'
import ChangePasswordScreen from '../app/(main)/change-password'
import OnboardingScreen from '../app/(main)/onboarding'
import ProfilePreviewScreen from '../app/(main)/profile-preview'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

function InfluencerStack() {
  const fetchRooms = useChatStore((s) => s.fetchRooms)
  const unreadByRoom = useChatStore((s) => s.unreadByRoom)
  const totalUnread = Object.values(unreadByRoom).reduce((sum, n) => sum + n, 0)

  const initialised = useRef(false)

  useEffect(() => {
    if (initialised.current) return
    initialised.current = true
    fetchRooms()
  }, [fetchRooms])

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
              component={InfluencerDashboard}
              options={{
                tabBarLabel: 'Dashboard',
                tabBarAccessibilityLabel: 'Dashboard tab',
                tabBarIcon: ({ color, focused }) => (
                  <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Discover"
              component={InfluencerDiscover}
              options={{
                tabBarLabel: 'Discover',
                tabBarAccessibilityLabel: 'Discover tab',
                tabBarIcon: ({ color, focused }) => (
                  <Ionicons name={focused ? 'compass' : 'compass-outline'} size={22} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="MyCampaigns"
              component={InfluencerCampaigns}
              options={{
                tabBarLabel: 'My Bids',
                tabBarAccessibilityLabel: 'My Bids tab',
                tabBarIcon: ({ color, focused }) => (
                  <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={22} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Chat"
              component={InfluencerChat}
              options={{
                tabBarLabel: 'Messages',
                tabBarAccessibilityLabel: 'Messages tab',
                tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
                tabBarIcon: ({ color, focused }) => (
                  <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={22} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Profile"
              component={InfluencerProfile}
              options={{
                tabBarLabel: 'Profile',
                tabBarAccessibilityLabel: 'Profile tab',
                tabBarIcon: ({ color, focused }) => (
                  <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
                ),
              }}
            />
          </Tab.Navigator>
        )}
      </Stack.Screen>

      <Stack.Screen
        name="CampaignDetails"
        component={InfluencerCampaignDetails}
        options={{ headerTitle: 'Campaign', headerShown: true, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }}
      />
      <Stack.Screen
        name="ChatDetail"
        component={InfluencerChatDetail}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{ headerShown: true, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }}
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
  return <InfluencerStack />
}
