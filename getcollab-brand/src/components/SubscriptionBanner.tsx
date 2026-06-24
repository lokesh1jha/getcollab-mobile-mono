import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { colors, spacing } from '@shared/constants'
import { useSubscriptionStore, getTrialDaysRemaining } from '../stores/subscription-store'

export function SubscriptionBanner() {
  const subscription = useSubscriptionStore((s) => s.subscription)
  const openBillingPortal = useSubscriptionStore((s) => s.openBillingPortal)

  if (!subscription) return null

  const daysLeft = getTrialDaysRemaining(subscription)
  const status = subscription.status

  if (status === 'TRIALING') {
    if (daysLeft !== null) {
      const urgent = daysLeft <= 3
      return (
        <TouchableOpacity
          style={[styles.banner, urgent && styles.bannerUrgent]}
          onPress={openBillingPortal}
          activeOpacity={0.8}
        >
          <View style={styles.bannerContent}>
            <Text style={styles.text}>
              {urgent
                ? `Your workspace trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
                : `Workspace trial · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
            </Text>
            <Text style={styles.cta}>Manage Workspace</Text>
          </View>
        </TouchableOpacity>
      )
    }
    return (
      <TouchableOpacity
        style={[styles.banner, styles.bannerError]}
        onPress={openBillingPortal}
        activeOpacity={0.8}
      >
        <View style={styles.bannerContent}>
          <Text style={styles.text}>Trial ended — renew to continue access.</Text>
          <Text style={styles.cta}>Open Billing Portal</Text>
        </View>
      </TouchableOpacity>
    )
  }

  if (status === 'PAST_DUE') {
    return (
      <TouchableOpacity
        style={[styles.banner, styles.bannerError]}
        onPress={openBillingPortal}
        activeOpacity={0.8}
      >
        <View style={styles.bannerContent}>
          <Text style={styles.text}>Payment issue. Update billing to continue access.</Text>
          <Text style={styles.cta}>Open Billing Portal</Text>
        </View>
      </TouchableOpacity>
    )
  }

  if (status === 'EXPIRED' || status === 'CANCELLED') {
    return (
      <TouchableOpacity
        style={[styles.banner, styles.bannerError]}
        onPress={openBillingPortal}
        activeOpacity={0.8}
      >
        <View style={styles.bannerContent}>
          <Text style={styles.text}>Workspace access ended. Manage subscription online.</Text>
          <Text style={styles.cta}>Continue Access</Text>
        </View>
      </TouchableOpacity>
    )
  }

  return null
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: 12,
  },
  bannerUrgent: {
    backgroundColor: colors.warning,
  },
  bannerError: {
    backgroundColor: colors.error,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  cta: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
})
