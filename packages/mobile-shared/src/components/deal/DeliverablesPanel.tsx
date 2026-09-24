import React, { useState } from 'react'
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import * as ImagePicker from 'expo-image-picker'
import { apiService, handleApiError, uploadMediaBlob } from '../../services/api'
import {
  STAGE_LABEL,
  type DealSubmission,
  type DeliverableProgress,
  type StageProgress,
} from '../../lib/deal-deliverables'

/**
 * Per-deliverable work and review for one deal, shared by both apps.
 *
 * Each deliverable passes its stages in order (script, content, live post);
 * the creator hands in the current stage and the brand approves, asks for
 * changes (with a note) or rejects. Colours come from the calling app's theme
 * (apps own their theme; shared code must not import one).
 */
export type PanelTheme = {
  bg: string
  card: string
  elevated: string
  border: string
  text: string
  textMuted: string
  textSubtle: string
  primary: string
  blue: string
  success: string
  warning: string
  error: string
}

const STATE_LABEL: Record<StageProgress['state'], string> = {
  locked: 'Locked',
  open: 'To do',
  submitted: 'In review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  rejected: 'Rejected',
}

export function DeliverablesPanel({
  dealId,
  progress,
  isBrand,
  maxRevisions,
  theme,
  onChanged,
}: {
  dealId: string
  progress: DeliverableProgress[]
  isBrand: boolean
  maxRevisions: number
  theme: PanelTheme
  /** Called after any successful action so the screen refetches. */
  onChanged: () => void
}) {
  const s = styles(theme)
  if (progress.length === 0) {
    return <Text style={s.muted}>No deliverables yet.</Text>
  }
  const done = progress.filter((p) => p.done).length
  return (
    <View style={{ gap: 12 }}>
      <View style={s.headerRow}>
        <Text style={s.section}>Deliverables</Text>
        <Text style={s.muted}>{done} of {progress.length} approved</Text>
      </View>
      {progress.map((p, i) => (
        <Animated.View key={p.milestone.id} entering={FadeInDown.delay(Math.min(i, 5) * 80).duration(320)}>
          <DeliverableCard dealId={dealId} p={p} isBrand={isBrand} maxRevisions={maxRevisions} theme={theme} onChanged={onChanged} />
        </Animated.View>
      ))}
    </View>
  )
}

function DeliverableCard({
  dealId, p, isBrand, maxRevisions, theme, onChanged,
}: {
  dealId: string
  p: DeliverableProgress
  isBrand: boolean
  maxRevisions: number
  theme: PanelTheme
  onChanged: () => void
}) {
  const s = styles(theme)
  const [showHistory, setShowHistory] = useState(false)
  const used = p.milestone.revision_count ?? 0
  const status = p.rejected ? 'Rejected' : p.done ? 'Approved' : p.current ? STATE_LABEL[p.current.state] : 'To do'
  const due = p.milestone.due_at ? new Date(p.milestone.due_at) : null
  const overdue = !!due && !p.done && due.getTime() < Date.now()
  const history = p.stages.flatMap((st) => st.history)

  return (
    <View style={[s.card, p.done && { borderColor: theme.success }]}>
      <View style={s.headerRow}>
        <Text style={s.title}>{p.milestone.title}</Text>
        <Text style={[s.badge, p.done && { color: theme.success }, p.rejected && { color: theme.error }]}>{status}</Text>
      </View>
      <Text style={[s.muted, overdue && { color: theme.error }]}>
        {due && !p.done ? `${overdue ? 'Overdue since' : 'Due'} ${due.toLocaleDateString()} · ` : ''}Revisions {used}/{maxRevisions}
      </Text>

      <View style={s.stepper} accessibilityLabel={`${p.milestone.title} stages`}>
        {p.stages.map((st) => (
          <View key={st.kind} style={s.step}>
            <Ionicons
              name={st.state === 'approved' ? 'checkmark-circle' : st.state === 'locked' ? 'lock-closed' : st.state === 'rejected' ? 'alert-circle' : 'ellipse-outline'}
              size={14}
              color={st.state === 'approved' ? theme.success : st.state === 'rejected' ? theme.error : st.state === 'locked' ? theme.textSubtle : theme.text}
            />
            <Text style={[s.stepText, st.state === 'locked' && { color: theme.textSubtle }]}>{STAGE_LABEL[st.kind]}</Text>
          </View>
        ))}
      </View>

      {p.rejected && (
        <Text style={s.notice}>This deliverable was rejected. Payment is on hold, and either side can open a dispute.</Text>
      )}

      {p.current && (
        <CurrentStage
          dealId={dealId}
          milestoneId={p.milestone.id}
          stage={p.current}
          isBrand={isBrand}
          revisionsLeft={Math.max(0, maxRevisions - used)}
          theme={theme}
          onChanged={onChanged}
        />
      )}

      {history.length > 0 && (
        <Pressable onPress={() => setShowHistory((v) => !v)} style={({ pressed }) => [s.link, pressed && { opacity: 0.85 }]} accessibilityRole="button">
          <Text style={s.linkText}>{showHistory ? 'Hide' : 'Show'} version history</Text>
        </Pressable>
      )}
      {showHistory && history.map((v) => (
        <Text key={v.id} style={s.muted}>
          {STAGE_LABEL[v.kind]} v{v.version} · {v.status.replace('_', ' ')}{v.auto_approved ? ' (automatic)' : ''}
          {v.review_note ? ` — “${v.review_note}”` : ''}
        </Text>
      ))}
    </View>
  )
}

