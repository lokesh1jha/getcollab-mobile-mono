import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import { useAuthStore } from '@shared/stores/auth-store'
import { logger } from '@shared/services/logger'
import * as Haptics from 'expo-haptics'

export default function AccountSettingsScreen() {
  const { user, updateProfile } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })

  const loadAccount = useCallback(async () => {
    try {
      const res = await apiService.getSettings()
      const s = res?.settings || res?.data || res || {}
      setForm({
        name: user?.name || s.name || '',
        email: user?.email || s.email || '',
        phone: s.phoneNumbers?.[0] || s.phone || '',
      })
    } catch (err) {
      logger.warn('Failed to load account settings', { error: err })
    } finally {
      setLoading(false)
    }
  }, [user?.name, user?.email])

  useFocusEffect(
    useCallback(() => {
      loadAccount()
    }, [loadAccount])
  )

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile({ name: form.name })
      await apiService.updateSettings({
        phoneNumbers: form.phone ? [form.phone] : [],
      })
      Alert.alert('Saved', 'Account updated.')
    } catch (err) {
      handleApiError(err, 'Failed to update account')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={styles.title}>Account</Text>
          <Text style={styles.subtitle}>Sign-in and contact details</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholderTextColor={colors.textSubtle} />

            <Text style={styles.label}>Email</Text>
            <TextInput style={[styles.input, { color: colors.textMuted }]} value={form.email} editable={false} placeholderTextColor={colors.textSubtle} />

            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" placeholderTextColor={colors.textSubtle} />
          </View>

          <Pressable style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleSave() }} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
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
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center', marginTop: spacing.lg },
  saveBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
})
