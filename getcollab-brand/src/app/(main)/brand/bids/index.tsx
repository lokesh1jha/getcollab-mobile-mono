import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, Alert, ActivityIndicator, RefreshControl, Modal, ScrollView } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { TrialGuard } from '../../../../components/TrialGuard'
import { apiService, handleApiError } from '@shared/services/api'

interface Bid { id: string; pitch?: string; message?: string; proposedAmount?: number; amount?: number; status: 'pending' | 'accepted' | 'rejected'; createdAt: string; campaign?: { id: string; title: string }; campaignTitle?: string; campaignId?: string; influencer?: { id: string; name: string; email?: string; image?: string; instagramHandle?: string }; influencerName?: string; influencerHandle?: string }
interface Props { navigation?: any; route?: any }
type StatusFilter = 'all' | 'pending' | 'accepted' | 'rejected'

const FILTERS: StatusFilter[] = ['all', 'pending', 'accepted', 'rejected']
const STATUS_COLORS: Record<string, { fg: string; bg: string }> = { pending: { fg: '#F59E0B', bg: 'rgba(245,158,11,0.14)' }, accepted: { fg: '#22C55E', bg: 'rgba(34,197,94,0.12)' }, rejected: { fg: '#EF4444', bg: 'rgba(239,68,68,0.14)' } }

