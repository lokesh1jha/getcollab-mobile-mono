import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable, Dimensions } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, radius, spacing } from '@/src/theme'
import { useCampaignStore } from '@shared/stores/campaign-store'
import { useInfluencerStore } from '@shared/stores/influencer-store'
import { useAuthStore } from '@shared/stores/auth-store'
import { useSubscriptionStore } from '../../../../stores/subscription-store'
import { SubscriptionBanner } from '../../../../components/SubscriptionBanner'
import { SubscriptionExpiredModal } from '../../../../components/SubscriptionExpiredModal'
import { EmailVerificationBanner } from '@shared/components/EmailVerificationBanner'
import { logger } from '@shared/services/logger'

const { width } = Dimensions.get('window')
const CARD_W = width * 0.42

const STATUS_COLORS: Record<string, { fg: string; bg: string; dot: string }> = {
  active: { fg: '#22C55E', bg: 'rgba(34,197,94,0.12)', dot: '#22C55E' },
  draft: { fg: '#A1A1AA', bg: 'rgba(161,161,170,0.12)', dot: '#A1A1AA' },
  completed: { fg: '#3B82F6', bg: 'rgba(59,130,246,0.14)', dot: '#3B82F6' },
  paused: { fg: '#F59E0B', bg: 'rgba(245,158,11,0.14)', dot: '#F59E0B' },
  cancelled: { fg: '#EF4444', bg: 'rgba(239,68,68,0.14)', dot: '#EF4444' },
}

function getGreeting(name?: string): { greeting: string; subtitle: string } {
  const hour = new Date().getHours()
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = name?.split(' ')[0]
  return {
    greeting: firstName ? `${timeGreeting}, ${firstName}` : timeGreeting,
    subtitle: "Here's what's happening today.",
  }
}

interface ScreenProps { navigation?: any }

