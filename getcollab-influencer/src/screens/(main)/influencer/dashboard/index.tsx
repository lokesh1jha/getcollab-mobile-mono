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
import { colors, spacing, radius } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import { useAuthStore } from '@shared/stores/auth-store'
import { useChatStore } from '@shared/stores/chat-store'
import { EmailVerificationBanner } from '@shared/components/EmailVerificationBanner'
import { InfluencerNavigationProp, InfluencerStackParamList } from '@/src/types/navigation'

const { width } = Dimensions.get('window')

interface Stats {
  campaigns: number
  applications: number
  active: number
  earnings: number
  pendingEarnings: number
  followers: string
  engagement: string
  totalBids: number
  completedCampaigns: number
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

interface Deliverable {
  campaignId?: string
  title?: string
  campaign?: string
  due?: string
  days?: number
}

// Checklist rows navigate without params, so only param-less screens qualify
// (TS cannot spread a union of names into navigate()'s tuple overloads, hence the cast below).
type ScreenName = {
  [K in keyof InfluencerStackParamList]: undefined extends InfluencerStackParamList[K] ? K : never
}[keyof InfluencerStackParamList] & string

interface ChecklistItem {
  title: string
  sub: string
  done: boolean
  screen: ScreenName
}

const QUICK_ACTIONS: { id: string; icon: string; label: string; screen: ScreenName }[] = [
  { id: 'discover', icon: 'compass-outline', label: 'Find\nCampaigns', screen: 'Discover' },
  { id: 'bids', icon: 'document-text-outline', label: 'My\nBids', screen: 'MyCampaigns' },
  { id: 'analytics', icon: 'stats-chart-outline', label: 'Analytics', screen: 'Analytics' },
  { id: 'chat', icon: 'chatbubbles-outline', label: 'Messages', screen: 'Chat' },
  { id: 'earnings', icon: 'wallet-outline', label: 'Earnings', screen: 'Earnings' },
  { id: 'profile', icon: 'person-circle-outline', label: 'Profile', screen: 'Profile' },
  { id: 'notifications', icon: 'notifications-outline', label: 'Alerts', screen: 'Notifications' },
]

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

function ActionCard({ item, index, navigation }: { item: typeof QUICK_ACTIONS[0]; index: number; navigation: InfluencerNavigationProp }) {
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
        onPress={() => (navigation as any)?.navigate(item.screen)}
        style={styles.actionCard}
      >
        <View style={styles.actionIcon}>
          <Ionicons name={item.icon as any} size={18} color={colors.neon} />
        </View>
        <Text style={styles.actionLabel}>{item.label}</Text>
      </Pressable>
    </Animated.View>
  )
}

