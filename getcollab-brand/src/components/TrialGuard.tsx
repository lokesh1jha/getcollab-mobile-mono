import React, { useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native'
import { colors, spacing, radius } from '@/src/theme'
import { useTrialGuard } from '../hooks/useTrialGuard'

interface TrialGuardProps {
  children: React.ReactNode
  feature?: string
  loading?: boolean
  fallback?: React.ReactNode
}

export function TrialGuard({ children, feature, loading: externalLoading, fallback }: TrialGuardProps) {
  const { loading, isBlocked, isTrialing, isPastDue, blockReason, openBillingPortal, startTrial, refresh } = useTrialGuard()
  const [actionLoading, setActionLoading] = useState(false)
  const [showFullScreen, setShowFullScreen] = useState(false)

  if (externalLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.neon} />
      </View>
    )
  }

  if (!isBlocked) {
    return <>{children}</>
  }

  if (isTrialing) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  if (isPastDue || showFullScreen) {
    return (
      <View style={styles.fullScreen}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔒</Text>
          </View>
          <Text style={styles.title}>
            {isPastDue ? 'Payment Required' : 'Workspace Access Required'}
          </Text>
          <Text style={styles.description}>
            {blockReason || 'Manage your subscription to continue using this feature.'}
          </Text>
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
              onPress={async () => {
                setActionLoading(true)
                try {
                  await openBillingPortal()
                } finally {
                  setActionLoading(false)
                }
              }}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.primaryBtnText}>Open Billing Portal</Text>
              )}
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.outlinedBtn, pressed && { opacity: 0.7 }]}
              onPress={refresh}
            >
              <Text style={styles.outlinedBtnText}>Check Status</Text>
            </Pressable>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.fullScreen}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔒</Text>
        </View>
        <Text style={styles.title}>Workspace Access Required</Text>
        <Text style={styles.description}>
          {blockReason || 'Manage your subscription to continue using this feature.'}
        </Text>
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
            onPress={async () => {
              setActionLoading(true)
              try {
                await startTrial()
              } finally {
                setActionLoading(false)
              }
            }}
            disabled={isPastDue || actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.primaryBtnText}>Continue Access</Text>
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.outlinedBtn, pressed && { opacity: 0.7 }]}
            onPress={openBillingPortal}
          >
            <Text style={styles.outlinedBtnText}>Open Billing Portal</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.bg,
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
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
  primaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neon,
    borderRadius: radius.pill,
    paddingVertical: 14,
  },
  primaryBtnText: {
    color: colors.black,
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
})