function Preview({ dealId, sub, theme }: { dealId: string; sub: DealSubmission; theme: PanelTheme }) {
  const s = styles(theme)
  const open = async () => {
    try {
      const r = await apiService.getSubmissionFileUrl(dealId, sub.id)
      if (r?.url) Linking.openURL(r.url)
    } catch (e) { handleApiError(e, 'File not ready yet') }
  }
  return (
    <View style={{ gap: 6 }}>
      {sub.body_text ? <Text style={s.body}>{sub.body_text}</Text> : null}
      {sub.live_url ? (
        <Pressable onPress={() => Linking.openURL(sub.live_url!)} style={({ pressed }) => pressed && { opacity: 0.85 }}>
          <Text style={s.linkText}>{sub.live_url}</Text>
        </Pressable>
      ) : null}
      {sub.live_url && sub.link_verified === false && (
        <Text style={[s.muted, { color: theme.warning }]}>Not found on the creator’s account. Check it before approving.</Text>
      )}
      {sub.blob_ids.length > 0 && <Button label="Open file" outline onPress={open} theme={theme} />}
    </View>
  )
}

function CurrentStage({
  dealId, milestoneId, stage, isBrand, revisionsLeft, theme, onChanged,
}: {
  dealId: string
  milestoneId: string
  stage: StageProgress
  isBrand: boolean
  revisionsLeft: number
  theme: PanelTheme
  onChanged: () => void
}) {
  const s = styles(theme)
  const [text, setText] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const label = STAGE_LABEL[stage.kind]
  const latest = stage.latest

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try { await fn(); onChanged() } catch (e) { handleApiError(e, "Couldn't complete that. Try again.") } finally { setBusy(false) }
  }

  if (isBrand) {
    if (stage.state !== 'submitted' || !latest) {
      return (
        <Text style={s.muted}>
          {stage.state === 'changes_requested' ? `Waiting for the creator to revise the ${label.toLowerCase()}.` : `Waiting for the creator to submit the ${label.toLowerCase()}.`}
        </Text>
      )
    }
    const confirmReject = () =>
      Alert.alert('Reject this deliverable?', 'This ends it and holds payment for a dispute.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => run(() => apiService.reviewSubmission(dealId, latest.id, { action: 'reject', note: note.trim() })) },
      ])
    return (
      <View style={s.box}>
        <Text style={s.strong}>{label} v{latest.version} is waiting for your review</Text>
        <Preview dealId={dealId} sub={latest} theme={theme} />
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Notes (hook, product, CTA, quality)"
          placeholderTextColor={theme.textSubtle}
          multiline
          style={s.input}
          accessibilityLabel={`Notes on ${label} v${latest.version}`}
        />
        <View style={s.row}>
          <Button label={`Approve ${label.toLowerCase()}`} disabled={busy} onPress={() => run(() => apiService.reviewSubmission(dealId, latest.id, { action: 'approve', note }))} theme={theme} />
          <Button
            label={`Request changes (${revisionsLeft} left)`}
            outline
            disabled={busy || !note.trim() || revisionsLeft === 0}
            onPress={() => run(() => apiService.reviewSubmission(dealId, latest.id, { action: 'request_changes', note: note.trim() }))}
            theme={theme}
          />
          <Button label="Reject…" outline disabled={busy || !note.trim()} onPress={confirmReject} theme={theme} />
        </View>
      </View>
    )
  }

  if (stage.state === 'submitted' && latest) {
    return <Text style={s.muted}>{label} v{latest.version} is with the brand for review. You’ll be notified when they decide.</Text>
  }

  const submit = () => run(async () => {
    if (stage.kind === 'CONTENT') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (perm.status !== 'granted') { Alert.alert('Permission needed', 'Allow photo access in Settings to upload.'); return }
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, quality: 0.8 })
      if (picked.canceled || picked.assets.length === 0) return
      const blobIds: string[] = []
      for (const a of picked.assets) {
        const done = await uploadMediaBlob({ uri: a.uri, mime: a.mimeType || 'image/jpeg', sizeBytes: a.fileSize || 0, width: a.width, height: a.height })
        const id = done?.id || done?.blob_id || done?.blobId
        if (!id) throw new Error('Upload failed')
        blobIds.push(String(id))
      }
      await apiService.submitDeliverableWork(dealId, milestoneId, { kind: 'CONTENT', blobIds, caption: text.trim() || undefined })
    } else if (stage.kind === 'SCRIPT') {
      await apiService.submitDeliverableWork(dealId, milestoneId, { kind: 'SCRIPT', bodyText: text.trim() })
    } else {
      await apiService.submitDeliverableWork(dealId, milestoneId, { kind: 'LIVE_LINK', liveUrl: text.trim() })
    }
    setText('')
  })

  const needsText = stage.kind !== 'CONTENT'
  return (
    <View style={s.box}>
      {stage.state === 'changes_requested' && latest?.review_note ? (
        <Text style={[s.notice, { borderColor: theme.warning }]}>The brand asked for changes to v{latest.version}: {latest.review_note}</Text>
      ) : null}
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={stage.kind === 'SCRIPT' ? 'Paste your script…' : stage.kind === 'LIVE_LINK' ? 'https://www.instagram.com/reel/…' : 'Caption (optional)'}
        placeholderTextColor={theme.textSubtle}
        autoCapitalize={stage.kind === 'LIVE_LINK' ? 'none' : 'sentences'}
        keyboardType={stage.kind === 'LIVE_LINK' ? 'url' : 'default'}
        multiline={stage.kind === 'SCRIPT'}
        style={[s.input, stage.kind === 'SCRIPT' && { minHeight: 90 }]}
        accessibilityLabel={stage.kind === 'SCRIPT' ? 'Script' : stage.kind === 'LIVE_LINK' ? 'Live post URL' : 'Caption'}
      />
      <Button
        label={busy ? 'Submitting…' : stage.kind === 'CONTENT' ? `Upload ${label.toLowerCase()}` : `${stage.state === 'changes_requested' ? 'Submit revised' : 'Submit'} ${label.toLowerCase()}`}
        disabled={busy || (needsText && !text.trim())}
        onPress={submit}
        theme={theme}
      />
    </View>
  )
}

