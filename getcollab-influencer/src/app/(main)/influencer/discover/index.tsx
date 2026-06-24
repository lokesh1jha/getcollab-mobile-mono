import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing, CATEGORIES, REGIONS } from '@shared/constants'
import { Card, Button } from '@shared/components/ui'
import apiService, { handleApiError } from '@shared/services/api'

interface Campaign {
  id: string
  title: string
  description: string
  budget: number
  status: string
  bidCount?: number
  categories?: string[]
  deliverables?: string[]
  region?: string
  startDate?: string
  endDate?: string
  brand?: {
    id: string
    name?: string
    image?: string
  }
  brandName?: string
}

interface DiscoverScreenProps {
  navigation?: any
}

const REGION_FILTERS = ['All Regions', ...REGIONS]

export default function DiscoverCampaigns({ navigation }: DiscoverScreenProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string>('All Regions')

  const [bidModal, setBidModal] = useState<Campaign | null>(null)
  const [bidPitch, setBidPitch] = useState('')
  const [bidAmount, setBidAmount] = useState('')
  const [submittingBid, setSubmittingBid] = useState(false)

  const loadCampaigns = useCallback(async () => {
    setError(null)
    try {
      const params: Record<string, any> = { status: 'ACTIVE' }
      if (searchQuery.trim()) params.search = searchQuery.trim()
      const response = await apiService.getCampaigns(params)
      const list: Campaign[] = response?.data || response?.campaigns || (Array.isArray(response) ? response : [])
      setCampaigns(Array.isArray(list) ? list : [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load campaigns')
      handleApiError(err, 'Failed to load campaigns')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [searchQuery])

  useFocusEffect(
    useCallback(() => {
      loadCampaigns()
    }, [loadCampaigns])
  )

  const handleRefresh = () => {
    setRefreshing(true)
    loadCampaigns()
  }

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const status = (campaign.status || '').toString().toLowerCase()
      if (status !== 'active') return false

      if (selectedCategory) {
        const cats = (campaign.categories || []).map((c) => c.toLowerCase())
        if (!cats.includes(selectedCategory.toLowerCase())) return false
      }

      if (selectedRegion && selectedRegion !== 'All Regions') {
        const region = (campaign.region || '').toLowerCase()
        if (region && region !== selectedRegion.toLowerCase()) return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const title = (campaign.title || '').toLowerCase()
        const description = (campaign.description || '').toLowerCase()
        const brand = (campaign.brand?.name || campaign.brandName || '').toLowerCase()
        if (!title.includes(q) && !description.includes(q) && !brand.includes(q)) return false
      }

      return true
    })
  }, [campaigns, selectedCategory, selectedRegion, searchQuery])

  const openBidModal = (campaign: Campaign) => {
    setBidModal(campaign)
    setBidPitch('')
    setBidAmount(campaign.budget ? String(Math.max(0, Math.floor(campaign.budget * 0.5))) : '')
  }

  const closeBidModal = () => {
    if (submittingBid) return
    setBidModal(null)
    setBidPitch('')
    setBidAmount('')
  }

  const submitBid = async () => {
    if (!bidModal) return
    if (!bidPitch.trim() || bidPitch.trim().length < 10) {
      Alert.alert('Pitch too short', 'Tell the brand why you are a great fit (at least 10 characters).')
      return
    }
    const amount = Number(bidAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter a positive bid amount.')
      return
    }

    setSubmittingBid(true)
    try {
      await apiService.submitBid({
        campaignId: bidModal.id,
        pitch: bidPitch.trim(),
        proposedAmount: amount,
      })
      Alert.alert('Bid submitted', 'The brand will review your pitch. You can track status under My Campaigns.', [
        {
          text: 'OK',
          onPress: () => {
            setBidModal(null)
            setBidPitch('')
            setBidAmount('')
          },
        },
      ])
    } catch (err) {
      handleApiError(err, 'Failed to submit bid')
    } finally {
      setSubmittingBid(false)
    }
  }

  const renderCampaign = useCallback(
    ({ item }: { item: Campaign }) => (
      <Card style={styles.campaignCard}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation?.navigate('CampaignDetails', { id: item.id, campaign: item })}
        >
          <View style={styles.campaignHeader}>
            <View style={styles.campaignInfo}>
              <Text style={styles.campaignTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.brand} numberOfLines={1}>
                {item.brand?.name || item.brandName || 'Brand'}
              </Text>
              {item.region ? <Text style={styles.region}>📍 {item.region}</Text> : null}
            </View>
            <Text style={styles.budget}>₹{Number(item.budget || 0).toLocaleString()}</Text>
          </View>

          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>

          {(item.categories?.length || 0) > 0 && (
            <View style={styles.tagRow}>
              {item.categories!.slice(0, 3).map((cat) => (
                <View key={cat} style={styles.categoryTag}>
                  <Text style={styles.categoryTagText}>{cat}</Text>
                </View>
              ))}
              {item.categories!.length > 3 && (
                <Text style={styles.moreText}>+{item.categories!.length - 3}</Text>
              )}
            </View>
          )}

          {(item.deliverables?.length || 0) > 0 && (
            <View style={styles.tagRow}>
              {item.deliverables!.slice(0, 3).map((d) => (
                <View key={d} style={styles.deliverableTag}>
                  <Text style={styles.deliverableText} numberOfLines={1}>
                    {d}
                  </Text>
                </View>
              ))}
              {item.deliverables!.length > 3 && (
                <Text style={styles.moreText}>+{item.deliverables!.length - 3}</Text>
              )}
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.campaignFooter}>
          <Text style={styles.bidsText}>
            {item.bidCount || 0} bid{(item.bidCount || 0) !== 1 ? 's' : ''}
          </Text>
          <Button title="Apply Now" size="sm" onPress={() => openBidModal(item)} />
        </View>
      </Card>
    ),
    [navigation]
  )

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading campaigns...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        style={styles.content}
        contentContainerStyle={styles.listContent}
        data={filteredCampaigns}
        renderItem={renderCampaign}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.title}>Discover Campaigns</Text>
              <Text style={styles.subtitle}>Find your next collaboration opportunity</Text>
            </View>

            <View style={styles.searchWrap}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search campaigns, brands, keywords..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                onSubmitEditing={loadCampaigns}
              />
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{filteredCampaigns.length}</Text>
                <Text style={styles.statLabel}>Matching</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{campaigns.length}</Text>
                <Text style={styles.statLabel}>Active Total</Text>
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                <TouchableOpacity
                  style={[styles.chip, !selectedCategory && styles.chipActive]}
                  onPress={() => setSelectedCategory(null)}
                >
                  <Text style={[styles.chipText, !selectedCategory && styles.chipTextActive]}>All</Text>
                </TouchableOpacity>
                {CATEGORIES.map((category) => {
                  const active = selectedCategory === category
                  return (
                    <TouchableOpacity
                      key={category}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setSelectedCategory(active ? null : category)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{category}</Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Region</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {REGION_FILTERS.map((region) => {
                  const active = selectedRegion === region
                  return (
                    <TouchableOpacity
                      key={region}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setSelectedRegion(region)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{region}</Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Text style={styles.sectionTitle}>
              {selectedCategory ? `${selectedCategory} ` : ''}Campaigns
              {selectedRegion && selectedRegion !== 'All Regions' ? ` · ${selectedRegion}` : ''}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No campaigns found</Text>
            <Text style={styles.emptySubtext}>
              Try changing your filters or check back later for new opportunities.
            </Text>
          </Card>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={10}
      />

      <Modal
        visible={!!bidModal}
        animationType="slide"
        transparent
        onRequestClose={closeBidModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Apply to Campaign</Text>
            <Text style={styles.modalCampaign} numberOfLines={2}>
              {bidModal?.title}
            </Text>
            <Text style={styles.modalBudget}>Budget: ₹{Number(bidModal?.budget || 0).toLocaleString()}</Text>

            <Text style={styles.modalLabel}>Your Pitch *</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Why are you the best creator for this campaign?"
              placeholderTextColor={colors.textMuted}
              value={bidPitch}
              onChangeText={setBidPitch}
              multiline
              numberOfLines={5}
              editable={!submittingBid}
            />

            <Text style={styles.modalLabel}>Proposed Amount (₹) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 15000"
              placeholderTextColor={colors.textMuted}
              value={bidAmount}
              onChangeText={setBidAmount}
              keyboardType="numeric"
              editable={!submittingBid}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={closeBidModal}
                disabled={submittingBid}
                style={styles.modalBtn}
              />
              <Button
                title={submittingBid ? 'Submitting...' : 'Submit Bid'}
                onPress={submitBid}
                loading={submittingBid}
                disabled={submittingBid}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    paddingTop: spacing.xl,
    marginBottom: spacing.md,
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
  searchWrap: {
    marginBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  filterSection: {
    marginBottom: spacing.md,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.white,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  errorText: {
    color: colors.error,
    marginBottom: spacing.md,
  },
  campaignCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  campaignInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  campaignTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  brand: {
    fontSize: 14,
    color: colors.textMuted,
  },
  region: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  budget: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  categoryTag: {
    backgroundColor: `${colors.accent}20`,
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  categoryTagText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '500',
  },
  deliverableTag: {
    backgroundColor: `${colors.primary}15`,
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    maxWidth: '48%',
  },
  deliverableText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  moreText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    alignSelf: 'center',
  },
  campaignFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bidsText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  modalCampaign: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  modalBudget: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  modalLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  modalInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalBtn: {
    flex: 1,
  },
})
