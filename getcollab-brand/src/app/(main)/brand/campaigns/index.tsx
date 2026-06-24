import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { colors, spacing } from '@shared/constants'
import { Button } from '@shared/components/ui/Button'
import { apiService, handleApiError } from '@shared/services/api'

interface Campaign {
  id: string
  title: string
  status: 'draft' | 'active' | 'completed' | 'paused' | 'cancelled'
  budget: number
  bidCount?: number
  applications?: number
  createdAt: string
}

interface BrandCampaignsScreenProps {
  navigation?: any
}

export default function BrandCampaignsScreen({ navigation }: BrandCampaignsScreenProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiService.deleteCampaign(deleteTarget.id)
      setCampaigns((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setDeleteTarget(null)
      Alert.alert('Deleted', 'Campaign has been deleted.')
    } catch (err) {
      handleApiError(err, 'Failed to delete campaign')
    } finally {
      setDeleting(false)
    }
  }

  const loadCampaigns = useCallback(async () => {
    try {
      const response = await apiService.getMyCampaigns()
      const list: Campaign[] = response?.data || response?.campaigns || response || []
      setCampaigns(Array.isArray(list) ? list : [])
    } catch (error: any) {
      handleApiError(error, 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadCampaigns()
    }, [loadCampaigns])
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await loadCampaigns()
    setRefreshing(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.primary
      case 'draft':
        return colors.textMuted
      case 'completed':
        return colors.success
      case 'paused':
        return colors.warning
      case 'cancelled':
        return colors.error
      default:
        return colors.textMuted
    }
  }

  const getStatusText = (status: string) =>
    status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'

  const formatDate = (value?: string) => {
    if (!value) return '-'
    try {
      return new Date(value).toLocaleDateString()
    } catch {
      return value
    }
  }

  const renderCampaign = useCallback(
    ({ item }: { item: Campaign }) => (
      <View style={styles.campaignCard}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`View campaign: ${item.title}`}
          onPress={() => navigation?.navigate('CampaignDetails', { id: item.id, campaign: item })}
          activeOpacity={0.7}
        >
          <View style={styles.campaignHeader}>
            <Text style={styles.campaignTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {getStatusText(item.status)}
              </Text>
            </View>
          </View>

          <View style={styles.campaignDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Budget</Text>
              <Text style={styles.detailValue}>₹{(item.budget ?? 0).toLocaleString()}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Bids</Text>
              <Text style={styles.detailValue}>{item.bidCount ?? item.applications ?? 0}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Created</Text>
              <Text style={styles.detailValue}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.actionsRow}>
          <Button
            title="View Bids"
            variant="outline"
            size="sm"
            onPress={() => navigation?.navigate('Bids', { campaignId: item.id })}
            style={styles.actionBtn}
          />
          <Button
            title="Analytics"
            size="sm"
            onPress={() => navigation?.navigate('CampaignAnalytics', { id: item.id, title: item.title })}
            style={styles.actionBtn}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Delete campaign: ${item.title}`}
            onPress={() => setDeleteTarget(item)}
            style={styles.deleteBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.deleteBtnText}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [navigation]
  )

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No campaigns yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first campaign to start collaborating with creators
      </Text>
      <Button
        title="Create Campaign"
        onPress={() => navigation?.navigate('CreateCampaign')}
        style={styles.createButton}
      />
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
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>My Campaigns</Text>
          <Button
            title="Create"
            onPress={() => navigation?.navigate('CreateCampaign')}
            size="sm"
          />
        </View>

        <FlatList
          data={campaigns}
          renderItem={renderCampaign}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={renderEmptyState}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
        />

        <Modal
          visible={!!deleteTarget}
          transparent
          animationType="fade"
          onRequestClose={() => setDeleteTarget(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Delete campaign?</Text>
              <Text style={styles.modalBody}>
                "{deleteTarget?.title}" will be permanently deleted. All associated bids will be cancelled.
                This action cannot be undone.
              </Text>
              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setDeleteTarget(null)}
                  disabled={deleting}
                  style={styles.modalBtn}
                />
                <Button
                  title={deleting ? 'Deleting...' : 'Delete'}
                  variant="danger"
                  onPress={handleDelete}
                  loading={deleting}
                  disabled={deleting}
                  style={styles.modalBtn}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  campaignCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  campaignTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing.md,
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
  campaignDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${colors.error}15`,
  },
  deleteBtnText: {
    fontSize: 18,
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
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  createButton: {
    width: '80%',
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