function Button({ label, onPress, disabled, outline, theme }: { label: string; onPress: () => void; disabled?: boolean; outline?: boolean; theme: PanelTheme }) {
  const s = styles(theme)
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [outline ? s.secondary : s.primary, pressed && { opacity: 0.85 }, disabled && { opacity: 0.5 }]}
    >
      <Text style={outline ? s.secondaryText : s.primaryText}>{label}</Text>
    </Pressable>
  )
}

const styles = (t: PanelTheme) =>
  StyleSheet.create({
    section: { color: t.text, fontSize: 15, fontWeight: '800' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    card: { backgroundColor: t.card, borderColor: t.border, borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
    title: { color: t.text, fontSize: 15, fontWeight: '700', flexShrink: 1 },
    badge: { color: t.textMuted, fontSize: 12, fontWeight: '700' },
    muted: { color: t.textMuted, fontSize: 12 },
    strong: { color: t.text, fontSize: 13, fontWeight: '700' },
    body: { color: t.text, fontSize: 13, backgroundColor: t.elevated, borderRadius: 12, padding: 12 },
    stepper: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    step: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    stepText: { color: t.text, fontSize: 12, fontWeight: '600' },
    notice: { color: t.text, fontSize: 12, borderWidth: 1, borderColor: t.error, borderRadius: 12, padding: 10 },
    box: { gap: 8, backgroundColor: t.elevated, borderRadius: 12, padding: 12 },
    input: { backgroundColor: t.card, borderColor: t.border, borderWidth: 1, borderRadius: 12, padding: 12, color: t.text },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    link: { alignSelf: 'flex-start' },
    linkText: { color: t.blue, fontSize: 12, fontWeight: '600' },
    primary: { alignSelf: 'flex-start', backgroundColor: t.primary, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
    primaryText: { color: '#000', fontWeight: '800' },
    secondary: { alignSelf: 'flex-start', borderWidth: 1, borderColor: t.border, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
    secondaryText: { color: t.text, fontWeight: '700' },
  })
