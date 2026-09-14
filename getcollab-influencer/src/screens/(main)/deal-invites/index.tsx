import React, { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'

interface Invite {
  id: string
  campaignTitle?: string
  campaign?: { title?: string }
  message?: string
  status?: string
  createdAt?: string
  created_at?: string
}

export default function DealInvitesScreen({ navigation }: any) {
  const [items, setItems] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [decliningId, setDecliningId] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await apiService.getDealInvites({ status: 'pending' })
      setItems(res?.invites || res?.data || [])
    } catch (e) { handleApiError(e, 'Failed to load invites') }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useFocusEffect(useCallback(() => { setLoading(true); load() }, [load]))

  const accept = async (id: string) => {
    setBusy(id)
    try {
      await apiService.acceptDealInvite(id)
      setItems((x) => x.filter((i) => i.id !== id))
    } catch (e) { handleApiError(e, 'Failed to accept invite') }
    finally { setBusy(null) }
  }

  const decline = async () => {
    if (!decliningId) return
    setBusy(decliningId)
    try {
      await apiService.declineDealInvite(decliningId, declineReason.trim() || undefined)
      setItems((x) => x.filter((i) => i.id !== decliningId))
      setDecliningId(null)
      setDeclineReason('')
    } catch (e) { handleApiError(e, 'Failed to decline invite') }
    finally { setBusy(null) }
  }

  if (loading) return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.center}><ActivityIndicator color={colors.neon} /></View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Campaign Invites</Text>
        <Text style={styles.subtitle}>Invitations from brands to collaborate</Text>
      </View>
      <FlatList
        data={items}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.neon} />}
        contentContainerStyle={styles.list}
        keyExtractor={(i) => String(i.id)}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}><Ionicons name="mail-outline" size={26} color={colors.textMuted} /></View>
            <Text style={styles.emptyTitle}>No pending invites</Text>
            <Text style={styles.emptySub}>When a brand invites you to a campaign, it will show up here.</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 40).duration(300)}>
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={styles.inviteIcon}>
                  <Ionicons name="mail" size={18} color={colors.blue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.campaignTitle || item.campaign?.title || 'Campaign invitation'}</Text>
                  <Text style={styles.cardMeta}>{item.message || 'A brand invited you to collaborate.'}</Text>
                  {item.createdAt || item.created_at ? (
                    <Text style={styles.cardDate}>{new Date(item.createdAt || item.created_at!).toLocaleDateString()}</Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.actions}>
                <Pressable
                  disabled={!!busy}
                  onPress={() => accept(item.id)}
                  style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }, busy === item.id && { opacity: 0.5 }]}
                >
                  {busy === item.id ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={14} color="#000" />
                      <Text style={styles.primaryText}>Accept</Text>
                    </>
                  )}
                </Pressable>
                <Pressable
                  disabled={!!busy}
                  onPress={() => { setDecliningId(item.id); setDeclineReason('') }}
                  style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.85 }, !!busy && { opacity: 0.5 }]}
                >
                  <Ionicons name="close" size={14} color={colors.text} />
                  <Text style={styles.secondaryText}>Decline</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        )}
      />

      {/* Decline Modal */}
      <Modal visible={decliningId !== null} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => { setDecliningId(null); setDeclineReason('') }} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Decline invitation</Text>
          <Text style={styles.sheetSub}>Optional: let the brand know why you're passing.</Text>
          <TextInput
            value={declineReason}
            onChangeText={setDeclineReason}
            placeholder="Reason (optional)"
            placeholderTextColor={colors.textSubtle}
            multiline
            style={styles.sheetInput}
          />
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
            <Pressable onPress={() => { setDecliningId(null); setDeclineReason('') }} style={({ pressed }) => [styles.sheetBtnOutline, pressed && { opacity: 0.85 }]}>
              <Text style={styles.sheetBtnOutlineText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={decline}
              disabled={!!busy}
              style={({ pressed }) => [styles.sheetBtnDanger, pressed && { opacity: 0.85 }, !!busy && { opacity: 0.5 }]}
            >
              <Text style={styles.sheetBtnDangerText}>{busy === decliningId ? 'Saving…' : 'Decline'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg },
  inviteIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  cardMeta: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
  cardDate: { color: colors.textSubtle, fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, justifyContent: 'flex-end' },
  primary: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.neon, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  primaryText: { color: '#000', fontWeight: '800', fontSize: 13 },
  secondary: { flexDirection: 'row', alignItems: 'center', gap: 6, borderColor: colors.border, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  secondaryText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  emptyWrap: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: spacing.xl },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, paddingBottom: spacing.xxxl, borderWidth: 1, borderBottomWidth: 0, borderColor: colors.border },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  sheetSub: { color: colors.textMuted, fontSize: 13, marginTop: 4, marginBottom: spacing.md },
  sheetInput: { backgroundColor: colors.elevated, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, color: colors.text, minHeight: 80, textAlignVertical: 'top' },
  sheetBtnOutline: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  sheetBtnOutlineText: { color: colors.text, fontWeight: '700' },
  sheetBtnDanger: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.pill, backgroundColor: colors.errorSoft, borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)' },
  sheetBtnDangerText: { color: colors.error, fontWeight: '800' },
})
