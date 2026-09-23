import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import { useAuthStore } from '@shared/stores/auth-store'
import { logger } from '@shared/services/logger'

export default function ProfileSettingsScreen() {
  const { user, updateProfile } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', bio: '', websiteUrl: '', industry: '', location: '' })

  const loadProfile = useCallback(async () => {
    try {
      const res = await apiService.getProfile()
      const p = res?.profile || res?.data || res || {}
      setForm({
        name: p.name || user?.name || '',
        bio: p.bio || '',
        websiteUrl: p.websiteUrl || p.website || '',
        industry: p.industry || '',
        location: p.location || '',
      })
    } catch (err) {
      logger.warn('Failed to load profile settings', { error: err })
    } finally {
      setLoading(false)
    }
  }, [user?.name])

  useFocusEffect(
    useCallback(() => {
      loadProfile()
    }, [loadProfile])
  )

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile({
        name: form.name,
        bio: form.bio,
        location: form.location,
      })
      await apiService.updateGeneralProfile({
        name: form.name,
        websiteUrl: form.websiteUrl,
        industry: form.industry,
      })
      Alert.alert('Saved', 'Profile updated successfully.')
    } catch (err) {
      handleApiError(err, 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.neon} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Your public brand profile</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Brand Name</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholderTextColor={colors.textSubtle} />

            <Text style={styles.label}>Bio</Text>
            <TextInput style={[styles.input, { minHeight: 100 }]} multiline value={form.bio} onChangeText={(v) => setForm({ ...form, bio: v })} placeholderTextColor={colors.textSubtle} />

            <Text style={styles.label}>Website</Text>
            <TextInput style={styles.input} value={form.websiteUrl} onChangeText={(v) => setForm({ ...form, websiteUrl: v })} placeholder="https://..." placeholderTextColor={colors.textSubtle} autoCapitalize="none" />

            <Text style={styles.label}>Industry</Text>
            <TextInput style={styles.input} value={form.industry} onChangeText={(v) => setForm({ ...form, industry: v })} placeholderTextColor={colors.textSubtle} />

            <Text style={styles.label}>Location</Text>
            <TextInput style={styles.input} value={form.location} onChangeText={(v) => setForm({ ...form, location: v })} placeholderTextColor={colors.textSubtle} />
          </View>

          <Pressable style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]} onPress={handleSave} disabled={saving}>
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
  saveBtn: { backgroundColor: colors.neon, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center', marginTop: spacing.lg },
  saveBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
})
