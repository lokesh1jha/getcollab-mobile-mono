import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { colors, spacing } from '@shared/constants'
import { apiService, handleApiError } from '@shared/services/api'
import { useAuthStore } from '@shared/stores/auth-store'
import { EmailVerificationBanner } from '@shared/components/EmailVerificationBanner'

interface DashboardScreenProps {
  navigation?: any
}

interface DashboardStats {
  campaigns: number
  earnings: number
  followers: number
  engagement: number
}

interface ActivityItem {
  id: string
  text: string
  time: string
}

const formatRelativeTime = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

const pickPrimaryFollowers = (profile: any): number => {
  if (!profile) return 0
  const metricsKeys = [
    'instagramMetrics',
    'youtubeMetrics',
    'tiktokMetrics',
    'twitterMetrics',
    'facebookMetrics',
  ]
  for (const key of metricsKeys) {
    const followers = Number(profile[key]?.followers)
    if (followers > 0) return followers
  }
  return Number(profile.followers || 0)
}

const pickEngagement = (profile: any): number => {
  if (!profile) return 0
  const metricsKeys = [
    'instagramMetrics',
    'youtubeMetrics',
    'tiktokMetrics',
    'twitterMetrics',
    'facebookMetrics',
  ]
  for (const key of metricsKeys) {
    const eng = Number(profile[key]?.avgEngagement)
    if (eng > 0) return eng
  }
  return 0
}

export default function InfluencerDashboard({ navigation }: DashboardScreenProps) {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats>({
    campaigns: 0,
    earnings: 0,
    followers: 0,
    engagement: 0,
  })
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDashboardData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true)
    setError(null)
    try {
      const [bidsRes, earningsRes, profileRes, notificationsRes] = await Promise.all([
        apiService.getBids({ status: 'accepted' }).catch(() => null),
        apiService.getEarnings().catch(() => null),
        apiService.getProfileWithMetrics().catch(() => apiService.getProfile().catch(() => null)),
        apiService.getNotifications().catch(() => null),
      ])

      const bids = bidsRes?.data || bidsRes?.bids || (Array.isArray(bidsRes) ? bidsRes : [])
      const earnings = earningsRes?.data || earningsRes?.requests || earningsRes?.earnings || (Array.isArray(earningsRes) ? earningsRes : [])
      const earningsTotal = Array.isArray(earnings)
        ? earnings.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0)
        : Number(earningsRes?.total ?? 0)

      const profile = profileRes?.data || profileRes?.profile || profileRes?.influencerProfile || profileRes || {}
      const notifications = notificationsRes?.data || notificationsRes?.notifications || []

      setStats({
        campaigns: Array.isArray(bids) ? bids.length : 0,
        earnings: earningsTotal,
        followers: pickPrimaryFollowers(profile),
        engagement: pickEngagement(profile),
      })

      setActivities(
        (Array.isArray(notifications) ? notifications : [])
          .slice(0, 5)
          .map((n: any) => ({
            id: String(n.id ?? Math.random()),
            text: n.message || n.title || 'Activity',
            time: formatRelativeTime(n.createdAt),
          }))
      )
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard')
      handleApiError(err, 'Failed to load dashboard data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadDashboardData(true)
    }, [loadDashboardData])
  )

  const onRefresh = () => {
    setRefreshing(true)
    loadDashboardData(false)
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    )
  }

  const displayFollowers = stats.followers >= 1000
    ? `${(stats.followers / 1000).toFixed(1)}K`
    : String(stats.followers)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <EmailVerificationBanner />
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.nameText}>{user?.name ? `@${user.name.replace(/\s+/g, '').toLowerCase()}` : 'Creator'}</Text>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.campaigns}</Text>
            <Text style={styles.statLabel}>Active Campaigns</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>₹{stats.earnings.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Earnings</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{displayFollowers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.engagement ? `${stats.engagement.toFixed(1)}%` : '—'}</Text>
            <Text style={styles.statLabel}>Engagement</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation?.navigate('Discover')}>
              <Text style={styles.actionTitle}>Find Campaigns</Text>
              <Text style={styles.actionSubtitle}>Discover new opportunities</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => navigation?.navigate('MyCampaigns')}>
              <Text style={styles.actionTitle}>My Campaigns</Text>
              <Text style={styles.actionSubtitle}>View your applications</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => navigation?.navigate('Chat')}>
              <Text style={styles.actionTitle}>Messages</Text>
              <Text style={styles.actionSubtitle}>Check your inbox</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => navigation?.navigate('Earnings')}>
              <Text style={styles.actionTitle}>Earnings</Text>
              <Text style={styles.actionSubtitle}>Track your payouts</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>

          {activities.length === 0 ? (
            <View style={styles.emptyActivity}>
              <Text style={styles.emptyActivityText}>
                No activity yet. New campaign matches and payments will show up here.
              </Text>
            </View>
          ) : (
            activities.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <Text style={styles.activityText}>{activity.text}</Text>
                {activity.time ? <Text style={styles.activityTime}>{activity.time}</Text> : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  nameText: {
    fontSize: 16,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  errorText: {
    color: colors.error,
    marginBottom: spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  actionsContainer: {
    gap: spacing.md,
  },
  actionButton: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  actionSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  emptyActivity: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyActivityText: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  activityItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
})
