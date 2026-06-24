import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing } from '@shared/constants'
import { Button } from '@shared/components/ui/Button'
import { Input } from '@shared/components/ui/Input'
import { useAuthStore } from '@shared/stores/auth-store'
import apiService, { handleApiError } from '@shared/services/api'

interface Props {
  navigation?: any
}

export default function VerifyEmailScreen({ navigation }: Props) {
  const { user, fetchCurrentUser } = useAuthStore()
  const [token, setToken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)

  const handleVerify = async () => {
    if (!token.trim()) {
      Alert.alert('Missing token', 'Paste the verification token from your email.')
      return
    }
    setSubmitting(true)
    try {
      await apiService.verifyEmail(token.trim())
      await fetchCurrentUser()
      Alert.alert('Verified', 'Your email is now verified.', [
        { text: 'OK', onPress: () => navigation?.goBack() },
      ])
    } catch (err) {
      handleApiError(err, 'Verification failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await apiService.sendVerificationEmail()
      Alert.alert('Email sent', `A new verification link was sent to ${user?.email}.`)
    } catch (err) {
      handleApiError(err, 'Failed to resend')
    } finally {
      setResending(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          We sent a verification link to <Text style={styles.email}>{user?.email}</Text>.
          Tap the link in the email, or paste the token below.
        </Text>

        <Input
          label="Verification Token"
          value={token}
          onChangeText={setToken}
          placeholder="Paste token here"
          style={styles.input}
        />

        <Button
          title={submitting ? 'Verifying...' : 'Verify'}
          onPress={handleVerify}
          loading={submitting}
          disabled={submitting}
          fullWidth
          style={styles.submitBtn}
        />

        <Button
          title={resending ? 'Sending...' : 'Resend Email'}
          variant="outline"
          onPress={handleResend}
          loading={resending}
          disabled={resending}
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
  email: { color: colors.text, fontWeight: '600' },
  input: { marginBottom: spacing.lg },
  submitBtn: { marginBottom: spacing.md },
})
