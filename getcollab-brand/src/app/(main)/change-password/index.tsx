import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert, ScrollView, TextInput, Pressable, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { colors, spacing, radius } from '@/src/theme'
import apiService, { handleApiError } from '@shared/services/api'

interface Props {
  navigation?: any
}

const validatePassword = (value: string): string | null => {
  if (value.length < 8) return 'At least 8 characters'
  if (!/[A-Z]/.test(value)) return 'Add an uppercase letter'
  if (!/[a-z]/.test(value)) return 'Add a lowercase letter'
  if (!/[0-9]/.test(value)) return 'Add a number'
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return 'Add a special character'
  return null
}

export default function ChangePasswordScreen({ navigation }: Props) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const nextErr = next ? validatePassword(next) : null

  const handleSubmit = async () => {
    if (!current) {
      Alert.alert('Missing', 'Enter your current password.')
      return
    }
    const err = validatePassword(next)
    if (err) {
      Alert.alert('Weak password', err)
      return
    }
    if (next !== confirm) {
      Alert.alert('Mismatch', 'New passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await apiService.changePassword(current, next)
      Alert.alert('Password updated', 'Your password has been changed.', [
        { text: 'OK', onPress: () => navigation?.goBack() },
      ])
    } catch (e) {
      handleApiError(e, 'Failed to change password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={styles.title}>Change Password</Text>
            <Text style={styles.subtitle}>Update the password on your account.</Text>
          </Animated.View>

          <View style={styles.field}>
            <Text style={styles.label}>Current Password</Text>
            <TextInput style={styles.input} value={current} onChangeText={setCurrent} secureTextEntry placeholderTextColor={colors.textSubtle} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>New Password</Text>
            <TextInput style={[styles.input, nextErr && { borderColor: colors.error }]} value={next} onChangeText={setNext} secureTextEntry placeholderTextColor={colors.textSubtle} />
            {nextErr ? <Text style={styles.errorText}>{nextErr}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput style={styles.input} value={confirm} onChangeText={setConfirm} secureTextEntry placeholderTextColor={colors.textSubtle} />
          </View>

          <View style={styles.requirements}>
            <Text style={styles.reqTitle}>Requirements</Text>
            {[
              'At least 8 characters',
              'One uppercase letter',
              'One lowercase letter',
              'One number',
              'One special character',
            ].map((r) => (
              <Text key={r} style={styles.reqText}>• {r}</Text>
            ))}
          </View>

          <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.primaryBtnText}>Update Password</Text>}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.8, marginTop: spacing.lg, marginBottom: spacing.sm },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xl },
  field: { marginBottom: spacing.lg },
  label: { fontSize: 12, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.4, marginBottom: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 12, color: colors.text, fontSize: 14, backgroundColor: colors.bg },
  errorText: { color: colors.error, fontSize: 12, marginTop: spacing.xs },
  requirements: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  reqTitle: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm },
  reqText: { fontSize: 13, color: colors.textMuted, paddingVertical: 2 },
  primaryBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neon, borderRadius: radius.pill, paddingVertical: 14 },
  primaryBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
})
