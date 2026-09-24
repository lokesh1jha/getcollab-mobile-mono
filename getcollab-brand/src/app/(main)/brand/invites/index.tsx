import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator, Alert } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing, STATUS_COLORS } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import type { BrandInvite } from '@shared/types'
import * as Haptics from 'expo-haptics'


interface Props {
  navigation?: any
}

export default function InvitesScreen({ navigation }: Props) {
  const [invites, setInvites] = useState<BrandInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const loadInvites = useCallback(async () => {
    try {
      const res = await apiService.getBrandInvites()
      const list = res?.invites || res?.data || []
      setInvites(Array.isArray(list) ? list : [])
    } catch (err) {
      handleApiError(err, 'Failed to load invites')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadInvites()
    }, [loadInvites])
  )

  const handleCancel = async (invite: BrandInvite) => {
    Alert.alert('Cancel invite?', `Cancel invite to ${invite.influencerName || 'this creator'}?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel invite',
        style: 'destructive',
        onPress: async () => {
          setCancellingId(invite.id)
          try {
            await apiService.cancelBrandInvite(invite.id)
            setInvites((prev) => prev.map((i) => (i.id === invite.id ? { ...i, status: 'cancelled' } : i)))
          } catch (err) {
            handleApiError(err, 'Failed to cancel invite')
          } finally {
            setCancellingId(null)
          }
        },
      },
    ])
  }

  const renderItem = ({ item, index }: { item: BrandInvite; index: number }) => {
    const st = item.status || 'pending'
    const s = STATUS_COLORS[st] || STATUS_COLORS.pending
    const isCancelling = cancellingId === item.id

    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 80).duration(320)} style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.influencerName}>{item.influencerName || 'Creator'}</Text>
            {item.campaignTitle && <Text style={styles.campaignTitle}>{item.campaignTitle}</Text>}
            <Text style={styles.date}>Sent: {new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.fg }]}>{st.charAt(0).toUpperCase() + st.slice(1)}</Text>
          </View>
        </View>
        {item.message && <Text style={styles.message} numberOfLines={2}>{item.message}</Text>}
        {st === 'pending' && (
          <Pressable
            style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.85 }]}
            onPress={() => handleCancel(item)}
            disabled={isCancelling}
          >
            <Text style={styles.cancelBtnText}>{isCancelling ? 'Cancelling…' : 'Cancel invite'}</Text>
          </Pressable>
        )}
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
          data={invites}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.title}>Invites</Text>
              <Text style={styles.subtitle}>Campaign invites you've sent</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="mail-outline" size={26} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No invites yet</Text>
              <Text style={styles.emptySub}>Invite creators from the Creators tab.</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRefreshing(true); loadInvites() }} tintColor={colors.primary} />}
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  influencerName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  campaignTitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  date: { color: colors.textSubtle, fontSize: 11, marginTop: 4 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  message: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginTop: spacing.sm },
  cancelBtn: { alignItems: 'center', justifyContent: 'center', marginTop: spacing.md, paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.error + '55', backgroundColor: 'rgba(239,68,68,0.08)' },
  cancelBtnText: { color: colors.error, fontSize: 13, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13 },
})
