import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator, Alert, FlatList, Linking, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { colors, radius, spacing, statusColor } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import { InfluencerNavigationProp } from '@/src/types/navigation'
import { DeliverablesPanel } from '@shared/components/deal/DeliverablesPanel'
import { LegalDetailsForm } from '@shared/components/deal/LegalDetailsForm'
import { deliverableProgress } from '@shared/lib/deal-deliverables'
import * as Haptics from 'expo-haptics'

interface Deal {
  id: string
  campaignTitle?: string
  campaign?: { title?: string; id?: string }
  status: string
  deliverablesCompleted?: number
  deliverablesTotal?: number
  otherParty?: { name?: string }
  rating?: { rating?: number }
  createdAt?: string
}

export default function CollaborationsScreen({ navigation }: { navigation: InfluencerNavigationProp }) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected] = useState<any | null>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [shipping, setShipping] = useState<any | null>(null)
  // GET /collabs/{id}: deal, milestones, contract, submissions.
  const [detail, setDetail] = useState<any | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  // A notification tap or an accepted application opens one deal directly.
  const deepLinkId: string | undefined = (useRoute().params as { id?: string } | undefined)?.id

  const load = useCallback(async () => {
    try {
      const list = await apiService.getAllDeals()
      setDeals(list)
      const target = deepLinkId && list.find((d: any) => String(d.id) === deepLinkId)
      if (target) open(target)
    } catch (e) { handleApiError(e, "Couldn't load collaborations") }
    finally { setLoading(false); setRefreshing(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkId])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    try { await fn() } catch (e: any) { handleApiError(e, "Couldn't complete that. Try again.") }
    finally { setBusy(null) }
  }

  const open = async (deal: any) => {
    setSelected(deal)
    setDocuments([])
    setShipping(null)
    setDetail(null)
    try {
      const [docs, ship, d] = await Promise.all([
        apiService.getDocuments(deal.id).catch(() => null),
        apiService.getDealShipping(deal.id).catch(() => null),
        apiService.getDeal(deal.id).catch(() => null),
      ])
      setDocuments(docs?.documents || docs?.data || [])
      setShipping(ship?.shipping || ship?.data || ship || null)
      setDetail(d)
    } catch (e) { handleApiError(e, "Couldn't load this collaboration") }
  }

  const refreshDocs = async () => {
    if (!selected) return
    const r = await apiService.getDocuments(selected.id)
    setDocuments(r?.documents || r?.data || [])
  }

  const sign = (doc: any) => run(`sign-${doc.id}`, async () => {
    if (!name.trim()) { Alert.alert('Name required', 'Enter your full legal name to sign.'); return }
    await apiService.signDocument(doc.id, name.trim())
    setName('')
    await refreshDocs()
  })

  const openPdf = (doc: any) => run(`pdf-${doc.id}`, async () => {
    const r = await apiService.getDocumentPdf(doc.id)
    const url = r?.url || r?.data?.url
    if (!url) throw new Error('PDF not ready yet')
    Linking.openURL(url)
  })

  const acceptContract = () => run('contract', async () => {
    await apiService.acceptDealContract(selected.id)
    Alert.alert('Agreement accepted', 'Waiting for the brand to sign.')
    open(selected)
  })

  const start = () => run('start', async () => {
    await apiService.startDeal(selected.id)
    Alert.alert('Work started', 'Submit your deliverables when ready.')
    open(selected)
  })

  if (loading) return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
    </SafeAreaView>
  )

  if (selected) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => setSelected(null)} style={({ pressed }) => [styles.backRow, pressed && { opacity: 0.85 }]}>
            <Ionicons name="chevron-back" size={20} color={colors.blue} />
            <Text style={styles.back}>Collaborations</Text>
          </Pressable>

          <Text style={styles.heading}>{selected.campaignTitle || selected.campaign?.title || 'Collaboration'}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusColor(selected.status).bg, alignSelf: 'flex-start', marginTop: spacing.sm }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor(selected.status).dot }]} />
            <Text style={[styles.statusText, { color: statusColor(selected.status).fg }]}>{selected.status || 'active'}</Text>
          </View>

          <Text style={styles.section}>Agreement</Text>
          <Text style={styles.meta}>
            {detail?.contract?.status === 'active'
              ? 'Signed by both sides.'
              : detail?.contract?.creator_accepted_at
                ? 'You signed. Waiting for the brand.'
                : 'Review and sign the agreement to start.'}
          </Text>
          {detail?.agreementMissing?.creator?.length > 0 && (
            <LegalDetailsForm
              dealId={selected.id}
              missing={detail.agreementMissing.creator}
              theme={colors}
              onSaved={() => { Alert.alert('Agreement updated', 'Your details are on it now. Review it, then accept.'); open(selected) }}
            />
          )}
          {!detail?.agreementMissing?.creator?.length && detail?.agreementMissing?.brand?.length > 0 && (
            <Text style={styles.meta}>Waiting for the brand to add their legal name and address. You can sign once they&apos;re on the agreement.</Text>
          )}
          <View style={styles.row}>
            {detail?.contract && detail.contract.status !== 'active' && !detail.contract.creator_accepted_at && !detail?.agreementMissing && (
              <Action label={busy === 'contract' ? 'Saving…' : 'Accept agreement'} busy={!!busy} onPress={acceptContract} />
            )}
            {detail?.contract?.status === 'active' && detail?.deal?.stage === 'CONTRACT' && (
              detail.deal.payment_status === 'held'
                ? <Action label={busy === 'start' ? 'Saving…' : 'Start work'} busy={!!busy} onPress={start} />
                : <Text style={styles.meta}>Wait until the brand funds escrow before starting.</Text>
            )}
          </View>

          {detail && (
            <View style={styles.block}>
              <DeliverablesPanel
                dealId={selected.id}
                progress={deliverableProgress(detail.milestones ?? [], detail.submissions ?? [])}
                isBrand={false}
                maxRevisions={detail.deal?.max_revisions ?? 2}
                theme={colors}
                onChanged={() => open(selected)}
              />
            </View>
          )}

          {shipping ? (
            <View style={styles.block}>
              <Text style={styles.section}>Shipping</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Status</Text>
                  <Text style={styles.infoValue}>{shipping.status || 'Tracked'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tracking</Text>
                  <Text style={styles.infoValue}>{shipping.trackingNumber || shipping.tracking_number || 'None yet'}</Text>
                </View>
              </View>
            </View>
          ) : null}

          <Text style={styles.section}>Documents</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Full legal name" placeholderTextColor={colors.textSubtle} style={styles.input} />

          {documents.length === 0 && <Text style={styles.empty}>No documents yet.</Text>}
          {documents.map((doc) => (
            <View key={doc.id} style={styles.docCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.docTitle}>{doc.kind || 'Agreement'}</Text>
                <Text style={styles.docMeta}>{doc.status || 'pending_signature'}</Text>
              </View>
              <View style={styles.row}>
                {doc.status === 'pending_signature' && <Action label={busy === `sign-${doc.id}` ? 'Signing…' : 'Sign'} busy={!!busy} onPress={() => sign(doc)} />}
                <Action label="View PDF" outline busy={!!busy} onPress={() => openPdf(doc)} />
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Collaborations</Text>
        <Text style={styles.listSub}>Your active and completed collaborations.</Text>
      </View>
      <FlatList automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRefreshing(true); load() }} tintColor={colors.primary} />}
        data={deals}
        keyExtractor={(x) => String(x.id)}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconBox}><Ionicons name="people-outline" size={26} color={colors.textMuted} /></View>
            <Text style={styles.emptyTitle}>No collaborations yet</Text>
            <Text style={styles.emptySub}>Apply to campaigns. Accepted ones appear here.</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 80).duration(320)}>
            <Pressable onPress={() => open(item)} style={({ pressed }) => [styles.dealCard, pressed && { opacity: 0.85 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={styles.dealAvatar}>
                  <Text style={styles.dealAvatarText}>{(item.campaignTitle || item.campaign?.title || 'C').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dealTitle} numberOfLines={1}>{item.campaignTitle || item.campaign?.title || 'Collaboration'}</Text>
                  <Text style={styles.dealMeta}>{item.otherParty?.name || 'Brand'} · {item.status || 'active'}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusColor(item.status).bg }]}>
                  <Text style={[styles.statusText, { color: statusColor(item.status).fg }]}>{item.status || 'active'}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
                <View style={styles.dealChip}>
                  <Ionicons name="checkbox-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.dealChipText}>{item.deliverablesCompleted ?? 0}/{item.deliverablesTotal ?? 0} done</Text>
                </View>
                {item.rating?.rating && (
                  <View style={styles.dealChip}>
                    <Ionicons name="star" size={12} color={colors.warning} />
                    <Text style={styles.dealChipText}>{item.rating.rating}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          </Animated.View>
        )}
      />
    </SafeAreaView>
  )
}

