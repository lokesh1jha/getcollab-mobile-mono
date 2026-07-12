import React, { useState, useCallback } from 'react'
import { FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing, statusColor } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'

interface Settlement { id: string; amount: number; status: string; campaignId?: string; campaignTitle?: string; createdAt?: string; notes?: string }

function formatDate(v?: string): string {
  if (!v) return '—'
  try { return new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return v }
}

export default function EarningsScreen({ navigation }: any) {
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [amount, setAmount] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const totalPaid = settlements.filter(s => s.status === 'paid' || s.status === 'completed').reduce((sum, s) => sum + Number(s.amount || 0), 0)
  const totalPending = settlements.filter(s => s.status === 'pending' || s.status === 'processing').reduce((sum, s) => sum + Number(s.amount || 0), 0)

  const load = useCallback(async (spinner = false) => {
    if (spinner) setLoading(true)
    try {
      const res = await apiService.getEarnings()
      const list: Settlement[] = res?.data || res?.requests || res?.earnings || (Array.isArray(res) ? res : [])
      setSettlements(Array.isArray(list) ? list : [])
    } catch (err: any) {
      handleApiError(err, 'Failed to load earnings')
    } finally { setLoading(false); setRefreshing(false) }
  }, [])

  useFocusEffect(useCallback(() => { load(true) }, [load]))
  const onRefresh = () => { setRefreshing(true); load(false) }

  const handleRequest = async () => {
    if (!amount.trim()) return
    setSubmitting(true)
    try {
      await apiService.requestPayout({ amount: Number(amount), campaignId: campaignId || undefined, message: notes || '' })
      setShowModal(false)
      setAmount('')
      setCampaignId('')
      setNotes('')
      load(false)
    } catch (err: any) {
      handleApiError(err, 'Failed to request payout')
    } finally { setSubmitting(false) }
  }

  const renderSettlement = ({ item, index }: { item: Settlement; index: number }) => {
    const s = statusColor(item.status)
    return (
      <Animated.View entering={FadeInDown.delay(index * 40).duration(320)} style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={styles.cardIcon}>
            <Ionicons name={item.status === 'paid' || item.status === 'completed' ? 'checkmark-circle' : 'time-outline'} size={18} color={item.status === 'paid' || item.status === 'completed' ? colors.success : colors.warning} />
          </View>
          <View>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.campaignTitle || `Campaign #${item.campaignId?.slice(-4) || '—'}`}</Text>
            <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.cardAmount}>₹{Number(item.amount || 0).toLocaleString()}</Text>
          <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.fg }]}>{item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}</Text>
          </View>
        </View>
      </Animated.View>
    )
  }

  if (loading) return (
    <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={colors.neon} />
    </View>
  )

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <Pressable hitSlop={12} onPress={() => navigation?.goBack()} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.75 }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Earnings</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          data={settlements}
          renderItem={renderSettlement}
          keyExtractor={s => s.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neon} />}
          ListHeaderComponent={
            <View>
              {/* Stat cards */}
              <View style={styles.statsRow}>
                <Animated.View entering={FadeInDown.delay(0).duration(320)} style={[styles.statCard, { borderColor: 'rgba(34,197,94,0.3)' }]}>
                  <View style={styles.statIconWrap}><Ionicons name="wallet-outline" size={18} color={colors.success} /></View>
                  <Text style={[styles.statValue, { color: colors.success }]}>₹{totalPaid.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Total Paid</Text>
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(80).duration(320)} style={[styles.statCard, { borderColor: 'rgba(245,158,11,0.3)' }]}>
                  <View style={[styles.statIconWrap, { backgroundColor: colors.warningSoft }]}><Ionicons name="time-outline" size={18} color={colors.warning} /></View>
                  <Text style={[styles.statValue, { color: colors.warning }]}>₹{totalPending.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </Animated.View>
              </View>

              <Pressable
                onPress={() => setShowModal(true)}
                style={({ pressed }) => [styles.requestBtn, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="cash-outline" size={18} color="#000" />
                <Text style={styles.requestBtnText}>Request Payout</Text>
              </Pressable>

              <Text style={[styles.sectionTitle, { marginTop: spacing.xl, marginBottom: spacing.md }]}>History</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="wallet-outline" size={26} color={colors.textMuted} /></View>
              <Text style={styles.emptyTitle}>No earnings yet</Text>
              <Text style={styles.emptySub}>Complete campaigns to receive payouts here.</Text>
            </View>
          }
        />

        <Modal visible={showModal} animationType="slide" transparent>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <Pressable style={styles.overlay} onPress={() => setShowModal(false)} />
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Request Payout</Text>

              <Text style={styles.sheetLabel}>Amount (₹)</Text>
              <View style={styles.sheetInput}>
                <Ionicons name="cash-outline" size={18} color={colors.textMuted} />
                <TextInput value={amount} onChangeText={setAmount} placeholder="Enter amount" placeholderTextColor={colors.textSubtle} keyboardType="numeric" style={styles.sheetInputText} />
              </View>

              <Text style={styles.sheetLabel}>Campaign ID (optional)</Text>
              <View style={styles.sheetInput}>
                <Ionicons name="megaphone-outline" size={18} color={colors.textMuted} />
                <TextInput value={campaignId} onChangeText={setCampaignId} placeholder="Campaign reference" placeholderTextColor={colors.textSubtle} style={styles.sheetInputText} />
              </View>

              <Text style={styles.sheetLabel}>Notes (optional)</Text>
              <View style={[styles.sheetInput, { alignItems: 'flex-start', minHeight: 80, paddingTop: 14 }]}>
                <TextInput value={notes} onChangeText={setNotes} placeholder="Additional notes…" placeholderTextColor={colors.textSubtle} multiline style={[styles.sheetInputText, { textAlignVertical: 'top' }]} />
              </View>

              <Pressable onPress={handleRequest} disabled={submitting || !amount.trim()} style={({ pressed }) => [styles.submitBtn, (!amount.trim() || submitting) && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}>
                <Text style={styles.submitBtnText}>{submitting ? 'Requesting…' : 'Request Payout'}</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, marginBottom: spacing.md },
  statCard: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  statValue: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  statLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },
  requestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.neon, borderRadius: radius.pill, paddingVertical: 14 },
  requestBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  cardIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: '600', maxWidth: 160 },
  cardDate: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  cardAmount: { color: colors.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: spacing.xl },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, paddingBottom: spacing.xxxl, borderWidth: 1, borderBottomWidth: 0, borderColor: colors.border },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.xl },
  sheetLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '600', letterSpacing: 0.4, marginBottom: 8, marginTop: spacing.md },
  sheetInput: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 14 },
  sheetInputText: { flex: 1, color: colors.text, fontSize: 15, padding: 0 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.neon, borderRadius: radius.pill, paddingVertical: 16, marginTop: spacing.xl },
  submitBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
})
