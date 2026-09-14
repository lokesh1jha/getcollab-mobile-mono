import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, RouteProp } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import type { AffiliateReward } from '@shared/types'

type RouteParams = RouteProp<{ affiliateCommissions: { programId?: string } }, 'affiliateCommissions'>

const STATUS_COLORS: Record<string, { fg: string; bg: string }> = {
  pending: { fg: '#F59E0B', bg: 'rgba(245,158,11,0.14)' },
  approved: { fg: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  paid: { fg: '#3B82F6', bg: 'rgba(59,130,246,0.14)' },
  rejected: { fg: '#EF4444', bg: 'rgba(239,68,68,0.14)' },
}

export default function AffiliateCommissionsScreen() {
  const route = useRoute<RouteParams>()
  const { programId } = route.params || {}

  const [rewards, setRewards] = useState<AffiliateReward[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadRewards = useCallback(async () => {
    try {
      const res = await apiService.getAffiliateRewards()
      const list = res?.rewards || res?.data || []
      const all = Array.isArray(list) ? list : []
      setRewards(programId ? all.filter((r: AffiliateReward) => r.programId === programId) : all)
    } catch (err) {
      handleApiError(err, 'Failed to load commissions')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [programId])

  useEffect(() => {
    loadRewards()
  }, [loadRewards])

  const totalPending = rewards.filter((r) => r.status === 'pending').reduce((sum, r) => sum + r.amountMinor, 0)
  const totalPaid = rewards.filter((r) => r.status === 'paid').reduce((sum, r) => sum + r.amountMinor, 0)

  const renderItem = ({ item, index }: { item: AffiliateReward; index: number }) => {
    const st = item.status || 'pending'
    const s = STATUS_COLORS[st] || STATUS_COLORS.pending
    return (
      <Animated.View entering={FadeInDown.delay(index * 40).duration(320)} style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.amount}>₹{(item.amountMinor / 100).toLocaleString()}</Text>
            <Text style={styles.meta}>{item.currency} · {new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.fg }]}>{st.charAt(0).toUpperCase() + st.slice(1)}</Text>
          </View>
        </View>
        {item.rejectReason && <Text style={styles.rejectReason}>Reason: {item.rejectReason}</Text>}
      </Animated.View>
    )
  }

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
          data={rewards}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListHeaderComponent={
            <View>
              <View style={styles.header}>
                <Text style={styles.title}>Commissions</Text>
                <Text style={styles.subtitle}>{rewards.length} reward{rewards.length !== 1 ? 's' : ''}</Text>
              </View>
              <View style={styles.metricsRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Pending</Text>
                  <Text style={styles.metricValue}>₹{(totalPending / 100).toLocaleString()}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Paid</Text>
                  <Text style={styles.metricValue}>₹{(totalPaid / 100).toLocaleString()}</Text>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="cash-outline" size={26} color={colors.textMuted} /></View>
              <Text style={styles.emptyTitle}>No commissions yet</Text>
              <Text style={styles.emptySub}>Commissions appear when referrals convert.</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRewards() }} tintColor={colors.neon} />}
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
  metricCard: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  metricLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  metricValue: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 6 },

  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  amount: { color: '#fff', fontSize: 18, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  rejectReason: { color: colors.error, fontSize: 12, marginTop: spacing.sm },

  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13 },
})
