import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { colors, spacing, CATEGORIES } from '@shared/constants'
import { Card, Button } from '@shared/components/ui'
import { TrialGuard } from '../../../../components/TrialGuard'
import apiService, { handleApiError } from '@shared/services/api'

interface Creator {
  id: string
  name: string
  avatar?: string
  image?: string
  bio?: string
  location?: string
  categories?: string[]
  audienceSize?: number
  engagementRate?: number
  verified?: boolean
  instagramHandle?: string
  instagramMetrics?: { followers?: number }
}

interface Props {
  navigation?: any
}

export default function BrowseCreatorsScreen({ navigation }: Props) {
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const loadCreators = useCallback(async () => {
    try {
      const params: Record<string, any> = {}
      if (searchQuery.trim()) params.q = searchQuery.trim()
      if (selectedCategory) params.category = selectedCategory
      const response = await apiService.getInfluencers(params)
      const list = response?.data || response?.influencers || (Array.isArray(response) ? response : [])
      setCreators(Array.isArray(list) ? list : [])
    } catch (err) {
      handleApiError(err, 'Failed to load creators')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedCategory])

  useEffect(() => {
    loadCreators()
  }, [loadCreators])

  useFocusEffect(
    useCallback(() => {
      loadCreators()
    }, [loadCreators])
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await loadCreators()
    setRefreshing(false)
  }

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return creators
    const q = searchQuery.toLowerCase()
    return creators.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.bio?.toLowerCase().includes(q) ||
        c.instagramHandle?.toLowerCase().includes(q) ||
        c.categories?.some((cat) => cat.toLowerCase().includes(q))
    )
  }, [creators, searchQuery])

  const handleStartChat = async (creator: Creator) => {
    try {
      const room = await apiService.createDirectChat(creator.id)
      const roomId = room?.id || room?.data?.id
      navigation?.navigate('ChatDetail', { roomId, chat: { id: roomId, influencerName: creator.name } })
    } catch (err) {
      handleApiError(err, 'Failed to start chat')
    }
  }

  const renderCreator = ({ item }: { item: Creator }) => {
    const followers = item.audienceSize || item.instagramMetrics?.followers || 0
    return (
      <Card style={styles.card}>
        <TouchableOpacity
          onPress={() => navigation?.navigate('CreatorProfile', { creatorId: item.id, creator: item })}
          activeOpacity={0.85}
        >
          <View style={styles.row}>
            <View style={styles.avatarWrap}>
              {item.avatar || item.image ? (
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase()}</Text>
                </View>
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase() || '?'}</Text>
                </View>
              )}
            </View>
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.verified ? <Text style={styles.verified}> ✓</Text> : null}
              </View>
              {item.instagramHandle ? <Text style={styles.handle}>@{item.instagramHandle}</Text> : null}
              {item.location ? <Text style={styles.location}>📍 {item.location}</Text> : null}
              <View style={styles.statRow}>
                {followers > 0 && (
                  <Text style={styles.stat}>
                    {followers >= 1000 ? `${(followers / 1000).toFixed(1)}K` : followers} followers
                  </Text>
                )}
                {item.engagementRate ? <Text style={styles.stat}>{item.engagementRate.toFixed(1)}% eng.</Text> : null}
              </View>
            </View>
          </View>

          {item.bio ? <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text> : null}

          {(item.categories?.length || 0) > 0 && (
            <View style={styles.tagRow}>
              {item.categories!.slice(0, 3).map((cat) => (
                <View key={cat} style={styles.tag}>
                  <Text style={styles.tagText}>{cat}</Text>
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.actions}>
          <Button title="Message" variant="outline" size="sm" onPress={() => handleStartChat(item)} style={styles.actionBtn} />
          <Button
            title="Invite to Campaign"
            size="sm"
            onPress={() => navigation?.navigate('InviteCreator', { creatorId: item.id, creator: item })}
            style={styles.actionBtn}
          />
        </View>
      </Card>
    )
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <TrialGuard feature="influencer:unlimited-search">
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filtered}
        renderItem={renderCreator}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.title}>Browse Creators</Text>
              <Text style={styles.subtitle}>Find creators and invite them directly to your campaigns</Text>
            </View>

            <TextInput
              style={styles.search}
              placeholder="Search by name, handle, category..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, !selectedCategory && styles.chipActive]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[styles.chipText, !selectedCategory && styles.chipTextActive]}>All</Text>
              </TouchableOpacity>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, selectedCategory === cat && styles.chipActive]}
                  onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                >
                  <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.resultCount}>{filtered.length} creator{filtered.length === 1 ? '' : 's'}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No creators found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search or category filter</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      />
    </SafeAreaView>
    </TrialGuard>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  header: { marginBottom: spacing.md },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  search: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  chipRow: { gap: spacing.sm, paddingBottom: spacing.md },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { color: colors.white },
  resultCount: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  card: { padding: spacing.md, marginBottom: spacing.md },
  row: { flexDirection: 'row', marginBottom: spacing.sm },
  avatarWrap: { marginRight: spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: colors.white, fontSize: 22, fontWeight: 'bold' },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  verified: { color: colors.primary, fontSize: 14 },
  handle: { fontSize: 13, color: colors.primary, marginTop: 2 },
  location: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  statRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  stat: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  bio: { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginVertical: spacing.sm },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  tag: { backgroundColor: `${colors.accent}20`, borderRadius: 12, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  tagText: { color: colors.accent, fontSize: 11, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: { flex: 1 },
  emptyState: { alignItems: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  emptySubtext: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
})
