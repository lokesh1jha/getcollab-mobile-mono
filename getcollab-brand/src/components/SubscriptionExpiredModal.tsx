import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { colors, spacing } from '@shared/constants'
import { useSubscriptionStore } from '../stores/subscription-store'

interface SubscriptionExpiredModalProps {
  visible: boolean
  onClose: () => void
}

export function SubscriptionExpiredModal({ visible, onClose }: SubscriptionExpiredModalProps) {
  const openBillingPortal = useSubscriptionStore((s) => s.openBillingPortal)

  return (
    <Modal visible={visible} onClose={onClose} showCloseButton={false}>
      <View style={styles.container}>
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

        <View style={styles.actions}>
          <Button
            title="Open Billing Portal"
            onPress={() => {
              onClose()
              openBillingPortal()
            }}
            fullWidth
          />
          <Button
            title="Maybe Later"
            onPress={onClose}
            variant="outline"
            fullWidth
            style={styles.laterButton}
          />
        </View>

        <Text style={styles.footer}>
          Subscription management is handled securely on our website.
        </Text>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 28,
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
    backgroundColor: colors.background,
    borderRadius: 12,
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
  actions: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  laterButton: {
    marginTop: spacing.xs,
  },
  footer: {
    fontSize: 12,
    color: colors.textDark,
    textAlign: 'center',
  },
})