export default function InfluencerDashboard({ navigation }: { navigation: InfluencerNavigationProp }) {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<Stats>({
    campaigns: 0, applications: 0, active: 0, earnings: 0, pendingEarnings: 0,
    followers: '—', engagement: '—', totalBids: 0, completedCampaigns: 0,
  })
  const [activities, setActivities] = useState<Activity[]>([])
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (spinner = false) => {
    if (spinner) setLoading(true)
    try {
      const [dashboardRes, earningsRes, profileRes, notifRes] = await Promise.all([
        apiService.getDashboardStats().catch(() => null),
        apiService.getEarnings().catch(() => null),
        apiService.getProfileWithMetrics().catch(() => apiService.getProfile().catch(() => null)),
        apiService.getNotifications().catch(() => null),
      ])

      const bids = dashboardRes?.bids || dashboardRes?.data?.bids || dashboardRes?.bidsList || (Array.isArray(dashboardRes) ? dashboardRes : [])
      const earningsList = earningsRes?.earnings || earningsRes?.data || (Array.isArray(earningsRes) ? earningsRes : [])
      const settlementsList = earningsRes?.settlementRequests || earningsRes?.settlements || (Array.isArray(earningsRes) ? [] : [])
      const allMoney = [...(Array.isArray(earningsList) ? earningsList : []), ...(Array.isArray(settlementsList) ? settlementsList : [])]
      
      const paidTotal = allMoney.filter((s: any) => ['released','paid','completed','mark_paid'].includes(String(s.status).toLowerCase()))
        .reduce((sum: number, s: any) => sum + Number(s.amountMinor ?? s.amount ?? 0) / (s.amountMinor != null ? 100 : 1), 0)
      const pendingTotal = allMoney.filter((s: any) => !['released','paid','completed','mark_paid'].includes(String(s.status).toLowerCase()))
        .reduce((sum: number, s: any) => sum + Number(s.amountMinor ?? s.amount ?? 0) / (s.amountMinor != null ? 100 : 1), 0)

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

      const activeBidsCount = Number(dashboardRes?.activeDeals ?? dashboardRes?.activeDealsCount ?? dashboardRes?.stats?.activeDeals ?? (Array.isArray(bids) ? bids.length : 0))
      const totalBidsCount = Number(dashboardRes?.totalBids ?? dashboardRes?.stats?.totalBids ?? (Array.isArray(bids) ? bids.length : 0))
      const campaignsCount = Number(dashboardRes?.totalCampaigns ?? dashboardRes?.stats?.totalCampaigns ?? activeBidsCount)
      const completedCount = Number(dashboardRes?.completedCampaigns ?? dashboardRes?.stats?.completedCampaigns ?? 0)

      setStats({
        campaigns: campaignsCount,
        applications: totalBidsCount,
        active: Number(dashboardRes?.activeCampaigns ?? dashboardRes?.stats?.activeCampaigns ?? activeBidsCount),
        earnings: paidTotal,
        pendingEarnings: pendingTotal,
        followers: rawFollowers > 0 ? formatFollowers(rawFollowers) : '—',
        engagement: rawEng > 0 ? `${rawEng.toFixed(1)}%` : '—',
        totalBids: totalBidsCount,
        completedCampaigns: completedCount,
      })

      const mappedNotifs: Activity[] = (Array.isArray(notifs) && notifs.length > 0)
        ? notifs.slice(0, 5).map((n: any) => {
            const typeStr = (n.type || n.title || '').toLowerCase()
            const msgStr = (n.message || '').toLowerCase()
            let pillText: string | undefined
            let pillType: 'green' | 'orange' | 'blue' = 'blue'

            if (n.amount) {
              pillText = `+₹${Number(n.amount).toLocaleString()}`
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
        : []
      setActivities(mappedNotifs)

      const upcoming = (dashboardRes?.upcomingDeliverables || dashboardRes?.data?.upcomingDeliverables || []) as Deliverable[]
      setDeliverables(Array.isArray(upcoming) ? upcoming.slice(0, 4) : [])

      const hasConnectedSocial = !!(
        profile.instagramHandle || profile.youtubeHandle || profile.tiktokHandle || profile.twitterHandle ||
        profile.instagramMetrics?.followers || profile.youtubeMetrics?.followers || profile.tiktokMetrics?.followers
      )
      const onboardingComplete = Boolean(user?.onboardingCompleted)

      setChecklist([
        {
          title: 'Creator profile added',
          sub: 'Display name, niche and rates brands see first.',
          done: onboardingComplete,
          screen: 'Profile',
        },
        {
          title: 'Add your social accounts',
          sub: 'Instagram, YouTube and get verified',
          done: hasConnectedSocial,
          screen: 'Profile',
        },
        {
          title: 'Apply to your first campaign',
          sub: 'Browse open briefs and send a pitch with your rate.',
          done: totalBidsCount > 0,
          screen: 'Discover',
        },
      ])
    } catch (err: any) {
      handleApiError(err, 'Failed to load dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.onboardingCompleted])

  useFocusEffect(useCallback(() => { load(true) }, [load]))
  const onRefresh = () => { setRefreshing(true); load(false) }

  const avatarUrl = user?.profilePicture || user?.avatar || (user as any)?.profile?.avatar
  const doneCount = checklist.filter(t => t.done).length
  const hasActivity = stats.active > 0 || stats.applications > 0 || stats.completedCampaigns > 0 || stats.totalBids > 0 || activities.length > 0

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
          contentContainerStyle={{ paddingBottom: 48, paddingHorizontal: spacing.lg }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neon} />}
        >
          <EmailVerificationBanner />

          {/* Header */}
          <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{getGreeting(user?.name)}</Text>
              <Text style={styles.subtitle}>Here's your overview</Text>
            </View>
            <View style={styles.headerRight}>
              <Pressable accessibilityRole="button" accessibilityLabel="Change photo"
                onPress={() => navigation?.navigate('Profile')}
                style={({ pressed }) => [styles.avatarWrap, pressed && { opacity: 0.8 }]}
              >
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Ionicons name="person" size={20} color={colors.textMuted} />
                  </View>
                )}
              </Pressable>
            </View>
          </Animated.View>

          {/* Total Earnings Hero Card */}
          <Animated.View entering={FadeInDown.delay(100).duration(450)} style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <Text style={styles.heroEyebrow}>TOTAL EARNINGS</Text>
            </View>
            <View style={styles.heroBody}>
              <Text style={styles.heroAmount}>₹{stats.earnings.toLocaleString()}</Text>
              {stats.pendingEarnings > 0 && (
                <Text style={styles.heroSub}>₹{stats.pendingEarnings.toLocaleString()} pending</Text>
              )}
            </View>
          </Animated.View>

          {/* 3 Summary Stat Cards */}
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

          {/* Setup Checklist */}
          <Animated.View entering={FadeInDown.delay(260).duration(450)} style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Do this first</Text>
              <Text style={styles.sectionSub}>{doneCount} of {checklist.length} done</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${(doneCount / Math.max(checklist.length, 1)) * 100}%` }]} />
            </View>
            <View style={{ gap: 2 }}>
              {checklist.map((task, i) => (
                <Pressable key={task.title} onPress={() => navigation?.navigate(task.screen as never)} style={styles.checkRow}>
                  <View style={[styles.checkCircle, task.done && styles.checkCircleDone]}>
                    {task.done ? (
                      <Ionicons name="checkmark" size={14} color={colors.success} />
                    ) : (
                      <Text style={styles.checkNumber}>{i + 1}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.checkTitle, task.done && { textDecorationLine: 'line-through', color: colors.textMuted }]}>{task.title}</Text>
                    <Text style={styles.checkSub}>{task.sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
                </Pressable>
              ))}
            </View>
          </Animated.View>

          {/* Recent Activity / Deliverables */}
          <Animated.View entering={FadeInDown.delay(300).duration(450)} style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{deliverables.length > 0 ? 'Upcoming deliverables' : 'Recent Activity'}</Text>
              {activities.length > 0 && (
                <Pressable onPress={() => navigation?.navigate('Notifications')}>
                  <Text style={styles.sectionLink}>View all</Text>
                </Pressable>
              )}
            </View>

            {deliverables.length > 0 ? (
              <View style={{ gap: 10 }}>
                {deliverables.map((d, idx) => (
                  <Animated.View key={d.campaignId || idx} entering={FadeInDown.delay(320 + idx * 50).duration(380)} style={styles.activityCard}>
                    <View style={styles.activityIcon}>
                      <Text style={{ color: colors.neon, fontSize: 14, fontWeight: '800' }}>{(d.title || d.campaign || 'D').charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityTitle} numberOfLines={1}>{d.title || d.campaign || 'Deliverable'}</Text>
                      <Text style={styles.activitySubtitle}>Due {d.due || 'soon'}</Text>
                    </View>
                    {d.days != null && (
                      <View style={[styles.pillBadge, { backgroundColor: d.days <= 2 ? colors.errorSoft : colors.warningSoft }]}>
                        <Text style={[styles.pillText, { color: d.days <= 2 ? colors.error : colors.warning }]}>{d.days}d</Text>
                      </View>
                    )}
                  </Animated.View>
                ))}
              </View>
            ) : activities.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="notifications-outline" size={26} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No activity yet</Text>
                <Text style={styles.emptySub}>Bids, payments and approvals will appear here.</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {activities.map((a, idx) => {
                  const isGreen = a.pillType === 'green'
                  const isOrange = a.pillType === 'orange'
                  const badgeBg = isGreen ? colors.successSoft : isOrange ? colors.warningSoft : colors.blueSoft
                  const badgeText = isGreen ? colors.success : isOrange ? colors.warning : colors.blue
                  return (
                    <Animated.View key={a.id} entering={FadeInDown.delay(320 + idx * 50).duration(380)} style={styles.activityCard}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.activityTitle} numberOfLines={1}>{a.title}</Text>
                        <Text style={styles.activitySubtitle} numberOfLines={1}>{a.subtitle}</Text>
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
            )}
          </Animated.View>

          {/* Escrow Card */}
          {hasActivity && (
            <Animated.View entering={FadeInDown.delay(380).duration(450)} style={styles.escrowCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.escrowLabel}>Money held safely for you</Text>
                <Text style={styles.escrowAmount}>₹{stats.pendingEarnings.toLocaleString()}</Text>
                <Text style={styles.escrowSub}>Pending in escrow until posts go live</Text>
              </View>
              <Pressable onPress={() => navigation?.navigate('Earnings')} style={styles.escrowLink}>
                <Text style={styles.escrowLinkText}>Earnings →</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* Quick Actions / Shortcuts */}
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
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: spacing.md, paddingBottom: spacing.md,
  },
  greeting: { color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: 14, marginTop: 2, fontWeight: '400' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: { width: '100%', height: '100%', backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },

  heroCard: {
    backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    padding: 22, marginTop: 8,
  },
  heroHeader: { marginBottom: 12 },
  heroEyebrow: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  heroBody: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  heroAmount: { color: colors.neon, fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  heroSub: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  statCard: {
    flex: 1, backgroundColor: colors.card, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 12,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.bg, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  statNumber: { color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.4, marginBottom: 4 },
  statLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },

  section: { marginTop: 28 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  sectionSub: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  sectionLink: { color: colors.neon, fontSize: 13, fontWeight: '600' },

  progressTrack: { height: 7, borderRadius: 4, backgroundColor: colors.elevated, marginBottom: 14, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.neon },

  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  checkCircle: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.elevated,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  checkCircleDone: { backgroundColor: colors.successSoft, borderColor: colors.success },
  checkNumber: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  checkTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  checkSub: { color: colors.textMuted, fontSize: 12, marginTop: 1 },

  activityList: { gap: 10 },
  activityCard: {
    backgroundColor: colors.card, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.bg, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1,
  },
  activityIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: colors.neonSoft,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  activityTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  activitySubtitle: { color: colors.textMuted, fontSize: 12, fontWeight: '400' },
  pillBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  pillText: { fontSize: 12, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },

  escrowCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, marginTop: spacing.xl,
  },
  escrowLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  escrowAmount: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 4 },
  escrowSub: { color: colors.textSubtle, fontSize: 12, marginTop: 2 },
  escrowLink: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.neonSoft },
  escrowLinkText: { color: colors.neon, fontSize: 12, fontWeight: '700' },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 16, padding: 14, alignItems: 'flex-start', gap: 10, minHeight: 86,
    shadowColor: colors.bg, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1,
  },
  actionIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.neonSoft, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: colors.text, fontSize: 12, fontWeight: '600', lineHeight: 16 },
})
