import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import * as Haptics from 'expo-haptics'

export default function SecuritySettingsScreen() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) { Alert.alert('Missing fields', 'Fill in all fields.'); return }
    if (newPassword !== confirmPassword) { Alert.alert("Passwords don't match", 'Re-enter your new password.'); return }
    if (newPassword.length < 8) { Alert.alert('Password too short', 'Use at least 8 characters.'); return }
    setSaving(true)
    try {
      await apiService.changePassword(currentPassword, newPassword)
      Alert.alert('Password updated', 'Your new password is active.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      handleApiError(err, 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={styles.title}>Security</Text>
          <Text style={styles.subtitle}>Password and sign-in</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Current password</Text>
            <TextInput style={styles.input} secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} placeholderTextColor={colors.textSubtle} />

            <Text style={styles.label}>New password</Text>
            <TextInput style={styles.input} secureTextEntry value={newPassword} onChangeText={setNewPassword} placeholderTextColor={colors.textSubtle} />

            <Text style={styles.label}>Confirm new password</Text>
            <TextInput style={styles.input} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} placeholderTextColor={colors.textSubtle} />
          </View>

          <Pressable style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleChangePassword() }} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? 'Updating…' : 'Update password'}</Text>
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
