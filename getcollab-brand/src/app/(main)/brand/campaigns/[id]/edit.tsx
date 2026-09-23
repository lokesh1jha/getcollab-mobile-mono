import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert, TextInput, Pressable, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import { colors, radius, spacing, STATUS_COLORS } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import type { Campaign } from '@shared/types'
import * as Haptics from 'expo-haptics'

type RouteParams = RouteProp<{ campaignEdit: { id: string } }, 'campaignEdit'>

const STATUS_OPTIONS = ['draft', 'active', 'paused', 'completed', 'cancelled']


export default function CampaignEditScreen() {
  const route = useRoute<RouteParams>()
  const navigation = useNavigation()
  const { id } = route.params || {}

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    budget: '',
    startDate: '',
    endDate: '',
    status: '',
  })

  useEffect(() => {
    if (!id) return
    apiService.getCampaign(id)
      .then((res) => {
        const c = res?.campaign || res?.data || res
        setCampaign(c)
        setForm({
          title: c.title || '',
          description: c.description || '',
          budget: String(c.budget || ''),
          startDate: c.startDate ? c.startDate.slice(0, 10) : '',
          endDate: c.endDate ? c.endDate.slice(0, 10) : '',
          status: c.status || 'draft',
        })
      })
      .catch((err) => handleApiError(err, 'Failed to load campaign'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    if (!form.title.trim()) { Alert.alert('Error', 'Title is required'); return }
    const budgetNum = parseFloat(form.budget)
    if (Number.isNaN(budgetNum) || budgetNum <= 0) { Alert.alert('Error', 'Enter a valid budget'); return }

    setSaving(true)
    try {
      const payload: any = {
        title: form.title.trim(),
        description: form.description.trim(),
        budget: budgetNum,
        status: form.status,
      }
      if (form.startDate) payload.startDate = new Date(form.startDate).toISOString()
      if (form.endDate) payload.endDate = new Date(form.endDate).toISOString()

      await apiService.updateCampaign(id, payload)
      Alert.alert('Saved', 'Campaign updated successfully.')
      navigation.goBack()
    } catch (err) {
      handleApiError(err, 'Failed to save campaign')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.neon} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={styles.title}>Edit Campaign</Text>
          <Text style={styles.subtitle}>{campaign?.title}</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Title *</Text>
            <TextInput style={styles.input} value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} placeholderTextColor={colors.textSubtle} />

            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, { minHeight: 100 }]} multiline value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholderTextColor={colors.textSubtle} />

            <Text style={styles.label}>Budget (₹) *</Text>
            <TextInput style={styles.input} keyboardType="decimal-pad" value={form.budget} onChangeText={(v) => setForm({ ...form, budget: v })} placeholderTextColor={colors.textSubtle} />

            <Text style={styles.label}>Start Date</Text>
            <TextInput style={styles.input} value={form.startDate} onChangeText={(v) => setForm({ ...form, startDate: v })} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSubtle} />

            <Text style={styles.label}>End Date</Text>
            <TextInput style={styles.input} value={form.endDate} onChangeText={(v) => setForm({ ...form, endDate: v })} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSubtle} />

            <Text style={styles.label}>Status</Text>
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((st) => {
                const active = form.status === st
                const s = STATUS_COLORS[st] || STATUS_COLORS.draft
                return (
                  <Pressable key={st} onPress={() => { Haptics.selectionAsync(); setForm({ ...form, status: st }) }} style={({ pressed }) => [styles.statusChip, active && { backgroundColor: s.bg, borderColor: s.fg }, pressed && { opacity: 0.85 }]}>
                    <View style={[styles.statusDot, { backgroundColor: s.fg }]} />
                    <Text style={[styles.statusChipText, { color: active ? s.fg : colors.textMuted }]}>{st.charAt(0).toUpperCase() + st.slice(1)}</Text>
                  </Pressable>
                )
              })}
            </View>
          </View>

          <Pressable style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleSave() }} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2, marginBottom: spacing.lg },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 12, color: '#fff', fontSize: 14, backgroundColor: colors.bg },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusChipText: { fontSize: 12, fontWeight: '600' },
  saveBtn: { backgroundColor: colors.neon, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center', marginTop: spacing.lg },
  saveBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
})
