import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, RouteProp } from '@react-navigation/native'
import { colors, spacing } from '@shared/constants'
import { Button } from '@shared/components/ui/Button'
import { Input } from '@shared/components/ui/Input'
import apiService, { handleApiError } from '@shared/services/api'

type RouteParams = RouteProp<{ resetPassword: { token?: string } }, 'resetPassword'>

interface ResetPasswordScreenProps {
  navigation?: any
}

const validatePassword = (value: string): string | null => {
  if (value.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(value)) return 'Password must contain an uppercase letter'
  if (!/[a-z]/.test(value)) return 'Password must contain a lowercase letter'
  if (!/[0-9]/.test(value)) return 'Password must contain a number'
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return 'Password must contain a special character'
  return null
}

export default function ResetPasswordScreen({ navigation }: ResetPasswordScreenProps) {
  const route = useRoute<RouteParams>()
  const [token, setToken] = useState(route.params?.token || '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!token.trim()) {
      Alert.alert('Missing token', 'Paste the reset token from your email.')
      return
    }
    const err = validatePassword(password)
    if (err) {
      Alert.alert('Weak password', err)
      return
    }
    if (password !== confirm) {
      Alert.alert('Mismatch', 'Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await apiService.resetPassword(token.trim(), password)
      Alert.alert('Password reset', 'You can now sign in with your new password.', [
        { text: 'Sign In', onPress: () => navigation?.navigate('SignIn') },
      ])
    } catch (e) {
      handleApiError(e, 'Failed to reset password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>
          Paste the token from your email and choose a new password.
        </Text>

        <Input
          label="Reset Token"
          value={token}
          onChangeText={setToken}
          placeholder="Paste reset token"
          style={styles.input}
        />

        <Input
          label="New Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 chars, mix of cases, number, symbol"
          secureTextEntry
          style={styles.input}
        />

        <Input
          label="Confirm Password"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Repeat password"
          secureTextEntry
          style={styles.input}
        />

        <Button
          title={submitting ? 'Resetting...' : 'Reset Password'}
          onPress={handleSubmit}
          disabled={submitting}
          loading={submitting}
          fullWidth
          style={styles.submitBtn}
        />

        <Button
          title="Back to Sign In"
          variant="ghost"
          onPress={() => navigation?.navigate('SignIn')}
          fullWidth
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
    lineHeight: 20,
  },
  input: { marginBottom: spacing.lg },
  submitBtn: { marginBottom: spacing.md },
})
