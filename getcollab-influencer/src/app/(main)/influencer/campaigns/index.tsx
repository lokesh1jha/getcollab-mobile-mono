import React, { useState, useCallback, useMemo } from 'react'
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing, statusColor } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'

const FILTERS = ['All', 'applied', 'accepted', 'completed', 'rejected']

interface Bid { id: string; campaignTitle?: string; campaignId?: string; status: string; amount: number; createdAt?: string; campaign?: any }

export default function InfluencerCampaigns({ navigation }: any) {
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')

  const load = useCallback(async (spinner = false) => {
    if (spinner) setLoading(true)
    try {
      const res = await apiService.getBids()
      const list: Bid[] = res?.data || res?.bids || (Array.isArray(res) ? res : [])
      setBids(Array.isArray(list) ? list : [])
    } catch (err: any) {
      handleApiError(err, 'Failed to load bids')
    } finally { setLoading(false); setRefreshing(false) }
  }, [])

  useFocusEffect(useCallback(() => { load(true) }, [load]))
  const onRefresh = () => { setRefreshing(true); load(false) }

  const filtered = useMemo(() => {
    let list = filter === 'All' ? bids : bids.filter(b => b.status === filter)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(b => (b.campaignTitle || b.campaign?.title || '').toLowerCase().includes(q))
    }
    return list
  }, [bids, filter, query])

  const renderBid = ({ item, index }: { item: Bid; index: number }) => {
    const s = statusColor(item.status)
    const title = item.campaignTitle || item.campaign?.title || 'Campaign'
    const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'
    return (
      <Animated.View entering={FadeInDown.delay(index * 40).duration(320)} style={styles.card}>
        <Pressable
          onPress={() => navigation?.navigate('CampaignDetails', { id: item.campaignId || item.campaign?.id, campaign: item.campaign })}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
              <Text style={styles.cardDate}>Applied {date}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
              <Text style={[styles.statusText, { color: s.fg }]}>{item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.bidLabel}>Your bid</Text>
              <Text style={styles.bidAmount}>₹{Number(item.amount || 0).toLocaleString()}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
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
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search campaigns…" placeholderTextColor={colors.textSubtle} style={styles.searchInput} />
          {query.length > 0 && <Pressable onPress={() => setQuery('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={colors.textMuted} /></Pressable>}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
          {FILTERS.map(f => {
            const active = f === filter
            return (
              <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
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
                <Pressable onPress={() => navigation?.navigate('Discover')} style={styles.discoverBtn}>
                  <Text style={styles.discoverBtnText}>Find Campaigns</Text>
                </Pressable>
              )}
            </View>
          }
        />
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: spacing.lg, marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, padding: 0 },
  chip: { height: 32, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#000' },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  cardDate: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  bidLabel: { color: colors.textMuted, fontSize: 10, letterSpacing: 0.4 },
  bidAmount: { color: colors.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: spacing.xl },
  discoverBtn: { marginTop: spacing.md, backgroundColor: colors.neon, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill },
  discoverBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
})
