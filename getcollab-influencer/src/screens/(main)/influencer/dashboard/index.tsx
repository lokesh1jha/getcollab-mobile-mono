import React, { useState, useCallback } from 'react'
import { Dimensions, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import { useAuthStore } from '@shared/stores/auth-store'
import { EmailVerificationBanner } from '@shared/components/EmailVerificationBanner'

const { width } = Dimensions.get('window')
const CARD_W = width * 0.42

interface Stats { campaigns: number; earnings: number; followers: string; engagement: string }
interface Activity { id: string; text: string; time: string; type: string }

const QUICK_ACTIONS = [
  { id: 'discover', icon: 'compass-outline', label: 'Find\nCampaigns', screen: 'Discover' },
  { id: 'bids', icon: 'document-text-outline', label: 'My\nBids', screen: 'MyCampaigns' },
  { id: 'chat', icon: 'chatbubbles-outline', label: 'Messages', screen: 'Chat' },
  { id: 'earnings', icon: 'wallet-outline', label: 'Earnings', screen: 'Earnings' },
  { id: 'profile', icon: 'person-circle-outline', label: 'Profile', screen: 'Profile' },
  { id: 'notifications', icon: 'notifications-outline', label: 'Alerts', screen: 'Notifications' },
]

function activityIcon(type: string) {
  if (type?.includes('bid') || type?.includes('campaign')) return 'megaphone-outline'
  if (type?.includes('payment') || type?.includes('earning')) return 'cash-outline'
  if (type?.includes('message') || type?.includes('chat')) return 'chatbubble-outline'
  return 'notifications-outline'
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatTime(value?: string): string {
  if (!value) return ''
  const diffMs = Date.now() - new Date(value).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function getGreeting(name?: string): string {
  const h = new Date().getHours()
  const t = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  return name ? `Good ${t}, ${name.split(' ')[0]}` : `Good ${t}`
}

export default function InfluencerDashboard({ navigation }: any) {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<Stats>({ campaigns: 0, earnings: 0, followers: '—', engagement: '—' })
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (spinner = false) => {
    if (spinner) setLoading(true)
    try {
      const [bidsRes, earningsRes, profileRes, notifRes] = await Promise.all([
        apiService.getBids({ status: 'accepted' }).catch(() => null),
        apiService.getEarnings().catch(() => null),
        apiService.getProfileWithMetrics().catch(() => apiService.getProfile().catch(() => null)),
        apiService.getNotifications().catch(() => null),
      ])

      const bids = bidsRes?.data || bidsRes?.bids || (Array.isArray(bidsRes) ? bidsRes : [])
      const earningsList = earningsRes?.data || earningsRes?.requests || (Array.isArray(earningsRes) ? earningsRes : [])
      const earningsTotal = Array.isArray(earningsList)
        ? earningsList.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0)
        : Number(earningsRes?.total ?? 0)

      const profile = profileRes?.data || profileRes?.profile || profileRes?.influencerProfile || profileRes || {}
      const notifs = notifRes?.data || notifRes?.notifications || (Array.isArray(notifRes) ? notifRes : [])

      const rawFollowers = (() => {
        for (const k of ['instagramMetrics','youtubeMetrics','tiktokMetrics','twitterMetrics','facebookMetrics']) {
          const f = Number(profile[k]?.followers)
          if (f > 0) return f
        }
        return Number(profile.followers || 0)
      })()

      const rawEng = (() => {
        for (const k of ['instagramMetrics','youtubeMetrics','tiktokMetrics','twitterMetrics','facebookMetrics']) {
          const e = Number(profile[k]?.avgEngagement)
          if (e > 0) return e
        }
        return 0
      })()

      setStats({
        campaigns: Array.isArray(bids) ? bids.length : 0,
        earnings: earningsTotal,
        followers: rawFollowers > 0 ? formatFollowers(rawFollowers) : '—',
        engagement: rawEng > 0 ? `${rawEng.toFixed(1)}%` : '—',
      })

      setActivities(
        (Array.isArray(notifs) ? notifs : []).slice(0, 5).map((n: any) => ({
          id: String(n.id ?? Math.random()),
          text: n.message || n.title || 'New activity',
          time: formatTime(n.createdAt),
          type: n.type || '',
        }))
      )
    } catch (err: any) {
      handleApiError(err, 'Failed to load dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load(true) }, [load]))
  const onRefresh = () => { setRefreshing(true); load(false) }

  const kpiCards = [
    { id: 'campaigns', label: 'Active Bids', value: String(stats.campaigns), icon: 'megaphone-outline', color: colors.blue },
    { id: 'earnings', label: 'Earnings', value: `₹${stats.earnings.toLocaleString()}`, icon: 'wallet-outline', color: colors.success },
    { id: 'followers', label: 'Followers', value: stats.followers, icon: 'people-outline', color: colors.neon },
    { id: 'engagement', label: 'Engagement', value: stats.engagement, icon: 'trending-up-outline', color: colors.warning },
  ]

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.neon} />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: spacing.xxxl }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neon} />}
        >
          <EmailVerificationBanner />

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{getGreeting(user?.name)}</Text>
              <Text style={styles.subtitle}>Here's your creator summary.</Text>
            </View>
            <Pressable onPress={() => navigation?.navigate('Notifications')} style={styles.bellBtn} hitSlop={10}>
              <Ionicons name="notifications-outline" size={20} color={colors.text} />
              <View style={styles.bellDot} />
            </Pressable>
          </View>

          {/* KPI Cards */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md, paddingVertical: spacing.sm }} style={{ marginTop: spacing.sm }}>
            {kpiCards.map((k, i) => (
              <Animated.View key={k.id} entering={FadeInDown.delay(80 * i).duration(320)} style={[styles.kpiCard, { width: CARD_W }]}>
                <View style={[styles.kpiIconWrap, { backgroundColor: k.color + '20' }]}>
                  <Ionicons name={k.icon as any} size={16} color={k.color} />
                </View>
                <Text style={styles.kpiValue}>{k.value}</Text>
                <Text style={styles.kpiLabel}>{k.label}</Text>
              </Animated.View>
            ))}
          </ScrollView>

          {/* Quick Actions */}
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
            <Text style={[styles.sectionTitle, { marginBottom: spacing.md }]}>Quick Actions</Text>
            <View style={styles.actionGrid}>
              {QUICK_ACTIONS.map((a) => (
                <Pressable
                  key={a.id}
                  style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] }]}
                  onPress={() => navigation?.navigate(a.screen)}
                >
                  <View style={styles.actionIcon}>
                    <Ionicons name={a.icon as any} size={18} color={colors.text} />
                  </View>
                  <Text style={styles.actionLabel}>{a.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Recent Activity */}
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              {activities.length > 0 && (
                <Pressable onPress={() => navigation?.navigate('Notifications')}>
                  <Text style={styles.sectionLink}>View all</Text>
                </Pressable>
              )}
            </View>

            {activities.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="notifications-outline" size={26} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No activity yet</Text>
                <Text style={styles.emptySub}>Campaign matches and payments will appear here.</Text>
              </View>
            ) : (
              <View style={styles.listCard}>
                {activities.map((a, idx) => (
                  <View key={a.id} style={[styles.activityRow, idx !== activities.length - 1 && styles.activityDivider]}>
                    <View style={styles.activityIconWrap}>
                      <Ionicons name={activityIcon(a.type) as any} size={16} color={colors.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityText} numberOfLines={2}>{a.text}</Text>
                    </View>
                    {a.time ? <Text style={styles.activityTime}>{a.time}</Text> : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  greeting: { color: colors.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  bellBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  bellDot: { position: 'absolute', top: 10, right: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.neon, borderWidth: 2, borderColor: colors.card },

  kpiCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  kpiIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  kpiValue: { color: colors.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.8 },
  kpiLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  sectionLink: { color: colors.blue, fontSize: 13, fontWeight: '600' },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  actionCard: {
    width: (width - spacing.lg * 2 - spacing.md * 2) / 3,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, alignItems: 'flex-start', gap: 10, minHeight: 88,
  },
  actionIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  actionLabel: { color: colors.text, fontSize: 12, fontWeight: '600', lineHeight: 16 },

  listCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  activityDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  activityIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  activityText: { color: colors.text, fontSize: 13, lineHeight: 18 },
  activityTime: { color: colors.textSubtle, fontSize: 11 },

  emptyCard: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: spacing.xl },
})
