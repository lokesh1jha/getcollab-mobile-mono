import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, RouteProp } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'

type RouteParams = RouteProp<{ campaignEscrow: { id: string; title?: string } }, 'campaignEscrow'>

interface EscrowItem { id: string; label: string; amount: number; status: string; date?: string }

const STATUS_COLORS: Record<string, { fg: string; bg: string }> = {
  funded: { fg: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  pending: { fg: '#F59E0B', bg: 'rgba(245,158,11,0.14)' },
  released: { fg: '#3B82F6', bg: 'rgba(59,130,246,0.14)' },
  held: { fg: '#A1A1AA', bg: 'rgba(161,161,170,0.12)' },
}

export default function CampaignEscrowScreen() {
  const route = useRoute<RouteParams>()
  const { id: campaignId, title } = route.params || {}

  const [escrow, setEscrow] = useState<{ totalBudget: number; funded: number; released: number; held: number; items: EscrowItem[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Reads the campaign's escrow pool. This used to present the campaign
  // budget as "funded" and the org-wide wallet balance as held for this
  // campaign, neither of which is escrow.
  const loadEscrow = useCallback(async () => {
    try {
      const pool = await apiService.getCampaignPool(campaignId).catch((e: any) => {
        if (e?.code === 'not_found' || /not found/i.test(String(e?.message))) return null
        throw e
      })
      if (!pool) {
        setEscrow({ totalBudget: 0, funded: 0, released: 0, held: 0, items: [] })
        return
      }
      const rupees = (minor?: number) => (minor ?? 0) / 100
      const rows: Array<[string, number, string]> = [
        ['Funded into escrow', pool.fundedMinor, 'funded'],
        ['Reserved for creators', pool.reservedMinor, 'held'],
        ['Released to creators', (pool.releasedMinor ?? 0) + (pool.paidMinor ?? 0), 'released'],
        ['Refunded to you', pool.refundedMinor, 'pending'],
        ['Available to reserve', pool.availableMinor, 'funded'],
      ]
      const items: EscrowItem[] = rows
        .filter(([, minor]) => (minor ?? 0) > 0)
        .map(([label, minor, status], idx) => ({ id: String(idx), label, amount: rupees(minor), status }))
      setEscrow({
        totalBudget: rupees(pool.budgetMinor),
        funded: rupees(pool.fundedMinor),
        released: rupees((pool.releasedMinor ?? 0) + (pool.paidMinor ?? 0)),
        held: rupees(pool.reservedMinor),
        items,
      })
    } catch (err) {
      handleApiError(err, 'Failed to load escrow')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [campaignId])

  useEffect(() => {
    if (campaignId) loadEscrow()
  }, [campaignId, loadEscrow])

  if (loading && !refreshing) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.neon} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEscrow() }} tintColor={colors.neon} />}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={styles.title}>Escrow</Text>
          <Text style={styles.subtitle}>{title || 'Campaign funds'}</Text>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total Budget</Text>
              <Text style={styles.metricValue}>₹{(escrow?.totalBudget ?? 0).toLocaleString()}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Reserved</Text>
              <Text style={styles.metricValue}>₹{(escrow?.held ?? 0).toLocaleString()}</Text>
            </View>
          </View>

          {escrow && escrow.items.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Escrow</Text>
              <View style={styles.listCard}>
                {escrow.items.map((item, idx) => {
                  const s = STATUS_COLORS[item.status] || STATUS_COLORS.pending
                  return (
                    <View key={item.id} style={[styles.listRow, idx < escrow.items.length - 1 && styles.listRowDivider]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listTitle}>{item.label}</Text>
                        {item.date && <Text style={styles.listMeta}>{new Date(item.date).toLocaleDateString()}</Text>}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.listAmount}>₹{item.amount.toLocaleString()}</Text>
                        <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
                          <Text style={[styles.statusText, { color: s.fg }]}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</Text>
                        </View>
                      </View>
                    </View>
                  )
                })}
              </View>
            </View>
          )}

          {(!escrow || escrow.items.length === 0) && (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="cash-outline" size={26} color={colors.textMuted} /></View>
              <Text style={styles.emptyTitle}>Nothing in escrow yet</Text>
              <Text style={styles.emptySub}>Funds appear here once you fund the campaign or a creator&apos;s collaboration.</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2, marginBottom: spacing.lg },

  metricsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  metricCard: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  metricLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  metricValue: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 6 },

  section: { marginBottom: spacing.lg },
  sectionTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm },

  listCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  listRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  listTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  listMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  listAmount: { color: '#fff', fontSize: 14, fontWeight: '700' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13 },
})
