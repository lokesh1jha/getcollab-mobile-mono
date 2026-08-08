import React, { useState, useCallback } from 'react'
import {
  Dimensions, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, View, ActivityIndicator,
} from 'react-native'
import Animated, {
  FadeIn, FadeInDown,
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import { useAuthStore } from '@shared/stores/auth-store'
import { EmailVerificationBanner } from '@shared/components/EmailVerificationBanner'

const { width } = Dimensions.get('window')
const CARD_W = width * 0.44

// ─── Palette ────────────────────────────────────────────────────────────────────
const P = {
  bg:           '#0B0B0B',
  card:         '#19191E',
  cardHigh:     '#1C1C23',
  text:         '#F5F5F5',
  textMuted:    '#A6A6B0',
  textSubtle:   '#6E6F7E',
  accent:       '#5868D8',
  accentLight:  '#6675E8',
  accentSoft:   '#303058',
  border:       'rgba(255,255,255,0.07)',
  accentBorder: 'rgba(88,104,216,0.28)',
}

interface Stats { campaigns: number; earnings: number; followers: string; engagement: string }
interface Activity { id: string; text: string; time: string; type: string }

const QUICK_ACTIONS = [
  { id: 'discover',      icon: 'compass-outline',       label: 'Find\nCampaigns', screen: 'Discover' },
  { id: 'bids',          icon: 'document-text-outline', label: 'My\nBids',        screen: 'MyCampaigns' },
  { id: 'chat',          icon: 'chatbubbles-outline',   label: 'Messages',        screen: 'Chat' },
  { id: 'earnings',      icon: 'wallet-outline',        label: 'Earnings',        screen: 'Earnings' },
  { id: 'profile',       icon: 'person-circle-outline', label: 'Profile',         screen: 'Profile' },
  { id: 'notifications', icon: 'notifications-outline', label: 'Alerts',          screen: 'Notifications' },
]

// ─── Helpers ────────────────────────────────────────────────────────────────────
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
  return name ? `Good ${t}, ${name.split(' ')[0]} 👋` : `Good ${t}`
}

// ─── Animated Action Card ────────────────────────────────────────────────────────
function ActionCard({ item, index, navigation }: { item: typeof QUICK_ACTIONS[0]; index: number; navigation: any }) {
  const scale = useSharedValue(1)
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 14, stiffness: 280 }) }],
  }))
  return (
    <Animated.View
      entering={FadeInDown.delay(200 + index * 65).duration(460).springify().damping(14)}
      style={[{ width: (width - spacing.lg * 2 - 12 * 2) / 3 }, animStyle]}
    >
      <Pressable
        onPressIn={() => { scale.value = 0.93 }}
        onPressOut={() => { scale.value = 1 }}
        onPress={() => navigation?.navigate(item.screen)}
        style={styles.actionCard}
      >
        <View style={styles.actionIcon}>
          <Ionicons name={item.icon as any} size={18} color={P.accentLight} />
        </View>
        <Text style={styles.actionLabel}>{item.label}</Text>
      </Pressable>
    </Animated.View>
  )
}

