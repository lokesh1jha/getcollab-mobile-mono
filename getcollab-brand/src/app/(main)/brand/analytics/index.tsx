import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, ScrollView } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import { useAuthStore } from '@shared/stores/auth-store'

interface CampaignMetric { id: string; title: string; totalBudget: number; totalSpent: number; totalBids: number; acceptedBids: number; status: string }
interface CreatorMetric { id: string; name: string; collaborations: number; totalSpend: number; averageRating?: number; lastInteraction?: string }

const STATUS_COLORS: Record<string, { fg: string; bg: string }> = {
  active: { fg: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  draft: { fg: '#A1A1AA', bg: 'rgba(161,161,170,0.12)' },
  completed: { fg: '#3B82F6', bg: 'rgba(59,130,246,0.14)' },
  paused: { fg: '#F59E0B', bg: 'rgba(245,158,11,0.14)' },
  cancelled: { fg: '#EF4444', bg: 'rgba(239,68,68,0.14)' },
}

type Tab = 'campaigns' | 'creators'

export default function AnalyticsScreen({ navigation }: any) {
  const [tab, setTab] = useState<Tab>('campaigns')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [campaignMetrics, setCampaignMetrics] = useState<CampaignMetric[]>([])
  const [creatorMetrics, setCreatorMetrics] = useState<CreatorMetric[]>([])
  const { user } = useAuthStore()

  const loadAnalytics = useCallback(async () => {
    try {
      const [campRes, relRes] = await Promise.all([
        apiService.getMyCampaigns(),
        apiService.getRelationships().catch(() => null),
      ])
      const camps = campRes?.campaigns || campRes?.data || []
      setCampaignMetrics(
        (Array.isArray(camps) ? camps : []).map((c: any) => ({
          id: c.id,
          title: c.title,
          totalBudget: c.budget || 0,
          totalSpent: c.spent || 0,
          totalBids: c.bidCount || 0,
          acceptedBids: c.acceptedBids || 0,
          status: c.status || 'draft',
        }))
      )
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
      <Animated.View entering={FadeInDown.delay(index * 40).duration(320)}>
        <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]} onPress={() => navigation?.navigate('CampaignAnalytics', { id: item.id, title: item.title })}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.rowMeta}>₹{item.totalBudget.toLocaleString()} budget · {item.totalBids} bids</Text>
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
    <Animated.View entering={FadeInDown.delay(index * 40).duration(320)}>
      <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]} onPress={() => navigation?.navigate('RelationshipDetail', { id: item.id })}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.rowMeta}>{item.collaborations} collabs · ₹{item.totalSpend.toLocaleString()} spent</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
      </Pressable>
    </Animated.View>
  )

  if (loading && !refreshing) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.neon} />
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
                  <Text style={styles.metricLabel}>Total Budget</Text>
                  <Text style={styles.metricValue}>₹{totalBudget.toLocaleString()}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Total Spent</Text>
                  <Text style={styles.metricValue}>₹{totalSpent.toLocaleString()}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Total Bids</Text>
                  <Text style={styles.metricValue}>{totalBids}</Text>
                </View>
              </View>

              <View style={styles.tabRow}>
                <Pressable onPress={() => setTab('campaigns')} style={({ pressed }) => [styles.tab, tab === 'campaigns' && styles.tabActive, pressed && { opacity: 0.7 }]}>
                  <Text style={[styles.tabText, tab === 'campaigns' && styles.tabTextActive]}>Campaigns</Text>
                </Pressable>
                <Pressable onPress={() => setTab('creators')} style={({ pressed }) => [styles.tab, tab === 'creators' && styles.tabActive, pressed && { opacity: 0.7 }]}>
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
              <Text style={styles.emptySub}>Analytics will appear once you have campaigns and relationships.</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAnalytics() }} tintColor={colors.neon} />}
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
