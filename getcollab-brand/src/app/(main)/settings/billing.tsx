import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, Linking } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import { useSubscriptionStore } from '../../../stores/subscription-store'
import type { Invoice } from '@shared/types'

export default function BillingSettingsScreen() {
  const subscription = useSubscriptionStore((s) => s.subscription)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadBilling = useCallback(async () => {
    try {
      const res = await apiService.getInvoices()
      const list = res?.invoices || res?.data || []
      setInvoices(Array.isArray(list) ? list : [])
    } catch (err) {
      handleApiError(err, 'Failed to load billing')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadBilling()
    }, [loadBilling])
  )

  const handleDownload = async (invoiceId: string) => {
    try {
      const res = await apiService.downloadInvoice(invoiceId)
      const url = res?.downloadUrl || res?.url || res?.pdfUrl
      if (url) {
        Linking.openURL(url)
      } else {
        handleApiError(new Error('No download URL'), 'Download unavailable')
      }
    } catch (err) {
      handleApiError(err, 'Failed to download invoice')
    }
  }

  const renderInvoice = ({ item, index }: { item: Invoice; index: number }) => (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 80).duration(320)}>
      <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]} onPress={() => handleDownload(item.id)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.invoiceTitle}>{item.description || `Invoice ${item.id.slice(0, 8)}`}</Text>
          <Text style={styles.invoiceMeta}>₹{item.amount.toLocaleString()} · {new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: item.status === 'paid' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.14)' }]}>
          <Text style={[styles.statusText, { color: item.status === 'paid' ? '#22C55E' : '#F59E0B' }]}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</Text>
        </View>
        <Ionicons name="download-outline" size={18} color={colors.textSubtle} />
      </Pressable>
    </Animated.View>
  )

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
          data={invoices}
          renderItem={renderInvoice}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          ListHeaderComponent={
            <View>
              <View style={styles.header}>
                <Text style={styles.title}>Billing</Text>
                <Text style={styles.subtitle}>Plan and invoices</Text>
              </View>

              <View style={styles.planCard}>
                <Text style={styles.planLabel}>Current Plan</Text>
                <Text style={styles.planValue}>{subscription?.plan || 'Free'}</Text>
                <Text style={styles.planStatus}>{subscription?.status || 'Active'}</Text>
                <Pressable style={({ pressed }) => [styles.manageBtn, pressed && { opacity: 0.85 }]} onPress={() => useSubscriptionStore.getState().openBillingPortal()}>
                  <Text style={styles.manageBtnText}>Manage Subscription</Text>
                </Pressable>
              </View>

              <Text style={styles.sectionLabel}>Invoices</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No invoices yet</Text>
              <Text style={styles.emptySub}>Invoices appear after your first payment.</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadBilling() }} tintColor={colors.neon} />}
        />
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: spacing.md, marginBottom: spacing.md },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },

  planCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  planLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  planValue: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 4 },
  planStatus: { color: colors.textSubtle, fontSize: 13, marginTop: 2 },
  manageBtn: { backgroundColor: colors.neon, borderRadius: radius.pill, paddingVertical: 12, alignItems: 'center', marginTop: spacing.md },
  manageBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },

  sectionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  invoiceTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  invoiceMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },

  divider: { height: 1, backgroundColor: colors.border },

  empty: { alignItems: 'center', paddingVertical: spacing.xxxl },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  emptySub: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
})
