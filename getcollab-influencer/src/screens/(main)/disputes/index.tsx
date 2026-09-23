import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Pressable, ActivityIndicator, TextInput, Alert, RefreshControl } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { colors, spacing } from '@/src/theme'
import { Card, Button } from '@shared/components/ui'
import apiService, { handleApiError } from '@shared/services/api'
import { InfluencerNavigationProp } from '@/src/types/navigation'

interface Dispute {
  id: string
  campaignId: string | null
  reason: string
  description: string
  status: 'open' | 'resolved' | 'dismissed'
  resolution?: string
  createdAt: string
  campaign?: {
    title: string
  }
}

interface DisputesScreenProps {
  navigation?: InfluencerNavigationProp
}

export default function DisputesScreen({ navigation }: DisputesScreenProps) {
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ reason: '', description: '', dealId: '' })
  // Disputes are filed against a collaboration (deal); the API requires dealId.
  const [deals, setDeals] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)

  const fetchDisputes = useCallback(async () => {
    try {
      const [response, dealsRes] = await Promise.all([
        apiService.getDisputes(),
        apiService.getDeals({ limit: '100' }).catch(() => null),
      ])
      setDeals(dealsRes?.deals || dealsRes?.data || [])
      const list = response?.data || response?.disputes || (Array.isArray(response) ? response : [])
      setDisputes(Array.isArray(list) ? list : [])
    } catch (err) {
      // silently handle fetch error; UI loading state is cleared in finally
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchDisputes()
    }, [fetchDisputes])
  )

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDisputes()
    setRefreshing(false)
  }

  const resetForm = () => {
    setFormData({ reason: '', description: '', dealId: '' })
    setShowForm(false)
  }

  const handleSubmitDispute = async () => {
    if (!formData.dealId || !formData.reason.trim() || !formData.description.trim()) {
      Alert.alert('Error', 'Choose the collaboration and fill in reason and description.')
      return
    }

    setSubmitting(true)
    try {
      // The API keeps one text field; the short reason leads it.
      await apiService.createDispute({
        dealId: formData.dealId,
        reason: `${formData.reason.trim()}: ${formData.description.trim()}`,
      })
      Alert.alert('Success', 'Dispute filed successfully. Our team will review it.')
      resetForm()
      fetchDisputes()
    } catch (err: any) {
      handleApiError(err, 'Failed to submit dispute. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return colors.success
      case 'dismissed':
        return colors.textMuted
      default:
        return colors.warning
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'Resolved'
      case 'dismissed':
        return 'Dismissed'
      default:
        return 'Open'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const filteredDisputes = statusFilter === 'all' ? disputes : disputes.filter((d) => d.status === statusFilter)

  const renderDisputeItem = ({ item }: { item: Dispute }) => (
    <Card style={styles.disputeCard}>
      <View style={styles.disputeHeader}>
        <View style={styles.disputeInfo}>
          <Text style={styles.disputeReason}>{item.reason}</Text>
          <Text style={styles.disputeCampaign}>{item.campaign?.title || 'General Dispute'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <Text style={styles.disputeDescription} numberOfLines={3}>
        {item.description}
      </Text>

      <View style={styles.disputeFooter}>
        <Text style={styles.disputeDate}>{formatDate(item.createdAt)}</Text>
        {item.resolution && (
          <View style={styles.resolutionContainer}>
            <Text style={styles.resolutionLabel}>Resolution:</Text>
            <Text style={styles.resolutionText} numberOfLines={2}>
              {item.resolution}
            </Text>
          </View>
        )}
      </View>
    </Card>
  )

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>No disputes found</Text>
      <Text style={styles.emptySubtext}>You haven't filed any disputes yet</Text>
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
      <Animated.View entering={FadeInDown.duration(320)} style={{ flex: 1 }}>
        <FlatList automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled"
          data={filteredDisputes}
          renderItem={renderDisputeItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={filteredDisputes.length === 0 ? styles.emptyList : styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          ListHeaderComponent={
            <View>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Disputes</Text>
                <Text style={styles.headerSubtitle}>Report and track issues</Text>
              </View>
  
              <View style={styles.filterContainer}>
                {['all', 'open', 'resolved', 'dismissed'].map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={[styles.filterButton, statusFilter === filter && styles.filterButtonActive]}
                    onPress={() => setStatusFilter(filter)}
                  >
                    <Text style={[styles.filterText, statusFilter === filter && styles.filterTextActive]}>
                      {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
  
              <Button
                title={showForm ? 'Close Form' : 'Report an Issue'}
                variant={showForm ? 'outline' : 'primary'}
                onPress={() => setShowForm(!showForm)}
                style={styles.reportButton}
              />
  
              {showForm && (
                <Card style={styles.formCard}>
                  <Text style={styles.formTitle}>File a New Dispute</Text>
  
                  <Text style={styles.fieldLabel}>Reason *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Payment not received"
                    placeholderTextColor={colors.textMuted}
                    value={formData.reason}
                    onChangeText={(text) => setFormData({ ...formData, reason: text })}
                  />
  
                  <Text style={styles.fieldLabel}>Collaboration *</Text>
                  <View style={styles.dealRow}>
                    {deals.length === 0 && <Text style={styles.fieldHint}>No collaborations to dispute.</Text>}
                    {deals.map((d: any) => {
                      const on = formData.dealId === d.id
                      return (
                        <Pressable
                          key={d.id}
                          onPress={() => setFormData({ ...formData, dealId: d.id })}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: on }}
                          style={({ pressed }) => [styles.dealChip, on && styles.dealChipOn, pressed && { opacity: 0.85 }]}
                        >
                          <Text style={[styles.dealChipText, on && styles.dealChipTextOn]}>
                            {new Date(d.created_at).toLocaleDateString()} · {d.status}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </View>
  
                  <Text style={styles.fieldLabel}>Description *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe the issue in detail (min 10 chars)..."
                    placeholderTextColor={colors.textMuted}
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    multiline
                    numberOfLines={4}
                  />
  
                  <View style={styles.formButtons}>
                    <Button
                      title="Cancel"
                      variant="outline"
                      onPress={resetForm}
                      style={styles.cancelButton}
                    />
                    <Button
                      title={submitting ? 'Submitting...' : 'Submit'}
                      onPress={handleSubmitDispute}
                      disabled={submitting}
                      loading={submitting}
                      style={styles.submitButton}
                    />
                  </View>
                </Card>
              )}
  
              {filteredDisputes.length > 0 && <Text style={styles.sectionTitle}>History</Text>}
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.neon} />
          }
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      </Animated.View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  dealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  dealChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 6 },
  dealChipOn: { borderColor: colors.neon },
  dealChipText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  dealChipTextOn: { color: colors.neon },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.black,
  },
  reportButton: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  formCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  fieldHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  formButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  disputeCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  disputeInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  disputeReason: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  disputeCampaign: {
    fontSize: 14,
    color: colors.primary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  disputeDescription: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  disputeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  disputeDate: {
    fontSize: 12,
    color: colors.textDark,
  },
  resolutionContainer: {
    flex: 1,
    marginLeft: spacing.md,
    alignItems: 'flex-end',
  },
  resolutionLabel: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  resolutionText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
})
