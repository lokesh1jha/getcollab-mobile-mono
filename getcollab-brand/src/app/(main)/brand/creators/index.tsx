import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, TextInput, ScrollView } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { TrialGuard } from '../../../../components/TrialGuard'
import apiService, { handleApiError } from '@shared/services/api'

interface Creator { id: string; name: string; avatar?: string; image?: string; bio?: string; location?: string; categories?: string[]; audienceSize?: number; engagementRate?: number; verified?: boolean; instagramHandle?: string; instagramMetrics?: { followers?: number }; matchScore?: number }
interface Props { navigation?: any }

const CATEGORIES = ['All', 'Skincare', 'Fashion', 'Fitness', 'Tech', 'Travel', 'Food', 'Beauty']

export default function BrowseCreatorsScreen({ navigation }: Props) {
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [shortlisted, setShortlisted] = useState<Record<string, boolean>>({})

  const loadCreators = useCallback(async () => {
    try {
      const params: Record<string, any> = {}
      if (searchQuery.trim()) params.q = searchQuery.trim()
      if (selectedCategory) params.category = selectedCategory
      const response = await apiService.getMarketplace(params)
      const list = response?.influencers || response?.data || (Array.isArray(response) ? response : [])
      setCreators(Array.isArray(list) ? list : [])
    } catch (err) { handleApiError(err, 'Failed to load creators') }
    finally { setLoading(false) }
  }, [searchQuery, selectedCategory])

  useEffect(() => { loadCreators() }, [loadCreators])
  useFocusEffect(useCallback(() => { loadCreators() }, [loadCreators]))

  const onRefresh = async () => { setRefreshing(true); await loadCreators(); setRefreshing(false) }

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return creators
    const q = searchQuery.toLowerCase()
    return creators.filter((c) => c.name?.toLowerCase().includes(q) || c.bio?.toLowerCase().includes(q) || c.instagramHandle?.toLowerCase().includes(q) || c.categories?.some((cat) => cat.toLowerCase().includes(q)))
  }, [creators, searchQuery])

  const handleStartChat = async (creator: Creator) => {
    try {
      const room = await apiService.createDirectChat(creator.id)
      const roomId = room?.id || room?.data?.id
      navigation?.navigate('ChatDetail', { roomId, chat: { id: roomId, influencerName: creator.name } })
    } catch (err) { handleApiError(err, 'Failed to start chat') }
  }

  const renderCreator = ({ item, index }: { item: Creator; index: number }) => {
    const followers = item.audienceSize || item.instagramMetrics?.followers || 0
    const score = item.matchScore
    const scoreColor = score != null ? (score >= 90 ? colors.success : score >= 80 ? colors.blue : colors.warning) : colors.blue
    return (
      <Animated.View entering={FadeInDown.delay(index * 60).duration(320)} style={styles.creatorCard}>
        <View style={styles.creatorTopRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase() || '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.creatorName} numberOfLines={1}>{item.name}</Text>
              {item.verified && <Ionicons name="checkmark-circle" size={14} color={colors.blue} />}
            </View>
            <Text style={styles.creatorHandle}>{item.instagramHandle || 'Creator'}</Text>
          </View>
          {score != null && (
            <View style={[styles.matchPill, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: scoreColor + '55' }]}>
              <View style={[styles.scoreDot, { backgroundColor: scoreColor }]} />
              <Text style={[styles.matchScore, { color: scoreColor }]}>{score}</Text>
              <Text style={styles.matchLabel}>match</Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{followers >= 1000 ? `${(followers / 1000).toFixed(1)}K` : followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{item.engagementRate ? `${item.engagementRate.toFixed(1)}%` : '—'}</Text>
            <Text style={styles.statLabel}>Eng.</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{item.location?.split(',')[0] || '—'}</Text>
            <Text style={styles.statLabel}>Location</Text>
          </View>
        </View>

        <View style={styles.creatorBottom}>
          <View style={styles.priceWrap}>
            <Text style={styles.priceLabel}>Range</Text>
            <Text style={styles.priceValue}>Variable</Text>
          </View>
          <View style={styles.creatorActions}>
            <Pressable style={({ pressed }) => [styles.viewBtn, pressed && { opacity: 0.85 }]} onPress={() => navigation?.navigate('InviteCreator', { creatorId: item.id, creator: item })}>
              <Text style={styles.viewBtnText}>Invite</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.viewBtn, styles.messageBtn, pressed && { opacity: 0.85 }]} onPress={() => handleStartChat(item)}>
              <Text style={styles.viewBtnText}>Message</Text>
            </Pressable>
            <Pressable
              onPress={() => setShortlisted((s) => ({ ...s, [item.id]: !s[item.id] }))}
              style={({ pressed }) => [styles.shortlistBtn, shortlisted[item.id] && styles.shortlistBtnActive, pressed && { opacity: 0.75 }]}
            >
              <Ionicons name={shortlisted[item.id] ? 'bookmark' : 'bookmark-outline'} size={16} color={shortlisted[item.id] ? '#000' : '#fff'} />
            </Pressable>
          </View>
        </View>
      </Animated.View>
    )
  }

  if (loading && !refreshing) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.neon} />
      </View>
    )
  }

  return (
    <TrialGuard feature="influencer:unlimited-search">
      <View style={styles.root}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <FlatList
            data={filtered}
            renderItem={renderCreator}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
            ListHeaderComponent={
              <View>
                <View style={styles.header}>
                  <Text style={styles.title}>Creators</Text>
                  <Pressable style={styles.iconBtn}>
                    <Ionicons name="options-outline" size={20} color="#fff" />
                  </Pressable>
                </View>

                <View style={styles.searchWrap}>
                  <Ionicons name="search" size={18} color={colors.textMuted} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search by name, handle, category..."
                    placeholderTextColor={colors.textSubtle}
                    style={styles.searchInput}
                  />
                  {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </Pressable>
                  )}
                </View>

                <View style={styles.chipsRow}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                    {CATEGORIES.map((cat) => {
                      const active = (!selectedCategory && cat === 'All') || cat === selectedCategory
                      return (
                        <Pressable key={cat} onPress={() => setSelectedCategory(cat === 'All' ? null : cat)} style={[styles.chip, active && styles.chipActive]}>
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat}</Text>
                        </Pressable>
                      )
                    })}
                  </ScrollView>
                </View>

                <Animated.View entering={FadeIn.duration(360)} style={styles.aiBanner}>
                  <View style={styles.aiBannerLeft}>
                    <View style={styles.aiSparkle}>
                      <Ionicons name="sparkles" size={14} color={colors.blue} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.aiBannerTitle}>AI found creators matching your needs</Text>
                      <Text style={styles.aiBannerSub}>{filtered.length} creators found</Text>
                    </View>
                  </View>
                  <Pressable style={styles.aiBannerCta}>
                    <Text style={styles.aiBannerCtaText}>View</Text>
                  </Pressable>
                </Animated.View>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}><Ionicons name="search" size={26} color={colors.textMuted} /></View>
                <Text style={styles.emptyTitle}>No creators found</Text>
                <Text style={styles.emptySub}>Try adjusting your search or category filter.</Text>
              </View>
            }
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neon} />}
          />
        </SafeAreaView>
      </View>
    </TrialGuard>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.lg, paddingVertical: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, padding: 0 },

  chipsRow: { height: 50, justifyContent: 'center', marginTop: 4 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: '#fff', borderColor: '#fff' },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#000' },

  aiBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(59,130,246,0.08)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.35)', borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: 10, marginBottom: spacing.md },
  aiBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  aiSparkle: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(59,130,246,0.18)', alignItems: 'center', justifyContent: 'center' },
  aiBannerTitle: { color: '#fff', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  aiBannerSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  aiBannerCta: { backgroundColor: colors.blue, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  aiBannerCtaText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  creatorCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  creatorTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  creatorName: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  creatorHandle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  matchPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  scoreDot: { width: 6, height: 6, borderRadius: 3 },
  matchScore: { fontSize: 13, fontWeight: '700' },
  matchLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },

  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: radius.md, paddingVertical: spacing.md, marginTop: spacing.md, borderWidth: 1, borderColor: colors.border },
  statBlock: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 24, backgroundColor: colors.border },
  statValue: { color: '#fff', fontSize: 14, fontWeight: '700' },
  statLabel: { color: colors.textMuted, fontSize: 10, marginTop: 2, letterSpacing: 0.3 },

  creatorBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  priceWrap: {},
  priceLabel: { color: colors.textMuted, fontSize: 10, letterSpacing: 0.4 },
  priceValue: { color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 2 },
  creatorActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.borderStrong },
  messageBtn: { backgroundColor: colors.blue, borderColor: colors.blue },
  viewBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  shortlistBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  shortlistBtnActive: { backgroundColor: colors.neon, borderColor: colors.neon },

  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13 },
})
