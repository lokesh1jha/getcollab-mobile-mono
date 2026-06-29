import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Dimensions, Pressable } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { TrialGuard } from '../../../../../components/TrialGuard'
import apiService, { handleApiError } from '@shared/services/api'

type RoutePropType = RouteProp<{ analytics: { id: string; title?: string } }, 'analytics'>
const CHART_HEIGHT = 120

interface Metrics { totalBudget: number; totalSpent: number; remainingBudget: number; totalBids: number; acceptedBids: number; totalMessages: number; campaignStatus: string; startDate?: string; endDate?: string }
interface TimePoint { date: string; bids: number; messages: number; spending: number }
interface InfluencerPerf { influencerId: string; influencerName?: string; bidsCount?: number; acceptedBids?: number; totalSpent?: number }

export default function CampaignAnalyticsScreen() {
  const route = useRoute<RoutePropType>()
  const navigation = useNavigation()
  const { id: campaignId, title } = route.params || ({ id: '' } as any)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [timeseries, setTimeseries] = useState<TimePoint[]>([])
  const [topInfluencers, setTopInfluencers] = useState<InfluencerPerf[]>([])

  const loadAnalytics = useCallback(async () => {
    setError(null)
    try {
      const [metricsRes, tsRes, infRes] = await Promise.all([
        apiService.getAnalytics({ campaignId, type: 'metrics' }).catch(() => null),
        apiService.getAnalytics({ campaignId, type: 'timeseries', days: 30 }).catch(() => null),
        apiService.getAnalytics({ campaignId, type: 'influencers' }).catch(() => null),
      ])
      setMetrics(metricsRes?.data || metricsRes || null)
      const ts = tsRes?.data || tsRes?.timeSeries || tsRes
      setTimeseries(Array.isArray(ts) ? ts : [])
      const inf = infRes?.data || infRes?.influencers || infRes
      setTopInfluencers(Array.isArray(inf) ? inf.slice(0, 5) : [])
    } catch (err: any) { setError(err?.message || 'Failed to load analytics'); handleApiError(err, 'Failed to load analytics') }
    finally { setLoading(false); setRefreshing(false) }
  }, [campaignId])

  useEffect(() => {
    if (campaignId) loadAnalytics()
    else { setLoading(false); setError('No campaign selected') }
  }, [campaignId, loadAnalytics])

  const onRefresh = () => { setRefreshing(true); loadAnalytics() }

  if (loading) {
    return <SafeAreaView style={styles.root}><View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={colors.neon} /></View></SafeAreaView>
  }

  if (error && !metrics) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.md }}>
          <Text style={{ color: colors.error, fontSize: 16, textAlign: 'center' }}>{error}</Text>
          <Pressable style={({ pressed }) => [styles.outlinedBtn, pressed && { opacity: 0.8 }]} onPress={() => navigation.goBack()}>
            <Text style={styles.outlinedBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const acceptanceRate = metrics && metrics.totalBids > 0 ? Math.round((metrics.acceptedBids / metrics.totalBids) * 100) : 0
  const budgetUsedPct = metrics && metrics.totalBudget > 0 ? Math.round((metrics.totalSpent / metrics.totalBudget) * 100) : 0

  return (
    <TrialGuard feature="analytics:premium">
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neon} />}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.header}>
              <Text style={styles.title}>{title || 'Campaign Analytics'}</Text>
              {metrics?.campaignStatus && (
                <View style={styles.statusBadge}><Text style={styles.statusText}>{metrics.campaignStatus}</Text></View>
              )}
            </View>

            {metrics && (
              <>
                <View style={styles.statsGrid}>
                  <StatCard label="Total Budget" value={`₹${metrics.totalBudget.toLocaleString()}`} />
                  <StatCard label="Spent" value={`₹${metrics.totalSpent.toLocaleString()}`} accent />
                  <StatCard label="Remaining" value={`₹${metrics.remainingBudget.toLocaleString()}`} />
                  <StatCard label="Total Bids" value={String(metrics.totalBids)} />
                  <StatCard label="Accepted" value={String(metrics.acceptedBids)} />
                  <StatCard label="Messages" value={String(metrics.totalMessages)} />
                </View>

                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Performance Summary</Text>
                  <PercentRow label="Acceptance Rate" value={acceptanceRate} color={colors.success} />
                  <PercentRow label="Budget Used" value={budgetUsedPct} color={colors.warning} />
                </View>
              </>
            )}

            {timeseries.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Last 30 Days</Text>
                <Text style={styles.chartTitle}>Bids</Text>
                <BarChart data={timeseries.map((t) => t.bids)} color={colors.blue} />
                <Text style={styles.chartCaption}>Total: {timeseries.reduce((s, t) => s + t.bids, 0)}</Text>
                <Text style={[styles.chartTitle, { marginTop: spacing.lg }]}>Spending</Text>
                <BarChart data={timeseries.map((t) => t.spending)} color={colors.neon} />
                <Text style={styles.chartCaption}>Total: ₹{timeseries.reduce((s, t) => s + t.spending, 0).toLocaleString()}</Text>
              </View>
            )}

            {topInfluencers.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Top Performing Creators</Text>
                {topInfluencers.map((inf, idx) => (
                  <View key={inf.influencerId || idx} style={styles.infRow}>
                    <View style={styles.infRank}><Text style={styles.infRankText}>{idx + 1}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infName}>{inf.influencerName || 'Creator'}</Text>
                      <Text style={styles.infMeta}>{inf.acceptedBids ?? 0} accepted · ₹{(inf.totalSpent ?? 0).toLocaleString()} spent</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {metrics && metrics.totalBids === 0 && (
              <View style={styles.card}><Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center' }}>No bids yet on this campaign.</Text></View>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </TrialGuard>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={[styles.statCard, accent && { borderLeftColor: colors.warning }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && { color: colors.warning }]}>{value}</Text>
    </View>
  )
}

function PercentRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>{label}</Text>
        <Text style={{ color, fontSize: 14, fontWeight: '700' }}>{value}%</Text>
      </View>
      <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ width: `${Math.min(100, value)}%`, height: '100%', backgroundColor: color, borderRadius: 4 }} />
      </View>
    </View>
  )
}

function BarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1)
  const screenWidth = Dimensions.get('window').width - spacing.lg * 4
  const barWidth = Math.max(2, Math.floor(screenWidth / data.length) - 2)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT, overflow: 'hidden', marginVertical: spacing.sm }}>
      {data.map((value, idx) => (
        <View key={idx} style={{ width: barWidth, height: Math.max(2, (value / max) * (CHART_HEIGHT - 8)), backgroundColor: color, opacity: 0.85, marginRight: 2, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', letterSpacing: -0.5, flex: 1, marginRight: spacing.md },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.blueSoft, borderRadius: radius.pill },
  statusText: { color: colors.blue, fontSize: 11, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: spacing.lg },
  statCard: { width: '48%', backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, borderLeftWidth: 4, borderLeftColor: colors.blue, borderWidth: 1, borderColor: colors.border },
  statLabel: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.xs },
  statValue: { color: '#fff', fontSize: 18, fontWeight: '700' },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: spacing.md },
  chartTitle: { color: '#fff', fontSize: 13, fontWeight: '600', marginBottom: spacing.xs },
  chartCaption: { color: colors.textMuted, fontSize: 12 },
  infRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  infRank: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  infRankText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  infName: { color: '#fff', fontWeight: '600', fontSize: 14 },
  infMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  outlinedBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong },
  outlinedBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
