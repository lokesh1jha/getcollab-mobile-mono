import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert, ScrollView, TextInput, Pressable, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { colors, spacing, radius } from '@/src/theme'
import { useAuthStore } from '@shared/stores/auth-store'
import apiService, { handleApiError } from '@shared/services/api'
import * as Haptics from 'expo-haptics'

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
        Alert.alert('Verified', 'Your email is verified.', [
          { text: 'OK', onPress: () => navigation?.goBack() },
        ])
      } else {
        Alert.alert('Verified', 'Your email is verified. Sign in to continue.', [
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
      Alert.alert('Code sent', `We sent a new code to ${email}.`)
    } catch (err) {
      handleApiError(err, 'Failed to resend')
    } finally {
      setResending(false)
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={styles.title}>Verify your email</Text>
            <Text style={styles.subtitle}>
              Enter the code we sent to <Text style={styles.email}>{email}</Text>.
            </Text>
          </Animated.View>

          <View style={styles.field}>
            <Text style={styles.label}>Verification code</Text>
            <TextInput
              style={styles.input}
              value={token}
              onChangeText={setToken}
              placeholder="6-digit code"
              placeholderTextColor={colors.textSubtle}
              keyboardType="number-pad"
            />
          </View>

          <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleVerify() }} disabled={submitting}>
            {submitting ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.primaryBtnText}>Verify</Text>}
          </Pressable>

          <Pressable style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.75 }]} onPress={handleResend} disabled={resending}>
            <Text style={styles.secondaryBtnText}>{resending ? 'Sending…' : 'Resend code'}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.8, marginTop: spacing.lg, marginBottom: spacing.sm },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xl, lineHeight: 20 },
  email: { color: colors.text, fontWeight: '600' },
  field: { marginBottom: spacing.lg },
  label: { fontSize: 12, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.4, marginBottom: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 12, color: colors.text, fontSize: 14, backgroundColor: colors.bg },
  primaryBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 14, marginBottom: spacing.md },
  primaryBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
  secondaryBtn: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.pill, paddingVertical: 14 },
  secondaryBtnText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
})
