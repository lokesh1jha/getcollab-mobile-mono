import React, { useState } from 'react'
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing } from '@/src/theme'
import { useAuthStore } from '../stores/auth-store'
import apiService, { handleApiError } from '../services/api'

export function EmailVerificationBanner() {
  const user = useAuthStore((s) => s.user)
  const navigation = useNavigation<any>()
  const [sending, setSending] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (!user || user.emailVerified || dismissed) return null

  const handleResend = async () => {
    setSending(true)
    try {
      await apiService.resendEmailOtp(user.email)
      navigation.navigate('VerifyEmail', { email: user.email })
    } catch (err) {
      handleApiError(err, 'Failed to resend verification email')
    } finally {
      setSending(false)
    }
  }

  return (
    <View style={styles.banner}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.body} numberOfLines={2}>
          Confirm <Text style={styles.email}>{user.email}</Text> to unlock all features.
        </Text>
      </View>
      <View style={styles.actions}>
        {sending ? (
          <ActivityIndicator color={colors.text} size="small" />
        ) : (
          <Pressable
            onPress={handleResend}
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Resend verification email"
          >
            <Text style={styles.btnText}>Resend</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => setDismissed(true)}
          style={({ pressed }) => [styles.close, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={16} color={colors.text} />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    borderRadius: 10,
  },
  title: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  body: {
    color: colors.text,
    fontSize: 12,
    opacity: 0.9,
  },
  email: { fontWeight: '700' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.sm,
  },
  btn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 6,
    minHeight: 32,
    justifyContent: 'center',
  },
  btnText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  close: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
