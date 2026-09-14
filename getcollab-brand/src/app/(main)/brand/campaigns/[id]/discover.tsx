import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, Alert } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'

type RouteParams = RouteProp<{ campaignDiscover: { id: string; title?: string } }, 'campaignDiscover'>

interface Creator { id: string; name: string; instagramHandle?: string; matchScore?: number; audienceSize?: number; engagementRate?: number; categories?: string[] }

export default function CampaignDiscoverScreen() {
  const route = useRoute<RouteParams>()
  const navigation = useNavigation()
  const { id: campaignId, title } = route.params || {}

  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [invitingId, setInvitingId] = useState<string | null>(null)

  const loadCreators = useCallback(async () => {
    try {
      const res = await apiService.discoverCreators({ campaignId, limit: 50 })
      const list = res?.influencers || res?.data || res?.results || []
      setCreators(Array.isArray(list) ? list : [])
    } catch (err) {
      handleApiError(err, 'Failed to load creators')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [campaignId])

  useEffect(() => {
    if (campaignId) loadCreators()
  }, [campaignId, loadCreators])

  const handleInvite = async (creator: Creator) => {
    setInvitingId(creator.id)
    try {
      await apiService.inviteCreatorToCampaign(campaignId, creator.id, `Join our campaign: ${title || ''}`)
      Alert.alert('Invited', `${creator.name} has been invited.`)
    } catch (err) {
      handleApiError(err, 'Failed to invite creator')
    } finally {
      setInvitingId(null)
    }
  }

  const renderItem = ({ item, index }: { item: Creator; index: number }) => {
    const score = item.matchScore
    const scoreColor = score != null ? (score >= 90 ? colors.success : score >= 80 ? colors.blue : colors.warning) : colors.blue
    return (
      <Animated.View entering={FadeInDown.delay(index * 50).duration(320)} style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase() || '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.handle}>{item.instagramHandle || 'Creator'}</Text>
            <Text style={styles.meta}>{item.audienceSize ? `${(item.audienceSize / 1000).toFixed(1)}K followers` : ''} {item.engagementRate ? `· ${item.engagementRate.toFixed(1)}% eng` : ''}</Text>
          </View>
          {score != null && (
            <View style={[styles.scorePill, { borderColor: scoreColor + '55' }]}>
              <View style={[styles.scoreDot, { backgroundColor: scoreColor }]} />
              <Text style={[styles.scoreText, { color: scoreColor }]}>{score}</Text>
            </View>
          )}
        </View>
        <Pressable
          style={({ pressed }) => [styles.inviteBtn, invitingId === item.id && { opacity: 0.6 }, pressed && { opacity: 0.85 }]}
          onPress={() => handleInvite(item)}
          disabled={invitingId === item.id}
        >
          <Text style={styles.inviteBtnText}>{invitingId === item.id ? 'Inviting…' : 'Invite to Campaign'}</Text>
        </Pressable>
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
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <FlatList
          data={creators}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.title}>Discover Creators</Text>
              <Text style={styles.subtitle}>Find creators for {title || 'this campaign'}</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="search" size={26} color={colors.textMuted} /></View>
              <Text style={styles.emptyTitle}>No matches yet</Text>
              <Text style={styles.emptySub}>Try browsing all creators from the Creators tab.</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadCreators() }} tintColor={colors.neon} />}
        />
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: spacing.md, marginBottom: spacing.md },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },

  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  name: { color: '#fff', fontSize: 16, fontWeight: '700' },
  handle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  meta: { color: colors.textSubtle, fontSize: 11, marginTop: 2 },
  scorePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  scoreDot: { width: 6, height: 6, borderRadius: 3 },
  scoreText: { fontSize: 13, fontWeight: '700' },

  inviteBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue, borderRadius: radius.pill, paddingVertical: 12, marginTop: spacing.md },
  inviteBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13 },
})
