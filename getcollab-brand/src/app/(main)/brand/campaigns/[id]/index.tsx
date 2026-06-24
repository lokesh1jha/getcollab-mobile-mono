import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import { colors, spacing } from '@shared/constants'
import { Card, Button } from '@shared/components/ui'
import { useCampaignStore } from '@shared/stores/campaign-store'
import type { Campaign } from '@shared/types'

type CampainDetailsRouteProp = RouteProp<{ campaignDetails: { id: string; campaign?: Campaign } }, 'campaignDetails'>

export default function BrandCampaignDetailsScreen() {
  const route = useRoute<CampainDetailsRouteProp>()
  const navigation = useNavigation()
  const { id, campaign: preloadedCampaign } = route.params || {}

  const { currentCampaign, fetchCampaign, isLoading } = useCampaignStore()
  const [campaign, setCampaign] = useState<Campaign | null>(preloadedCampaign || null)

  useEffect(() => {
    if (id && !preloadedCampaign) {
      loadCampaign()
    } else if (preloadedCampaign) {
      setCampaign(preloadedCampaign)
    }
  }, [id, preloadedCampaign])

  const loadCampaign = async () => {
    try {
      await fetchCampaign(id)
      const state = useCampaignStore.getState()
      setCampaign(state.currentCampaign)
    } catch (error) {
      console.error('Failed to load campaign:', error)
    }
  }

  if (isLoading && !campaign) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  if (!campaign) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Campaign not found</Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} variant="outline" />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{campaign.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(campaign.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(campaign.status) }]}>
              {campaign.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Campaign Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Budget</Text>
            <Text style={styles.value}>${campaign.budget.toLocaleString()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Bids</Text>
            <Text style={styles.value}>{campaign.bidCount}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Region</Text>
            <Text style={styles.value}>{campaign.region}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Created</Text>
            <Text style={styles.value}>{new Date(campaign.createdAt).toLocaleDateString()}</Text>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{campaign.description}</Text>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Deliverables</Text>
          <View style={styles.deliverablesList}>
            {campaign.deliverables?.map((deliverable, index) => (
              <View key={index} style={styles.deliverableItem}>
                <Text style={styles.deliverableText}>✓ {deliverable}</Text>
              </View>
            ))}
          </View>
        </Card>

        <View style={styles.dateSection}>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Start Date</Text>
            <Text style={styles.dateValue}>{new Date(campaign.startDate).toLocaleDateString()}</Text>
          </View>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>End Date</Text>
            <Text style={styles.dateValue}>{new Date(campaign.endDate).toLocaleDateString()}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return colors.success
    case 'draft': return colors.textMuted
    case 'completed': return colors.primary
    case 'cancelled': return colors.error
    default: return colors.textMuted
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    marginBottom: spacing.lg,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  section: {
    margin: spacing.md,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 14,
    color: colors.textMuted,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  description: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  deliverablesList: {
    gap: spacing.sm,
  },
  deliverableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  deliverableText: {
    fontSize: 14,
    color: colors.primary,
  },
  dateSection: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  dateItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
})
