import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { colors, spacing } from '@shared/constants'
import { Button } from '@shared/components/ui/Button'
import { TrialGuard } from '../../../../components/TrialGuard'
import { apiService, handleApiError } from '@shared/services/api'

interface Bid {
  id: string
  pitch?: string
  message?: string
  coinsSpent?: number
  proposedAmount?: number
  amount?: number
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
  campaign?: {
    id: string
    title: string
  }
  campaignTitle?: string
  campaignId?: string
  influencer?: {
    id: string
    name: string
    email?: string
    image?: string
    instagramHandle?: string
  }
  influencerName?: string
  influencerHandle?: string
}

interface BrandBidsScreenProps {
  navigation?: any
  route?: any
}

type StatusFilter = 'all' | 'pending' | 'accepted' | 'rejected'

export default function BrandBidsScreen({ navigation, route }: BrandBidsScreenProps) {
  const initialCampaignId = route?.params?.campaignId
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ bid: Bid; action: 'accept' | 'reject' } | null>(null)

  const loadBids = useCallback(async () => {
    try {
      const response = initialCampaignId
        ? await apiService.getBidsForCampaign(initialCampaignId)
        : await apiService.getBids()
      const list: Bid[] = response?.data || response?.bids || (Array.isArray(response) ? response : [])
      setBids(Array.isArray(list) ? list : [])
    } catch (error) {
      handleApiError(error, 'Failed to load bids')
    } finally {
      setLoading(false)
    }
  }, [initialCampaignId])

  useEffect(() => {
    loadBids()
  }, [loadBids])

  useFocusEffect(
    useCallback(() => {
      loadBids()
    }, [loadBids])
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await loadBids()
    setRefreshing(false)
  }

  const performBidAction = async (bid: Bid, action: 'accept' | 'reject') => {
    setActioningId(bid.id)
    const newStatus = action === 'accept' ? 'accepted' : 'rejected'
    try {
      await apiService.updateBidStatus(bid.id, newStatus)
      setBids((prev) => prev.map((b) => (b.id === bid.id ? { ...b, status: newStatus } : b)))
      Alert.alert('Success', `Bid ${newStatus} successfully.`)
    } catch (error) {
      handleApiError(error, `Failed to ${action} bid`)
    } finally {
      setActioningId(null)
      setConfirmModal(null)
    }
  }

  const messageInfluencer = async (bid: Bid) => {
    const influencerId = bid.influencer?.id
    if (!influencerId) {
      Alert.alert('Unavailable', 'Influencer is missing from this bid.')
      return
    }
    try {
      const room = await apiService.createDirectChat(influencerId, bid.campaign?.id || bid.campaignId)
      const roomId = room?.id || room?.data?.id
      if (roomId) {
        navigation?.navigate('Chat', { roomId })
      }
    } catch (error) {
      handleApiError(error, 'Failed to open chat')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.warning
      case 'accepted':
        return colors.success
      case 'rejected':
        return colors.error
      default:
        return colors.textMuted
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending Review'
      case 'accepted':
        return 'Accepted'
      case 'rejected':
        return 'Rejected'
      default:
        return status
    }
  }

  const filteredBids = filter === 'all' ? bids : bids.filter((bid) => bid.status === filter)

  const renderBid = ({ item }: { item: Bid }) => {
    const influencerName = item.influencer?.name || item.influencerName || 'Influencer'
    const handle = item.influencer?.instagramHandle || item.influencerHandle
    const campaignTitle = item.campaign?.title || item.campaignTitle || 'Campaign'
    const amount = item.proposedAmount ?? item.amount ?? item.coinsSpent ?? 0
    const message = item.pitch || item.message || ''
    const isActing = actioningId === item.id

    return (
      <View style={styles.bidCard}>
        <View style={styles.bidHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.influencerName}>{influencerName}</Text>
            {!!handle && <Text style={styles.influencerHandle}>{handle.startsWith('@') ? handle : `@${handle}`}</Text>}
            <Text style={styles.campaignTitle}>{campaignTitle}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.bidDetails}>
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Proposed Amount</Text>
            <Text style={styles.amount}>₹{Number(amount).toLocaleString()}</Text>
          </View>

          {!!message && (
            <>
              <Text style={styles.messageLabel}>Pitch</Text>
              <Text style={styles.message}>{message}</Text>
            </>
          )}

          <Text style={styles.date}>Submitted: {new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>

        {item.status === 'pending' && (
          <View style={styles.actionButtons}>
            <Button
              title={isActing ? 'Working...' : 'Accept'}
              onPress={() => setConfirmModal({ bid: item, action: 'accept' })}
              size="sm"
              disabled={isActing}
              style={styles.acceptButton}
            />
            <Button
              title="Reject"
              onPress={() => setConfirmModal({ bid: item, action: 'reject' })}
              variant="outline"
              size="sm"
              disabled={isActing}
              style={styles.rejectButton}
            />
          </View>
        )}

        {item.status === 'accepted' && (
          <Button
            title="Message Creator"
            onPress={() => messageInfluencer(item)}
            size="sm"
            variant="outline"
          />
        )}
      </View>
    )
  }

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No bids yet</Text>
      <Text style={styles.emptySubtitle}>
        When creators apply to your campaigns, their bids will appear here
      </Text>
    </View>
  )

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <TrialGuard feature="campaign:unlimited-outreach">
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Received Bids</Text>
          <Text style={styles.subtitle}>Manage applications to your campaigns</Text>
        </View>

        <View style={styles.filterContainer}>
          {(['all', 'pending', 'accepted', 'rejected'] as StatusFilter[]).map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterButton, filter === status && styles.activeFilter]}
              onPress={() => setFilter(status)}
            >
              <Text style={[styles.filterText, filter === status && styles.activeFilterText]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={filteredBids}
          renderItem={renderBid}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        />

        <Modal
          visible={!!confirmModal}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmModal(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {confirmModal?.action === 'accept' ? 'Accept Bid' : 'Reject Bid'}
              </Text>
              <Text style={styles.modalBody}>
                {confirmModal?.action === 'accept'
                  ? `Accept ${confirmModal?.bid.influencer?.name || 'this creator'}'s bid? You can message them after accepting.`
                  : `Reject this bid? The creator will be notified.`}
              </Text>
              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  size="sm"
                  onPress={() => setConfirmModal(null)}
                  style={styles.modalBtn}
                />
                <Button
                  title={confirmModal?.action === 'accept' ? 'Accept' : 'Reject'}
                  size="sm"
                  variant={confirmModal?.action === 'reject' ? 'danger' : 'primary'}
                  loading={!!actioningId}
                  onPress={() => confirmModal && performBidAction(confirmModal.bid, confirmModal.action)}
                  style={styles.modalBtn}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
    </TrialGuard>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.xs,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeFilter: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  activeFilterText: {
    color: colors.white,
  },
  bidCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  influencerName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  influencerHandle: {
    fontSize: 14,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  campaignTitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  bidDetails: {
    marginBottom: spacing.md,
  },
  amountContainer: {
    marginBottom: spacing.md,
  },
  amountLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  messageLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  date: {
    fontSize: 12,
    color: colors.textMuted,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  acceptButton: {
    flex: 1,
  },
  rejectButton: {
    flex: 1,
  },
  listContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  modalBody: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalBtn: {
    flex: 1,
  },
})
