import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import { colors, radius, spacing, STATUS_COLORS } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import type { AffiliateProgram } from '@shared/types'

type RouteParams = RouteProp<{ affiliateDetail: { id: string } }, 'affiliateDetail'>


export default function AffiliateDetailScreen() {
  const route = useRoute<RouteParams>()
  const navigation = useNavigation()
  const { id } = route.params || {}

  const [program, setProgram] = useState<AffiliateProgram | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', destinationUrl: '', terms: '' })

  const loadProgram = useCallback(async () => {
    try {
      const res = await apiService.getAffiliateProgram(id)
      const p = res?.program || res?.data || null
      setProgram(p)
      if (p) {
        setForm({
          name: p.name || '',
          description: p.description || '',
          destinationUrl: p.destinationUrl || '',
          terms: p.terms || '',
        })
      }
    } catch (err) {
      handleApiError(err, 'Failed to load program')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [id])

  useEffect(() => {
    if (id) loadProgram()
  }, [id, loadProgram])

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Name is required'); return }
    setSaving(true)
    try {
      await apiService.updateAffiliateProgram(id, {
        name: form.name.trim(),
        description: form.description.trim(),
        destinationUrl: form.destinationUrl.trim(),
        terms: form.terms.trim(),
      })
      setProgram((prev) => (prev ? { ...prev, ...form } : prev))
      setEditing(false)
      Alert.alert('Saved', 'Program updated.')
    } catch (err) {
      handleApiError(err, 'Failed to save program')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!program) return
    try {
      if (program.status === 'active') {
        await apiService.pauseAffiliateProgram(program.id)
        setProgram({ ...program, status: 'paused' })
      } else if (program.status === 'paused') {
        await apiService.resumeAffiliateProgram(program.id)
        setProgram({ ...program, status: 'active' })
      } else if (program.status === 'draft') {
        await apiService.activateAffiliateProgram(program.id)
        setProgram({ ...program, status: 'active' })
      }
    } catch (err) {
      handleApiError(err, 'Failed to update status')
    }
  }

  const handleClose = async () => {
    if (!program) return
    Alert.alert('Close Program?', 'This will stop new referrals. Existing commissions remain.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiService.closeAffiliateProgram(program.id)
            setProgram({ ...program, status: 'closed' })
          } catch (err) {
            handleApiError(err, 'Failed to close program')
          }
        },
      },
    ])
  }

  const handleIncreaseBudget = async () => {
    if (!program) return
    Alert.alert('Increase Budget', 'Enter additional amount in rupees.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Add ₹5,000',
        onPress: async () => {
          try {
            await apiService.increaseAffiliateBudget(program.id, 5000 * 100)
            Alert.alert('Success', 'Budget increased.')
            loadProgram()
          } catch (err) {
            handleApiError(err, 'Failed to increase budget')
          }
        },
      },
    ])
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.neon} />
        </View>
      </SafeAreaView>
    )
  }

  if (!program) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg }}>
          <Text style={{ color: colors.error, fontSize: 16 }}>Program not found</Text>
          <Pressable style={({ pressed }) => [styles.outlinedBtn, pressed && { opacity: 0.8 }]} onPress={() => navigation.goBack()}>
            <Text style={styles.outlinedBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const st = program.status || 'draft'
  const s = STATUS_COLORS[st] || STATUS_COLORS.draft
  const budget = program.budget

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProgram() }} tintColor={colors.neon} />}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{program.name}</Text>
            <Pressable onPress={handleToggleStatus} style={({ pressed }) => [styles.statusPill, { backgroundColor: s.bg }, pressed && { opacity: 0.7 }]}>
              <Text style={[styles.statusText, { color: s.fg }]}>{st.charAt(0).toUpperCase() + st.slice(1)}</Text>
            </Pressable>
          </View>

          {budget && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Budget</Text>
              <View style={styles.budgetRow}>
                <View style={styles.budgetBlock}>
                  <Text style={styles.budgetValue}>₹{(budget.totalMinor / 100).toLocaleString()}</Text>
                  <Text style={styles.budgetLabel}>Total</Text>
                </View>
                <View style={styles.budgetBlock}>
                  <Text style={styles.budgetValue}>₹{(budget.reservedMinor / 100).toLocaleString()}</Text>
                  <Text style={styles.budgetLabel}>Reserved</Text>
                </View>
                <View style={styles.budgetBlock}>
                  <Text style={styles.budgetValue}>₹{((budget.totalMinor - budget.reservedMinor) / 100).toLocaleString()}</Text>
                  <Text style={styles.budgetLabel}>Available</Text>
                </View>
              </View>
              <Pressable style={({ pressed }) => [styles.budgetBtn, pressed && { opacity: 0.85 }]} onPress={handleIncreaseBudget}>
                <Text style={styles.budgetBtnText}>Increase Budget</Text>
              </Pressable>
            </View>
          )}

          {editing ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Edit Program</Text>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholderTextColor={colors.textSubtle} />
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput style={[styles.input, { minHeight: 80 }]} multiline value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholderTextColor={colors.textSubtle} />
              <Text style={styles.fieldLabel}>Destination URL</Text>
              <TextInput style={styles.input} value={form.destinationUrl} onChangeText={(v) => setForm({ ...form, destinationUrl: v })} placeholderTextColor={colors.textSubtle} autoCapitalize="none" />
              <Text style={styles.fieldLabel}>Terms</Text>
              <TextInput style={[styles.input, { minHeight: 80 }]} multiline value={form.terms} onChangeText={(v) => setForm({ ...form, terms: v })} placeholderTextColor={colors.textSubtle} />
              <View style={styles.editActions}>
                <Pressable style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.75 }]} onPress={() => setEditing(false)}>
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]} onPress={handleSave} disabled={saving}>
                  <Text style={styles.primaryBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.sectionTitle}>Details</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Edit" onPress={() => setEditing(true)} style={({ pressed }) => pressed && { opacity: 0.85 }}>
                  <Ionicons name="create-outline" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
              {program.description ? <Text style={styles.detailBody}>{program.description}</Text> : null}
              {program.destinationUrl ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>URL</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>{program.destinationUrl}</Text>
                </View>
              ) : null}
              {program.productName ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Product</Text>
                  <Text style={styles.detailValue}>{program.productName}</Text>
                </View>
              ) : null}
              {program.currency ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Currency</Text>
                  <Text style={styles.detailValue}>{program.currency}</Text>
                </View>
              ) : null}
            </View>
          )}

          <View style={styles.actionsRow}>
            <Pressable style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.85 }]} onPress={() => (navigation as any).navigate('AffiliateLinks', { programId: program.id })}>
              <Ionicons name="link-outline" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Links</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.85 }]} onPress={() => (navigation as any).navigate('AffiliateCommissions', { programId: program.id })}>
              <Ionicons name="cash-outline" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Commissions</Text>
            </Pressable>
          </View>

          {program.status !== 'closed' && (
            <Pressable style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.85 }]} onPress={handleClose}>
              <Text style={styles.closeBtnText}>Close Program</Text>
            </Pressable>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg, gap: spacing.md },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', letterSpacing: -0.5, flex: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, flexShrink: 0 },
  statusText: { fontSize: 11, fontWeight: '700' },

  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },

  budgetRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  budgetBlock: { flex: 1, alignItems: 'center' },
  budgetValue: { color: '#fff', fontSize: 16, fontWeight: '700' },
  budgetLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  budgetBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neon, borderRadius: radius.pill, paddingVertical: 12, marginTop: spacing.sm },
  budgetBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },

  detailBody: { color: colors.textMuted, fontSize: 14, lineHeight: 22, marginBottom: spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { color: colors.textMuted, fontSize: 13 },
  detailValue: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: spacing.md },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.4, marginBottom: spacing.sm, marginTop: spacing.md },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 12, color: colors.text, fontSize: 14, backgroundColor: colors.bg },
  editActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  primaryBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neon, borderRadius: radius.pill, paddingVertical: 12 },
  primaryBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },
  secondaryBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.pill, paddingVertical: 12 },
  secondaryBtnText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },

  actionsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.blue, borderRadius: radius.pill, paddingVertical: 12 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  closeBtn: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.error + '55', borderRadius: radius.pill, paddingVertical: 12, backgroundColor: colors.errorSoft },
  closeBtnText: { color: colors.error, fontSize: 13, fontWeight: '600' },

  outlinedBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, marginTop: spacing.md },
  outlinedBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
