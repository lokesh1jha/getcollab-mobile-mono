import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, overline } from '@/src/theme'
import { useSubscriptionStore, getTrialDaysRemaining } from '../../../stores/subscription-store'
import { SubscriptionExpiredModal } from '../../../components/SubscriptionExpiredModal'
import * as Haptics from 'expo-haptics'

export default function SubscriptionScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = async () => {
    setRefreshing(true)
    try { await fetchStatus() } finally { setRefreshing(false) }
  }
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
      <View style={styles.root}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onRefresh() }} tintColor={colors.primary} />} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.header}>
              <Text style={styles.title}>Workspace</Text>
              <Text style={styles.subtitle}>Your plan and access.</Text>
            </View>
          </Animated.View>

          {status === 'TRIALING' && daysLeft !== null && (
            <Animated.View entering={FadeInDown.delay(80).duration(400)} style={[styles.statusCard, daysLeft <= 3 && styles.statusCardUrgent]}>
              <Text style={[styles.statusLabel, daysLeft <= 3 && { color: colors.warning }]}>
                {daysLeft <= 3 ? 'Trial ending soon' : 'Trial active'}
              </Text>
              <Text style={styles.statusValue}>{daysLeft} day{daysLeft === 1 ? '' : 's'} left</Text>
              <Text style={styles.statusDetail}>Trial ends {subscription?.trialEndsAt?.slice(0, 10)}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.max(5, (daysLeft / 14) * 100)}%` }]} />
              </View>
              <Pressable style={({ pressed }) => [styles.outlinedBtn, pressed && { opacity: 0.85 }]} onPress={openBillingPortal}>
                <Text style={styles.outlinedBtnText}>Manage plan</Text>
              </Pressable>
            </Animated.View>
          )}

          {status === 'ACTIVE' && (
            <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.statusCard}>
              <Text style={[styles.statusLabel, { color: colors.success }]}>Subscribed</Text>
              <Text style={styles.statusValue}>{subscription?.billing === 'YEARLY' ? 'Yearly plan' : 'Monthly plan'}</Text>
              <Text style={styles.statusDetail}>Renews {subscription?.currentPeriodEnd?.slice(0, 10) || 'soon'}</Text>
              {subscription?.cancelAtPeriodEnd && (
                <Text style={styles.statusWarn}>Cancellation scheduled</Text>
              )}
              <Pressable style={({ pressed }) => [styles.outlinedBtn, pressed && { opacity: 0.85 }]} onPress={openBillingPortal}>
                <Text style={styles.outlinedBtnText}>Manage plan</Text>
              </Pressable>
            </Animated.View>
          )}

          {status === 'PAST_DUE' && (
            <Animated.View entering={FadeInDown.delay(80).duration(400)} style={[styles.statusCard, { borderColor: colors.error }]}>
              <Text style={[styles.statusLabel, { color: colors.error }]}>Payment issue</Text>
              <Text style={styles.statusValue}>Update billing to keep access</Text>
              <Text style={styles.statusDetail}>A payment failed, so your plan is paused.</Text>
              <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openBillingPortal() }}>
                <Text style={styles.primaryBtnText}>Update billing</Text>
              </Pressable>
            </Animated.View>
          )}

          {status !== 'TRIALING' && status !== 'ACTIVE' && status !== 'PAST_DUE' && subscription && (
            <Animated.View entering={FadeInDown.delay(80).duration(400)} style={[styles.statusCard, { borderColor: colors.warning }]}>
              <Text style={styles.statusValue}>Access ended</Text>
              <Text style={styles.statusDetail}>Renew your plan on the web to keep working with creators.</Text>
              <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowExpiredModal(true) }}>
                <Text style={styles.primaryBtnText}>Renew plan</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.75 }]} onPress={fetchStatus}>
                <Text style={styles.ghostBtnText}>Refresh status</Text>
              </Pressable>
            </Animated.View>
          )}

          {!subscription && (
            <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.statusCard}>
              <Text style={styles.statusValue}>Start your 7-day free trial</Text>
              <Text style={styles.statusDetail}>No card needed. Run campaigns and work with creators.</Text>
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); useSubscriptionStore.getState().startTrial() }}
                disabled={loading}
              >
                <Text style={styles.primaryBtnText}>{loading ? 'Starting…' : 'Start free trial'}</Text>
              </Pressable>
            </Animated.View>
          )}

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>What's included</Text>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.infoText}>Create and manage campaigns</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.infoText}>Find and invite creators</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.infoText}>Live chat</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.infoText}>Campaign analytics</Text>
            </View>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusValue}>Need help?</Text>
            <Text style={styles.statusDetail}>For billing questions, visit our website or contact support.</Text>
            <Pressable style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.75 }]} onPress={openBillingPortal}>
              <Text style={styles.ghostBtnText}>Visit getcollab.in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
      <SubscriptionExpiredModal visible={showExpiredModal} onClose={() => setShowExpiredModal(false)} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 20 },

  statusCard: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg,
  },
  statusCardUrgent: { borderColor: colors.warning },
  statusLabel: { ...overline },
  statusValue: { fontSize: 20, fontWeight: '700', color: '#fff', marginVertical: spacing.xs },
  statusDetail: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm, lineHeight: 19 },
  statusWarn: { fontSize: 12, color: colors.warning, marginTop: spacing.xs, marginBottom: spacing.sm },
  progressBar: { height: 4, backgroundColor: colors.elevated, borderRadius: 2, marginTop: spacing.sm, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },

  primaryBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 14, marginTop: spacing.md },
  primaryBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
  outlinedBtn: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.pill, paddingVertical: 14, marginTop: spacing.md },
  outlinedBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  ghostBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: spacing.sm },
  ghostBtnText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },

  infoSection: {
    marginBottom: spacing.lg, padding: spacing.lg,
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  infoTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, gap: spacing.sm },
  infoText: { color: colors.textMuted, fontSize: 14 },
})
