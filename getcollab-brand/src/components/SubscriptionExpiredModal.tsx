import React from 'react'
import { View, Text, StyleSheet, Modal as RNModal, Pressable } from 'react-native'
import { colors, spacing, radius } from '@/src/theme'
import { useSubscriptionStore } from '../stores/subscription-store'

interface SubscriptionExpiredModalProps {
  visible: boolean
  onClose: () => void
}

export function SubscriptionExpiredModal({ visible, onClose }: SubscriptionExpiredModalProps) {
  const openBillingPortal = useSubscriptionStore((s) => s.openBillingPortal)

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔒</Text>
          </View>

          <Text style={styles.title}>Your workspace trial has ended.</Text>

          <Text style={styles.description}>
            Continue collaborating with influencers by managing your workspace subscription securely on the web dashboard.
          </Text>

          <View style={styles.features}>
            <Text style={styles.featureTitle}>You can still:</Text>
            <Text style={styles.featureItem}>View existing chats</Text>
            <Text style={styles.featureItem}>Access current campaigns</Text>
            <Text style={styles.featureItem}>Manage your profile</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
            onPress={() => {
              onClose()
              openBillingPortal()
            }}
          >
            <Text style={styles.primaryBtnText}>Open Billing Portal</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.outlinedBtn, pressed && { opacity: 0.7 }]}
            onPress={onClose}
          >
            <Text style={styles.outlinedBtnText}>Maybe Later</Text>
          </Pressable>

          <Text style={styles.footer}>Subscription management is handled securely on our website.</Text>
        </View>
      </View>
    </RNModal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.warningSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  features: {
    width: '100%',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  featureItem: {
    fontSize: 14,
    color: colors.textMuted,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.md,
  },
  primaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    paddingVertical: 14,
    marginBottom: spacing.sm,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  outlinedBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    paddingVertical: 14,
  },
  outlinedBtnText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    fontSize: 12,
    color: colors.textSubtle,
    textAlign: 'center',
    marginTop: spacing.md,
  },
})
