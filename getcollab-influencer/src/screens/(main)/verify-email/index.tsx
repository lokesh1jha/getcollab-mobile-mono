import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing } from '@/src/theme'
import { Button } from '@shared/components/ui/Button'
import { Input } from '@shared/components/ui/Input'
import { useAuthStore } from '@shared/stores/auth-store'
import apiService, { handleApiError } from '@shared/services/api'

interface Props {
  navigation?: any
  route?: any
}

export default function VerifyEmailScreen({ navigation, route }: Props) {
  const { user, fetchCurrentUser } = useAuthStore()
  const emailParam = route?.params?.email
  const email = emailParam || user?.email

  const [token, setToken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)

  const handleVerify = async () => {
    if (!token.trim()) {
      Alert.alert('Missing code', 'Enter the verification code from your email.')
      return
    }
    if (!email) {
      Alert.alert('Missing email', 'Email address is missing.')
      return
    }
    setSubmitting(true)
    try {
      await apiService.verifyEmail(email, token.trim())
      if (user) {
        await fetchCurrentUser()
        Alert.alert('Verified', 'Your email is now verified.', [
          { text: 'OK', onPress: () => navigation?.goBack() },
        ])
      } else {
        Alert.alert('Verified', 'Your email is now verified. Please sign in.', [
          { text: 'OK', onPress: () => navigation?.navigate('SignIn', { email }) },
        ])
      }
    } catch (err) {
      handleApiError(err, 'Verification failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (!email) {
      Alert.alert('Missing email', 'Email address is missing.')
      return
    }
    setResending(true)
    try {
      await apiService.resendEmailOtp(email)
      Alert.alert('Email sent', `A new verification code was sent to ${email}.`)
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
          We sent a verification code to <Text style={styles.email}>{email}</Text>.
          Please enter the code below.
        </Text>

        <Input
          label="Verification Code"
          value={token}
          onChangeText={setToken}
          placeholder="Enter 6-digit code"
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
