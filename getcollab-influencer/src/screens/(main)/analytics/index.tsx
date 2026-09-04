import React, { useState, useCallback } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing, statusColor } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'

// Analytics are derived from the influencer's own data (bids, earnings, profile
// metrics). The backend /analytics endpoint is brand-org scoped, so it is
// intentionally not used here.

interface PlatformStat {
  key: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  followers: number
  engagement: number | null
}

const PLATFORMS: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'instagramMetrics', label: 'Instagram', icon: 'logo-instagram' },
  { key: 'youtubeMetrics', label: 'YouTube', icon: 'logo-youtube' },
  { key: 'tiktokMetrics', label: 'TikTok', icon: 'logo-tiktok' },
  { key: 'twitterMetrics', label: 'Twitter', icon: 'logo-twitter' },
  { key: 'facebookMetrics', label: 'Facebook', icon: 'logo-facebook' },
]

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function money(n: number): string {
  return `₹${Number(n || 0).toLocaleString()}`
}

export default function AnalyticsScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [failed, setFailed] = useState(false)

  const [totalBids, setTotalBids] = useState(0)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [bidAmounts, setBidAmounts] = useState({ total: 0, accepted: 0 })
  const [earnings, setEarnings] = useState({ paid: 0, pending: 0, payouts: 0 })
  const [platforms, setPlatforms] = useState<PlatformStat[]>([])
  const [activity, setActivity] = useState<number[]>([])
  const [campaigns, setCampaigns] = useState<{ id: string; title: string; count: number; amount: number; accepted: boolean }[]>([])

  const load = useCallback(async (spinner = false) => {
    if (spinner) setLoading(true)
    setFailed(false)
    try {
      const [bidsRes, earningsRes, profileRes] = await Promise.all([
        apiService.getBids().catch(() => null),
        apiService.getEarnings().catch(() => null),
        apiService.getProfileWithMetrics().catch(() => apiService.getProfile().catch(() => null)),
      ])

      const bids = bidsRes?.data || bidsRes?.bids || (Array.isArray(bidsRes) ? bidsRes : [])
      const bidList = Array.isArray(bids) ? bids : []
      const counts: Record<string, number> = {}
      let amountTotal = 0
      let amountAccepted = 0
      for (const b of bidList) {
        const s = String(b.status || 'pending').toLowerCase()
        counts[s] = (counts[s] || 0) + 1
        amountTotal += Number(b.amount) || 0
        if (s === 'accepted') amountAccepted += Number(b.amount) || 0
      }
      setTotalBids(bidList.length)
      setStatusCounts(counts)
      setBidAmounts({ total: amountTotal, accepted: amountAccepted })

      // 30-day application activity, bucketed client-side from bid dates
      const buckets = new Array(30).fill(0) as number[]
      let dated = 0
      for (const b of bidList) {
        const raw = b.createdAt || b.created_at || b.appliedAt
        if (!raw) continue
        const t = new Date(raw).getTime()
        if (Number.isNaN(t)) continue
        const daysAgo = Math.floor((Date.now() - t) / 86_400_000)
        if (daysAgo >= 0 && daysAgo < 30) { buckets[29 - daysAgo] += 1; dated += 1 }
      }
      setActivity(dated > 0 ? buckets : [])

      // Per-campaign bid aggregation
      const byCampaign = new Map<string, { id: string; title: string; count: number; amount: number; accepted: boolean }>()
      for (const b of bidList) {
        const id = String(b.campaignId || b.campaign?.id || '')
        if (!id) continue
        const entry = byCampaign.get(id) || {
          id,
          title: b.campaignTitle || b.campaign?.title || `Campaign #${id.slice(-4)}`,
          count: 0,
          amount: 0,
          accepted: false,
        }
        entry.count += 1
        entry.amount += Number(b.amount) || 0
        const st = String(b.status || '').toLowerCase()
        if (st === 'accepted' || st === 'active') entry.accepted = true
        byCampaign.set(id, entry)
      }
      setCampaigns([...byCampaign.values()].sort((a, b) => b.amount - a.amount).slice(0, 8))

      const list = earningsRes?.data || earningsRes?.requests || earningsRes?.earnings || (Array.isArray(earningsRes) ? earningsRes : [])
      const settlementList = Array.isArray(list) ? list : []
      let paid = 0
      let pending = 0
      for (const s of settlementList) {
        const st = String(s.status || '').toLowerCase()
        if (st === 'paid' || st === 'completed') paid += Number(s.amount) || 0
        else if (st === 'pending' || st === 'processing') pending += Number(s.amount) || 0
      }
      setEarnings({ paid, pending, payouts: settlementList.length })

      const profile = profileRes?.data || profileRes?.profile || profileRes?.influencerProfile || profileRes || {}
      const stats: PlatformStat[] = PLATFORMS.map((p) => {
        const m = (profile as any)[p.key] || {}
        const followers = Number(m.followers) || 0
        const engagement = Number(m.avgEngagement) || 0
        return {
          ...p,
          followers,
          engagement: engagement > 0 ? engagement : null,
        }
      }).filter((p) => p.followers > 0)
      setPlatforms(stats)
    } catch (err: any) {
      setFailed(true)
      handleApiError(err, 'Failed to load analytics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load(true) }, [load]))
  const onRefresh = () => { setRefreshing(true); load(false) }

  const accepted = statusCounts['accepted'] || 0
  const rejected = statusCounts['rejected'] || 0
  const pending = (statusCounts['pending'] || 0) + (statusCounts['applied'] || 0)
  const winRate = totalBids > 0 ? Math.round((accepted / totalBids) * 100) : 0
  const maxActivity = Math.max(...activity, 1)

  const statusRows = [
    { status: 'accepted', label: 'Accepted', count: accepted },
    { status: 'applied', label: 'In review', count: pending },
    { status: 'rejected', label: 'Declined', count: rejected },
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
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neon} />}
        >
          {/* Performance hero */}
          <Animated.View entering={FadeInDown.delay(0).duration(320)} style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalBids}</Text>
              <Text style={styles.statLabel}>Applications</Text>
            </View>
            <View style={[styles.statCard, winRate > 0 && { borderColor: colors.neonSoft }]}>
              <Text style={[styles.statValue, winRate > 0 && { color: colors.neon }]}>{winRate}%</Text>
              <Text style={styles.statLabel}>Win rate</Text>
            </View>
          </Animated.View>

          {/* Application activity */}
          {activity.length > 0 && (
            <Animated.View entering={FadeInDown.delay(40).duration(320)}>
              <Text style={styles.sectionTitle}>Applications · last 30 days</Text>
              <View style={styles.chartCard}>
                <View style={styles.chartBars}>
                  {activity.map((count, i) => (
                    <View
                      key={i}
                      style={[styles.chartBar, { height: Math.max((count / maxActivity) * 96, count > 0 ? 6 : 2), backgroundColor: count > 0 ? colors.blue : colors.elevated }]}
                    />
                  ))}
                </View>
                <View style={styles.chartAxis}>
                  <Text style={styles.chartAxisText}>30d ago</Text>
                  <Text style={styles.chartAxisText}>15d</Text>
                  <Text style={styles.chartAxisText}>Today</Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Bid status breakdown */}
          <Animated.View entering={FadeInDown.delay(80).duration(320)}>
            <Text style={styles.sectionTitle}>Bid status</Text>
            <View style={styles.listCard}>
              {statusRows.map((row, i) => {
                const s = statusColor(row.status)
                return (
                  <View key={row.status} style={[styles.listRow, i < statusRows.length - 1 && styles.listRowDivider]}>
                    <View style={styles.listLeft}>
                      <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
                      <Text style={styles.listLabel}>{row.label}</Text>
                    </View>
                    <Text style={styles.listValue}>{row.count}</Text>
                  </View>
                )
              })}
            </View>
          </Animated.View>

          {/* Bid value */}
          {bidAmounts.total > 0 && (
            <Animated.View entering={FadeInDown.delay(140).duration(320)}>
              <Text style={styles.sectionTitle}>Bid value</Text>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{money(bidAmounts.total)}</Text>
                  <Text style={styles.statLabel}>Total bid</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: colors.success }]}>{money(bidAmounts.accepted)}</Text>
                  <Text style={styles.statLabel}>Won</Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* By campaign */}
          {campaigns.length > 0 && (
            <Animated.View entering={FadeInDown.delay(170).duration(320)}>
              <Text style={styles.sectionTitle}>By campaign</Text>
              <View style={styles.listCard}>
                {campaigns.map((c, i) => (
                  <View key={c.id} style={[styles.listRow, i < campaigns.length - 1 && styles.listRowDivider]}>
                    <View style={styles.listLeft}>
                      <View style={[styles.statusDot, { backgroundColor: c.accepted ? colors.success : colors.blue }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listLabel} numberOfLines={1}>{c.title}</Text>
                        <Text style={styles.campaignSub}>{c.count} bid{c.count === 1 ? '' : 's'} · {money(c.amount)}</Text>
                      </View>
                    </View>
                    {c.accepted && <Ionicons name="checkmark-circle" size={16} color={colors.success} />}
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Earnings */}
          <Animated.View entering={FadeInDown.delay(200).duration(320)}>
            <Text style={styles.sectionTitle}>Earnings</Text>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { borderColor: 'rgba(34,197,94,0.3)' }]}>
                <Text style={[styles.statValue, { color: colors.success }]}>{money(earnings.paid)}</Text>
                <Text style={styles.statLabel}>Total paid</Text>
              </View>
              <View style={[styles.statCard, { borderColor: 'rgba(245,158,11,0.3)' }]}>
                <Text style={[styles.statValue, { color: colors.warning }]}>{money(earnings.pending)}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </View>
            {earnings.payouts > 0 && (
              <Text style={styles.payoutNote}>{earnings.payouts} payout{earnings.payouts === 1 ? '' : 's'} on record</Text>
            )}
          </Animated.View>

          {/* Audience by platform */}
          <Animated.View entering={FadeInDown.delay(260).duration(320)}>
            <Text style={styles.sectionTitle}>Audience</Text>
            {platforms.length > 0 ? (
              <View style={styles.listCard}>
                {platforms.map((p, i) => (
                  <View key={p.key} style={[styles.listRow, i < platforms.length - 1 && styles.listRowDivider]}>
                    <View style={styles.listLeft}>
                      <View style={styles.platformIcon}>
                        <Ionicons name={p.icon} size={16} color={colors.textMuted} />
                      </View>
                      <Text style={styles.listLabel}>{p.label}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.listValue}>{formatCount(p.followers)}</Text>
                      {p.engagement !== null && (
                        <Text style={styles.engagement}>{p.engagement.toFixed(1)}% engagement</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="people-outline" size={26} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No audience data</Text>
                <Text style={styles.emptySub}>Connect your social accounts to see follower stats.</Text>
              </View>
            )}
          </Animated.View>

          {failed && totalBids === 0 && (
            <Pressable onPress={() => load(true)} style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.85 }]}>
              <Ionicons name="refresh" size={16} color={colors.text} />
              <Text style={styles.retryText}>Tap to retry</Text>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  statCard: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, gap: 4 },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: spacing.xl, marginBottom: spacing.md },
  listCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  listRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  listLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  listLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  listValue: { color: colors.text, fontSize: 15, fontWeight: '700' },
  platformIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  engagement: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  payoutNote: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.lg, paddingVertical: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  retryText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  chartCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 2 },
  chartBar: { flex: 1, borderRadius: 2 },
  chartAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  chartAxisText: { color: colors.textSubtle, fontSize: 10 },
  campaignSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
})
