import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { colors, spacing, radius } from '@/src/theme'
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
        <Animated.View entering={FadeInDown.duration(400)}>
          <Pressable
            style={({ pressed }) => [styles.banner, urgent && styles.bannerUrgent, pressed && { opacity: 0.85 }]}
            onPress={openBillingPortal}
          >
            <View style={styles.bannerContent}>
              <Text style={styles.bannerText}>
                {urgent
                  ? `Your workspace trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
                  : `Workspace trial · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
              </Text>
              <Text style={styles.bannerCta}>Manage →</Text>
            </View>
          </Pressable>
        </Animated.View>
      )
    }
    return (
      <Animated.View entering={FadeInDown.duration(400)}>
        <Pressable
          style={({ pressed }) => [styles.banner, styles.bannerError, pressed && { opacity: 0.85 }]}
          onPress={openBillingPortal}
        >
          <View style={styles.bannerContent}>
            <Text style={styles.bannerText}>Trial ended — renew to continue access.</Text>
            <Text style={styles.bannerCta}>Manage →</Text>
          </View>
        </Pressable>
      </Animated.View>
    )
  }

  if (status === 'PAST_DUE') {
    return (
      <Animated.View entering={FadeInDown.duration(400)}>
        <Pressable
          style={({ pressed }) => [styles.banner, styles.bannerError, pressed && { opacity: 0.85 }]}
          onPress={openBillingPortal}
        >
          <View style={styles.bannerContent}>
            <Text style={styles.bannerText}>Payment issue. Update billing to continue access.</Text>
            <Text style={styles.bannerCta}>Manage →</Text>
          </View>
        </Pressable>
      </Animated.View>
    )
  }

  if (status === 'EXPIRED' || status === 'CANCELLED') {
    return (
      <Animated.View entering={FadeInDown.duration(400)}>
        <Pressable
          style={({ pressed }) => [styles.banner, styles.bannerError, pressed && { opacity: 0.85 }]}
          onPress={openBillingPortal}
        >
          <View style={styles.bannerContent}>
            <Text style={styles.bannerText}>Workspace access ended. Manage subscription online.</Text>
            <Text style={styles.bannerCta}>Continue →</Text>
          </View>
        </Pressable>
      </Animated.View>
    )
  }

  return null
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.blue,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
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
  bannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  bannerCta: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
})
