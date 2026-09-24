import React, { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import * as Haptics from 'expo-haptics'

export default function PayoutSettingsScreen() {
  const [form, setForm] = useState({ bankAccount: '', ifscCode: '', panNumber: '', gstNumber: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => {
    try {
      const res = await apiService.getPayoutSettings()
      setForm((prev) => ({ ...prev, ...(res?.data || res || {}) }))
    } catch (err) { handleApiError(err, "Couldn't load payout details") }
    finally { setLoading(false) }
  }, [])
  useFocusEffect(useCallback(() => { load() }, [load]))
  const save = async () => {
    if (!form.bankAccount.trim() || !form.ifscCode.trim() || !form.panNumber.trim()) {
      Alert.alert('Required fields', 'Enter your bank account, IFSC code and PAN.')
      return
    }
    setSaving(true)
    try { await apiService.updatePayoutSettings(form); Alert.alert('Saved', 'Payout details updated.') }
    catch (err) { handleApiError(err, "Couldn't save payout details. Try again.") }
    finally { setSaving(false) }
  }
  if (loading) return <View style={[styles.root, { alignItems: 'center' }]}><ActivityIndicator size="large" color={colors.primary} /></View>
  return <View style={styles.root}><SafeAreaView style={{ flex: 1 }} edges={['top']}>
    <Animated.View entering={FadeInDown.duration(320)} style={{ flex: 1 }}>
      <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.title}>Payout details</Text>
        <Text style={styles.subtitle}>Needed before you can withdraw earnings.</Text>
        <Field label="Bank account number" value={form.bankAccount} onChangeText={(v: string) => setForm({ ...form, bankAccount: v })} keyboardType="number-pad" />
        <Field label="IFSC code" value={form.ifscCode} onChangeText={(v: string) => setForm({ ...form, ifscCode: v.toUpperCase() })} autoCapitalize="characters" />
        <Field label="PAN number" value={form.panNumber} onChangeText={(v: string) => setForm({ ...form, panNumber: v.toUpperCase() })} autoCapitalize="characters" />
        <Field label="GST number (optional)" value={form.gstNumber} onChangeText={(v: string) => setForm({ ...form, gstNumber: v.toUpperCase() })} autoCapitalize="characters" />
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); save() }} disabled={saving} style={({ pressed }) => [styles.button, pressed && { opacity: .85 }, saving && { opacity: .5 }]}><Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save'}</Text></Pressable>
      </ScrollView>
    </Animated.View>
  </SafeAreaView></View>
}
function Field({ label, ...props }: any) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} placeholderTextColor={colors.textSubtle} style={styles.input} /></View> }
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }, content: { padding: spacing.lg, paddingBottom: spacing.xxxl }, title: { color: colors.text, fontSize: 28, fontWeight: '800' }, subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.sm, marginBottom: spacing.xl }, field: { marginBottom: spacing.lg }, label: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: spacing.sm }, input: { color: colors.text, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md }, button: { backgroundColor: colors.primary, borderRadius: radius.pill, padding: spacing.lg, alignItems: 'center', marginTop: spacing.md }, buttonText: { color: '#000', fontWeight: '800' } })
