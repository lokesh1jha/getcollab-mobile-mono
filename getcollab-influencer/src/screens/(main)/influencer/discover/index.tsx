import React, { useState, useCallback, useMemo, useRef } from 'react'
import {
  FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, View, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing, statusColor } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import { InfluencerNavigationProp } from '@/src/types/navigation'

const CATEGORIES = ['All', 'Fashion', 'Beauty', 'Fitness', 'Tech', 'Travel', 'Food', 'Lifestyle', 'Gaming']
const SORTS = [
  { key: 'newest', label: 'Newest' },
  { key: 'budget_desc', label: 'Budget: High-Low' },
  { key: 'budget_asc', label: 'Budget: Low-High' },
]
const BUDGET_RANGES = [
  { key: 'all', label: 'Any budget' },
  { key: '0-50000', label: 'Under ₹50K' },
  { key: '50000-200000', label: '₹50K - ₹2L' },
  { key: '200000-1000000', label: '₹2L - ₹10L' },
  { key: '1000000+', label: '₹10L+' },
]

interface Campaign {
  id: string; title: string; description?: string; budget?: number; budgetCurrency?: string; budgetDisclosed?: boolean
  status: string; category?: string; region?: string; deliverables?: string[]
  startDate?: string; endDate?: string; applicationDeadline?: string
  brandName?: string; brand?: { name?: string; image?: string }
  minFollowers?: number; maxFollowers?: number; platforms?: string[]
  targetGender?: string; targetAgeMin?: number; targetAgeMax?: number
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
  if (days > 30) return null
  if (days === 0) return 'Ends today'
  return `${days}d left`
}

