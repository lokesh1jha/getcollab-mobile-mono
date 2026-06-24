import React, { useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { colors, spacing } from '@shared/constants'
import { Button, Card } from './ui'
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
        <ActivityIndicator size="large" color={colors.primary} />
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
        <Card style={styles.card}>
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
            <Button
              title="Open Billing Portal"
              onPress={async () => {
                setActionLoading(true)
                try {
                  await openBillingPortal()
                } finally {
                  setActionLoading(false)
                }
              }}
              loading={actionLoading}
              disabled={actionLoading}
              fullWidth
            />
            <Button
              title="Check Status"
              onPress={refresh}
              variant="outline"
              fullWidth
              style={styles.secondaryAction}
            />
          </View>
        </Card>
      </View>
    )
  }

  return (
    <View style={styles.fullScreen}>
      <Card style={styles.card}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔒</Text>
        </View>
        <Text style={styles.title}>Workspace Access Required</Text>
        <Text style={styles.description}>
          {blockReason || 'Manage your subscription to continue using this feature.'}
        </Text>
        <View style={styles.actions}>
          <Button
            title="Continue Access"
            onPress={async () => {
              setActionLoading(true)
              try {
                startTrial()
              } finally {
                setActionLoading(false)
              }
            }}
            loading={actionLoading}
            disabled={isPastDue}
            fullWidth
          />
          <Button
            title="Open Billing Portal"
            onPress={openBillingPortal}
            variant="outline"
            fullWidth
            style={styles.secondaryAction}
          />
        </View>
      </Card>
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
    backgroundColor: colors.background,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: spacing.xl,
    alignItems: 'center',
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
  secondaryAction: {
    marginTop: spacing.xs,
  },
})
