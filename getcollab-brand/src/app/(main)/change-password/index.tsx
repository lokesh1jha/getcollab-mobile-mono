import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing } from '@shared/constants'
import { Button } from '@shared/components/ui/Button'
import { Input } from '@shared/components/ui/Input'
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Change Password</Text>
        <Text style={styles.subtitle}>Update the password on your account.</Text>

        <Input
          label="Current Password"
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
          style={styles.input}
        />
        <Input
          label="New Password"
          value={next}
          onChangeText={setNext}
          secureTextEntry
          error={nextErr || undefined}
          style={styles.input}
        />
        <Input
          label="Confirm New Password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          style={styles.input}
        />

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

        <Button
          title={submitting ? 'Updating...' : 'Update Password'}
          onPress={handleSubmit}
          disabled={submitting}
          loading={submitting}
          fullWidth
          style={styles.submitBtn}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  input: { marginBottom: spacing.lg },
  requirements: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  reqTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  reqText: {
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: 2,
  },
  submitBtn: { marginTop: spacing.md },
})
