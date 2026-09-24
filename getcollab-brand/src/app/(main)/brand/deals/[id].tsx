import React, { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import { DeliverablesPanel } from '@shared/components/deal/DeliverablesPanel'
import { allDeliverablesApproved, deliverableProgress } from '@shared/lib/deal-deliverables'
import * as Haptics from 'expo-haptics'

type RouteParams = RouteProp<{ DealReview: { id: string; title?: string } }, 'DealReview'>

const EVENT_LABEL: Record<string, string> = {
  'deal.created': 'Collaboration created',
  'contract.signed': 'Agreement signed',
  'deal.funded': 'Escrow funded',
  'deal.started': 'Production started',
  'submission.submitted': 'Work submitted',
  'submission.changes_requested': 'Changes requested',
  'submission.approved': 'Work approved',
  'submission.rejected': 'Work rejected',
  'deliverable.completed': 'Deliverable approved',
  'deal.deliverables_complete': 'All deliverables approved',
  'deal.payment_released': 'Payment released',
  'deal.completed': 'Collaboration completed',
  'deal.refunded': 'Escrow refunded',
}

/**
 * The brand's side of one collaboration: sign, fund, review each deliverable,
 * release, or raise a dispute. The brand app had no deal screen, so none of
 * this could be done on mobile.
 */
export default function DealReviewScreen() {
  const route = useRoute<RouteParams>()
  const { id, title } = route.params || ({} as { id: string; title?: string })
  const [detail, setDetail] = useState<any | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')

  const load = useCallback(async () => {
    try {
      const [d, ev] = await Promise.all([
        apiService.getDeal(id),
        apiService.getDealEvents(id).catch(() => null),
      ])
      setDetail(d)
      setEvents(ev?.events ?? [])
    } catch (e) { handleApiError(e, "Couldn't load collaboration") }
    finally { setLoading(false); setRefreshing(false) }
  }, [id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const run = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true)
    try { await fn(); if (done) Alert.alert('Done', done); await load() } catch (e) { handleApiError(e, 'Something went wrong. Try again.') }
    finally { setBusy(false) }
  }

  if (loading || !detail) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  const deal = detail.deal ?? {}
  const contract = detail.contract
  const progress = deliverableProgress(detail.milestones ?? [], detail.submissions ?? [])
  const releasable = allDeliverablesApproved(progress)
  const paid = deal.payment_status === 'released' || deal.payment_status === 'mark_paid'

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRefreshing(true); load() }} tintColor={colors.primary} />}
        >
          <Animated.View entering={FadeInDown.duration(320)} style={{ gap: spacing.xs }}>
            <Text style={styles.title}>{title || 'Collaboration'}</Text>
            <Text style={styles.muted}>Status: {deal.status} · Payment: {deal.payment_status}</Text>
          </Animated.View>

          <View style={styles.card}>
            <Text style={styles.section}>Agreement & escrow</Text>
            {contract?.status === 'active' ? (
              <Text style={styles.muted}>Signed by both sides.</Text>
            ) : contract?.brand_accepted_at ? (
              <Text style={styles.muted}>You signed. Waiting for the creator.</Text>
            ) : (
              <Button label="Accept agreement" disabled={busy} onPress={() => run(() => apiService.acceptDealContract(id))} />
            )}
            {contract?.status === 'active' && deal.payment_status === 'unpaid' && (
              <Button label="Fund escrow" disabled={busy} onPress={() => run(() => apiService.fundDeal(id), 'Payment is held in escrow.')} />
            )}
            {deal.payment_status === 'held' && <Text style={styles.muted}>Payment is held in escrow.</Text>}
          </View>

          <DeliverablesPanel
            dealId={id}
            progress={progress}
            isBrand
            maxRevisions={deal.max_revisions ?? 2}
            theme={colors}
            onChanged={load}
          />

          <View style={styles.card}>
            <Text style={styles.section}>Payment</Text>
            <Text style={styles.muted}>
              {paid
                ? 'Payment released.'
                : releasable
                  ? 'All work approved. Release now or wait for the next payout run.'
                  : `Releases once all deliverables are approved (${progress.filter((p) => p.done).length} of ${progress.length} done).`}
            </Text>
            {!paid && deal.payment_status === 'held' && (
              <Button label="Release payment" disabled={busy || !releasable} onPress={() => run(() => apiService.releaseDealPayment(id), 'Payment released.')} />
            )}
            {deal.payment_status === 'held' && (
              <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                <TextInput
                  value={disputeReason}
                  onChangeText={setDisputeReason}
                  placeholder="Describe the problem"
                  placeholderTextColor={colors.textSubtle}
                  multiline
                  style={styles.input}
                  accessibilityLabel="Dispute reason"
                />
                <Button
                  label="Raise dispute"
                  outline
                  disabled={busy || !disputeReason.trim()}
                  onPress={() => run(async () => {
                    await apiService.createDispute({ dealId: id, reason: disputeReason.trim() })
                    setDisputeReason('')
                  }, 'Dispute raised. Payment stays on hold until it is resolved.')}
                />
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.section}>Timeline</Text>
            {events.length === 0 ? (
              <Text style={styles.muted}>No activity yet.</Text>
            ) : events.map((e, i) => (
              <View key={e.id} style={[styles.eventRow, i < events.length - 1 && styles.eventSep]}>
                <Text style={styles.eventText}>
                  {EVENT_LABEL[e.type] ?? e.type}
                  {e.payload?.deliverable ? ` · ${e.payload.deliverable}` : ''}
                  {e.payload?.comment ? ` — “${e.payload.comment}”` : ''}
                </Text>
                <Text style={styles.eventTime}>{new Date(e.createdAt).toLocaleString()}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

function Button({ label, onPress, disabled, outline }: { label: string; onPress: () => void; disabled?: boolean; outline?: boolean }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [outline ? styles.secondary : styles.primary, pressed && { opacity: 0.85 }, disabled && { opacity: 0.5 }]}
    >
      <Text style={outline ? styles.secondaryText : styles.primaryText}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.6 },
  muted: { color: colors.textMuted, fontSize: 13 },
  section: { color: colors.text, fontSize: 15, fontWeight: '800' },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  input: { backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, color: colors.text, minHeight: 60 },
  eventRow: { paddingVertical: spacing.sm, gap: 2 },
  eventSep: { borderBottomWidth: 1, borderBottomColor: colors.border },
  eventText: { color: colors.text, fontSize: 13 },
  eventTime: { color: colors.textSubtle, fontSize: 11 },
  primary: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  primaryText: { color: '#000', fontWeight: '800' },
  secondary: { alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  secondaryText: { color: colors.text, fontWeight: '700' },
})
