import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, ScrollView } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing, STATUS_COLORS } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import { useAuthStore } from '@shared/stores/auth-store'
import * as Haptics from 'expo-haptics'

interface CampaignMetric {
  id: string
  title: string
  totalBudget: number
  totalSpent: number
  totalBids: number
  acceptedBids: number
  status: string
}

interface CreatorMetric {
  id: string
  name: string
  collaborations: number
  totalSpend: number
  averageRating?: number
  lastInteraction?: string
}

interface MonthlyPoint {
  month: string
  budget: number
  spent: number
}


type Tab = 'campaigns' | 'creators'

function SimpleBarChart({ data }: { data: MonthlyPoint[] }) {
  const max = Math.max(...data.map((d) => Math.max(d.budget, d.spent)), 1)
  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.legendRow}>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.legendDot, { backgroundColor: colors.blue }]} />
          <Text style={chartStyles.legendText}>Budget</Text>
        </View>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={chartStyles.legendText}>Spent</Text>
        </View>
      </View>
      <View style={chartStyles.chartRow}>
        {data.map((point) => (
          <View key={point.month} style={chartStyles.column}>
            <View style={chartStyles.bars}>
              <View style={[chartStyles.bar, { height: `${(point.budget / max) * 100}%`, backgroundColor: colors.blue }]} />
              <View style={[chartStyles.bar, { height: `${(point.spent / max) * 100}%`, backgroundColor: colors.primary }]} />
            </View>
            <Text style={chartStyles.monthLabel}>{point.month}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const chartStyles = StyleSheet.create({
  container: { marginTop: spacing.md },
  legendRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendText: { color: colors.textMuted, fontSize: 11 },
  chartRow: { flexDirection: 'row', justifyContent: 'space-between', height: 140, gap: 4 },
  column: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, flex: 1 },
  bar: { width: 10, borderRadius: 2, minHeight: 2 },
  monthLabel: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
})

export default function AnalyticsScreen({ navigation }: any) {
  const [tab, setTab] = useState<Tab>('campaigns')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [campaignMetrics, setCampaignMetrics] = useState<CampaignMetric[]>([])
  const [creatorMetrics, setCreatorMetrics] = useState<CreatorMetric[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyPoint[]>([])
  const { user } = useAuthStore()

  const loadAnalytics = useCallback(async () => {
    try {
      const [campRes, relRes] = await Promise.all([
        apiService.getMyCampaigns(),
        apiService.getRelationships().catch(() => null),
      ])
      const camps = campRes?.campaigns || campRes?.data || []
      const campsList = (Array.isArray(camps) ? camps : []) as any[]
      setCampaignMetrics(
        campsList.map((c: any) => ({
          id: c.id,
          title: c.title,
          totalBudget: c.budget || 0,
          totalSpent: c.spent || 0,
          totalBids: c.bidCount || 0,
          acceptedBids: c.acceptedBids || 0,
          status: c.status || 'draft',
        }))
      )

      // Last six calendar months (this one included), bucketed by year and month.
      const now = new Date()
      const trend = Array.from({ length: 6 }, (_, k) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - k), 1)
        const monthCamps = campsList.filter((c: any) => {
          const created = new Date(c.createdAt)
          return created.getFullYear() === d.getFullYear() && created.getMonth() === d.getMonth()
        })
        return {
          month: d.toLocaleString('en-US', { month: 'short' }),
          budget: monthCamps.reduce((sum: number, c: any) => sum + (c.budget || 0), 0),
          spent: monthCamps.reduce((sum: number, c: any) => sum + (c.spent || 0), 0),
        }
      })
      setMonthlyData(trend.some((t) => t.budget > 0 || t.spent > 0) ? trend : [])

      const rels = relRes?.relationships || relRes?.data || []
      setCreatorMetrics(
        (Array.isArray(rels) ? rels : []).map((r: any) => ({
          id: r.id,
          name: r.otherParty?.name || 'Unknown',
          collaborations: r.totalCollaborations || 0,
          totalSpend: r.totalSpend || 0,
          averageRating: r.averageRating,
          lastInteraction: r.lastInteractionAt,
        }))
      )
    } catch (err) {
      handleApiError(err, 'Failed to load analytics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadAnalytics()
    }, [loadAnalytics])
  )

  const totalBudget = campaignMetrics.reduce((sum, c) => sum + c.totalBudget, 0)
  const totalSpent = campaignMetrics.reduce((sum, c) => sum + c.totalSpent, 0)
  const totalBids = campaignMetrics.reduce((sum, c) => sum + c.totalBids, 0)

  const renderCampaign = ({ item, index }: { item: CampaignMetric; index: number }) => {
    const s = STATUS_COLORS[item.status] || STATUS_COLORS.draft
    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 80).duration(320)}>
        <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]} onPress={() => navigation?.navigate('CampaignAnalytics', { id: item.id, title: item.title })}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.rowMeta}>₹{item.totalBudget.toLocaleString()} budget · {item.totalBids} applications</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.fg }]}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
        </Pressable>
      </Animated.View>
    )
  }

  const renderCreator = ({ item, index }: { item: CreatorMetric; index: number }) => (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 80).duration(320)}>
      <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]} onPress={() => navigation?.navigate('RelationshipDetail', { id: item.id })}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.rowMeta}>{item.collaborations} collaborations · ₹{item.totalSpend.toLocaleString()} spent</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
      </Pressable>
    </Animated.View>
  )

  if (loading && !refreshing) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <FlatList
          data={(tab === 'campaigns' ? campaignMetrics : creatorMetrics) as any[]}
          renderItem={tab === 'campaigns' ? renderCampaign as any : renderCreator as any}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          ListHeaderComponent={
            <View>
              <View style={styles.header}>
                <Text style={styles.title}>Analytics</Text>
                <Text style={styles.subtitle}>Performance overview</Text>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Total budget</Text>
                  <Text style={styles.metricValue}>₹{totalBudget.toLocaleString()}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Total spent</Text>
                  <Text style={styles.metricValue}>₹{totalSpent.toLocaleString()}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Applications</Text>
                  <Text style={styles.metricValue}>{totalBids}</Text>
                </View>
              </View>

              {tab === 'campaigns' && monthlyData.length > 0 && (
                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>Budget vs spent</Text>
                  <SimpleBarChart data={monthlyData} />
                </View>
              )}

              <View style={styles.tabRow}>
                <Pressable onPress={() => { Haptics.selectionAsync(); setTab('campaigns') }} style={({ pressed }) => [styles.tab, tab === 'campaigns' && styles.tabActive, pressed && { opacity: 0.7 }]}>
                  <Text style={[styles.tabText, tab === 'campaigns' && styles.tabTextActive]}>Campaigns</Text>
                </Pressable>
                <Pressable onPress={() => { Haptics.selectionAsync(); setTab('creators') }} style={({ pressed }) => [styles.tab, tab === 'creators' && styles.tabActive, pressed && { opacity: 0.7 }]}>
                  <Text style={[styles.tabText, tab === 'creators' && styles.tabTextActive]}>Creators</Text>
                </Pressable>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="stats-chart-outline" size={26} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No data yet</Text>
              <Text style={styles.emptySub}>Launch a campaign to see analytics here.</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRefreshing(true); loadAnalytics() }} tintColor={colors.primary} />}
        />
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: spacing.md, marginBottom: spacing.md },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },

  metricsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  metricCard: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md },
  metricLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  metricValue: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 6 },

  chartCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  chartTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: spacing.sm },

  tabRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  tabActive: { backgroundColor: '#fff', borderColor: '#fff' },
  tabText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#000' },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  rowTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  rowMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginRight: spacing.sm },
  statusText: { fontSize: 11, fontWeight: '700' },

  divider: { height: 1, backgroundColor: colors.border },

  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13 },
})
