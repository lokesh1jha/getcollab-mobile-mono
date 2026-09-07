import React, { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'

export default function PayoutSettingsScreen({ navigation }: any) {
  const [form, setForm] = useState({ bankAccount: '', ifscCode: '', panNumber: '', gstNumber: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => {
    try {
      const res = await apiService.getPayoutSettings()
      setForm((prev) => ({ ...prev, ...(res?.data || res || {}) }))
    } catch (err) { handleApiError(err, 'Failed to load payout details') }
    finally { setLoading(false) }
  }, [])
  useFocusEffect(useCallback(() => { load() }, [load]))
  const save = async () => {
    if (!form.bankAccount.trim() || !form.ifscCode.trim() || !form.panNumber.trim()) {
      Alert.alert('Required fields', 'Bank account, IFSC code, and PAN are required.')
      return
    }
    setSaving(true)
    try { await apiService.updatePayoutSettings(form); Alert.alert('Saved', 'Payout details updated.') }
    catch (err) { handleApiError(err, 'Failed to save payout details') }
    finally { setSaving(false) }
  }
  if (loading) return <View style={styles.root}><ActivityIndicator color={colors.neon} /></View>
  return <View style={styles.root}><SafeAreaView style={{ flex: 1 }} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>Back</Text></Pressable>
      <Text style={styles.title}>Payout Details</Text>
      <Text style={styles.subtitle}>Required before you can withdraw creator earnings.</Text>
      <Field label="Bank account number" value={form.bankAccount} onChangeText={(v: string) => setForm({ ...form, bankAccount: v })} keyboardType="number-pad" />
      <Field label="IFSC code" value={form.ifscCode} onChangeText={(v: string) => setForm({ ...form, ifscCode: v.toUpperCase() })} autoCapitalize="characters" />
      <Field label="PAN number" value={form.panNumber} onChangeText={(v: string) => setForm({ ...form, panNumber: v.toUpperCase() })} autoCapitalize="characters" />
      <Field label="GST number (optional)" value={form.gstNumber} onChangeText={(v: string) => setForm({ ...form, gstNumber: v.toUpperCase() })} autoCapitalize="characters" />
      <Pressable onPress={save} disabled={saving} style={({ pressed }) => [styles.button, pressed && { opacity: .85 }, saving && { opacity: .5 }]}><Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save Payout Details'}</Text></Pressable>
    </ScrollView>
  </SafeAreaView></View>
}
function Field({ label, ...props }: any) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} placeholderTextColor={colors.textSubtle} style={styles.input} /></View> }
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }, content: { padding: spacing.lg, paddingBottom: spacing.xxxl }, back: { color: colors.blue, marginBottom: spacing.xl }, title: { color: colors.text, fontSize: 28, fontWeight: '800' }, subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.sm, marginBottom: spacing.xl }, field: { marginBottom: spacing.lg }, label: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: spacing.sm }, input: { color: colors.text, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md }, button: { backgroundColor: colors.neon, borderRadius: radius.pill, padding: spacing.lg, alignItems: 'center', marginTop: spacing.md }, buttonText: { color: '#000', fontWeight: '800' } })
