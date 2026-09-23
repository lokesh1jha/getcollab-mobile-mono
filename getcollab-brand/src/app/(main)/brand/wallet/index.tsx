import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator, Modal, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import type { WalletTransaction } from '@shared/types'

const ENTRY_LABELS: Record<string, string> = {
  fund: 'Top-up / Fund',
  hold: 'Held in escrow',
  reserve: 'Reserved',
  release: 'Reservation released',
  consume: 'Reward / payout',
  release_influencer: 'Released to creator',
  release_fee: 'Platform fee',
  refund: 'Refund',
  adjustment: 'Manual adjustment',
  mark_paid: 'Payment settled',
}

function fmtMinor(minor: number): string {
  return `₹${Math.abs(minor / 100).toLocaleString('en-IN')}`
}

interface Props {
  navigation?: any
}

export default function WalletScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [summary, setSummary] = useState<{
    available_minor: number
    held_minor: number
    reserved_minor?: number
    balance_minor: number
  } | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const [topUpOpen, setTopUpOpen] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadWallet = useCallback(async (nextPage = 1) => {
    try {
      const [sumRes, txRes] = await Promise.all([
        apiService.fetchWalletSummary(),
        apiService.fetchWalletTransactions('INR', nextPage, 25),
      ])
      setSummary(sumRes)
      const txs = txRes?.transactions || []
      if (nextPage === 1) {
        setTransactions(txs)
      } else {
        setTransactions((prev) => [...prev, ...txs])
      }
      setHasMore(txs.length >= 25)
    } catch (err) {
      handleApiError(err, 'Failed to load wallet')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      setPage(1)
      loadWallet(1)
    }, [loadWallet])
  )

  const handleRefresh = () => {
    setRefreshing(true)
    setPage(1)
    loadWallet(1)
  }

  const handleTopUp = async () => {
    const amt = parseInt(amount, 10)
    if (Number.isNaN(amt) || amt <= 0) {
      Alert.alert('Error', 'Enter a valid amount')
      return
    }
    setSubmitting(true)
    try {
      const res = await apiService.topUpWallet({
        amountMinor: amt * 100,
        idempotencyKey: `topup-${Date.now()}`,
        memo: 'wallet top-up',
      })
      if (res?.error) throw new Error(res.error)
      Alert.alert('Success', 'Payment initiated. Balance updates after confirmation.')
      setTopUpOpen(false)
      setAmount('')
      loadWallet(1)
    } catch (err: any) {
      handleApiError(err, 'Top-up failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRefund = async () => {
    const amt = parseInt(amount, 10)
    if (Number.isNaN(amt) || amt <= 0) {
      Alert.alert('Error', 'Enter a valid amount')
      return
    }
    if (!refundReason.trim()) {
      Alert.alert('Error', 'Reason required')
      return
    }
    setSubmitting(true)
    try {
      const res = await apiService.requestWalletRefund({
        amountMinor: amt * 100,
        reason: refundReason.trim(),
      })
      if (res?.error) throw new Error(res.error)
      Alert.alert('Success', 'Refund request submitted for review')
      setRefundOpen(false)
      setAmount('')
      setRefundReason('')
    } catch (err: any) {
      handleApiError(err, 'Refund request failed')
    } finally {
      setSubmitting(false)
    }
  }

  const available = summary?.available_minor ?? 0
  const reserved = summary?.reserved_minor ?? summary?.held_minor ?? 0
  const total = summary?.balance_minor ?? available + reserved

  const metrics = [
    { label: 'Available', value: fmtMinor(available), icon: 'wallet-outline' as const, hint: 'Ready to fund campaigns' },
    { label: 'Reserved', value: fmtMinor(reserved), icon: 'lock-closed-outline' as const, hint: 'Earmarked for campaigns' },
    { label: 'Total', value: fmtMinor(total), icon: 'cash-outline' as const, hint: 'Cumulative funded' },
  ]

  const renderTransaction = ({ item, index }: { item: WalletTransaction; index: number }) => {
    const isPositive = item.amount_minor >= 0
    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 80).duration(320)} style={styles.txRow}>
        <View style={styles.txLeft}>
          <Text style={styles.txType}>{ENTRY_LABELS[item.entry_type] || item.entry_type}</Text>
          <Text style={styles.txMemo} numberOfLines={1}>
            {item.memo}
          </Text>
          <Text style={styles.txDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
        <Text style={[styles.txAmount, isPositive ? styles.txPositive : styles.txNegative]}>
          {isPositive ? '+' : '−'}
          {fmtMinor(item.amount_minor)}
        </Text>
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
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          ListHeaderComponent={
            <View>
              <View style={styles.header}>
                <Text style={styles.title}>Wallet</Text>
                <Text style={styles.subtitle}>One wallet for campaigns and affiliate</Text>
              </View>

              <View style={styles.actionsRow}>
                <Pressable style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.85 }]} onPress={() => setTopUpOpen(true)}>
                  <Ionicons name="add-circle-outline" size={16} color="#000" />
                  <Text style={styles.actionBtnText}>Top up</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.actionBtnSecondary, pressed && { opacity: 0.85 }]} onPress={() => setRefundOpen(true)}>
                  <Ionicons name="arrow-undo-outline" size={16} color="#fff" />
                  <Text style={styles.actionBtnSecondaryText}>Refund</Text>
                </Pressable>
              </View>

              <View style={styles.metricsGrid}>
                {metrics.map((m, i) => (
                  <Animated.View entering={FadeInDown.delay(Math.min(i, 5) * 80).duration(320)} key={m.label} style={styles.metricCard}>
                    <View style={styles.metricTop}>
                      <Ionicons name={m.icon} size={16} color={colors.textMuted} />
                      <Text style={styles.metricLabel}>{m.label}</Text>
                    </View>
                    <Text style={styles.metricValue}>{m.value}</Text>
                    <Text style={styles.metricHint}>{m.hint}</Text>
                  </Animated.View>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Transactions</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="receipt-outline" size={26} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptySub}>Top up your wallet to get started.</Text>
            </View>
          }
          ListFooterComponent={
            hasMore ? (
              <Pressable
                style={({ pressed }) => [styles.loadMoreBtn, pressed && { opacity: 0.85 }]}
                onPress={() => {
                  const next = page + 1
                  setPage(next)
                  loadWallet(next)
                }}
              >
                <Text style={styles.loadMoreText}>Load more</Text>
              </Pressable>
            ) : null
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.neon} />}
        />
      </SafeAreaView>

      {/* Top-up Modal */}
      <Modal visible={topUpOpen} transparent animationType="fade" onRequestClose={() => setTopUpOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Top up wallet</Text>
              <Text style={styles.modalBody}>Add funds. Balance is credited after payment verification.</Text>
              <Text style={styles.inputLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={amount}
                onChangeText={setAmount}
                placeholder="e.g. 10000"
                placeholderTextColor={colors.textSubtle}
              />
              <View style={styles.modalActions}>
                <Pressable style={({ pressed }) => [styles.outlinedBtn, { flex: 1 }, pressed && { opacity: 0.8 }]} onPress={() => setTopUpOpen(false)}>
                  <Text style={styles.outlinedBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, { flex: 1 }, pressed && { opacity: 0.85 }]}
                  onPress={handleTopUp}
                  disabled={submitting}
                >
                  <Text style={styles.primaryBtnText}>{submitting ? 'Processing…' : 'Top up'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Refund Modal */}
      <Modal visible={refundOpen} transparent animationType="fade" onRequestClose={() => setRefundOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Request refund</Text>
              <Text style={styles.modalBody}>Available balance only. Admin reviews before funds leave the wallet.</Text>
              <Text style={styles.inputLabel}>Amount (₹)</Text>
              <TextInput style={styles.input} keyboardType="number-pad" value={amount} onChangeText={setAmount} placeholderTextColor={colors.textSubtle} />
              <Text style={styles.inputLabel}>Reason</Text>
              <TextInput
                style={[styles.input, { minHeight: 80 }]}
                multiline
                value={refundReason}
                onChangeText={setRefundReason}
                placeholder="Why refund?"
                placeholderTextColor={colors.textSubtle}
              />
              <View style={styles.modalActions}>
                <Pressable style={({ pressed }) => [styles.outlinedBtn, { flex: 1 }, pressed && { opacity: 0.8 }]} onPress={() => setRefundOpen(false)}>
                  <Text style={styles.outlinedBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, { flex: 1 }, pressed && { opacity: 0.85 }]}
                  onPress={handleRefund}
                  disabled={submitting}
                >
                  <Text style={styles.primaryBtnText}>{submitting ? 'Submitting…' : 'Submit'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: spacing.md, marginBottom: spacing.md },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },

  actionsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.neon, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill },
  actionBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },
  actionBtnSecondary: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill },
  actionBtnSecondaryText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  metricsGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  metricCard: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md },
  metricTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  metricValue: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 6 },
  metricHint: { color: colors.textSubtle, fontSize: 10, marginTop: 4 },

  sectionTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: spacing.md, marginBottom: spacing.sm },

  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  txLeft: { flex: 1 },
  txType: { color: '#fff', fontSize: 14, fontWeight: '600' },
  txMemo: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  txDate: { color: colors.textSubtle, fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  txPositive: { color: colors.success },
  txNegative: { color: colors.textMuted },

  divider: { height: 1, backgroundColor: colors.border },

  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13 },

  loadMoreBtn: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  loadMoreText: { color: colors.blue, fontSize: 13, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, width: '100%', maxWidth: 400 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  modalBody: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: spacing.lg },
  inputLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 12, color: '#fff', fontSize: 14, backgroundColor: colors.bg },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  outlinedBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong },
  outlinedBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  primaryBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: radius.pill, backgroundColor: colors.neon },
  primaryBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },
})
