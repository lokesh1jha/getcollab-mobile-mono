import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator, Alert, FlatList, Linking, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { colors, radius, spacing, statusColor } from '@/src/theme'
import { apiService, handleApiError, uploadMediaBlob } from '@shared/services/api'
import { InfluencerNavigationProp } from '@/src/types/navigation'
import * as ImagePicker from 'expo-image-picker'

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
  const [deliverables, setDeliverables] = useState<any[]>([])
  const [name, setName] = useState('')
  const [script, setScript] = useState('')
  const [liveUrl, setLiveUrl] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await apiService.getDeals()
      setDeals(r?.deals || r?.collabs || r?.data || [])
    } catch (e) { handleApiError(e, 'Failed to load collaborations') }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useFocusEffect(useCallback(() => { setLoading(true); load() }, [load]))

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    try { await fn() } catch (e: any) { handleApiError(e, 'Action failed') }
    finally { setBusy(null) }
  }

  const open = async (deal: any) => {
    setSelected(deal)
    setDocuments([])
    setShipping(null)
    setDeliverables([])
    try {
      const [docs, ship, dels] = await Promise.all([
        apiService.getDocuments(deal.id).catch(() => null),
        apiService.getDealShipping(deal.id).catch(() => null),
        apiService.getDeal(deal.id).catch(() => null),
      ])
      setDocuments(docs?.documents || docs?.data || [])
      setShipping(ship?.shipping || ship?.data || ship || null)
      const dealData = dels?.deal || dels?.data || dels || {}
      setDeliverables(dealData.deliverables || [])
    } catch (e) { handleApiError(e, 'Failed to load collaboration') }
  }

  const refreshDocs = async () => {
    if (!selected) return
    const r = await apiService.getDocuments(selected.id)
    setDocuments(r?.documents || r?.data || [])
  }

  const sign = (doc: any) => run(`sign-${doc.id}`, async () => {
    if (!name.trim()) { Alert.alert('Name required', 'Enter your full legal name before signing.'); return }
    await apiService.signDocument(doc.id, name.trim())
    setName('')
    await refreshDocs()
  })

  const openPdf = (doc: any) => run(`pdf-${doc.id}`, async () => {
    const r = await apiService.getDocumentPdf(doc.id)
    const url = r?.url || r?.data?.url
    if (!url) throw new Error('PDF not available yet')
    Linking.openURL(url)
  })

  const acceptContract = () => run('contract', async () => {
    await apiService.acceptDealContract(selected.id)
    Alert.alert('Done', 'Contract accepted.')
    open(selected)
  })

  const start = () => run('start', async () => {
    await apiService.startDeal(selected.id)
    Alert.alert('Done', 'Collaboration started.')
    open(selected)
  })

  const submitScript = () => run('script', async () => {
    if (!script.trim()) { Alert.alert('Script required', 'Write your script before submitting.'); return }
    await apiService.submitDealScript(selected.id, script.trim())
    setScript('')
    Alert.alert('Done', 'Script submitted for review.')
  })

  const submitMedia = () => run('media', async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Permission needed', 'Enable photo library access to upload.'); return }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 })
    if (result.canceled || !result.assets[0]) return
    const a = result.assets[0]
    const done = await uploadMediaBlob({ uri: a.uri, mime: a.mimeType || 'image/jpeg', sizeBytes: a.fileSize || 0, width: a.width, height: a.height })
    const blobId = done?.id || done?.blob_id || done?.blobId
    if (!blobId) throw new Error('Upload failed')
    await apiService.submitDealMedia(selected.id, { blobId: String(blobId) })
    Alert.alert('Done', 'Deliverable submitted for review.')
  })

  const submitProof = () => run('proof', async () => {
    if (!liveUrl.trim()) { Alert.alert('Link required', 'Paste the live post URL first.'); return }
    await apiService.upsertDealProof(selected.id, { liveUrl: liveUrl.trim(), screenshotBlobIds: [] })
    await apiService.submitDealProof(selected.id, {})
    setLiveUrl('')
    Alert.alert('Done', 'Proof submitted for review.')
  })

  const renderDeliverable = ({ item, index }: { item: any; index: number }) => {
    const done = item.status === 'completed' || item.status === 'approved'
    return (
      <Animated.View entering={FadeInDown.delay(index * 40).duration(300)} style={styles.delRow}>
        <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={done ? colors.success : colors.textMuted} />
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={styles.delTitle}>{item.title || item.type || 'Deliverable'}</Text>
          <Text style={styles.delMeta}>{item.status || 'pending'}</Text>
        </View>
      </Animated.View>
    )
  }

  if (loading) return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.center}><ActivityIndicator color={colors.neon} /></View>
    </SafeAreaView>
  )

  if (selected) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => setSelected(null)} style={styles.backRow}>
            <Ionicons name="chevron-back" size={20} color={colors.blue} />
            <Text style={styles.back}>Back to collaborations</Text>
          </Pressable>

          <Text style={styles.heading}>{selected.campaignTitle || selected.campaign?.title || 'Collaboration'}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusColor(selected.status).bg, alignSelf: 'flex-start', marginTop: spacing.sm }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor(selected.status).dot }]} />
            <Text style={[styles.statusText, { color: statusColor(selected.status).fg }]}>{selected.status || 'active'}</Text>
          </View>

          {/* Deliverables checklist */}
          {deliverables.length > 0 && (
            <View style={styles.block}>
              <Text style={styles.section}>Deliverables</Text>
              {deliverables.map((d, i) => renderDeliverable({ item: d, index: i }))}
            </View>
          )}

          <Text style={styles.section}>Contract</Text>
          <View style={styles.row}>
            <Action label={busy === 'contract' ? 'Saving…' : 'Accept contract'} busy={!!busy} onPress={acceptContract} />
            <Action label={busy === 'start' ? 'Saving…' : 'Start work'} busy={!!busy} onPress={start} />
          </View>

          <Text style={styles.section}>Script</Text>
          <TextInput value={script} onChangeText={setScript} placeholder="Paste your script…" placeholderTextColor={colors.textSubtle} multiline style={[styles.input, { minHeight: 90 }]} />
          <Action label={busy === 'script' ? 'Submitting…' : 'Submit script'} busy={!!busy} onPress={submitScript} />

          <Text style={styles.section}>Deliverable</Text>
          <Action label={busy === 'media' ? 'Uploading…' : 'Upload & submit media'} busy={!!busy} onPress={submitMedia} />

          <Text style={styles.section}>Proof of publishing</Text>
          <TextInput value={liveUrl} onChangeText={setLiveUrl} placeholder="https://…" autoCapitalize="none" placeholderTextColor={colors.textSubtle} style={styles.input} />
          <Action label={busy === 'proof' ? 'Submitting…' : 'Submit proof'} busy={!!busy} onPress={submitProof} />

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
                  <Text style={styles.infoValue}>{shipping.trackingNumber || shipping.tracking_number || 'No tracking number'}</Text>
                </View>
              </View>
            </View>
          ) : null}

          <Text style={styles.section}>Documents</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Full name for signing" placeholderTextColor={colors.textSubtle} style={styles.input} />

          {documents.length === 0 && <Text style={styles.empty}>No documents have been generated yet.</Text>}
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
        <Text style={styles.listSub}>Track all active and completed collaborations</Text>
      </View>
      <FlatList
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.neon} />}
        data={deals}
        keyExtractor={(x) => String(x.id)}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconBox}><Ionicons name="people-outline" size={26} color={colors.textMuted} /></View>
            <Text style={styles.emptyTitle}>No collaborations yet</Text>
            <Text style={styles.emptySub}>Start a collaboration from a relationship or accepted bid.</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 40).duration(300)}>
            <Pressable onPress={() => open(item)} style={styles.dealCard}>
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
  primary: { alignSelf: 'flex-start', backgroundColor: colors.neon, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.sm },
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
