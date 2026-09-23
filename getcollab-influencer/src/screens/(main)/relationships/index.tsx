import React, { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import * as Haptics from 'expo-haptics'

interface Relationship {
  id: string
  otherParty?: { name?: string; image?: string }
  brandName?: string
  totalCollaborations?: number
  lastCampaign?: string
}

export default function RelationshipsScreen() {
  const [items, setItems] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await apiService.getRelationships()
      setItems(r?.relationships || r?.data || [])
    } catch (e) { handleApiError(e, 'Failed to load relationships') }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.center}><ActivityIndicator color={colors.neon} /></View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <FlatList
        style={styles.root}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRefreshing(true); load() }} tintColor={colors.neon} />}
        data={items}
        keyExtractor={(x) => String(x.id)}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            <Text style={styles.heading}>Brand Relationships</Text>
            <Text style={styles.subheading}>Track your ongoing brand partnerships</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}><Ionicons name="people-outline" size={26} color={colors.textMuted} /></View>
            <Text style={styles.emptyTitle}>No relationships yet</Text>
            <Text style={styles.emptySub}>Your brand relationships will appear here after accepted collaborations.</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 80).duration(320)}>
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(item.otherParty?.name || item.brandName || 'B').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.otherParty?.name || item.brandName || 'Brand'}</Text>
                  <Text style={styles.meta}>{item.totalCollaborations || 0} collaborations{item.lastCampaign ? ` · ${item.lastCampaign}` : ''}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
              </View>
            </View>
          </Animated.View>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.lg, flexGrow: 1 },
  heading: { color: colors.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  subheading: { color: colors.textMuted, fontSize: 14, marginTop: 2, marginBottom: spacing.md },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  emptyWrap: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: spacing.xl },
})
