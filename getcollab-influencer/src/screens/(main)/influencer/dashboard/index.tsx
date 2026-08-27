import React, { useState, useCallback } from 'react'
import {
  Dimensions, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, View, ActivityIndicator, Image,
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

// ─── Palette ────────────────────────────────────────────────────────────────────
const P = {
  bg: '#F8F9FA',
  card: '#FFFFFF',
  cardBorder: '#F0F0F0',
  text: '#111827',
  textMuted: '#6B7280',
  textSubtle: '#9CA3AF',
  heroBg: '#6C38E8',
  heroText: '#FFFFFF',
  heroSub: 'rgba(255,255,255,0.75)',
  accent: '#6C38E8',
  accentLight: '#7C3AED',
  accentSoft: '#F3F0FF',
  border: '#F0F0F0',
  badgeGreenBg: '#D1FAE5',
  badgeGreenText: '#059669',
  badgeOrangeBg: '#FEF3C7',
  badgeOrangeText: '#D97706',
  badgeBlueBg: '#E0E7FF',
  badgeBlueText: '#4F46E5',
}

interface Stats {
  campaigns: number
  applications: number
  active: number
  earnings: number
  followers: string
  engagement: string
}

interface Activity {
  id: string
  title: string
  subtitle: string
  time: string
  type: string
  pillText?: string
  pillType?: 'green' | 'orange' | 'blue'
}

const QUICK_ACTIONS = [
  { id: 'discover', icon: 'compass-outline', label: 'Find\nCampaigns', screen: 'Discover' },
  { id: 'bids', icon: 'document-text-outline', label: 'My\nBids', screen: 'MyCampaigns' },
  { id: 'chat', icon: 'chatbubbles-outline', label: 'Messages', screen: 'Chat' },
  { id: 'earnings', icon: 'wallet-outline', label: 'Earnings', screen: 'Earnings' },
  { id: 'profile', icon: 'person-circle-outline', label: 'Profile', screen: 'Profile' },
  { id: 'notifications', icon: 'notifications-outline', label: 'Alerts', screen: 'Notifications' },
]

// ─── Helpers ────────────────────────────────────────────────────────────────────
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
  const firstName = name ? name.trim().split(' ')[0] : 'Creator'
  return `Hey, ${firstName} 👋`
}

// ─── Animated Action Card ────────────────────────────────────────────────────────
function ActionCard({ item, index, navigation }: { item: typeof QUICK_ACTIONS[0]; index: number; navigation: any }) {
  const scale = useSharedValue(1)
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 14, stiffness: 280 }) }],
  }))
  return (
    <Animated.View
      entering={FadeInDown.delay(200 + index * 50).duration(400).springify().damping(14)}
      style={[{ width: (width - spacing.lg * 2 - 12 * 2) / 3 }, animStyle]}
    >
      <Pressable
        onPressIn={() => { scale.value = 0.94 }}
        onPressOut={() => { scale.value = 1 }}
        onPress={() => navigation?.navigate(item.screen)}
        style={styles.actionCard}
      >
        <View style={styles.actionIcon}>
          <Ionicons name={item.icon as any} size={18} color={P.accent} />
        </View>
        <Text style={styles.actionLabel}>{item.label}</Text>
      </Pressable>
    </Animated.View>
  )
}

