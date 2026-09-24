import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import * as Haptics from 'expo-haptics'

type RouteParams = RouteProp<{ campaignExecute: { id: string; title?: string } }, 'campaignExecute'>

// One row per creator's collaboration on this campaign. This screen used to
// read `deal.deliverables`, which the API never returned, so it always showed
// "No deliverables yet"; per-deliverable review is on the deal screen.
interface Deliverable { id: string; title: string; status: string; subtitle: string; dueDate?: string }

function dealStatus(d: any): string {
  if (d.status === 'cancelled') return 'rejected'
  if (d.payment_status === 'released' || d.payment_status === 'mark_paid' || d.stage === 'COMPLETED') return 'approved'
  if (d.stage === 'PRODUCTION') return 'in_progress'
  if (d.payment_status === 'held') return 'submitted'
  return 'pending'
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Awaiting signature or funding',
  submitted: 'Funded · ready to start',
  in_progress: 'In production',
  approved: 'Paid',
  rejected: 'Cancelled',
}

const STATUS_COLORS: Record<string, { fg: string; bg: string; icon: string }> = {
  pending: { fg: '#F59E0B', bg: 'rgba(245,158,11,0.14)', icon: 'time-outline' },
  in_progress: { fg: '#3B82F6', bg: 'rgba(59,130,246,0.14)', icon: 'hammer-outline' },
  submitted: { fg: '#F59E0B', bg: 'rgba(245,158,11,0.14)', icon: 'cloud-upload-outline' },
  approved: { fg: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: 'checkmark-circle-outline' },
  rejected: { fg: '#EF4444', bg: 'rgba(239,68,68,0.14)', icon: 'close-circle-outline' },
}

export default function CampaignExecuteScreen() {
  const route = useRoute<RouteParams>()
  const navigation = useNavigation<any>()
  const { id: campaignId, title } = route.params || {}

  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadDeliverables = useCallback(async () => {
    try {
      // GET /collabs ignores campaignId, so filter here; names come from the
      // campaign's bids.
      const [res, bidsRes] = await Promise.all([
        apiService.getDeals({ limit: '100' }),
        apiService.getBidsForCampaign(campaignId).catch(() => null),
      ])
      const deals = res?.deals || res?.data || res?.collabs || []
      const bids: any[] = bidsRes?.bids || bidsRes?.data || []
      const nameByBid = new Map(bids.map((b) => [b.id, b.influencer?.name || b.influencer_name || b.influencerName]))
      const mapped: Deliverable[] = (Array.isArray(deals) ? deals : [])
        .filter((d: any) => d.campaign_id === campaignId)
        .map((d: any) => ({
          id: d.id,
          title: nameByBid.get(d.bid_id) || 'Creator',
          status: dealStatus(d),
          subtitle: STATUS_LABEL[dealStatus(d)],
        }))
      setDeliverables(mapped)
    } catch (err) {
      handleApiError(err, "Couldn't load collaborations")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [campaignId])

  useEffect(() => {
    if (campaignId) loadDeliverables()
  }, [campaignId, loadDeliverables])

  const renderItem = ({ item, index }: { item: Deliverable; index: number }) => {
    const st = item.status || 'pending'
    const s = STATUS_COLORS[st] || STATUS_COLORS.pending
    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 80).duration(320)}>
       <Pressable
        onPress={() => navigation.navigate('DealReview', { id: item.id, title: `${title || 'Campaign'} · ${item.title}` })}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
       >
        <View style={styles.cardTop}>
          <View style={[styles.statusIcon, { backgroundColor: s.bg }]}>
            <Ionicons name={s.icon as any} size={16} color={s.fg} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.titleText} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.meta}>{item.subtitle}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
            <Ionicons name="chevron-forward" size={16} color={s.fg} />
          </View>
        </View>
        {item.dueDate && <Text style={styles.due}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>}
       </Pressable>
      </Animated.View>
    )
  }

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
          data={deliverables}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.title}>Collaborations</Text>
              <Text style={styles.subtitle}>Tap a creator to review their work</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="list-outline" size={26} color={colors.textMuted} /></View>
              <Text style={styles.emptyTitle}>No creators yet</Text>
              <Text style={styles.emptySub}>Accept an application or invite a creator to start.</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRefreshing(true); loadDeliverables() }} tintColor={colors.primary} />}
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

  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statusIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  titleText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  due: { color: colors.textSubtle, fontSize: 11, marginTop: spacing.sm },

  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13 },
})