export default function BrandBidsScreen({ navigation, route }: Props) {
  const initialCampaignId = route?.params?.campaignId
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ bid: Bid; action: 'accept' | 'reject' } | null>(null)

  const loadBids = useCallback(async () => {
    try {
      const response = initialCampaignId ? await apiService.getBidsForCampaign(initialCampaignId) : await apiService.getBids()
      const list: Bid[] = response?.data || response?.bids || (Array.isArray(response) ? response : [])
      setBids(Array.isArray(list) ? list : [])
    } catch (error) { handleApiError(error, 'Failed to load bids') }
    finally { setLoading(false) }
  }, [initialCampaignId])

  useEffect(() => { loadBids() }, [loadBids])
  useFocusEffect(useCallback(() => { loadBids() }, [loadBids]))
  const onRefresh = async () => { setRefreshing(true); await loadBids(); setRefreshing(false) }

  const performBidAction = async (bid: Bid, action: 'accept' | 'reject') => {
    setActioningId(bid.id); const newStatus = action === 'accept' ? 'accepted' : 'rejected'
    try {
      await apiService.updateBidStatus(bid.id, newStatus)
      setBids((prev) => prev.map((b) => (b.id === bid.id ? { ...b, status: newStatus } : b)))
      Alert.alert('Success', `Bid ${newStatus} successfully.`)
    } catch (error) { handleApiError(error, `Failed to ${action} bid`) }
    finally { setActioningId(null); setConfirmModal(null) }
  }

  const messageInfluencer = async (bid: Bid) => {
    const influencerId = bid.influencer?.id
    if (!influencerId) { Alert.alert('Unavailable', 'Influencer is missing from this bid.'); return }
    try {
      const room = await apiService.createDirectChat(influencerId, bid.campaign?.id || bid.campaignId)
      const roomId = room?.id || room?.data?.id
      if (roomId) navigation?.navigate('Chat', { roomId })
    } catch (error) { handleApiError(error, 'Failed to open chat') }
  }

  const filteredBids = filter === 'all' ? bids : bids.filter((bid) => bid.status === filter)

  if (loading && !refreshing) {
    return <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={colors.neon} /></View>
  }

  return (
    <TrialGuard feature="campaign:unlimited-outreach">
      <View style={styles.root}>
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
          <FlatList
            data={filteredBids}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
            ListHeaderComponent={
              <View>
                <View style={styles.header}>
                  <Text style={styles.title}>Bids</Text>
                  <Text style={styles.subtitle}>Manage applications to your campaigns</Text>
                </View>

                <View style={styles.filterRow}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                    {FILTERS.map((f) => {
                      const active = f === filter
                      return (
                        <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, active && styles.chipActive]}>
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
                        </Pressable>
                      )
                    })}
                  </ScrollView>
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}><Ionicons name="document-text-outline" size={26} color={colors.textMuted} /></View>
                <Text style={styles.emptyTitle}>No bids yet</Text>
                <Text style={styles.emptySub}>When creators apply to your campaigns, their bids will appear here.</Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const s = STATUS_COLORS[item.status] || STATUS_COLORS.pending
              const influencerName = item.influencer?.name || item.influencerName || 'Influencer'
              const campaignTitle = item.campaign?.title || item.campaignTitle || 'Campaign'
              const amount = item.proposedAmount ?? item.amount ?? 0
              const message = item.pitch || item.message || ''
              const isActing = actioningId === item.id

              return (
                <Animated.View entering={FadeInDown.delay(index * 40).duration(320)} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.influencerName}>{influencerName}</Text>
                      {item.influencer?.instagramHandle || item.influencerHandle ? <Text style={styles.handle}>@{item.influencer?.instagramHandle || item.influencerHandle}</Text> : null}
                      <Text style={styles.campaignTitle}>{campaignTitle}</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
                      <Text style={[styles.statusText, { color: s.fg }]}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</Text>
                    </View>
                  </View>

                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Proposed Amount</Text>
                    <Text style={styles.amountValue}>₹{Number(amount).toLocaleString()}</Text>
                  </View>

                  {!!message && <Text style={styles.message} numberOfLines={3}>{message}</Text>}

                  <Text style={styles.date}>Submitted: {new Date(item.createdAt).toLocaleDateString()}</Text>

                  {item.status === 'pending' && (
                    <View style={styles.actionsRow}>
                      <Pressable style={({ pressed }) => [styles.acceptBtn, pressed && { opacity: 0.85 }]} disabled={isActing} onPress={() => setConfirmModal({ bid: item, action: 'accept' })}>
                        <Text style={styles.acceptBtnText}>{isActing ? '...' : 'Accept'}</Text>
                      </Pressable>
                      <Pressable style={({ pressed }) => [styles.rejectBtn, pressed && { opacity: 0.8 }]} disabled={isActing} onPress={() => setConfirmModal({ bid: item, action: 'reject' })}>
                        <Text style={styles.rejectBtnText}>Reject</Text>
                      </Pressable>
                    </View>
                  )}

                  {item.status === 'accepted' && (
                    <Pressable style={({ pressed }) => [styles.outlinedBtn, pressed && { opacity: 0.8 }]} onPress={() => messageInfluencer(item)}>
                      <Text style={styles.outlinedBtnText}>Message Creator</Text>
                    </Pressable>
                  )}
                </Animated.View>
              )
            }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neon} />}
          />

          <Modal visible={!!confirmModal} transparent animationType="fade" onRequestClose={() => setConfirmModal(null)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>{confirmModal?.action === 'accept' ? 'Accept Bid' : 'Reject Bid'}</Text>
                <Text style={styles.modalBody}>{confirmModal?.action === 'accept' ? `Accept ${confirmModal?.bid.influencer?.name || 'this creator'}'s bid?` : 'Reject this bid? The creator will be notified.'}</Text>
                <View style={styles.modalActions}>
                  <Pressable style={({ pressed }) => [styles.outlinedBtn, { flex: 1 }, pressed && { opacity: 0.8 }]} onPress={() => setConfirmModal(null)}>
                    <Text style={styles.outlinedBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={({ pressed }) => [confirmModal?.action === 'accept' ? styles.acceptBtn : styles.rejectBtn, { flex: 1 }, pressed && { opacity: 0.85 }]} onPress={() => confirmModal && performBidAction(confirmModal.bid, confirmModal.action)}>
                    <Text style={confirmModal?.action === 'accept' ? styles.acceptBtnText : styles.rejectBtnText}>{confirmModal?.action === 'accept' ? 'Accept' : 'Reject'}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </View>
    </TrialGuard>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: spacing.md, marginBottom: spacing.md },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  filterRow: { height: 50, justifyContent: 'center', marginBottom: spacing.sm },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: '#fff', borderColor: '#fff' },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#000' },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  influencerName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  handle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  campaignTitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  amountLabel: { color: colors.textMuted, fontSize: 13 },
  amountValue: { color: '#fff', fontSize: 18, fontWeight: '700' },
  message: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.md },
  date: { color: colors.textSubtle, fontSize: 11, marginTop: spacing.sm },
  actionsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  acceptBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success, borderRadius: radius.pill, paddingVertical: 12 },
  acceptBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  rejectBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.error, borderRadius: radius.pill, paddingVertical: 12 },
  rejectBtnText: { color: colors.error, fontSize: 13, fontWeight: '600' },
  outlinedBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong },
  outlinedBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: spacing.xxxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, width: '100%', maxWidth: 400 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  modalBody: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: spacing.lg },
  modalActions: { flexDirection: 'row', gap: spacing.md },
})
