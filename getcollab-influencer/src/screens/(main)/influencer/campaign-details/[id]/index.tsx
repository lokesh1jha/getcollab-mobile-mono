import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert, Dimensions, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, statusColor } from '@/src/theme'
import { useCampaignStore } from '@shared/stores/campaign-store'
import { apiService, handleApiError } from '@shared/services/api'
import * as Haptics from 'expo-haptics'

const { width } = Dimensions.get('window')

type CampaignDetailsRouteProp = RouteProp<
  { CampaignDetails: { id: string } },
  'CampaignDetails'
>

interface CampaignDetail {
  id: string
  title: string
  description?: string
  status?: string
  budget?: number
  budgetCurrency?: string
  budgetDisclosed?: boolean
  startDate?: string
  endDate?: string
  applicationDeadline?: string
  brand?: {
    id?: string
    name?: string
    image?: string
  }
  deliverables?: string[]
  requirements?: string[]
  targetCountries?: string[]
  targetLanguages?: string[]
  categories?: string[]
  platforms?: string[]
  minFollowers?: number
  maxFollowers?: number
  targetAgeMin?: number
  targetAgeMax?: number
  targetGender?: string
  pitchCount?: number
  hasApplied?: boolean
  myBid?: { id: string; status: string; amount?: number } | null
}

