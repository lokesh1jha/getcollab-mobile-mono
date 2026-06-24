import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { colors, spacing } from '@shared/constants'
import { Card, Button } from '@shared/components/ui'
import { useCampaignStore } from '@shared/stores/campaign-store'
import { useInfluencerStore } from '@shared/stores/influencer-store'
import { useSubscriptionStore } from '../../../../stores/subscription-store'
import { SubscriptionBanner } from '../../../../components/SubscriptionBanner'
import { SubscriptionExpiredModal } from '../../../../components/SubscriptionExpiredModal'
import { EmailVerificationBanner } from '@shared/components/EmailVerificationBanner'
import { logger } from '@shared/services/logger'

interface ScreenProps {
  navigation?: any
}

export default function BrandDashboardScreen({ navigation }: ScreenProps) {
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showExpiredModal, setShowExpiredModal] = useState(false)

  const { myCampaigns, fetchMyCampaigns } = useCampaignStore()
  const { influencers, fetchInfluencers } = useInfluencerStore()
  const subscription = useSubscriptionStore((s) => s.subscription)

  const loadDashboardData = useCallback(async () => {
    setLoadError(null)
    try {
      setLoading(true)
      await Promise.all([
        fetchMyCampaigns(),
        fetchInfluencers(),
      ])
    } catch (error: any) {
      const message = error?.message || 'Failed to load dashboard data'
      setLoadError(message)
      logger.error(message, error)
    } finally {
      setLoading(false)
    }
  }, [fetchMyCampaigns, fetchInfluencers])

  useFocusEffect(
    useCallback(() => {
      loadDashboardData()
    }, [loadDashboardData])
  )

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadDashboardData()
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const status = subscription?.status
    if (status === 'EXPIRED' || status === 'CANCELLED') {
      setShowExpiredModal(true)
    }
  }, [subscription?.status])

  const activeCampaignsCount = myCampaigns.filter(c => c.status === 'active').length
  const totalBidsCount = myCampaigns.reduce((sum, c) => sum + (c.bidCount || 0), 0)

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (loadError) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{loadError}</Text>
          <Button title="Retry" onPress={loadDashboardData} fullWidth />
        </Card>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <EmailVerificationBanner />
        <SubscriptionBanner />
        <View style={styles.header}>
          <Text style={styles.title}>Brand Dashboard</Text>
          <Text style={styles.subtitle}>Manage your campaigns</Text>
        </View>

        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>{activeCampaignsCount}</Text>
            <Text style={styles.statLabel}>Active Campaigns</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>{totalBidsCount}</Text>
            <Text style={styles.statLabel}>Total Bids</Text>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Button
            title="Create Campaign"
            onPress={() => navigation?.navigate('CreateCampaign')}
            fullWidth
            style={styles.actionButton}
          />
          <Button
            title="View Influencers"
            onPress={() => navigation?.navigate('BrandInfluencers')}
            variant="outline"
            fullWidth
            style={styles.actionButton}
          />
          <Button
            title="View Messages"
            onPress={() => navigation?.navigate('BrandChat')}
            variant="outline"
            fullWidth
            style={styles.actionButton}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Campaigns</Text>
            {myCampaigns.length > 0 && (
              <Text style={styles.seeAllLink}>See All</Text>
            )}
          </View>
          {myCampaigns.length > 0 ? (
            myCampaigns.slice(0, 3).map((campaign) => (
              <Card
                key={campaign.id}
                style={styles.campaignCard}
                onPress={() => navigation?.navigate('CampaignDetails', { id: campaign.id })}
              >
                <View style={styles.campaignHeader}>
                  <Text style={styles.campaignTitle} numberOfLines={2}>
                    {campaign.title}
                  </Text>
                  <Text style={[styles.campaignStatus, { color: campaign.status === 'active' ? colors.success : colors.warning }]}>
                    {campaign.status.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.campaignDescription} numberOfLines={2}>
                  {campaign.description}
                </Text>
                <View style={styles.campaignFooter}>
                  <Text style={styles.campaignBudget}>${campaign.budget?.toLocaleString()}</Text>
                  <Text style={styles.campaignBids}>{campaign.bidCount || 0} bid{(campaign.bidCount || 0) !== 1 ? 's' : ''}</Text>
                </View>
              </Card>
            ))
          ) : (
            <Card>
              <Text style={styles.emptyText}>No campaigns yet</Text>
              <Text style={styles.emptySubtext}>Create your first campaign to get started</Text>
            </Card>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Influencers</Text>
          {influencers.length > 0 ? (
            influencers.slice(0, 3).map((influencer) => (
              <Card
                key={influencer.id}
                style={styles.influencerCard}
                onPress={() => navigation?.navigate('InfluencerProfile', { id: influencer.id })}
              >
                <View style={styles.influencerInfo}>
                  <Text style={styles.influencerName}>{influencer.name}</Text>
                  <Text style={styles.influencerBio} numberOfLines={1}>
                    {influencer.bio}
                  </Text>
                  <View style={styles.influencerStats}>
                    <Text style={styles.influencerStat}>👥 {influencer.audienceSize?.toLocaleString()}</Text>
                    <Text style={styles.influencerStat}>💬 {Math.round(influencer.engagementRate || 0)}%</Text>
                  </View>
                </View>
              </Card>
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No influencers found</Text>
              <Text style={styles.emptySubtext}>Browse creators to find the perfect match for your campaigns</Text>
              <Button
                title="Find Influencers"
                onPress={() => navigation?.navigate('Creators')}
                variant="outline"
                style={styles.emptyCta}
                fullWidth
              />
            </Card>
          )}
        </View>
      </ScrollView>

      <SubscriptionExpiredModal
        visible={showExpiredModal}
        onClose={() => setShowExpiredModal(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorCard: {
    margin: spacing.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyCta: {
    marginTop: spacing.sm,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  section: {
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  seeAllLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  actionButton: {
    marginBottom: spacing.sm,
  },
  campaignCard: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  campaignTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  campaignStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: spacing.md,
  },
  campaignDescription: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  campaignFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  campaignBudget: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  campaignBids: {
    fontSize: 14,
    color: colors.textMuted,
  },
  influencerCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  influencerInfo: {
    flex: 1,
  },
  influencerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  influencerBio: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  influencerStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  influencerStat: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
})
