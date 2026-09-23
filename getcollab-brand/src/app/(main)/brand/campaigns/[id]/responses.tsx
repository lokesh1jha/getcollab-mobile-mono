import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, Alert, ActivityIndicator, RefreshControl, Modal, ScrollView } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import { colors, radius, spacing, STATUS_COLORS } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import * as Haptics from 'expo-haptics'

type RouteParams = RouteProp<{ campaignResponses: { id: string; title?: string } }, 'campaignResponses'>

interface Bid { id: string; pitch?: string; proposedAmount?: number; amount?: number; status: 'pending' | 'accepted' | 'rejected'; createdAt: string; influencer?: { id: string; name: string; instagramHandle?: string } }


export default function CampaignResponsesScreen() {
  const route = useRoute<RouteParams>()
  const navigation = useNavigation()
  const { id: campaignId, title } = route.params || {}

  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ bid: Bid; action: 'accept' | 'reject' } | null>(null)

  const loadBids = useCallback(async () => {
    try {
      const res = await apiService.getBidsForCampaign(campaignId)
      const list = res?.data || res?.bids || (Array.isArray(res) ? res : [])
      setBids(Array.isArray(list) ? list : [])
    } catch (err) {
      handleApiError(err, 'Failed to load responses')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [campaignId])

  useEffect(() => {
    if (campaignId) loadBids()
  }, [campaignId, loadBids])

  const performAction = async (bid: Bid, action: 'accept' | 'reject') => {
    setActioningId(bid.id)
    const newStatus = action === 'accept' ? 'accepted' : 'rejected'
    try {
      await apiService.updateBidStatus(bid.id, newStatus)
      setBids((prev) => prev.map((b) => (b.id === bid.id ? { ...b, status: newStatus } : b)))
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert('Success', `Bid ${newStatus} successfully.`)
    } catch (err) {
      handleApiError(err, `Failed to ${action} bid`)
    } finally {
      setActioningId(null)
      setConfirmModal(null)
    }
  }

  const messageCreator = async (bid: Bid) => {
    const influencerId = bid.influencer?.id
    if (!influencerId) { Alert.alert('Unavailable', 'Creator info missing'); return }
    try {
      const room = await apiService.createDirectChat(influencerId, campaignId)
      const roomId = room?.id || room?.data?.id
      if (roomId) (navigation as any).navigate('ChatDetail', { roomId, id: roomId })
    } catch (err) {
      handleApiError(err, 'Failed to open chat')
    }
  }

  const renderItem = ({ item, index }: { item: Bid; index: number }) => {
    const s = STATUS_COLORS[item.status] || STATUS_COLORS.pending
    const isActing = actioningId === item.id
    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 80).duration(320)} style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.influencer?.name || 'Creator'}</Text>
            {item.influencer?.instagramHandle && <Text style={styles.handle}>@{item.influencer.instagramHandle}</Text>}
            <Text style={styles.amount}>₹{Number(item.proposedAmount ?? item.amount ?? 0).toLocaleString()}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.fg }]}>{(item.status ?? 'pending').charAt(0).toUpperCase() + (item.status ?? 'pending').slice(1)}</Text>
          </View>
        </View>
        {item.pitch && <Text style={styles.pitch} numberOfLines={3}>{item.pitch}</Text>}
        <Text style={styles.date}>Submitted: {new Date(item.createdAt).toLocaleDateString()}</Text>
        {item.status === 'pending' && (
          <View style={styles.actionsRow}>
            <Pressable style={({ pressed }) => [styles.acceptBtn, pressed && { opacity: 0.85 }]} disabled={isActing} onPress={() => setConfirmModal({ bid: item, action: 'accept' })}>
              <Text style={styles.acceptBtnText}>{isActing ? '…' : 'Accept'}</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.rejectBtn, pressed && { opacity: 0.8 }]} disabled={isActing} onPress={() => setConfirmModal({ bid: item, action: 'reject' })}>
              <Text style={styles.rejectBtnText}>Reject</Text>
            </Pressable>
          </View>
        )}
        {item.status === 'accepted' && (
          <Pressable style={({ pressed }) => [styles.outlinedBtn, pressed && { opacity: 0.8 }]} onPress={() => messageCreator(item)}>
            <Text style={styles.outlinedBtnText}>Message Creator</Text>
          </Pressable>
        )}
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
          data={bids}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.title}>Responses</Text>
              <Text style={styles.subtitle}>{bids.length} applications for {title || 'this campaign'}</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="document-text-outline" size={26} color={colors.textMuted} /></View>
              <Text style={styles.emptyTitle}>No responses yet</Text>
              <Text style={styles.emptySub}>Applications will appear here when creators apply.</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadBids() }} tintColor={colors.neon} />}
        />
      </SafeAreaView>

      <Modal visible={!!confirmModal} transparent animationType="fade" onRequestClose={() => setConfirmModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{confirmModal?.action === 'accept' ? 'Accept Bid' : 'Reject Bid'}</Text>
            <Text style={styles.modalBody}>{confirmModal?.action === 'accept' ? `Accept ${confirmModal?.bid.influencer?.name || 'this creator'}'s bid?` : 'Reject this bid? The creator will be notified.'}</Text>
            <View style={styles.modalActions}>
              <Pressable style={({ pressed }) => [styles.outlinedBtn, { flex: 1 }, pressed && { opacity: 0.8 }]} onPress={() => setConfirmModal(null)}>
                <Text style={styles.outlinedBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [confirmModal?.action === 'accept' ? styles.acceptBtn : styles.rejectBtn, { flex: 1 }, pressed && { opacity: 0.85 }]} onPress={() => confirmModal && performAction(confirmModal.bid, confirmModal.action)}>
                <Text style={confirmModal?.action === 'accept' ? styles.acceptBtnText : styles.rejectBtnText}>{confirmModal?.action === 'accept' ? 'Accept' : 'Reject'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: spacing.md, marginBottom: spacing.md },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },

  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  name: { color: '#fff', fontSize: 16, fontWeight: '700' },
  handle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  amount: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 4 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  pitch: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.md },
  date: { color: colors.textSubtle, fontSize: 11, marginTop: spacing.sm },
  actionsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  acceptBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success, borderRadius: radius.pill, paddingVertical: 12 },
  acceptBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  rejectBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.error, borderRadius: radius.pill, paddingVertical: 12 },
  rejectBtnText: { color: colors.error, fontSize: 13, fontWeight: '600' },
  outlinedBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong },
  outlinedBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, width: '100%', maxWidth: 400 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  modalBody: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: spacing.lg },
  modalActions: { flexDirection: 'row', gap: spacing.md },
})