export default function BrandDashboardScreen({ navigation }: ScreenProps) {
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showExpiredModal, setShowExpiredModal] = useState(false)

  const { myCampaigns, fetchMyCampaigns } = useCampaignStore()
  const { influencers, fetchInfluencers } = useInfluencerStore()
  const subscription = useSubscriptionStore((s) => s.subscription)
  const { user } = useAuthStore()

  const loadDashboardData = useCallback(async () => {
    setLoadError(null)
    try {
      setLoading(true)
      await Promise.all([fetchMyCampaigns(), fetchInfluencers()])
    } catch (error: any) {
      const message = error?.message || 'Failed to load dashboard data'
      setLoadError(message)
      logger.error(message, error)
    } finally { setLoading(false) }
  }, [fetchMyCampaigns, fetchInfluencers])

  useFocusEffect(useCallback(() => { loadDashboardData() }, [loadDashboardData]))

  const handleRefresh = async () => {
    setRefreshing(true)
    try { await loadDashboardData() } finally { setRefreshing(false) }
  }

  useEffect(() => {
    const status = subscription?.status
    if (status === 'EXPIRED' || status === 'CANCELLED') setShowExpiredModal(true)
  }, [subscription?.status])

  const activeCampaignsCount = myCampaigns.filter(c => c.status === 'active').length
  const totalBidsCount = myCampaigns.reduce((sum, c) => sum + (c.bidCount || 0), 0)
  const { greeting, subtitle } = getGreeting(user?.name || user?.companyName)

  const kpiCards = [
    {
      id: 'active', label: 'Active Campaigns', value: activeCampaignsCount,
      delta: myCampaigns.length > 0 ? { text: `${myCampaigns.length} total`, trend: 'up' as const } : undefined,
    },
    {
      id: 'bids', label: 'Total Bids', value: totalBidsCount,
      delta: totalBidsCount > 0 ? { text: `${activeCampaignsCount} campaigns`, trend: 'up' as const } : undefined,
    },
    {
      id: 'creators', label: 'Creators', value: influencers.length,
      delta: influencers.length > 0 ? { text: 'Available', trend: 'up' as const } : undefined,
    },
    {
      id: 'campaigns', label: 'Campaigns', value: myCampaigns.length,
      delta: activeCampaignsCount > 0 ? { text: `${activeCampaignsCount} live`, trend: 'up' as const } : undefined,
    },
  ]

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.neon} />
      </View>
    )
  }

  if (loadError) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', padding: spacing.lg }]}>
        <View style={[styles.kpiCard, { width: '100%', maxWidth: 400, alignItems: 'center', padding: spacing.xl }]}>
          <Text style={{ color: colors.error, fontSize: 16, textAlign: 'center', lineHeight: 22 }}>{loadError}</Text>
          <Pressable style={({ pressed }) => [styles.blueBtn, { marginTop: spacing.lg }, pressed && { opacity: 0.85 }]} onPress={loadDashboardData}>
            <Text style={styles.blueBtnText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: spacing.xxxl }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.neon} />}
        >
          <EmailVerificationBanner />
          <SubscriptionBanner />

          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <Pressable testID="dashboard-notif-btn" style={styles.bellBtn} hitSlop={10} onPress={() => navigation?.navigate('Notifications')}>
              <Ionicons name="notifications-outline" size={20} color="#fff" />
              <View style={styles.bellDot} />
            </Pressable>
          </View>

          {/* KPI Cards */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md, paddingVertical: spacing.sm }} style={{ marginTop: spacing.sm }}>
            {kpiCards.map((k, i) => (
              <Animated.View key={k.id} entering={FadeInDown.delay(80 * i).duration(320)} style={[styles.kpiCard, { width: CARD_W }]}>
                <Text style={styles.kpiLabel}>{k.label}</Text>
                <Text style={styles.kpiValue}>{k.value}</Text>
                {k.delta && (
                  <View style={[styles.deltaPill, { backgroundColor: k.delta.trend === 'up' ? colors.successSoft : colors.errorSoft }]}>
                    <Ionicons name={k.delta.trend === 'up' ? 'trending-up' : 'trending-down'} size={11} color={k.delta.trend === 'up' ? colors.success : colors.error} />
                    <Text style={[styles.deltaText, { color: k.delta.trend === 'up' ? colors.success : colors.error }]}>{k.delta.text}</Text>
                  </View>
                )}
              </Animated.View>
            ))}
          </ScrollView>

          {/* AI Insights */}
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.aiCard} testID="ai-insights-card">
              <LinearGradient colors={['rgba(59,130,246,0.20)', 'rgba(59,130,246,0.02)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
              <View style={styles.aiTopRow}>
                <View style={styles.aiBadge}>
                  <Ionicons name="sparkles" size={12} color={colors.blue} />
                  <Text style={styles.aiBadgeText}>AI INSIGHTS</Text>
                </View>
                <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
              </View>
              <Text style={styles.aiHeading}>Discover creators that match your brand</Text>
              <Text style={styles.aiSub}>AI-powered matching across categories, audience, and engagement metrics.</Text>
              <Pressable
                testID="ai-review-matches-btn"
                onPress={() => navigation?.navigate('Creators')}
                style={({ pressed }) => [styles.aiCta, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.aiCtaText}>Browse Creators</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </Pressable>
            </Animated.View>
          </View>

          {/* Recent Campaigns */}
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Campaigns</Text>
              {myCampaigns.length > 0 && (
                <Pressable onPress={() => navigation?.navigate('Campaigns')}>
                  <Text style={styles.sectionLink}>View all</Text>
                </Pressable>
              )}
            </View>

            {myCampaigns.length > 0 ? (
              <View style={styles.listCard}>
                {myCampaigns.slice(0, 3).map((c, idx) => {
                  const st = c.status || 'draft'
                  const s = STATUS_COLORS[st] || STATUS_COLORS.draft
                  return (
                    <Pressable
                      key={c.id}
                      style={({ pressed }) => [styles.listRow, idx !== Math.min(myCampaigns.length - 1, 2) && styles.listRowDivider, pressed && { opacity: 0.85 }]}
                      onPress={() => navigation?.navigate('CampaignDetails', { id: c.id, campaign: c })}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.campaignName} numberOfLines={1}>{c.title}</Text>
                        <View style={styles.metaRow}>
                          <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
                            <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
                            <Text style={[styles.statusText, { color: s.fg }]}>{st.charAt(0).toUpperCase() + st.slice(1)}</Text>
                          </View>
                          <Text style={styles.metaText}>₹{(c.budget || 0).toLocaleString()}</Text>
                          <Text style={styles.metaDot}>·</Text>
                          <Text style={styles.metaText}>{c.bidCount || 0} bids</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
                    </Pressable>
                  )
                })}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' }}>No campaigns yet</Text>
                <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: spacing.xs }}>Create your first campaign to get started</Text>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
            <Text style={[styles.sectionTitle, { marginBottom: spacing.md }]}>Quick Actions</Text>
            <View style={styles.actionGrid}>
              <ActionCard icon="search" label="Find Creators" onPress={() => navigation?.navigate('Creators')} />
              <ActionCard icon="add-circle" label="Create Campaign" onPress={() => navigation?.navigate('CreateCampaign')} />
              <ActionCard icon="person-add" label="Messages" onPress={() => navigation?.navigate('Chat')} />
              <ActionCard icon="document-text" label="View Bids" onPress={() => navigation?.navigate('Bids')} />
              <ActionCard icon="stats-chart" label="Analytics" onPress={() => {
                const first = myCampaigns[0]
                if (first) navigation?.navigate('CampaignAnalytics', { id: first.id, campaign: first })
                else navigation?.navigate('Campaigns')
              }} />
              <ActionCard icon="card" label="Billing" onPress={() => navigation?.navigate('Subscription')} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
      <SubscriptionExpiredModal visible={showExpiredModal} onClose={() => setShowExpiredModal(false)} />
    </View>
  )
}

function ActionCard({ icon, label, onPress }: { icon: any; label: string; onPress?: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] }]}
      onPress={onPress}
    >
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  greeting: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card,
  },
  bellDot: { position: 'absolute', top: 10, right: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.neon, borderWidth: 2, borderColor: colors.card },

  kpiCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, gap: 6 },
  kpiLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },
  kpiValue: { color: '#fff', fontSize: 26, fontWeight: '700', letterSpacing: -0.8, marginTop: 2 },
  deltaPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 4 },
  deltaText: { fontSize: 11, fontWeight: '700' },

  aiCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: 'rgba(59,130,246,0.35)', borderRadius: radius.lg, padding: spacing.lg, overflow: 'hidden' },
  aiTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(59,130,246,0.16)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  aiBadgeText: { color: colors.blue, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  aiHeading: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 24, letterSpacing: -0.4, marginTop: spacing.md },
  aiSub: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  aiCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.blue, borderRadius: radius.pill, paddingVertical: 12, marginTop: spacing.lg },
  aiCtaText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  sectionLink: { color: colors.blue, fontSize: 13, fontWeight: '600' },

  listCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  listRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  campaignName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  metaText: { color: colors.textMuted, fontSize: 12 },
  metaDot: { color: colors.textSubtle, fontSize: 12 },

  blueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.blue, borderRadius: radius.pill, paddingVertical: 12 },
  blueBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  actionCard: {
    width: (width - spacing.lg * 2 - spacing.md * 2) / 3,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, alignItems: 'flex-start', gap: 10, minHeight: 92,
  },
  actionIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  actionLabel: { color: '#fff', fontSize: 12, fontWeight: '600', lineHeight: 16 },

  emptyCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center' },
})
