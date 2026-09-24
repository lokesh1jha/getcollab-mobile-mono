import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing } from '@/src/theme'
import { Button } from '@shared/components/ui/Button'
import { Input } from '@shared/components/ui/Input'
import { useAuthStore } from '@shared/stores/auth-store'
import apiService, { handleApiError } from '@shared/services/api'
import { InfluencerNavigationProp } from '@/src/types/navigation'

interface Props {
  navigation?: InfluencerNavigationProp
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
      Alert.alert('No email address', 'Go back and sign up again.')
      return
    }
    setSubmitting(true)
    try {
      await apiService.verifyEmail(email, token.trim())
      if (user) {
        await fetchCurrentUser()
        Alert.alert('Email verified', 'You have full access now.', [
          { text: 'OK', onPress: () => navigation?.goBack() },
        ])
      } else {
        Alert.alert('Email verified', 'Sign in to continue.', [
          { text: 'OK', onPress: () => navigation?.navigate('SignIn', { email }) },
        ])
      }
    } catch (err) {
      handleApiError(err, "Couldn't verify. Check the code and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (!email) {
      Alert.alert('No email address', 'Go back and sign up again.')
      return
    }
    setResending(true)
    try {
      await apiService.resendEmailOtp(email)
      Alert.alert('Email sent', `We sent a new code to ${email}.`)
    } catch (err) {
      handleApiError(err, "Couldn't resend the code. Try again.")
    } finally {
      setResending(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeInDown.duration(320)} style={{ flex: 1 }}>
        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>
            Enter the code we sent to <Text style={styles.email}>{email}</Text>.
          </Text>
  
          <Input
            label="Verification code"
            value={token}
            onChangeText={setToken}
            placeholder="6-digit code"
            style={styles.input}
          />
  
          <Button
            title={submitting ? 'Verifying…' : 'Verify'}
            onPress={handleVerify}
            loading={submitting}
            disabled={submitting}
            fullWidth
            style={styles.submitBtn}
          />
  
          <Button
            title={resending ? 'Sending…' : 'Resend code'}
            variant="outline"
            onPress={handleResend}
            loading={resending}
            disabled={resending}
            fullWidth
          />
        </ScrollView>
      </Animated.View>
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