// ─── Main Screen ─────────────────────────────────────────────────────────────────
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
      const notifs  = notifRes?.data || notifRes?.notifications || (Array.isArray(notifRes) ? notifRes : [])

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
        campaigns:  Array.isArray(bids) ? bids.length : 0,
        earnings:   earningsTotal,
        followers:  rawFollowers > 0 ? formatFollowers(rawFollowers) : '—',
        engagement: rawEng > 0 ? `${rawEng.toFixed(1)}%` : '—',
      })

      setActivities(
        (Array.isArray(notifs) ? notifs : []).slice(0, 5).map((n: any) => ({
          id:   String(n.id ?? Math.random()),
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
    { id: 'campaigns',  label: 'Active Bids',  value: String(stats.campaigns),              icon: 'megaphone-outline',    color: P.accentLight },
    { id: 'earnings',   label: 'Total Earned', value: `₹${stats.earnings.toLocaleString()}`, icon: 'wallet-outline',       color: '#4ADE80' },
    { id: 'followers',  label: 'Followers',    value: stats.followers,                       icon: 'people-outline',       color: '#F59E0B' },
    { id: 'engagement', label: 'Engagement',   value: stats.engagement,                      icon: 'trending-up-outline',  color: '#FB7185' },
  ]

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={P.accent} />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P.accent} />}
        >
          <EmailVerificationBanner />

          {/* ── Header ─────────────────────────────────────────────────── */}
          <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>CREATOR DASHBOARD</Text>
              <Text style={styles.greeting}>{getGreeting(user?.name)}</Text>
              <Text style={styles.subtitle}>Here's your creator summary.</Text>
            </View>
            <Pressable
              onPress={() => navigation?.navigate('Notifications')}
              style={({ pressed }) => [styles.bellBtn, pressed && { opacity: 0.7 }]}
              hitSlop={10}
            >
              <Ionicons name="notifications-outline" size={20} color={P.text} />
              <View style={styles.bellDot} />
            </Pressable>
          </Animated.View>

          {/* ── KPI Cards ──────────────────────────────────────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 12, paddingVertical: 4 }}
            style={{ marginTop: 8 }}
          >
            {kpiCards.map((k, i) => (
              <Animated.View
                key={k.id}
                entering={FadeInDown.delay(60 + i * 90).duration(480).springify().damping(14)}
                style={[styles.kpiCard, { width: CARD_W }]}
              >
                <View style={[styles.kpiIconWrap, { backgroundColor: k.color + '1A', borderColor: k.color + '40' }]}>
                  <Ionicons name={k.icon as any} size={16} color={k.color} />
                </View>
                <Text style={styles.kpiValue}>{k.value}</Text>
                <Text style={styles.kpiLabel}>{k.label}</Text>
                <View style={[styles.kpiBar, { backgroundColor: k.color + '40' }]} />
              </Animated.View>
            ))}
          </ScrollView>

          {/* ── Quick Actions ───────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>SHORTCUTS</Text>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>
            <View style={styles.actionGrid}>
              {QUICK_ACTIONS.map((a, idx) => (
                <ActionCard key={a.id} item={a} index={idx} navigation={navigation} />
              ))}
            </View>
          </Animated.View>

          {/* ── Recent Activity ─────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(420).duration(400)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>NOTIFICATIONS</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                {activities.length > 0 && (
                  <Pressable
                    onPress={() => navigation?.navigate('Notifications')}
                    style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Text style={styles.sectionLink}>View all →</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {activities.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="notifications-outline" size={26} color={P.textSubtle} />
                </View>
                <Text style={styles.emptyTitle}>No activity yet</Text>
                <Text style={styles.emptySub}>Campaign matches and payments will appear here.</Text>
              </View>
            ) : (
              <View style={styles.listCard}>
                {activities.map((a, idx) => (
                  <Animated.View
                    key={a.id}
                    entering={FadeInDown.delay(460 + idx * 55).duration(380).springify().damping(16)}
                    style={[styles.activityRow, idx !== activities.length - 1 && styles.activityDivider]}
                  >
                    <View style={styles.activityIconWrap}>
                      <Ionicons name={activityIcon(a.type) as any} size={15} color={P.accentLight} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityText} numberOfLines={2}>{a.text}</Text>
                    </View>
                    {a.time ? <Text style={styles.activityTime}>{a.time}</Text> : null}
                  </Animated.View>
                ))}
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },

  // ── Header
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm,
  },
  eyebrow: {
    color: P.textSubtle, fontSize: 10, fontWeight: '700',
    letterSpacing: 1.8, marginBottom: 6, textTransform: 'uppercase',
  },
  greeting:  { color: P.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.6 },
  subtitle:  { color: P.textMuted, fontSize: 13, marginTop: 3 },
  bellBtn: {
    width: 42, height: 42, borderRadius: 21,
    borderWidth: 1, borderColor: P.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: P.card,
  },
  bellDot: {
    position: 'absolute', top: 9, right: 10,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: P.accent, borderWidth: 2, borderColor: P.bg,
  },

  // ── KPI
  kpiCard: {
    backgroundColor: P.card, borderWidth: 1, borderColor: P.border,
    borderRadius: 16, padding: 18, gap: 10, overflow: 'hidden',
  },
  kpiIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-start', borderWidth: 1,
  },
  kpiValue: { color: P.text, fontSize: 26, fontWeight: '800', letterSpacing: -1 },
  kpiLabel: { color: P.textMuted, fontSize: 12, fontWeight: '500', letterSpacing: 0.2 },
  kpiBar:   { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, borderRadius: 1 },

  // ── Section
  section:        { paddingHorizontal: spacing.lg, marginTop: 28 },
  sectionHeader:  { marginBottom: 14 },
  sectionEyebrow: {
    color: P.textSubtle, fontSize: 10, fontWeight: '700',
    letterSpacing: 1.6, marginBottom: 4, textTransform: 'uppercase',
  },
  sectionTitle: { color: P.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.4 },
  sectionLink:  { color: P.accentLight, fontSize: 13, fontWeight: '600' },

  // ── Action Grid
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    backgroundColor: P.cardHigh, borderWidth: 1, borderColor: P.border,
    borderRadius: 14, padding: 14, alignItems: 'flex-start', gap: 10, minHeight: 86,
  },
  actionIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: P.accentSoft, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: P.accentBorder,
  },
  actionLabel: { color: P.text, fontSize: 12, fontWeight: '600', lineHeight: 17 },

  // ── Activity List
  listCard: {
    backgroundColor: P.card, borderWidth: 1, borderColor: P.border,
    borderRadius: 16, overflow: 'hidden',
  },
  activityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  activityDivider:  { borderBottomWidth: 1, borderBottomColor: P.border },
  activityIconWrap: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: P.accentSoft, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: P.accentBorder,
  },
  activityText: { color: P.text, fontSize: 13, lineHeight: 19 },
  activityTime: { color: P.textSubtle, fontSize: 11, fontWeight: '500' },

  // ── Empty State
  emptyCard: {
    alignItems: 'center', paddingVertical: 48, gap: 8,
    backgroundColor: P.card, borderWidth: 1, borderColor: P.border, borderRadius: 16,
  },
  emptyIcon: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: P.accentSoft, borderWidth: 1, borderColor: P.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { color: P.text, fontSize: 15, fontWeight: '700', marginTop: 8 },
  emptySub:   { color: P.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 32, lineHeight: 19 },
})
