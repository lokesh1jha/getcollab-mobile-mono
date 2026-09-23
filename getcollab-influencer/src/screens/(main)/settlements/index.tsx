import React, { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { colors, radius, spacing, statusColor } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'

interface Settlement {
  id: string
  campaign_id?: string
  campaignId?: string
  status: string
  amount_minor?: number
  amount?: number
  createdAt?: string
}

export default function SettlementsScreen() {
  const [items, setItems] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [campaignId, setCampaignId] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await apiService.getSettlements()
      setItems(r?.settlementRequests || r?.data || [])
    } catch (e) { handleApiError(e, 'Failed to load settlements') }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const submit = async () => {
    if (!campaignId.trim()) return Alert.alert('Campaign required', 'Enter the campaign ID for the completed deal.')
    setSaving(true)
    try {
      await apiService.createSettlement({ campaignId: campaignId.trim(), amount: amount.trim() ? Math.round(Number(amount) * 100) : undefined, message })
      setCampaignId(''); setAmount(''); setMessage('')
      Alert.alert('Submitted', 'Settlement request created.')
      load()
    } catch (e) { handleApiError(e, 'Failed to create settlement') }
    finally { setSaving(false) }
  }

  const renderItem = ({ item, index }: { item: Settlement; index: number }) => {
    const s = statusColor(item.status)
    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 80).duration(320)} style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Campaign {String(item.campaign_id || item.campaignId || '').slice(-8)}</Text>
            <Text style={styles.meta}>{item.status || 'pending'} · ₹{(Number(item.amount_minor || item.amount || 0) / 100).toLocaleString()}</Text>
          </View>
        </View>
      </Animated.View>
    )
  }

  if (loading) return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.center}><ActivityIndicator color={colors.neon} /></View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <FlatList automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled"
        style={styles.root}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.neon} />}
        data={items}
        keyExtractor={(x) => String(x.id)}
        ListHeaderComponent={
          <View>
            <Text style={styles.heading}>Request settlement</Text>
            <Text style={styles.hint}>Use this for a completed collaboration while the brand reviews payment.</Text>
            <TextInput value={campaignId} onChangeText={setCampaignId} placeholder="Campaign ID" placeholderTextColor={colors.textSubtle} style={styles.input} />
            <TextInput value={amount} onChangeText={setAmount} placeholder="Amount in ₹ (optional)" keyboardType="numeric" placeholderTextColor={colors.textSubtle} style={styles.input} />
            <TextInput value={message} onChangeText={setMessage} placeholder="Message (optional)" placeholderTextColor={colors.textSubtle} style={styles.input} />
            <Pressable onPress={submit} disabled={saving} style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }, saving && { opacity: 0.5 }]}>
              <Text style={styles.primaryText}>{saving ? 'Submitting...' : 'Request settlement'}</Text>
            </Pressable>
            <Text style={[styles.heading, { marginTop: spacing.xl }]}>History</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="receipt-outline" size={26} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No settlement requests yet</Text>
          </View>
        }
        renderItem={renderItem}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  heading: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: spacing.md },
  hint: { color: colors.textMuted, lineHeight: 19, marginBottom: spacing.md },
  input: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, color: colors.text, marginBottom: spacing.md },
  primary: { alignItems: 'center', backgroundColor: colors.neon, borderRadius: radius.pill, padding: spacing.md },
  primaryText: { color: '#000', fontWeight: '800' },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  title: { color: colors.text, fontWeight: '700' },
  meta: { color: colors.textMuted, marginTop: spacing.xs, fontSize: 13 },
  emptyWrap: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyTitle: { color: colors.textMuted, fontSize: 15, fontWeight: '600', marginTop: spacing.sm },
})
