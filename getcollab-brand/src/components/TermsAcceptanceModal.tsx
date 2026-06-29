import React, { useState } from 'react'
import { Modal, View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { useAuthStore } from '@shared/stores/auth-store'
import apiService, { handleApiError } from '@shared/services/api'
import { colors, radius, spacing } from '@/src/theme'

export function TermsAcceptanceModal() {
  const { user, fetchCurrentUser } = useAuthStore()
  const [submitting, setSubmitting] = useState(false)

  const needsTerms =
    !!user?.onboardingCompleted &&
    !user?.termsAcceptedAt

  if (!needsTerms) return null

  const acceptTerms = async () => {
    setSubmitting(true)
    try {
      await apiService.acceptTerms()
      await fetchCurrentUser()
    } catch (error) {
      handleApiError(error, 'Failed to accept terms')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Accept Terms to Continue</Text>
          <Text style={styles.body}>
            Please review and accept GetCollab&apos;s Terms of Service and Privacy Policy to use your brand workspace.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && !submitting && { opacity: 0.85 }]}
            onPress={acceptTerms}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>I Accept</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    marginTop: spacing.sm,
    backgroundColor: colors.neon,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
})
