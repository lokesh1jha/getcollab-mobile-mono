import React, { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError, uploadMediaBlob } from '@shared/services/api'

export default function CollaborationsScreen() {
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any | null>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [shipping, setShipping] = useState<any | null>(null)
  const [name, setName] = useState('')
  const [script, setScript] = useState('')
  const [liveUrl, setLiveUrl] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await apiService.getDeals()
      setDeals(r?.deals || r?.collabs || r?.data || [])
    } catch (e) { handleApiError(e, 'Failed to load collaborations') }
    finally { setLoading(false) }
  }, [])
  useFocusEffect(useCallback(() => { load() }, [load]))

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    try { await fn() } catch (e: any) { handleApiError(e, 'Action failed') }
    finally { setBusy(null) }
  }

  const open = async (deal: any) => {
    setSelected(deal)
    setDocuments([])
    setShipping(null)
    try {
      const [docs, ship] = await Promise.all([
        apiService.getDocuments(deal.id).catch(() => null),
        apiService.getDealShipping(deal.id).catch(() => null),
      ])
      setDocuments(docs?.documents || docs?.data || [])
      setShipping(ship?.shipping || ship?.data || ship || null)
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
  })

  const start = () => run('start', async () => {
    await apiService.startDeal(selected.id)
    Alert.alert('Done', 'Collaboration started.')
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

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.neon} /></View>

  if (selected) {
    return (
      <View style={styles.root}>
        <FlatList
          contentContainerStyle={styles.list}
          data={documents}
          keyExtractor={(x) => String(x.id)}
          ListHeaderComponent={(
            <>
              <Pressable onPress={() => setSelected(null)}><Text style={styles.back}>Back to collaborations</Text></Pressable>
              <Text style={styles.heading}>{selected.campaignTitle || selected.campaign?.title || 'Collaboration'}</Text>
              <Text style={styles.meta}>Status: {selected.status || 'active'}</Text>

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
                <>
                  <Text style={styles.section}>Shipping</Text>
                  <Text style={styles.meta}>{shipping.status || 'Tracked'} · {shipping.trackingNumber || shipping.tracking_number || 'No tracking number'}</Text>
                </>
              ) : null}

              <Text style={styles.section}>Documents</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Full name for signing" placeholderTextColor={colors.textSubtle} style={styles.input} />
            </>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No documents have been generated yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.title}>{item.kind || 'Agreement'}</Text>
              <Text style={styles.meta}>{item.status || 'pending_signature'}</Text>
              <View style={styles.row}>
                {item.status === 'pending_signature' && <Action label={busy === `sign-${item.id}` ? 'Signing…' : 'Sign'} busy={!!busy} onPress={() => sign(item)} />}
                <Action label="View PDF" outline busy={!!busy} onPress={() => openPdf(item)} />
              </View>
            </View>
          )}
        />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <FlatList
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.neon} />}
        data={deals}
        keyExtractor={(x) => String(x.id)}
        ListEmptyComponent={<Text style={styles.empty}>Accepted collaborations will appear here.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => open(item)} style={styles.card}>
            <Text style={styles.title}>{item.campaignTitle || item.campaign?.title || 'Collaboration'}</Text>
            <Text style={styles.meta}>{item.status || 'active'} · Tap for contract, deliverables, proof & documents</Text>
          </Pressable>
        )}
      />
    </View>
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
  back: { color: colors.blue, marginBottom: spacing.md },
  heading: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: spacing.sm },
  meta: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm },
  section: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: spacing.lg, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  input: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, color: colors.text },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg },
  title: { color: colors.text, fontWeight: '700' },
  primary: { alignSelf: 'flex-start', backgroundColor: colors.neon, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.sm },
  primaryText: { color: '#000', fontWeight: '800' },
  secondary: { alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.sm },
  secondaryText: { color: colors.text, fontWeight: '700' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxxl },
})