export default function InfluencerDiscover({ navigation }: { navigation: InfluencerNavigationProp }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [sortKey, setSortKey] = useState('newest')
  const [budgetRange, setBudgetRange] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [bidTarget, setBidTarget] = useState<Campaign | null>(null)
  const [bidAmount, setBidAmount] = useState('')
  const [bidPitch, setBidPitch] = useState('')
  const [bidding, setBidding] = useState(false)

  const load = useCallback(async (spinner = false) => {
    if (spinner) setLoading(true)
    try {
      const params: Record<string, any> = { status: 'active' }
      if (category !== 'All') params.category = category
      if (budgetRange !== 'all') {
        const [min, max] = budgetRange.split('-').map(x => x.replace('+', ''))
        if (min) params.minBudget = min
        if (max) params.maxBudget = max
      }
      params.sort = sortKey
      const res = await apiService.getCampaigns(params)
      const list: Campaign[] = res?.data || res?.campaigns || (Array.isArray(res) ? res : [])
      setCampaigns(Array.isArray(list) ? list : [])
    } catch (err: any) {
      handleApiError(err, 'Failed to load campaigns')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [category, sortKey, budgetRange])

  useFocusEffect(useCallback(() => { load(true) }, [load]))
  const onRefresh = () => { setRefreshing(true); load(false) }

  const filtered = useMemo(() => {
    if (!query.trim()) return campaigns
    const q = query.toLowerCase()
    return campaigns.filter(c =>
      c.title?.toLowerCase().includes(q) ||
      (c.brandName || c.brand?.name)?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q) ||
      c.region?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    )
  }, [campaigns, query])

  const handleBid = async () => {
    if (!bidTarget || !bidAmount.trim() || !bidPitch.trim()) return
    setBidding(true)
    try {
      await apiService.submitBid({
        campaignId: bidTarget.id,
        amount: Number(bidAmount),
        message: bidPitch,
      })
      setBidTarget(null)
      setBidAmount('')
      setBidPitch('')
      Alert.alert('Applied!', 'Your application was submitted.')
    } catch (err: any) {
      handleApiError(err, 'Failed to submit bid')
    } finally {
      setBidding(false)
    }
  }

  const renderCampaign = ({ item, index }: { item: Campaign; index: number }) => {
    const s = statusColor(item.status)
    const tl = timeLeft(item.applicationDeadline || item.endDate)
    const brand = item.brandName || item.brand?.name || 'Brand'
    return (
      <Animated.View entering={FadeInDown.delay(index * 50).duration(320)} style={styles.campaignCard}>
        <Pressable
          onPress={() => navigation?.navigate('CampaignDetails', { id: item.id })}
          style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
        >
          <View style={styles.cardTop}>
            <View style={styles.brandAvatarWrap}>
              <Text style={styles.brandAvatarText}>{brand.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.campaignTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.brandName}>{brand}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
              <Text style={[styles.statusText, { color: s.fg }]}>
                {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
              </Text>
            </View>
          </View>

          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
          ) : null}

          <View style={styles.tagsRow}>
            {item.category ? <Tag text={item.category} icon="pricetag-outline" /> : null}
            {item.region ? <Tag text={item.region} icon="location-outline" /> : null}
            {item.platforms?.slice(0, 1).map(p => <Tag key={p} text={p} icon="camera-outline" />) ?? null}
            {item.deliverables?.slice(0, 1).map(d => <Tag key={d} text={d} icon="checkbox-outline" />) ?? null}
          </View>

          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.budgetLabel}>Budget</Text>
              <Text style={styles.budgetValue}>{formatBudget(item.budget, item.budgetCurrency, item.budgetDisclosed !== false)}</Text>
            </View>
            <View style={styles.cardActions}>
              {tl && (
                <View style={[styles.urgencyPill, tl === 'Ends today' && { backgroundColor: colors.errorSoft }]}>
                  <Ionicons name="time-outline" size={11} color={tl === 'Ends today' ? colors.error : colors.textMuted} />
                  <Text style={[styles.urgencyText, tl === 'Ends today' && { color: colors.error }]}>{tl}</Text>
                </View>
              )}
              <Pressable
                onPress={() => { setBidTarget(item); setBidAmount(String(item.budget || '')); setBidPitch('') }}
                style={({ pressed }) => [styles.applyBtn, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="flash" size={14} color="#000" />
                <Text style={styles.applyBtnText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    )
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Discover</Text>
          <Pressable onPress={() => setShowFilters(true)} style={styles.iconBtn}>
            <Ionicons name="options-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search campaigns, brands, categories…"
            placeholderTextColor={colors.textSubtle}
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Category chips */}
        <View style={styles.chipsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
            {CATEGORIES.map(cat => {
              const active = cat === category
              return (
                <Pressable key={cat} onPress={() => setCategory(cat)} style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat}</Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.neon} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            renderItem={renderCampaign}
            keyExtractor={c => c.id}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl }}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neon} />}
            ListHeaderComponent={
              filtered.length > 0 ? (
                <Animated.View entering={FadeIn.duration(360)} style={styles.aiBanner}>
                  <View style={styles.aiLeft}>
                    <View style={styles.aiSparkle}>
                      <Ionicons name="sparkles" size={14} color={colors.blue} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.aiBannerTitle}>{filtered.length} campaigns available for you</Text>
                      <Text style={styles.aiBannerSub}>{category !== 'All' ? category : 'All categories'} · {sortKey === 'newest' ? 'Newest first' : sortKey === 'budget_desc' ? 'Highest budget' : 'Lowest budget'}</Text>
                    </View>
                  </View>
                </Animated.View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="compass-outline" size={26} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No campaigns found</Text>
                <Text style={styles.emptySub}>Try a different category, budget filter, or clear your search.</Text>
              </View>
            }
          />
        )}

        {/* Filters Modal */}
        <Modal visible={showFilters} animationType="slide" transparent>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <Pressable style={styles.overlay} onPress={() => setShowFilters(false)} />
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Filters</Text>

              <Text style={styles.sheetLabel}>Sort by</Text>
              <View style={styles.sheetOptions}>
                {SORTS.map(s => (
                  <Pressable key={s.key} onPress={() => setSortKey(s.key)} style={[styles.sheetOption, sortKey === s.key && styles.sheetOptionActive]}>
                    <Text style={[styles.sheetOptionText, sortKey === s.key && styles.sheetOptionTextActive]}>{s.label}</Text>
                    {sortKey === s.key && <Ionicons name="checkmark" size={16} color={colors.neon} />}
                  </Pressable>
                ))}
              </View>

              <Text style={styles.sheetLabel}>Budget range</Text>
              <View style={styles.sheetOptions}>
                {BUDGET_RANGES.map(b => (
                  <Pressable key={b.key} onPress={() => setBudgetRange(b.key)} style={[styles.sheetOption, budgetRange === b.key && styles.sheetOptionActive]}>
                    <Text style={[styles.sheetOptionText, budgetRange === b.key && styles.sheetOptionTextActive]}>{b.label}</Text>
                    {budgetRange === b.key && <Ionicons name="checkmark" size={16} color={colors.neon} />}
                  </Pressable>
                ))}
              </View>

              <Pressable onPress={() => setShowFilters(false)} style={styles.submitBtn}>
                <Text style={styles.submitBtnText}>Show results</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Bid Modal */}
        <Modal visible={!!bidTarget} animationType="slide" transparent>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <Pressable style={styles.overlay} onPress={() => setBidTarget(null)} />
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>{bidTarget?.title}</Text>
              <Text style={styles.sheetSubtitle}>Budget: {formatBudget(bidTarget?.budget, bidTarget?.budgetCurrency, bidTarget?.budgetDisclosed !== false)}</Text>

              <Text style={styles.sheetLabel}>Your bid amount (₹)</Text>
              <View style={styles.sheetInput}>
                <Ionicons name="cash-outline" size={18} color={colors.textMuted} />
                <TextInput
                  value={bidAmount}
                  onChangeText={setBidAmount}
                  placeholder="Enter your rate"
                  placeholderTextColor={colors.textSubtle}
                  keyboardType="numeric"
                  style={styles.sheetInputText}
                />
              </View>

              <Text style={styles.sheetLabel}>Pitch / Cover note</Text>
              <View style={[styles.sheetInput, { alignItems: 'flex-start', minHeight: 100, paddingTop: 14 }]}>
                <TextInput
                  value={bidPitch}
                  onChangeText={setBidPitch}
                  placeholder="Tell the brand why you're the right fit…"
                  placeholderTextColor={colors.textSubtle}
                  multiline
                  style={[styles.sheetInputText, { textAlignVertical: 'top' }]}
                />
              </View>

              <Pressable
                onPress={handleBid}
                disabled={bidding || !bidAmount.trim() || !bidPitch.trim()}
                style={({ pressed }) => [styles.submitBtn, (bidding || !bidAmount.trim() || !bidPitch.trim()) && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="flash" size={18} color="#000" />
                <Text style={styles.submitBtnText}>{bidding ? 'Submitting…' : 'Submit Application'}</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </View>
  )
}