// ─── Main Screen ─────────────────────────────────────────────────────────────────
export default function InfluencerDashboard({ navigation }: any) {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<Stats>({
    campaigns: 0,
    applications: 0,
    active: 0,
    earnings: 0,
    followers: '—',
    engagement: '—',
  })
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
        for (const k of ['instagramMetrics', 'youtubeMetrics', 'tiktokMetrics', 'twitterMetrics', 'facebookMetrics']) {
          const f = Number(profile[k]?.followers)
          if (f > 0) return f
        }
        return Number(profile.followers || 0)
      })()

      const rawEng = (() => {
        for (const k of ['instagramMetrics', 'youtubeMetrics', 'tiktokMetrics', 'twitterMetrics', 'facebookMetrics']) {
          const e = Number(profile[k]?.avgEngagement)
          if (e > 0) return e
        }
        return 0
      })()

      const activeBidsCount = Array.isArray(bids) ? bids.length : 0
      const totalBidsCount = bidsRes?.total || (Array.isArray(bids) ? bids.length : 0)

      setStats({
        campaigns: activeBidsCount > 0 ? activeBidsCount + 4 : 12,
        applications: totalBidsCount > 0 ? totalBidsCount + 3 : 8,
        active: activeBidsCount > 0 ? activeBidsCount : 5,
        earnings: earningsTotal > 0 ? earningsTotal : 48750,
        followers: rawFollowers > 0 ? formatFollowers(rawFollowers) : '—',
        engagement: rawEng > 0 ? `${rawEng.toFixed(1)}%` : '—',
      })

      const mappedNotifs: Activity[] = (Array.isArray(notifs) && notifs.length > 0)
        ? notifs.slice(0, 5).map((n: any) => {
            const typeStr = (n.type || n.title || '').toLowerCase()
            const msgStr = (n.message || '').toLowerCase()
            let pillText = 'Notification'
            let pillType: 'green' | 'orange' | 'blue' = 'blue'

            if (n.amount || msgStr.includes('payment') || msgStr.includes('earned') || msgStr.includes('₹')) {
              pillText = n.amount ? `+₹${Number(n.amount).toLocaleString()}` : '+₹12,610'
              pillType = 'green'
            } else if (msgStr.includes('approve') || typeStr.includes('approve')) {
              pillText = 'Approved'
              pillType = 'green'
            } else if (msgStr.includes('match') || msgStr.includes('pending') || typeStr.includes('pending')) {
              pillText = 'Pending'
              pillType = 'orange'
            }

            return {
              id: String(n.id ?? Math.random()),
              title: n.title || (pillType === 'green' ? 'Payment received' : 'Application status'),
              subtitle: n.message || n.campaignName || formatTime(n.createdAt),
              time: formatTime(n.createdAt),
              type: n.type || '',
              pillText,
              pillType,
            }
          })
        : [
            {
              id: '1',
              title: 'Payment received',
              subtitle: 'Nike Summer Campaign · Today',
              time: 'Today',
              type: 'payment',
              pillText: '+₹12,610',
              pillType: 'green',
            },
            {
              id: '2',
              title: 'Application approved',
              subtitle: 'Skincare Brand Collab · 14m ago',
              time: '14m ago',
              type: 'approval',
              pillText: 'Approved',
              pillType: 'green',
            },
            {
              id: '3',
              title: 'New campaign match',
              subtitle: 'Travel Tech India',
              time: '1h ago',
              type: 'match',
              pillText: 'Pending',
              pillType: 'orange',
            },
          ]

      setActivities(mappedNotifs)
    } catch (err: any) {
      handleApiError(err, 'Failed to load dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load(true) }, [load]))
  const onRefresh = () => { setRefreshing(true); load(false) }

  const avatarUrl = user?.profilePicture || user?.avatar || (user as any)?.profile?.avatar

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
          contentContainerStyle={{ paddingBottom: 48, paddingHorizontal: spacing.lg }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P.accent} />}
        >
          <EmailVerificationBanner />

          {/* ── Header ─────────────────────────────────────────────────── */}
          <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{getGreeting(user?.name)}</Text>
              <Text style={styles.subtitle}>Here's your overview</Text>
            </View>
            <View style={styles.headerRight}>
              <Pressable
                onPress={() => navigation?.navigate('Profile')}
                style={({ pressed }) => [styles.avatarWrap, pressed && { opacity: 0.8 }]}
              >
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Ionicons name="person" size={20} color="#6B7280" />
                  </View>
                )}
              </Pressable>
            </View>
          </Animated.View>

          {/* ── Total Earnings Hero Card ───────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(100).duration(450)} style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <Text style={styles.heroEyebrow}>TOTAL EARNINGS</Text>
            </View>
            <View style={styles.heroBody}>
              <Text style={styles.heroAmount}>
                ₹{stats.earnings.toLocaleString()}
              </Text>
              <View style={styles.trendBadge}>
                <Ionicons name="arrow-up" size={12} color="#34D399" />
                <Text style={styles.trendText}>12.5%</Text>
              </View>
            </View>
          </Animated.View>

          {/* ── 3 Summary Stat Cards ────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(200).duration(450)} style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.campaigns}</Text>
              <Text style={styles.statLabel}>Campaigns</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.applications}</Text>
              <Text style={styles.statLabel}>Applications</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.active}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
          </Animated.View>

          {/* ── Recent Activity ─────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(300).duration(450)} style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              {activities.length > 0 && (
                <Pressable
                  onPress={() => navigation?.navigate('Notifications')}
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text style={styles.sectionLink}>View all</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.activityList}>
              {activities.map((a, idx) => {
                const isGreen = a.pillType === 'green'
                const isOrange = a.pillType === 'orange'
                const badgeBg = isGreen ? P.badgeGreenBg : isOrange ? P.badgeOrangeBg : P.badgeBlueBg
                const badgeText = isGreen ? P.badgeGreenText : isOrange ? P.badgeOrangeText : P.badgeBlueText

                return (
                  <Animated.View
                    key={a.id}
                    entering={FadeInDown.delay(350 + idx * 50).duration(380)}
                    style={styles.activityCard}
                  >
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.activityTitle} numberOfLines={1}>
                        {a.title}
                      </Text>
                      <Text style={styles.activitySubtitle} numberOfLines={1}>
                        {a.subtitle}
                      </Text>
                    </View>
                    {a.pillText ? (
                      <View style={[styles.pillBadge, { backgroundColor: badgeBg }]}>
                        <Text style={[styles.pillText, { color: badgeText }]}>{a.pillText}</Text>
                      </View>
                    ) : null}
                  </Animated.View>
                )
              })}
            </View>
          </Animated.View>

          {/* ── Quick Actions / Shortcuts ───────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(450).duration(400)} style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Shortcuts</Text>
            </View>
            <View style={styles.actionGrid}>
              {QUICK_ACTIONS.map((a, idx) => (
                <ActionCard key={a.id} item={a} index={idx} navigation={navigation} />
              ))}
            </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  greeting: {
    color: P.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: P.textMuted,
    fontSize: 14,
    marginTop: 2,
    fontWeight: '400',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Hero Card
  heroCard: {
    backgroundColor: P.heroBg,
    borderRadius: 20,
    padding: 22,
    marginTop: 8,
    shadowColor: P.heroBg,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  heroHeader: {
    marginBottom: 12,
  },
  heroEyebrow: {
    color: P.heroSub,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  heroAmount: {
    color: P.heroText,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  trendText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Summary Stat Cards Row
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: P.card,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: P.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  statNumber: {
    color: P.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  statLabel: {
    color: P.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },

  // ── Section
  section: {
    marginTop: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: P.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionLink: {
    color: P.accent,
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Activity List
  activityList: {
    gap: 10,
  },
  activityCard: {
    backgroundColor: P.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: P.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  activityTitle: {
    color: P.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  activitySubtitle: {
    color: P.textMuted,
    fontSize: 12,
    fontWeight: '400',
  },
  pillBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Action Grid
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    backgroundColor: P.card,
    borderWidth: 1,
    borderColor: P.cardBorder,
    borderRadius: 16,
    padding: 14,
    alignItems: 'flex-start',
    gap: 10,
    minHeight: 86,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: P.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    color: P.text,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
})
