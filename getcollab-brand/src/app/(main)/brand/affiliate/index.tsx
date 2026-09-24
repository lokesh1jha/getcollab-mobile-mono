import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, Alert, TextInput } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing, STATUS_COLORS } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import type { AffiliateProgram } from '@shared/types'
import * as Haptics from 'expo-haptics'


export default function AffiliateProgramsScreen({ navigation }: any) {
  const [programs, setPrograms] = useState<AffiliateProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const loadPrograms = useCallback(async () => {
    try {
      const res = await apiService.getAffiliatePrograms()
      const list = res?.programs || res?.data || []
      setPrograms(Array.isArray(list) ? list : [])
    } catch (err) {
      handleApiError(err, 'Failed to load programs')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadPrograms()
    }, [loadPrograms])
  )

  const handleCreate = async () => {
    if (!newName.trim()) { Alert.alert('Name needed', 'Enter a program name.'); return }
    setCreating(true)
    try {
      await apiService.createAffiliateProgram({
        name: newName.trim(),
        description: '',
        destinationUrl: '',
        terms: '',
      })
      setDialogOpen(false)
      setNewName('')
      loadPrograms()
    } catch (err) {
      handleApiError(err, 'Failed to create program')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleStatus = async (program: AffiliateProgram) => {
    try {
      if (program.status === 'active') {
        await apiService.pauseAffiliateProgram(program.id)
      } else {
        await apiService.activateAffiliateProgram(program.id)
      }
      loadPrograms()
    } catch (err) {
      handleApiError(err, 'Failed to update status')
    }
  }

  const renderItem = ({ item, index }: { item: AffiliateProgram; index: number }) => {
    const st = item.status || 'draft'
    const s = STATUS_COLORS[st] || STATUS_COLORS.draft
    const budget = item.budget
    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 80).duration(320)}>
        <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]} onPress={() => navigation?.navigate('AffiliateDetail', { id: item.id })}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.meta}>{item.productName || 'Product'} · {item.currency}</Text>
            </View>
            <Pressable onPress={(e) => { e.stopPropagation(); handleToggleStatus(item) }} style={({ pressed }) => [styles.statusPill, { backgroundColor: s.bg }, pressed && { opacity: 0.7 }]}>
              <Text style={[styles.statusText, { color: s.fg }]}>{st.charAt(0).toUpperCase() + st.slice(1)}</Text>
            </Pressable>
          </View>
          {budget && (
            <View style={styles.budgetRow}>
              <Text style={styles.budgetLabel}>Budget</Text>
              <Text style={styles.budgetValue}>₹{(budget.totalMinor / 100).toLocaleString()}</Text>
              <Text style={styles.budgetMeta}>Reserved: ₹{(budget.reservedMinor / 100).toLocaleString()}</Text>
            </View>
          )}
          <View style={styles.actionsRow}>
            <Pressable style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.85 }]} onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation?.navigate('AffiliateLinks', { programId: item.id }) }}>
              <Text style={styles.actionBtnText}>Links</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.85 }]} onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation?.navigate('AffiliateCommissions', { programId: item.id }) }}>
              <Text style={styles.actionBtnText}>Commissions</Text>
            </Pressable>
          </View>
        </Pressable>
      </Animated.View>
    )
  }

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
          data={programs}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListHeaderComponent={
            <View>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Affiliate</Text>
                  <Text style={styles.subtitle}>Your affiliate programs</Text>
                </View>
                <Pressable style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]} onPress={() => setDialogOpen(true)}>
                  <Ionicons name="add" size={16} color="#000" />
                  <Text style={styles.addBtnText}>New</Text>
                </Pressable>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="link-outline" size={26} color={colors.textMuted} /></View>
              <Text style={styles.emptyTitle}>No programs yet</Text>
              <Text style={styles.emptySub}>Create a program to start tracking referrals.</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRefreshing(true); loadPrograms() }} tintColor={colors.primary} />}
        />
      </SafeAreaView>

      {/* Create Modal */}
      {dialogOpen && (
        <Pressable style={styles.modalOverlay} onPress={() => setDialogOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New program</Text>
            <Text style={styles.modalBody}>Name your affiliate program.</Text>
            <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="Program name" placeholderTextColor={colors.textSubtle} />
            <View style={styles.modalActions}>
              <Pressable style={({ pressed }) => [styles.outlinedBtn, { flex: 1 }, pressed && { opacity: 0.8 }]} onPress={() => setDialogOpen(false)}>
                <Text style={styles.outlinedBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.primaryBtn, { flex: 1 }, pressed && { opacity: 0.85 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleCreate() }} disabled={creating}>
                <Text style={styles.primaryBtnText}>{creating ? 'Creating…' : 'Create'}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: spacing.md, marginBottom: spacing.md },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill },
  addBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },

  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  name: { color: '#fff', fontSize: 16, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  budgetLabel: { color: colors.textMuted, fontSize: 12 },
  budgetValue: { color: '#fff', fontSize: 16, fontWeight: '700' },
  budgetMeta: { color: colors.textSubtle, fontSize: 11 },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, width: '100%', maxWidth: 400 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  modalBody: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: spacing.lg },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 12, color: '#fff', fontSize: 14, backgroundColor: colors.bg },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  outlinedBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong },
  outlinedBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  primaryBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: radius.pill, backgroundColor: colors.primary },
  primaryBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },
})
