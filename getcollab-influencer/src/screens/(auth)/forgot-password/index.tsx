import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing } from '@/src/theme'
import { Button } from '@shared/components/ui/Button'
import { Input } from '@shared/components/ui/Input'
import apiService, { handleApiError } from '@shared/services/api'
import { InfluencerNavigationProp } from '@/src/types/navigation'

interface ForgotPasswordScreenProps {
  navigation?: InfluencerNavigationProp
}

// Self-contained palette for the premium dark-luxury theme.
// (Kept local so this screen renders consistently even if the shared
// theme file still has the old tokens — see note at the end of the reply.)

export default function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSend = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid email', 'Enter a valid email address.')
      return
    }
    setSending(true)
    try {
      await apiService.forgotPassword(email.trim())
      setSent(true)
    } catch (err) {
      handleApiError(err, "Couldn't send the reset email. Try again.")
    } finally {
      setSending(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Ambient purple glow */}
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <Animated.View entering={FadeInDown.duration(320)} style={{ flex: 1 }}>
        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text style={styles.title}>Forgot password?</Text>
          <Text style={styles.subtitle}>
            Enter your email to get a reset link.
          </Text>
  
          {sent ? (
            <View style={styles.successCard}>
              <Text style={styles.successTitle}>Check your inbox</Text>
              <Text style={styles.successText}>
                If <Text style={styles.successEmail}>{email}</Text> has an account, a reset link is on its way.
                It expires in 30 minutes.
              </Text>
              <Button
                title="Back to sign in"
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
                title={sending ? 'Sending…' : 'Send reset link'}
                onPress={handleSend}
                disabled={sending}
                loading={sending}
                fullWidth
                style={styles.submitBtn}
              />
  
              <Button
                title="Back to sign in"
                variant="ghost"
                onPress={() => navigation?.goBack()}
                fullWidth
              />
            </>
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Soft blurred purple glows
  glowTop: {
    position: 'absolute',
    top: -110,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -140,
    left: -90,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.10)',
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
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.primary,
    fontWeight: '600',
  },
  backBtn: {
    marginBottom: spacing.sm,
  },
})