import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert, ScrollView, Pressable, TextInput } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, radius, spacing } from '@/src/theme'
import apiService, { handleApiError } from '@shared/services/api'

interface Props { navigation?: any }

export default function ForgotPasswordScreen({ navigation }: Props) {
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
    } finally { setSending(false) }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={styles.title}>Forgot password?</Text>
            <Text style={styles.subtitle}>Enter your email and we'll send you a link to reset your password.</Text>

            {sent ? (
              <View style={styles.successCard}>
                <Text style={styles.successTitle}>Check your inbox 📬</Text>
                <Text style={styles.successText}>
                  If <Text style={styles.successEmail}>{email}</Text> matches an account, you'll receive a reset
                  link shortly. The link expires in 30 minutes.
                </Text>
                <Pressable style={({ pressed }) => [styles.blueBtn, pressed && { opacity: 0.85 }]} onPress={() => navigation?.navigate('SignIn')}>
                  <Text style={styles.blueBtnText}>Back to Sign In</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.7 }]} onPress={() => { setSent(false); handleSend() }}>
                  <Text style={styles.ghostBtnText}>Resend</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Email</Text>
                <View style={styles.fieldWrap}>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.textSubtle}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.fieldInput}
                  />
                </View>

                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
                  onPress={handleSend}
                  disabled={sending}
                >
                  <Text style={styles.primaryBtnText}>{sending ? 'Sending...' : 'Send Reset Link'}</Text>
                </Pressable>

                <Pressable style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.7 }]} onPress={() => navigation?.goBack()}>
                  <Text style={styles.ghostBtnText}>Back to Sign In</Text>
                </Pressable>
              </>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  content: { padding: spacing.xl },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: -0.8, marginTop: spacing.lg, marginBottom: spacing.sm },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 20, marginBottom: spacing.xl },

  fieldLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600', letterSpacing: 0.4, marginBottom: 8 },
  fieldWrap: {
    borderWidth: 1, borderColor: '#262626', borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: 14, backgroundColor: '#0A0A0A',
  },
  fieldInput: { color: '#fff', fontSize: 15, padding: 0 },

  primaryBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.neon, borderRadius: radius.pill, paddingVertical: 18,
    marginTop: spacing.xl,
  },
  primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },

  blueBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.blue, borderRadius: radius.pill, paddingVertical: 14,
    marginBottom: spacing.sm, marginTop: spacing.lg,
  },
  blueBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  ghostBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  ghostBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },

  successCard: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.lg,
  },
  successTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: spacing.sm },
  successText: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: spacing.lg },
  successEmail: { color: '#fff', fontWeight: '600' },
})
