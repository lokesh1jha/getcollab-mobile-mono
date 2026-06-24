import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing } from '@shared/constants'
import { Button, Card } from '@shared/components/ui'
import { useSubscriptionStore, getTrialDaysRemaining } from '../../../stores/subscription-store'
import { SubscriptionExpiredModal } from '../../../components/SubscriptionExpiredModal'

export default function SubscriptionScreen() {
  const { subscription, loading, fetchStatus, openBillingPortal } = useSubscriptionStore()
  const [showExpiredModal, setShowExpiredModal] = useState(false)

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const daysLeft = getTrialDaysRemaining(subscription)
  const status = subscription?.status

  useEffect(() => {
    if (status === 'EXPIRED' || status === 'CANCELLED') {
      setShowExpiredModal(true)
    }
  }, [status])

  if (loading && !subscription) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Workspace</Text>
          <Text style={styles.subtitle}>Manage your brand workspace and access.</Text>
        </View>

        {status === 'TRIALING' && daysLeft !== null && (
          <Card style={[styles.statusCard, daysLeft <= 3 && styles.statusCardUrgent]}>
            <Text style={[styles.statusLabel, daysLeft <= 3 && styles.statusLabelUrgent]}>
              {daysLeft <= 3 ? 'Trial ending soon' : 'Trial active'}
            </Text>
            <Text style={styles.statusValue}>
              {daysLeft} day{daysLeft === 1 ? '' : 's'} remaining
            </Text>
            <Text style={styles.statusDetail}>
              Trial ends {subscription?.trialEndsAt?.slice(0, 10)}
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.max(5, (daysLeft / 14) * 100)}%` }]} />
            </View>
            <Button
              title="Manage Workspace"
              onPress={openBillingPortal}
              variant="outline"
              fullWidth
              style={styles.statusAction}
            />
          </Card>
        )}

        {status === 'ACTIVE' && (
          <Card style={styles.statusCard}>
            <Text style={[styles.statusLabel, { color: colors.success }]}>Subscribed</Text>
            <Text style={styles.statusValue}>
              {subscription?.billing === 'YEARLY' ? 'Yearly plan' : 'Monthly plan'}
            </Text>
            <Text style={styles.statusDetail}>
              Renews {subscription?.currentPeriodEnd?.slice(0, 10) || 'soon'}
            </Text>
            {subscription?.cancelAtPeriodEnd && (
              <Text style={styles.statusWarn}>Cancellation scheduled</Text>
            )}
            <View style={styles.statusActions}>
              <Button
                title="Manage Subscription Online"
                onPress={openBillingPortal}
                variant="outline"
                fullWidth
              />
            </View>
          </Card>
        )}

        {status === 'PAST_DUE' && (
          <Card style={[styles.statusCard, { borderColor: colors.error }]}>
            <Text style={[styles.statusLabel, { color: colors.error }]}>Payment issue</Text>
            <Text style={styles.statusValue}>Update billing to continue access</Text>
            <Text style={styles.statusDetail}>
              Your subscription is paused due to a failed payment.
            </Text>
            <Button
              title="Open Billing Portal"
              onPress={openBillingPortal}
              fullWidth
              style={styles.statusAction}
            />
          </Card>
        )}

        {status !== 'TRIALING' && status !== 'ACTIVE' && status !== 'PAST_DUE' && subscription && (
          <Card style={styles.expiredCard}>
            <Text style={styles.expiredTitle}>Continue Access</Text>
            <Text style={styles.expiredText}>
              Your workspace access has ended. Manage your subscription on the web to continue collaborating with creators.
            </Text>
            <Button
              title="Open Billing Portal"
              onPress={() => setShowExpiredModal(true)}
              fullWidth
            />
            <Button
              title="Sync Status"
              onPress={fetchStatus}
              variant="ghost"
              fullWidth
              style={styles.syncButton}
            />
          </Card>
        )}

        {!subscription && (
          <Card style={styles.trialPromoCard}>
            <Text style={styles.trialPromoTitle}>Start your 14-day free trial</Text>
            <Text style={styles.trialPromoText}>
              No card required. Get full access to launch campaigns and connect with creators.
            </Text>
            <Button
              title={loading ? 'Starting...' : 'Start Free Trial'}
              onPress={useSubscriptionStore.getState().startTrial}
              disabled={loading}
              loading={loading}
              fullWidth
              style={styles.trialBtn}
            />
          </Card>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Workspace features</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoCheck}>✓</Text>
            <Text style={styles.infoText}>Campaign creation & management</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoCheck}>✓</Text>
            <Text style={styles.infoText}>Creator discovery & outreach</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoCheck}>✓</Text>
            <Text style={styles.infoText}>Real-time messaging</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoCheck}>✓</Text>
            <Text style={styles.infoText}>Campaign analytics & insights</Text>
          </View>
        </View>

        <Card style={styles.supportCard}>
          <Text style={styles.supportTitle}>Need help?</Text>
          <Text style={styles.supportText}>
            For billing or subscription inquiries, visit our website or contact support.
          </Text>
          <Button
            title="Visit getcollab.in"
            onPress={openBillingPortal}
            variant="ghost"
            fullWidth
          />
        </Card>
      </ScrollView>

      <SubscriptionExpiredModal
        visible={showExpiredModal}
        onClose={() => setShowExpiredModal(false)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  statusCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  statusCardUrgent: {
    borderColor: colors.warning,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusLabelUrgent: {
    color: colors.warning,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginVertical: spacing.xs,
  },
  statusDetail: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  statusWarn: {
    fontSize: 12,
    color: colors.warning,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  statusAction: {
    marginTop: spacing.md,
  },
  statusActions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surfaceLight,
    borderRadius: 2,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  trialPromoCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  trialPromoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  trialPromoText: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  trialBtn: {
    marginTop: spacing.sm,
  },
  expiredCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderColor: colors.warning,
  },
  expiredTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  expiredText: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  syncButton: {
    marginTop: spacing.sm,
  },
  infoSection: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  infoCheck: {
    color: colors.success,
    marginRight: spacing.sm,
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoText: {
    color: colors.text,
    fontSize: 14,
  },
  supportCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  supportText: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
})
