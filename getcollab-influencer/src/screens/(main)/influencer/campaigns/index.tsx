import React, { useState, useCallback, useMemo } from 'react'
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator, Modal, Alert } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing, statusColor } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import { InfluencerNavigationProp } from '@/src/types/navigation'

const FILTERS = ['All', 'applied', 'accepted', 'completed', 'rejected']
const SORTS = [
  { key: 'newest', label: 'Newest' },
  { key: 'budget_desc', label: 'Budget: High-Low' },
  { key: 'budget_asc', label: 'Budget: Low-High' },
]

interface Bid {
  id: string
  campaignTitle?: string
  campaignId?: string
  status: string
  amount?: number
  createdAt?: string
  campaign?: {
    id?: string
    title?: string
    brand?: { name?: string; image?: string }
    brandName?: string
    budget?: number
    budgetCurrency?: string
    budgetDisclosed?: boolean
    status?: string
    collaborationId?: string | null
  }
}
function formatBudget(n?: number, currency?: string, disclosed = true): string {
  if (!disclosed || n == null) return 'Undisclosed'
  const c = currency || 'INR'
  if (n >= 100000) return `${c === 'INR' ? '₹' : '$'}${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `${c === 'INR' ? '₹' : '$'}${(n / 1000).toFixed(0)}K`
  return `${c === 'INR' ? '₹' : '$'}${n}`
}

function formatDate(d?: string): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }
  catch { return d }
}

export default function InfluencerCampaigns({ navigation }: { navigation: InfluencerNavigationProp }) {
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState('All')
  const [sortKey, setSortKey] = useState('newest')
  const [query, setQuery] = useState('')
  const [showSort, setShowSort] = useState(false)

  const load = useCallback(async (spinner = false) => {
    if (spinner) setLoading(true)
    try {
      const params: Record<string, any> = { sort: sortKey }
      if (filter !== 'All') params.status = filter
      const res = await apiService.getBids(params)
      const list: Bid[] = res?.data || res?.bids || (Array.isArray(res) ? res : [])
      setBids(Array.isArray(list) ? list : [])
    } catch (err: any) {
      handleApiError(err, 'Failed to load bids')
    } finally { setLoading(false); setRefreshing(false) }
  }, [filter, sortKey])

  useFocusEffect(useCallback(() => { load() }, [load]))
  const onRefresh = () => { setRefreshing(true); load(false) }

  const filtered = useMemo(() => {
    let list = bids
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(b =>
        (b.campaignTitle || b.campaign?.title || '').toLowerCase().includes(q) ||
        (b.campaign?.brand?.name || b.campaign?.brandName || '').toLowerCase().includes(q)
      )
    }
    // client-side sort fallback if API doesn't sort
    if (sortKey === 'budget_desc') {
      list = [...list].sort((a, b) => (b.campaign?.budget ?? 0) - (a.campaign?.budget ?? 0))
    } else if (sortKey === 'budget_asc') {
      list = [...list].sort((a, b) => (a.campaign?.budget ?? 0) - (b.campaign?.budget ?? 0))
    }
    return list
  }, [bids, filter, query, sortKey])

  const renderBid = ({ item, index }: { item: Bid; index: number }) => {
    const s = statusColor(item.status)
    const title = item.campaignTitle || item.campaign?.title || 'Campaign'
    const brand = item.campaign?.brand?.name || item.campaign?.brandName || 'Brand'
    const date = item.createdAt ? formatDate(item.createdAt) : '—'
    const isAccepted = item.status === 'accepted'
    const collabId = item.campaign?.collaborationId
    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 80).duration(320)} style={styles.card}>
        <Pressable
          onPress={() => {
            if (isAccepted && collabId) {
              navigation?.navigate('Collaborations')
            } else {
              navigation?.navigate('CampaignDetails', { id: item.campaignId || item.campaign?.id || '' })
            }
          }}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
              <Text style={styles.cardBrand}>{brand}</Text>
              <Text style={styles.cardDate}>Applied {date}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
              <Text style={[styles.statusText, { color: s.fg }]}>{item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.bidLabel}>Budget</Text>
              <Text style={styles.bidAmount}>{formatBudget(item.campaign?.budget, item.campaign?.budgetCurrency, item.campaign?.budgetDisclosed !== false)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {isAccepted && collabId && (
                <View style={styles.collabPill}>
                  <Text style={styles.collabPillText}>Collaboration</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
            </View>
          </View>
        </Pressable>
      </Animated.View>
    )
  }

  if (loading) return (
    <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={colors.neon} />
    </View>
  )

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>My Bids</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Filters" onPress={() => setShowSort(true)} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.85 }]}>
            <Ionicons name="funnel-outline" size={18} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search campaigns…" placeholderTextColor={colors.textSubtle} style={styles.searchInput} />
          {query.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.85 }}><Ionicons name="close-circle" size={18} color={colors.textMuted} /></Pressable>}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
          {FILTERS.map(f => {
            const active = f === filter
            return (
              <Pressable key={f} onPress={() => setFilter(f)} style={({ pressed }) => [styles.filterChip, active && styles.filterChipActive, pressed && { opacity: 0.85 }]}>
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
              </Pressable>
            )
          })}
        </ScrollView>

        <FlatList
          data={filtered}
          renderItem={renderBid}
          keyExtractor={b => b.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neon} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="document-text-outline" size={26} color={colors.textMuted} /></View>
              <Text style={styles.emptyTitle}>{filter === 'All' ? 'No bids yet' : `No ${filter} bids`}</Text>
              <Text style={styles.emptySub}>{filter === 'All' ? 'Discover campaigns and apply to start earning.' : 'Try a different filter.'}</Text>
              {filter === 'All' && (
                <Pressable onPress={() => navigation?.navigate('Discover')} style={({ pressed }) => [styles.discoverBtn, pressed && { opacity: 0.85 }]}>
                  <Text style={styles.discoverBtnText}>Find Campaigns</Text>
                </Pressable>
              )}
            </View>
          }
        />

        {/* Sort Modal */}
        {showSort && (
          <Modal transparent animationType="fade">
            <Pressable style={styles.overlay} onPress={() => setShowSort(false)} />
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Sort by</Text>
              {SORTS.map(s => (
                <Pressable key={s.key} onPress={() => { setSortKey(s.key); setShowSort(false) }} style={({ pressed }) => [styles.sheetOption, sortKey === s.key && styles.sheetOptionActive, pressed && { opacity: 0.85 }]}>
                  <Text style={[styles.sheetOptionText, sortKey === s.key && styles.sheetOptionTextActive]}>{s.label}</Text>
                  {sortKey === s.key && <Ionicons name="checkmark" size={16} color={colors.neon} />}
                </Pressable>
              ))}
            </View>
          </Modal>
        )}
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: spacing.lg, marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, padding: 0 },
  filterChip: { height: 32, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { backgroundColor: colors.text, borderColor: colors.text },
  filterChipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: '#000' },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  cardBrand: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  cardDate: { color: colors.textSubtle, fontSize: 12, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  bidLabel: { color: colors.textMuted, fontSize: 10, letterSpacing: 0.4 },
  bidAmount: { color: colors.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  collabPill: { backgroundColor: colors.successSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  collabPillText: { color: colors.success, fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: spacing.xl },
  discoverBtn: { marginTop: spacing.md, backgroundColor: colors.neon, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill },
  discoverBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, paddingBottom: spacing.xxxl, borderWidth: 1, borderBottomWidth: 0, borderColor: colors.border },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  sheetOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetOptionActive: {},
  sheetOptionText: { color: colors.text, fontSize: 15 },
  sheetOptionTextActive: { color: colors.neon, fontWeight: '700' },
})
