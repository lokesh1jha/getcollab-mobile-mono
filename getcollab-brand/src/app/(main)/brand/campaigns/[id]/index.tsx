import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { useCampaignStore } from '@shared/stores/campaign-store'
import type { Campaign } from '@shared/types'

type RouteParams = RouteProp<{ campaignDetails: { id: string; campaign?: Campaign } }, 'campaignDetails'>

const STATUS_COLORS: Record<string, { fg: string; bg: string; dot: string }> = {
  active: { fg: '#22C55E', bg: 'rgba(34,197,94,0.12)', dot: '#22C55E' },
  draft: { fg: '#A1A1AA', bg: 'rgba(161,161,170,0.12)', dot: '#A1A1AA' },
  completed: { fg: '#3B82F6', bg: 'rgba(59,130,246,0.14)', dot: '#3B82F6' },
  cancelled: { fg: '#EF4444', bg: 'rgba(239,68,68,0.14)', dot: '#EF4444' },
}

export default function BrandCampaignDetailsScreen() {
  const route = useRoute<RouteParams>()
  const navigation = useNavigation()
  const { id, campaign: preloadedCampaign } = route.params || {}

  const { currentCampaign, fetchCampaign, isLoading } = useCampaignStore()
  const [campaign, setCampaign] = useState<Campaign | null>(preloadedCampaign || null)

  useEffect(() => {
    if (id && !preloadedCampaign) { loadCampaign() }
    else if (preloadedCampaign) { setCampaign(preloadedCampaign) }
  }, [id, preloadedCampaign])

  const loadCampaign = async () => {
    try { await fetchCampaign(id); setCampaign(useCampaignStore.getState().currentCampaign) }
    catch (error) { console.error('Failed to load campaign:', error) }
  }

  if (isLoading && !campaign) {
    return <SafeAreaView style={styles.root}><View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={colors.neon} /></View></SafeAreaView>
  }

  if (!campaign) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.md }}>
          <Text style={{ color: colors.error, fontSize: 16 }}>Campaign not found</Text>
          <Pressable style={({ pressed }) => [styles.outlinedBtn, pressed && { opacity: 0.8 }]} onPress={() => navigation.goBack()}>
            <Text style={styles.outlinedBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const st = campaign.status || 'draft'
  const s = STATUS_COLORS[st] || STATUS_COLORS.draft

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{campaign.title}</Text>
            <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
              <Text style={[styles.statusText, { color: s.fg }]}>{st.charAt(0).toUpperCase() + st.slice(1)}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Campaign Details</Text>
            <View style={styles.detailRow}><Text style={styles.label}>Budget</Text><Text style={styles.value}>₹{campaign.budget.toLocaleString()}</Text></View>
            <View style={styles.detailRow}><Text style={styles.label}>Bids</Text><Text style={styles.value}>{campaign.bidCount}</Text></View>
            <View style={styles.detailRow}><Text style={styles.label}>Region</Text><Text style={styles.value}>{campaign.region}</Text></View>
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}><Text style={styles.label}>Created</Text><Text style={styles.value}>{new Date(campaign.createdAt).toLocaleDateString()}</Text></View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{campaign.description}</Text>
          </View>

          {campaign.deliverables?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Deliverables</Text>
              {campaign.deliverables.map((del, idx) => (
                <View key={idx} style={styles.deliverableItem}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.blue} />
                  <Text style={styles.deliverableText}>{del}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.dateRow}>
            <View style={styles.dateCard}>
              <Text style={styles.dateLabel}>Start Date</Text>
              <Text style={styles.dateValue}>{new Date(campaign.startDate).toLocaleDateString()}</Text>
            </View>
            <View style={styles.dateCard}>
              <Text style={styles.dateLabel}>End Date</Text>
              <Text style={styles.dateValue}>{new Date(campaign.endDate).toLocaleDateString()}</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg, gap: spacing.md },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', letterSpacing: -0.5, flex: 1 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, flexShrink: 0 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginBottom: spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { color: colors.textMuted, fontSize: 14 },
  value: { color: '#fff', fontSize: 14, fontWeight: '600' },
  description: { color: colors.textMuted, fontSize: 14, lineHeight: 22 },

  deliverableItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  deliverableText: { color: '#fff', fontSize: 14 },

  dateRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  dateCard: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  dateLabel: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.xs },
  dateValue: { color: '#fff', fontSize: 14, fontWeight: '600' },

  outlinedBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong },
  outlinedBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
