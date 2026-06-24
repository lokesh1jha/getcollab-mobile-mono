import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { colors, spacing } from '@shared/constants'
import { apiService, handleApiError } from '@shared/services/api'

interface AppliedCampaign {
  id: string
  title: string
  brand?: string
  status: 'applied' | 'pending' | 'accepted' | 'rejected' | 'completed' | 'in_progress'
  proposedAmount: number
  appliedDate: string
  deadline?: string
}

interface InfluencerCampaignsScreenProps {
  navigation?: any
}

export default function InfluencerCampaignsScreen({ navigation }: InfluencerCampaignsScreenProps) {
  const [campaigns, setCampaigns] = useState<AppliedCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'pending'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const loadCampaigns = useCallback(async () => {
    try {
      const response = await apiService.getBids()
      const list = response?.data || response?.bids || (Array.isArray(response) ? response : [])
      const mapped: AppliedCampaign[] = (Array.isArray(list) ? list : []).map((bid: any) => ({
        id: bid.id,
        title: bid.campaign?.title || bid.campaignTitle || 'Campaign',
        brand: bid.campaign?.brand?.name || bid.brandName || '',
        status: (bid.status === 'pending' ? 'applied' : bid.status) as AppliedCampaign['status'],
        proposedAmount: Number(bid.coinsSpent || bid.proposedAmount || bid.amount || 0),
        appliedDate: bid.createdAt || '',
        deadline: bid.campaign?.endDate,
      }))
      setCampaigns(mapped)
    } catch (error: any) {
      handleApiError(error, 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

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
      case 'applied':
      case 'pending':
        return colors.warning
      case 'accepted':
      case 'in_progress':
        return colors.primary
      case 'completed':
        return colors.success
      case 'rejected':
        return colors.error
      default:
        return colors.textMuted
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'applied':
      case 'pending':
        return 'Applied'
      case 'accepted':
        return 'Accepted'
      case 'in_progress':
        return 'In Progress'
      case 'completed':
        return 'Completed'
      case 'rejected':
        return 'Rejected'
      default:
        return status
    }
  }

  const formatDate = (value?: string) => {
    if (!value) return '-'
    try {
      return new Date(value).toLocaleDateString()
    } catch {
      return value
    }
  }

  const filteredCampaigns = useMemo(() => {
    let list = campaigns
    if (filter === 'active') list = list.filter((c) => ['accepted', 'in_progress'].includes(c.status))
    else if (filter === 'completed') list = list.filter((c) => c.status === 'completed')
    else if (filter === 'pending') list = list.filter((c) => ['applied', 'pending'].includes(c.status))
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.brand?.toLowerCase().includes(q)
      )
    }
    return list
  }, [campaigns, filter, searchQuery])

  const renderCampaign = useCallback(
    ({ item }: { item: AppliedCampaign }) => (
      <TouchableOpacity
        style={styles.campaignCard}
        onPress={() => navigation?.navigate('CampaignDetails', { id: item.id, campaign: item })}
      >
        <View style={styles.campaignHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.campaignTitle}>{item.title}</Text>
            {item.brand ? <Text style={styles.brandName}>{item.brand}</Text> : null}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.campaignDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Proposed Amount</Text>
              <Text style={styles.detailValue}>₹{item.proposedAmount.toLocaleString()}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Applied</Text>
              <Text style={styles.detailValue}>{formatDate(item.appliedDate)}</Text>
            </View>
          </View>

          {item.deadline && (
            <View style={styles.deadlineContainer}>
              <Text style={styles.deadlineLabel}>Deadline</Text>
              <Text style={styles.deadline}>{formatDate(item.deadline)}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    ),
    [navigation]
  )

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No campaigns yet</Text>
      <Text style={styles.emptySubtitle}>
        Apply to campaigns in the Discover section to see them here
      </Text>
      <TouchableOpacity style={styles.browseButton} onPress={() => navigation?.navigate('Discover')}>
        <Text style={styles.browseText}>Browse Campaigns</Text>
      </TouchableOpacity>
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
          <Text style={styles.title}>My Bids</Text>
          <Text style={styles.subtitle}>Track every campaign you've applied to</Text>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Search campaigns or brands..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View style={styles.filterContainer}>
          {(['all', 'active', 'completed', 'pending'] as const).map((status) => (
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
          data={filteredCampaigns}
          renderItem={renderCampaign}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
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
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    fontSize: 15,
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
  titleContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  campaignTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  brandName: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
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
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  deadlineContainer: {
    alignItems: 'center',
  },
  deadlineLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  deadline: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
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
  browseButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  browseText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
})