function Action({ label, onPress, busy, outline }: { label: string; onPress: () => void; busy: boolean; outline?: boolean }) {
  return (
    <Pressable disabled={busy} onPress={onPress} style={({ pressed }) => [outline ? styles.secondary : styles.primary, pressed && { opacity: 0.85 }, busy && { opacity: 0.5 }]}>
      <Text style={outline ? styles.secondaryText : styles.primaryText}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  listHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  listTitle: { color: colors.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  listSub: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  back: { color: colors.blue, fontSize: 14, fontWeight: '600' },
  heading: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: spacing.sm },
  meta: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm },
  section: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: spacing.lg, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  input: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, color: colors.text },
  block: { marginTop: spacing.md },
  delRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  delTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  delMeta: { color: colors.textMuted, fontSize: 12, marginTop: 1, textTransform: 'capitalize' },
  infoCard: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { color: colors.textMuted, fontSize: 13 },
  infoValue: { color: colors.text, fontSize: 13, fontWeight: '700' },
  docCard: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md },
  docTitle: { color: colors.text, fontWeight: '700' },
  docMeta: { color: colors.textMuted, fontSize: 13, marginTop: 2, marginBottom: spacing.sm },
  primary: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.sm },
  primaryText: { color: '#000', fontWeight: '800' },
  secondary: { alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.sm },
  secondaryText: { color: colors.text, fontWeight: '700' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
  emptyWrap: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyIconBox: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  dealCard: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg },
  dealAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  dealAvatarText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  dealTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  dealMeta: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  dealChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.elevated, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  dealChipText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
})
