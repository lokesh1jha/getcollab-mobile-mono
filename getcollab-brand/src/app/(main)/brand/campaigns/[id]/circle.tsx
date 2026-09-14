import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'

type RouteParams = RouteProp<{ campaignCircle: { id: string; title?: string } }, 'campaignCircle'>

interface Member { id: string; name: string; instagramHandle?: string; status: string; image?: string }

const STATUS_COLORS: Record<string, { fg: string; bg: string }> = {
  invited: { fg: '#F59E0B', bg: 'rgba(245,158,11,0.14)' },
  accepted: { fg: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  active: { fg: '#3B82F6', bg: 'rgba(59,130,246,0.14)' },
  completed: { fg: '#A1A1AA', bg: 'rgba(161,161,170,0.12)' },
}

export default function CampaignCircleScreen() {
  const route = useRoute<RouteParams>()
  const navigation = useNavigation()
  const { id: campaignId, title } = route.params || {}

  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadCircle = useCallback(async () => {
    try {
      const res = await apiService.getDeals({ campaignId })
      const list = res?.deals || res?.data || res?.collabs || []
      const mapped = (Array.isArray(list) ? list : []).map((d: any) => ({
        id: d.id,
        name: d.influencer?.name || d.influencerName || 'Creator',
        instagramHandle: d.influencer?.instagramHandle || d.influencerHandle,
        status: d.status || 'invited',
        image: d.influencer?.image,
      }))
      setMembers(mapped)
    } catch (err) {
      handleApiError(err, 'Failed to load circle')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [campaignId])

  useEffect(() => {
    if (campaignId) loadCircle()
  }, [campaignId, loadCircle])

  const renderItem = ({ item, index }: { item: Member; index: number }) => {
    const st = item.status || 'invited'
    const s = STATUS_COLORS[st] || STATUS_COLORS.invited
    const initial = item.name?.charAt(0).toUpperCase() || '?'
    return (
      <Animated.View entering={FadeInDown.delay(index * 40).duration(320)}>
        <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            {item.instagramHandle && <Text style={styles.handle}>@{item.instagramHandle}</Text>}
          </View>
          <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.fg }]}>{st.charAt(0).toUpperCase() + st.slice(1)}</Text>
          </View>
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
          data={members}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.title}>Creator Circle</Text>
              <Text style={styles.subtitle}>{members.length} creators in {title || 'this campaign'}</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="people-outline" size={26} color={colors.textMuted} /></View>
              <Text style={styles.emptyTitle}>No creators yet</Text>
              <Text style={styles.emptySub}>Invite creators from the Discover tab.</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadCircle() }} tintColor={colors.neon} />}
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

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  name: { color: '#fff', fontSize: 15, fontWeight: '600' },
  handle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },

  divider: { height: 1, backgroundColor: colors.border },

  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13 },
})
