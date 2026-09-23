import React, { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'

export default function AffiliateScreen() {
  const [programs, setPrograms] = useState<any[]>([])
  const [links, setLinks] = useState<any[]>([])
  const [rewards, setRewards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [p, l, r] = await Promise.all([
        apiService.getAffiliatePrograms({ discover: true }),
        apiService.getAffiliateLinks(),
        apiService.getAffiliateRewards(),
      ])
      setPrograms(p?.programs || p?.data || [])
      setLinks(l?.links || l?.data || [])
      setRewards(r?.rewards || r?.data || [])
    } catch (e) { handleApiError(e, 'Failed to load affiliate data') }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const apply = async (id: string) => {
    setBusy(id)
    try {
      await apiService.applyToAffiliateProgram(id)
      Alert.alert('Submitted', 'Your application was submitted.')
      load()
    } catch (e) { handleApiError(e, 'Failed to apply') }
    finally { setBusy(null) }
  }

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.neon} />}
        data={programs}
        keyExtractor={(x) => String(x.id)}
        ListHeaderComponent={
          <View>
            <Text style={styles.heading}>Programs</Text>
            {programs.length === 0 && (
              <View style={styles.emptyWrap}>
                <Ionicons name="link-outline" size={26} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No affiliate programs available</Text>
              </View>
            )}
          </View>
        }
        ListFooterComponent={
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            <Text style={styles.heading}>My Links</Text>
            {links.length === 0 && <Text style={styles.muted}>No active links.</Text>}
            {links.map((x) => (
              <View key={x.id} style={styles.row}>
                <Text style={styles.title}>{x.code || x.id}</Text>
                <Text style={styles.meta}>{x.status || 'pending'}</Text>
              </View>
            ))}
            <Text style={styles.heading}>Commissions</Text>
            {rewards.length === 0 && <Text style={styles.muted}>No commissions yet.</Text>}
            {rewards.map((x) => (
              <View key={x.id} style={styles.row}>
                <Text style={styles.title}>₹{((Number(x.amountMinor || x.amount || 0)) / 100).toLocaleString()}</Text>
                <Text style={styles.meta}>{x.status || 'pending'}</Text>
              </View>
            ))}
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 80).duration(320)}>
            <View style={styles.card}>
              <Text style={styles.title}>{item.name || item.title || 'Affiliate program'}</Text>
              <Text style={styles.meta}>{item.description || item.rewardRule || 'Earn commissions by sharing your creator link.'}</Text>
              <Pressable disabled={!!busy} onPress={() => apply(item.id)} style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }, busy === item.id && { opacity: 0.5 }]}>
                <Text style={styles.primaryText}>{busy === item.id ? 'Applying...' : 'Apply'}</Text>
              </Pressable>
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
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  heading: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: spacing.md },
  muted: { color: colors.textMuted, fontSize: 14 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  row: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  title: { color: colors.text, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  primary: { alignSelf: 'flex-start', backgroundColor: colors.neon, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, marginTop: spacing.sm },
  primaryText: { color: '#000', fontWeight: '800' },
  emptyWrap: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyTitle: { color: colors.textMuted, fontSize: 14 },
})
