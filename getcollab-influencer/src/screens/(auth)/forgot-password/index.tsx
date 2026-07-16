import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing } from '@shared/constants'
import { Button } from '@shared/components/ui/Button'
import { Input } from '@shared/components/ui/Input'
import apiService, { handleApiError } from '@shared/services/api'

interface ForgotPasswordScreenProps {
  navigation?: any
}

export default function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSend = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.')
      return
    }
    setSending(true)
    try {
      await apiService.forgotPassword(email.trim())
      setSent(true)
    } catch (err) {
      handleApiError(err, 'Failed to send reset email')
    } finally {
      setSending(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Forgot password?</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a link to reset your password.
        </Text>

        {sent ? (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Check your inbox 📬</Text>
            <Text style={styles.successText}>
              If <Text style={styles.successEmail}>{email}</Text> matches an account, you'll receive a reset
              link shortly. The link expires in 30 minutes.
            </Text>
            <Button
              title="Back to Sign In"
              variant="outline"
              onPress={() => navigation?.navigate('SignIn')}
              fullWidth
              style={styles.backBtn}
            />
            <Button
              title="Resend"
              variant="ghost"
              onPress={() => {
                setSent(false)
                handleSend()
              }}
              fullWidth
            />
          </View>
        ) : (
          <>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              style={styles.input}
            />

            <Button
              title={sending ? 'Sending...' : 'Send Reset Link'}
              onPress={handleSend}
              disabled={sending}
              loading={sending}
              fullWidth
              style={styles.submitBtn}
            />

            <Button
              title="Back to Sign In"
              variant="ghost"
              onPress={() => navigation?.goBack()}
              fullWidth
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
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
  input: {
    marginBottom: spacing.lg,
  },
  submitBtn: {
    marginBottom: spacing.md,
  },
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.success,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  successText: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  successEmail: {
    color: colors.text,
    fontWeight: '600',
  },
  backBtn: {
    marginBottom: spacing.sm,
  },
})
