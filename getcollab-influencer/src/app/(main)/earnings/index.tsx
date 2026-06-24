import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, TextInput, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { colors, spacing } from '@shared/constants'
import { Card, Button } from '@shared/components/ui'
import apiService, { handleApiError } from '@shared/services/api'

interface Settlement {
  id: string
  campaignId?: string
  campaign?: {
    id?: string
    title?: string
  }
  amount: number
  status: 'pending' | 'paid' | 'rejected' | 'completed'
  message?: string
  createdAt: string
}

interface EarningsScreenProps {
  navigation?: any
}

export default function EarningsScreen({ navigation }: EarningsScreenProps) {
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [error, setError] = useState<string | null>(null)
  const [requestModal, setRequestModal] = useState(false)
  const [requestForm, setRequestForm] = useState({ amount: '', message: '', campaignId: '' })
  const [submitting, setSubmitting] = useState(false)

  const fetchSettlements = useCallback(async () => {
    try {
      setError(null)
      const response = await apiService.getEarnings()
      const list = response?.data || response?.requests || response?.earnings || response || []
      setSettlements(Array.isArray(list) ? list : [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load earnings')
      console.error('Error fetching settlements:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchSettlements()
    }, [fetchSettlements])
  )

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchSettlements()
    setRefreshing(false)
  }

  const handleSubmitPayout = async () => {
    const amount = Number(requestForm.amount)
    if (!amount || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter a payout amount greater than zero.')
      return
    }
    setSubmitting(true)
    try {
      await apiService.requestPayout({
        amount,
        message: requestForm.message.trim(),
        campaignId: requestForm.campaignId.trim() || undefined,
      })
      Alert.alert(
        'Payout requested',
        'Your request has been logged. Our team will review and process it shortly.'
      )
      setRequestModal(false)
      setRequestForm({ amount: '', message: '', campaignId: '' })
      fetchSettlements()
    } catch (err) {
      handleApiError(err, 'Failed to submit payout request')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return colors.success
      case 'pending':
        return colors.warning
      case 'rejected':
        return colors.error
      default:
        return colors.textMuted
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Paid'
      case 'completed':
        return 'Completed'
      case 'pending':
        return 'Pending'
      case 'rejected':
        return 'Rejected'
      default:
        return status || 'Unknown'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const totalPaid = settlements
    .filter((s) => s.status === 'paid' || s.status === 'completed')
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
  const totalPending = settlements
    .filter((s) => s.status === 'pending')
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0)

  const renderSettlementItem = ({ item }: { item: Settlement }) => (
    <Card style={styles.settlementCard}>
      <View style={styles.settlementHeader}>
        <View style={styles.settlementInfo}>
          <Text style={styles.campaignTitle} numberOfLines={1}>
            {item.campaign?.title || 'Campaign'}
          </Text>
          <Text style={styles.settlementDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amount}>₹{Number(item.amount || 0).toLocaleString()}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
      </View>
      {item.message && (
        <Text style={styles.settlementMessage} numberOfLines={2}>
          {item.message}
        </Text>
      )}
    </Card>
  )

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>💰</Text>
      <Text style={styles.emptyTitle}>No earnings yet</Text>
      <Text style={styles.emptySubtext}>
        Your settlement history will appear here once you complete campaigns
      </Text>
    </View>
  )

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading earnings...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={settlements}
        renderItem={renderSettlementItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={settlements.length === 0 ? styles.emptyList : styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Earnings</Text>
              <Text style={styles.headerSubtitle}>Track your campaign earnings</Text>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.statsContainer}>
              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>Total Paid</Text>
                <Text style={[styles.statValue, { color: colors.success }]}>₹{totalPaid.toLocaleString()}</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>Pending</Text>
                <Text style={[styles.statValue, { color: colors.warning }]}>₹{totalPending.toLocaleString()}</Text>
              </Card>
            </View>

            <View style={styles.requestRow}>
              <Button
                title="Request Payout"
                onPress={() => setRequestModal(true)}
                size="sm"
                fullWidth
              />
            </View>

            {settlements.length > 0 && <Text style={styles.sectionTitle}>History</Text>}
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
      />

      <Modal
        visible={requestModal}
        transparent
        animationType="slide"
        onRequestClose={() => setRequestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Request Payout</Text>
            <Text style={styles.modalSubtitle}>
              Submit a payout request for completed campaigns. Our team will review and disburse to your registered bank account.
            </Text>

            <Text style={styles.modalLabel}>Amount (₹) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 5000"
              placeholderTextColor={colors.textMuted}
              value={requestForm.amount}
              onChangeText={(v) => setRequestForm({ ...requestForm, amount: v })}
              keyboardType="numeric"
            />

            <Text style={styles.modalLabel}>Campaign ID (optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Associated campaign ID"
              placeholderTextColor={colors.textMuted}
              value={requestForm.campaignId}
              onChangeText={(v) => setRequestForm({ ...requestForm, campaignId: v })}
            />

            <Text style={styles.modalLabel}>Notes</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Provide any additional context..."
              placeholderTextColor={colors.textMuted}
              value={requestForm.message}
              onChangeText={(v) => setRequestForm({ ...requestForm, message: v })}
              multiline
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setRequestModal(false)}
                style={styles.modalBtn}
              />
              <Button
                title={submitting ? 'Submitting...' : 'Submit'}
                onPress={handleSubmitPayout}
                disabled={submitting}
                loading={submitting}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  errorText: {
    color: colors.error,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  requestRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
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
  settlementCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  settlementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  settlementInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  campaignTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  settlementDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
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
  settlementMessage: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 20,
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
    lineHeight: 20,
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
  modalSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 20,
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
    minHeight: 80,
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