function formatBudget(n?: number, currency?: string, disclosed = true): string {
  if (!disclosed || n == null) return 'Undisclosed'
  const c = currency || 'INR'
  if (n >= 100000) return `${c === 'INR' ? '₹' : '$'}${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `${c === 'INR' ? '₹' : '$'}${(n / 1000).toFixed(0)}K`
  return `${c === 'INR' ? '₹' : '$'}${n}`
}

function timeLeft(end?: string): string | null {
  if (!end) return null
  const diff = new Date(end).getTime() - Date.now()
  if (diff <= 0) return 'Closed'
  const days = Math.floor(diff / 86_400_000)
  if (days > 30) return `${Math.floor(days / 30)} months left`
  if (days === 0) return 'Ends today'
  return `${days}d left`
}

function formatDate(d?: string): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return d }
}

export default function InfluencerCampaignDetailsScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = async () => {
    setRefreshing(true)
    try { await load() } finally { setRefreshing(false) }
  }
  const route = useRoute<CampaignDetailsRouteProp>()
  const navigation = useNavigation<any>()
  const { id } = route.params || {}

  const { currentCampaign, fetchCampaign, isLoading: storeLoading } = useCampaignStore()
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [bidding, setBidding] = useState(false)
  const [bidAmount, setBidAmount] = useState('')
  const [bidPitch, setBidPitch] = useState('')

  const load = useCallback(async () => {
    if (!id) { setLoading(false); return }
    try {
      await fetchCampaign(id)
      const state = useCampaignStore.getState()
      const c = state.currentCampaign as any
      if (c) {
        setCampaign({
          id: c.id,
          title: c.title,
          description: c.description,
          status: c.status,
          budget: c.budget ?? c.budget_minor,
          budgetCurrency: c.budgetCurrency ?? c.currency ?? 'INR',
          budgetDisclosed: c.budgetDisclosed !== false,
          startDate: c.startDate || c.start_date,
          endDate: c.endDate || c.end_date,
          applicationDeadline: c.applicationDeadline || c.application_deadline,
          brand: c.brand,
          deliverables: c.deliverables || c.deliverableTypes || [],
          requirements: c.requirements || [],
          targetCountries: c.targetCountries || c.target_countries || [],
          targetLanguages: c.targetLanguages || c.target_languages || [],
          categories: c.categories || c.categorySlugs || [],
          platforms: c.platforms || [],
          minFollowers: c.minFollowers || c.min_followers,
          maxFollowers: c.maxFollowers || c.max_followers,
          targetAgeMin: c.targetAgeMin || c.target_age_min,
          targetAgeMax: c.targetAgeMax || c.target_age_max,
          targetGender: c.targetGender || c.target_gender,
          pitchCount: c.pitchCount ?? c.bidCount ?? 0,
          hasApplied: c.hasApplied ?? false,
          myBid: c.myBid || null,
        })
      }
    } catch (err: any) {
      handleApiError(err, 'Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }, [id, fetchCampaign])

  useEffect(() => { load() }, [load])

  const handleBid = async () => {
    if (!bidAmount.trim() || !bidPitch.trim()) {
      Alert.alert('Complete your pitch', 'Enter your rate and a short pitch.')
      return
    }
    setBidding(true)
    try {
      await apiService.submitBid({
        campaignId: id,
        amount: Number(bidAmount),
        message: bidPitch,
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert('Applied!', 'Your application was submitted.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (err: any) {
      handleApiError(err, 'Failed to submit application')
    } finally {
      setBidding(false)
    }
  }

  const s = campaign ? statusColor(campaign.status || 'draft') : statusColor('draft')
  const tl = timeLeft(campaign?.applicationDeadline || campaign?.endDate)

  if (loading || storeLoading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.neon} />
      </View>
    )
  }

  if (!campaign) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg }}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.md }}>Campaign not found</Text>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack() }} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}>
            <Text style={styles.primaryBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const isClosed = campaign.status !== 'active'
  const alreadyApplied = campaign.hasApplied || !!campaign.myBid

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <SafeAreaView style={styles.root} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.85 }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>Campaign</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onRefresh() }} tintColor={colors.neon} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        >
          {/* Brand row */}
          <Animated.View entering={FadeInDown.delay(0).duration(350)} style={styles.brandRow}>
            <View style={styles.brandAvatar}>
              <Text style={styles.brandAvatarText}>{(campaign.brand?.name || campaign.title)?.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandName}>{campaign.brand?.name || 'Brand'}</Text>
              <Text style={styles.campaignTitle}>{campaign.title}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
              <Text style={[styles.statusText, { color: s.fg }]}>
                {(campaign.status || 'draft').charAt(0).toUpperCase() + (campaign.status || 'draft').slice(1)}
              </Text>
            </View>
          </Animated.View>

          {/* Deadline + Budget */}
          <Animated.View entering={FadeInDown.delay(50).duration(350)} style={styles.metaRow}>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Budget</Text>
              <Text style={styles.metaValue}>{formatBudget(campaign.budget, campaign.budgetCurrency, campaign.budgetDisclosed)}</Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Deadline</Text>
              <Text style={[styles.metaValue, tl === 'Closed' && { color: colors.error }]}>{formatDate(campaign.applicationDeadline || campaign.endDate)}</Text>
              {tl && <Text style={[styles.metaSub, tl === 'Closed' && { color: colors.error }]}>{tl}</Text>}
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Duration</Text>
              <Text style={styles.metaValue}>{formatDate(campaign.startDate)}</Text>
              <Text style={styles.metaSub}>to {formatDate(campaign.endDate)}</Text>
            </View>
          </Animated.View>

          {/* Description */}
          {campaign.description ? (
            <Animated.View entering={FadeInDown.delay(100).duration(350)} style={styles.section}>
              <Text style={styles.sectionTitle}>About this campaign</Text>
              <Text style={styles.bodyText}>{campaign.description}</Text>
            </Animated.View>
          ) : null}

          {/* Deliverables */}
          {campaign.deliverables && campaign.deliverables.length > 0 ? (
            <Animated.View entering={FadeInDown.delay(140).duration(350)} style={styles.section}>
              <Text style={styles.sectionTitle}>Deliverables</Text>
              {campaign.deliverables.map((d, i) => (
                <View key={i} style={styles.listRow}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.neon} />
                  <Text style={styles.listText}>{d}</Text>
                </View>
              ))}
            </Animated.View>
          ) : null}

          {/* Requirements */}
          {campaign.requirements && campaign.requirements.length > 0 ? (
            <Animated.View entering={FadeInDown.delay(160).duration(350)} style={styles.section}>
              <Text style={styles.sectionTitle}>Requirements</Text>
              {campaign.requirements.map((r, i) => (
                <View key={i} style={styles.listRow}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={colors.blue} />
                  <Text style={styles.listText}>{r}</Text>
                </View>
              ))}
            </Animated.View>
          ) : null}

          {/* Target audience */}
          {(campaign.targetCountries?.length || campaign.targetLanguages?.length || campaign.categories?.length || campaign.platforms?.length || campaign.targetGender || campaign.minFollowers || campaign.maxFollowers) ? (
            <Animated.View entering={FadeInDown.delay(180).duration(350)} style={styles.section}>
              <Text style={styles.sectionTitle}>Target audience</Text>
              <View style={styles.tagGrid}>
                {campaign.categories?.map((c) => <Tag key={c} text={c} icon="pricetag-outline" />)}
                {campaign.platforms?.map((p) => <Tag key={p} text={p} icon="logo-instagram" />)}
                {campaign.targetCountries?.map((c) => <Tag key={c} text={c} icon="location-outline" />)}
                {campaign.targetLanguages?.map((l) => <Tag key={l} text={l} icon="language-outline" />)}
                {campaign.targetGender ? <Tag text={campaign.targetGender} icon="people-outline" /> : null}
                {campaign.minFollowers ? <Tag text={`${campaign.minFollowers}+ followers`} icon="person-add-outline" /> : null}
                {campaign.maxFollowers ? <Tag text={`Up to ${campaign.maxFollowers}`} icon="people-outline" /> : null}
              </View>
            </Animated.View>
          ) : null}

          {/* Already applied state */}
          {alreadyApplied ? (
            <Animated.View entering={FadeInDown.delay(220).duration(350)} style={[styles.applyCard, { borderColor: colors.success }]}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>Application submitted</Text>
                <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>
                  Status: <Text style={{ color: colors.success, fontWeight: '700' }}>{campaign.myBid?.status || 'Pending'}</Text>
                  {campaign.myBid?.amount ? ` · ₹${campaign.myBid.amount.toLocaleString()}` : ''}
                </Text>
              </View>
            </Animated.View>
          ) : isClosed ? (
            <Animated.View entering={FadeInDown.delay(220).duration(350)} style={[styles.applyCard, { borderColor: colors.error }]}>
              <Ionicons name="lock-closed" size={22} color={colors.error} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>Applications closed</Text>
                <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>This campaign is no longer accepting applications.</Text>
              </View>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.delay(220).duration(350)} style={styles.applySection}>
              <Text style={styles.sectionTitle}>Apply now</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: spacing.md }}>
                Pitch the brand with your rate and a short note.
              </Text>

              <View style={styles.inputWrap}>
                <Ionicons name="cash-outline" size={18} color={colors.textMuted} />
                <TextInput
                  value={bidAmount}
                  onChangeText={setBidAmount}
                  placeholder="Your rate (₹)"
                  placeholderTextColor={colors.textSubtle}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>

              <View style={[styles.inputWrap, { alignItems: 'flex-start', minHeight: 100, paddingTop: 14 }]}>
                <TextInput
                  value={bidPitch}
                  onChangeText={setBidPitch}
                  placeholder="Why you're the right fit…"
                  placeholderTextColor={colors.textSubtle}
                  multiline
                  style={[styles.input, { textAlignVertical: 'top' }]}
                />
              </View>

              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleBid() }}
                disabled={bidding || !bidAmount.trim() || !bidPitch.trim()}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  (bidding || !bidAmount.trim() || !bidPitch.trim()) && { opacity: 0.5 },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Ionicons name="flash" size={18} color="#000" />
                <Text style={styles.primaryBtnText}>{bidding ? 'Submitting…' : 'Submit Application'}</Text>
              </Pressable>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

function Tag({ text, icon }: { text: string; icon: string }) {
  return (
    <View style={styles.tag}>
      <Ionicons name={icon as any} size={12} color={colors.textMuted} />
      <Text style={styles.tagText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card,
  },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center', marginHorizontal: spacing.sm },

  brandRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, marginTop: spacing.sm,
  },
  brandAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.elevated,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  brandAvatarText: { color: colors.text, fontSize: 18, fontWeight: '700' },
  brandName: { color: colors.textMuted, fontSize: 13 },
  campaignTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 1, letterSpacing: -0.3 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  metaRow: {
    flexDirection: 'row', gap: spacing.md,
    paddingHorizontal: spacing.lg, marginTop: spacing.lg,
  },
  metaCard: {
    flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.lg, gap: 4,
  },
  metaLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  metaValue: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  metaSub: { color: colors.textSubtle, fontSize: 12, marginTop: 1 },

  section: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: spacing.md, letterSpacing: -0.3 },
  bodyText: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },

  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  listText: { color: colors.text, fontSize: 14, flex: 1, lineHeight: 20 },

  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.elevated, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: colors.border,
  },
  tagText: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },

  applySection: {
    marginTop: spacing.xl, marginHorizontal: spacing.lg,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.lg,
  },
  applyCard: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: spacing.xl, marginHorizontal: spacing.lg,
    backgroundColor: colors.card, borderWidth: 1, borderRadius: radius.lg,
    padding: spacing.lg,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 14,
    marginBottom: spacing.md,
  },
  input: { flex: 1, color: colors.text, fontSize: 15, padding: 0 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.neon, borderRadius: radius.pill, paddingVertical: 16, marginTop: spacing.sm,
  },
  primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
})
