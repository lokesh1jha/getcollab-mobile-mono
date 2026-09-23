import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, Clipboard } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, RouteProp } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import type { AffiliateLink } from '@shared/types'

type RouteParams = RouteProp<{ affiliateLinks: { programId?: string } }, 'affiliateLinks'>

export default function AffiliateLinksScreen() {
  const route = useRoute<RouteParams>()
  const { programId } = route.params || {}

  const [links, setLinks] = useState<AffiliateLink[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadLinks = useCallback(async () => {
    try {
      const res = await apiService.getAffiliateLinks()
      const list = res?.links || res?.data || []
      const all = Array.isArray(list) ? list : []
      setLinks(programId ? all.filter((l: AffiliateLink) => l.programId === programId) : all)
    } catch (err) {
      handleApiError(err, 'Failed to load links')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [programId])

  useEffect(() => {
    loadLinks()
  }, [loadLinks])

  const copyToClipboard = (url: string) => {
    Clipboard.setString(url)
    handleApiError({ message: 'Copied to clipboard' } as any, 'Copied to clipboard')
  }

  const renderItem = ({ item, index }: { item: AffiliateLink; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(320)} style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.code}>{item.code}</Text>
        <Text style={styles.url} numberOfLines={1}>{item.url}</Text>
        <Text style={styles.meta}>Status: {item.status}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Copy link" style={({ pressed }) => [styles.copyBtn, pressed && { opacity: 0.85 }]} onPress={() => copyToClipboard(item.url)}>
        <Ionicons name="copy-outline" size={18} color={colors.textMuted} />
      </Pressable>
    </Animated.View>
  )

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
          data={links}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.title}>Affiliate Links</Text>
              <Text style={styles.subtitle}>{links.length} active link{links.length !== 1 ? 's' : ''}</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="link-outline" size={26} color={colors.textMuted} /></View>
              <Text style={styles.emptyTitle}>No links yet</Text>
              <Text style={styles.emptySub}>Links are generated when creators join your programs.</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadLinks() }} tintColor={colors.neon} />}
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

  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  code: { color: '#fff', fontSize: 16, fontWeight: '700' },
  url: { color: colors.blue, fontSize: 13, marginTop: 2 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  copyBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.elevated },

  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13 },
})