function Tag({ text, icon }: { text: string; icon: string }) {
  return (
    <View style={styles.tag}>
      <Ionicons name={icon as any} size={10} color={colors.textMuted} />
      <Text style={styles.tagText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: spacing.lg, marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, padding: 0 },

  chipsRow: { height: 52, marginTop: 4, justifyContent: 'center' },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#000' },

  aiBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59,130,246,0.08)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, marginBottom: spacing.md },
  aiLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  aiSparkle: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(59,130,246,0.18)', alignItems: 'center', justifyContent: 'center' },
  aiBannerTitle: { color: colors.text, fontSize: 13, fontWeight: '600' },
  aiBannerSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },

  campaignCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  brandAvatarWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  brandAvatarText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  campaignTitle: { color: colors.text, fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  brandName: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  description: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: spacing.md },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.elevated, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  tagText: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  budgetLabel: { color: colors.textMuted, fontSize: 10, letterSpacing: 0.4 },
  budgetValue: { color: colors.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  urgencyPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.elevated, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  urgencyText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  applyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.neon, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  applyBtnText: { color: '#000', fontSize: 12, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, paddingBottom: spacing.xxxl, borderWidth: 1, borderBottomWidth: 0, borderColor: colors.border },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  sheetSubtitle: { color: colors.textMuted, fontSize: 13, marginTop: 4, marginBottom: spacing.xl },
  sheetLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '600', letterSpacing: 0.4, marginBottom: 8, marginTop: spacing.md },
  sheetInput: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 14 },
  sheetInputText: { flex: 1, color: colors.text, fontSize: 15, padding: 0 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.neon, borderRadius: radius.pill, paddingVertical: 16, marginTop: spacing.xl },
  submitBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },

  sheetOptions: { gap: spacing.sm },
  sheetOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.elevated },
  sheetOptionActive: { borderColor: colors.neon, backgroundColor: colors.neonSoft },
  sheetOptionText: { color: colors.text, fontSize: 14 },
  sheetOptionTextActive: { color: colors.neon, fontWeight: '700' },
})
