import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import { colors, radius, spacing, STATUS_COLORS } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import * as Haptics from 'expo-haptics'

type RouteParams = RouteProp<{ campaignOutreach: { id: string; title?: string } }, 'campaignOutreach'>

interface OutreachItem { id: string; creatorName: string; channel: string; status: string; sentAt: string }


export default function CampaignOutreachScreen() {
  const route = useRoute<RouteParams>()
  const navigation = useNavigation()
  const { id: campaignId, title } = route.params || {}

  const [items, setItems] = useState<OutreachItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadOutreach = useCallback(async () => {
    try {
      const [invitesRes, dealsRes] = await Promise.all([
        apiService.getBrandInvites({ campaignId }).catch(() => null),
        apiService.getAllDeals({ campaignId }).catch(() => null),
      ])
      const mapped: OutreachItem[] = []
      const invites = invitesRes?.invites || invitesRes?.data || []
      ;(Array.isArray(invites) ? invites : []).forEach((i: any) => {
        mapped.push({
          id: `invite-${i.id}`,
          creatorName: i.influencerName || i.influencer?.name || 'Creator',
          channel: 'Invite',
          status: i.status === 'pending' ? 'sent' : i.status === 'accepted' ? 'replied' : 'failed',
          sentAt: i.createdAt,
        })
      })
      const deals = dealsRes || []
      ;(Array.isArray(deals) ? deals : []).forEach((d: any) => {
        mapped.push({
          id: `deal-${d.id}`,
          creatorName: d.influencer?.name || d.influencerName || 'Creator',
          channel: 'Collaboration',
          status: d.status === 'active' ? 'replied' : d.status === 'pending' ? 'sent' : 'delivered',
          sentAt: d.createdAt,
        })
      })
      setItems(mapped)
    } catch (err) {
      handleApiError(err, "Couldn't load outreach")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [campaignId])

  useEffect(() => {
    if (campaignId) loadOutreach()
  }, [campaignId, loadOutreach])

  const renderItem = ({ item, index }: { item: OutreachItem; index: number }) => {
    const st = item.status || 'sent'
    const s = STATUS_COLORS[st] || STATUS_COLORS.sent
    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 80).duration(320)} style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.creatorName}</Text>
            <Text style={styles.meta}>{item.channel} · {new Date(item.sentAt).toLocaleDateString()}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.fg }]}>{st.charAt(0).toUpperCase() + st.slice(1)}</Text>
          </View>
        </View>
      </Animated.View>
    )
  }

  if (loading && !refreshing) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.title}>Outreach</Text>
              <Text style={styles.subtitle}>Invites and collaborations for {title || 'this campaign'}</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="send-outline" size={26} color={colors.textMuted} /></View>
              <Text style={styles.emptyTitle}>No outreach yet</Text>
              <Text style={styles.emptySub}>Invite creators from the Discover tab.</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRefreshing(true); loadOutreach() }} tintColor={colors.primary} />}
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  name: { color: '#fff', fontSize: 16, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13 },
})
