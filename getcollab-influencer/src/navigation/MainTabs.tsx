import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Platform } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, spacing } from '@/src/theme'
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

function ActiveDot() {
  return <View style={styles.activeDot} />
}

function TabIcon({ name, focused, badge }: { name: string; focused: boolean; badge?: number }) {
  const color = focused ? colors.neon : colors.textMuted
  return (
    <View style={[styles.tabIconWrap, focused && styles.tabIconActive]}>
      <Ionicons name={name as any} size={22} color={color} />
      {badge && badge > 0 ? (
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
        </View>
      ) : null}
      {focused && <ActiveDot />}
    </View>
  )
}

function InfluencerTabs() {
  const unreadByRoom = useChatStore((s) => s.unreadByRoom)
  const totalUnread = Object.values(unreadByRoom).reduce((sum, n) => sum + n, 0)

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={InfluencerDashboard}
        options={{
          tabBarAccessibilityLabel: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Discover"
        component={InfluencerDiscover}
        options={{
          tabBarAccessibilityLabel: 'Discover campaigns',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'compass' : 'compass-outline'} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="MyCampaigns"
        component={InfluencerCampaigns}
        options={{
          tabBarAccessibilityLabel: 'My Bids',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'document-text' : 'document-text-outline'} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={InfluencerChat}
        options={{
          tabBarAccessibilityLabel: 'Messages',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} badge={totalUnread} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={InfluencerProfile}
        options={{
          tabBarAccessibilityLabel: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person-circle' : 'person-circle-outline'} focused={focused} />,
        }}
      />
    </Tab.Navigator>
  )
}

function InfluencerStack() {
  const fetchRooms = useChatStore((s) => s.fetchRooms)
  const initialised = useRef(false)

  useEffect(() => {
    if (initialised.current) return
    initialised.current = true
    fetchRooms()
  }, [fetchRooms])

  const sharedHeaderOptions = {
    headerStyle: { backgroundColor: colors.bg },
    headerTintColor: colors.text,
    headerTitleStyle: { fontSize: 15, fontWeight: '700' as const },
    headerShadowVisible: false,
    headerBackTitleVisible: false,
  }

  return (
    <Stack.Navigator screenOptions={{ contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="MainTabs" component={InfluencerTabs} options={{ headerShown: false }} />
      <Stack.Screen name="CampaignDetails" component={InfluencerCampaignDetails} options={{ ...sharedHeaderOptions, headerTitle: 'Campaign' }} />
      <Stack.Screen name="ChatDetail" component={InfluencerChatDetail} options={{ headerShown: false }} />
      <Stack.Screen name="Earnings" component={EarningsScreen} options={{ ...sharedHeaderOptions, headerTitle: 'Earnings' }} />
      <Stack.Screen name="Disputes" component={DisputesScreen} options={{ ...sharedHeaderOptions, headerTitle: 'Disputes' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ ...sharedHeaderOptions, headerTitle: 'Settings' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ ...sharedHeaderOptions, headerTitle: 'Notifications' }} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ ...sharedHeaderOptions, headerTitle: 'Verify Email' }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ ...sharedHeaderOptions, headerTitle: 'Change Password' }} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProfilePreview" component={ProfilePreviewScreen} options={{ ...sharedHeaderOptions, headerTitle: 'Public Profile' }} />
    </Stack.Navigator>
  )
}

export default function MainTabs() {
  return <InfluencerStack />
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bg,
    borderTopColor: colors.border,
    borderTopWidth: 0.5,
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
  },
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 36,
    borderRadius: radius.md,
  },
  tabIconActive: {
    backgroundColor: colors.neonSoft,
  },
  activeDot: {
    position: 'absolute',
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neon,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
})
