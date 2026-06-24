import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import { colors, spacing } from '@shared/constants'
import { Card, Button } from '@shared/components/ui'
import { TrialGuard } from '../../../../../components/TrialGuard'
import apiService, { handleApiError } from '@shared/services/api'

type AnalyticsRouteProp = RouteProp<{ analytics: { id: string; title?: string } }, 'analytics'>

interface Metrics {
  totalBudget: number
  totalSpent: number
  remainingBudget: number
  totalBids: number
  acceptedBids: number
  totalMessages: number
  campaignStatus: string
  startDate?: string
  endDate?: string
}

interface TimePoint {
  date: string
  bids: number
  messages: number
  spending: number
}

interface InfluencerPerf {
  influencerId: string
  influencerName?: string
  bidsCount?: number
  acceptedBids?: number
  totalSpent?: number
}

const CHART_HEIGHT = 120

export default function CampaignAnalyticsScreen() {
  const route = useRoute<AnalyticsRouteProp>()
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
    } catch (err: any) {
      setError(err?.message || 'Failed to load analytics')
      handleApiError(err, 'Failed to load analytics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [campaignId])

  useEffect(() => {
    if (campaignId) {
      loadAnalytics()
    } else {
      setLoading(false)
      setError('No campaign selected')
    }
  }, [campaignId, loadAnalytics])

  const onRefresh = () => {
    setRefreshing(true)
    loadAnalytics()
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  if (error && !metrics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} variant="outline" />
        </View>
      </SafeAreaView>
    )
  }

  const acceptanceRate = metrics && metrics.totalBids > 0
    ? Math.round((metrics.acceptedBids / metrics.totalBids) * 100)
    : 0
  const budgetUsedPct = metrics && metrics.totalBudget > 0
    ? Math.round((metrics.totalSpent / metrics.totalBudget) * 100)
    : 0

  return (
    <TrialGuard feature="analytics:premium">
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{title || 'Campaign Analytics'}</Text>
          {metrics?.campaignStatus && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{metrics.campaignStatus}</Text>
            </View>
          )}
        </View>

        {metrics && (
          <>
            <View style={styles.statsGrid}>
              <StatCard label="Total Budget" value={`₹${metrics.totalBudget.toLocaleString()}`} accent={colors.primary} />
              <StatCard label="Spent" value={`₹${metrics.totalSpent.toLocaleString()}`} accent={colors.warning} />
              <StatCard label="Remaining" value={`₹${metrics.remainingBudget.toLocaleString()}`} accent={colors.success} />
              <StatCard label="Total Bids" value={String(metrics.totalBids)} accent={colors.accent} />
              <StatCard label="Accepted" value={String(metrics.acceptedBids)} accent={colors.success} />
              <StatCard label="Messages" value={String(metrics.totalMessages)} accent={colors.secondary} />
            </View>

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Performance Summary</Text>
              <PercentRow label="Acceptance Rate" value={acceptanceRate} color={colors.success} />
              <PercentRow label="Budget Used" value={budgetUsedPct} color={colors.warning} />
            </Card>
          </>
        )}

        {timeseries.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Last 30 Days — Bids</Text>
            <BarChart data={timeseries.map((t) => t.bids)} color={colors.primary} />
            <Text style={styles.chartCaption}>
              Total: {timeseries.reduce((s, t) => s + t.bids, 0)} bids
            </Text>

            <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Messages</Text>
            <BarChart data={timeseries.map((t) => t.messages)} color={colors.accent} />
            <Text style={styles.chartCaption}>
              Total: {timeseries.reduce((s, t) => s + t.messages, 0)} messages
            </Text>

            <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Spending (₹)</Text>
            <BarChart data={timeseries.map((t) => t.spending)} color={colors.success} />
            <Text style={styles.chartCaption}>
              Total: ₹{timeseries.reduce((s, t) => s + t.spending, 0).toLocaleString()}
            </Text>
          </Card>
        )}

        {topInfluencers.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Top Performing Creators</Text>
            {topInfluencers.map((inf, idx) => (
              <View key={inf.influencerId || idx} style={styles.influencerRow}>
                <View style={styles.influencerRank}>
                  <Text style={styles.influencerRankText}>{idx + 1}</Text>
                </View>
                <View style={styles.influencerInfo}>
                  <Text style={styles.influencerName}>{inf.influencerName || 'Creator'}</Text>
                  <Text style={styles.influencerStats}>
                    {inf.acceptedBids ?? 0} accepted · ₹{(inf.totalSpent ?? 0).toLocaleString()} spent
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {metrics && metrics.totalBids === 0 && (
          <Card style={styles.section}>
            <Text style={styles.emptyText}>
              No bids yet on this campaign. Share your campaign to attract creators.
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
    </TrialGuard>
  )
}

interface StatCardProps {
  label: string
  value: string
  accent: string
}

const StatCard = ({ label, value, accent }: StatCardProps) => (
  <View style={[styles.statCard, { borderLeftColor: accent }]}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
  </View>
)

interface PercentRowProps {
  label: string
  value: number
  color: string
}

const PercentRow = ({ label, value, color }: PercentRowProps) => (
  <View style={styles.percentRow}>
    <View style={styles.percentHeader}>
      <Text style={styles.percentLabel}>{label}</Text>
      <Text style={[styles.percentValue, { color }]}>{value}%</Text>
    </View>
    <View style={styles.percentTrack}>
      <View style={[styles.percentFill, { width: `${Math.min(100, value)}%`, backgroundColor: color }]} />
    </View>
  </View>
)

interface BarChartProps {
  data: number[]
  color: string
}

const BarChart = ({ data, color }: BarChartProps) => {
  const max = Math.max(...data, 1)
  const screenWidth = Dimensions.get('window').width - spacing.lg * 4
  const barWidth = Math.max(2, Math.floor(screenWidth / data.length) - 2)
  return (
    <View style={[styles.chartContainer, { height: CHART_HEIGHT }]}>
      {data.map((value, idx) => {
        const heightPct = max === 0 ? 0 : value / max
        return (
          <View
            key={idx}
            style={{
              width: barWidth,
              height: Math.max(2, heightPct * (CHART_HEIGHT - 8)),
              backgroundColor: color,
              opacity: 0.85,
              marginRight: 2,
              borderTopLeftRadius: 2,
              borderTopRightRadius: 2,
            }}
          />
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    marginRight: spacing.md,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: `${colors.primary}20`,
    borderRadius: 12,
  },
  statusText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderTopColor: colors.border,
    borderBottomColor: colors.border,
    borderRightColor: colors.border,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  percentRow: {
    marginBottom: spacing.md,
  },
  percentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  percentLabel: {
    color: colors.textMuted,
    fontSize: 14,
  },
  percentValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  percentTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  percentFill: {
    height: '100%',
    borderRadius: 4,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  chartCaption: {
    fontSize: 12,
    color: colors.textMuted,
  },
  influencerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  influencerRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  influencerRankText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 13,
  },
  influencerInfo: {
    flex: 1,
  },
  influencerName: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  influencerStats: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
})
