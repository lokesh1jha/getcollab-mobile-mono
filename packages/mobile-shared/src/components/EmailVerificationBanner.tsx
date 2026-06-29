import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing } from '../constants'
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
      await apiService.sendVerificationEmail()
      navigation.navigate('VerifyEmail')
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
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <TouchableOpacity
            onPress={handleResend}
            style={styles.btn}
            accessibilityRole="button"
            accessibilityLabel="Resend verification email"
          >
            <Text style={styles.btnText}>Resend</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => setDismissed(true)}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={16} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: 10,
  },
  title: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  body: {
    color: colors.white,
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
    color: colors.white,
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
