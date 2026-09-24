import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, Linking } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import type { Invoice } from '@shared/types'
import * as Haptics from 'expo-haptics'

export default function InvoicesScreen({ navigation }: any) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadInvoices = useCallback(async () => {
    try {
      const res = await apiService.getInvoices()
      const list = res?.invoices || res?.data || []
      setInvoices(Array.isArray(list) ? list : [])
    } catch (err) {
      handleApiError(err, 'Failed to load invoices')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadInvoices()
    }, [loadInvoices])
  )

  const handleDownload = async (invoiceId: string) => {
    try {
      const res = await apiService.downloadInvoice(invoiceId)
      const url = res?.downloadUrl || res?.url || res?.pdfUrl
      if (url) {
        Linking.openURL(url)
      } else {
        handleApiError(new Error("This invoice isn't ready to download."), 'Download unavailable')
      }
    } catch (err) {
      handleApiError(err, 'Failed to download invoice')
    }
  }

  const renderInvoice = ({ item, index }: { item: Invoice; index: number }) => (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 80).duration(320)}>
      <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]} onPress={() => handleDownload(item.id)}>
        <View style={styles.rowIcon}>
          <Ionicons name="document-text-outline" size={18} color={colors.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.invoiceTitle}>{item.description || `Invoice ${item.id.slice(0, 8)}`}</Text>
          <Text style={styles.invoiceMeta}>₹{item.amount.toLocaleString()} · {new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: item.status === 'paid' ? colors.successSoft : colors.warningSoft }]}
        >
          <Text style={[styles.statusText, { color: item.status === 'paid' ? colors.success : colors.warning }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
        <Ionicons name="download-outline" size={18} color={colors.textSubtle} />
      </Pressable>
    </Animated.View>
  )

  if (loading && !refreshing) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
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
            <View style={styles.header}>
              <Text style={styles.title}>Invoices</Text>
              <Text style={styles.subtitle}>{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="receipt-outline" size={26} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No invoices yet</Text>
              <Text style={styles.emptySub}>Invoices appear after your first payment.</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRefreshing(true); loadInvoices() }} tintColor={colors.primary} />}
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

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  rowIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  invoiceTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  invoiceMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginRight: spacing.sm },
  statusText: { fontSize: 11, fontWeight: '700' },

  divider: { height: 1, backgroundColor: colors.border },

  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13 },
})
