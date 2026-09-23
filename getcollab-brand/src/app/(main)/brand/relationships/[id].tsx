import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl, Alert } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import { colors, radius, spacing, STATUS_COLORS } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import type { RelationshipDetail } from '@shared/types'
import * as Haptics from 'expo-haptics'

type RouteParams = RouteProp<{ relationshipDetail: { id: string } }, 'relationshipDetail'>


export default function RelationshipDetailScreen() {
  const route = useRoute<RouteParams>()
  const navigation = useNavigation()
  const { id } = route.params || {}

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [relationship, setRelationship] = useState<RelationshipDetail | null>(null)

  const loadDetail = useCallback(async () => {
    try {
      const [relRes, collabRes, timelineRes] = await Promise.all([
        apiService.getRelationship(id),
        apiService.getRelationshipCollaborations(id).catch(() => null),
        apiService.getRelationshipTimeline(id).catch(() => null),
      ])
      const rel = relRes?.relationship || relRes || null
      if (rel) {
        setRelationship({
          ...rel,
          collaborations: collabRes?.collaborations || collabRes || [],
          timeline: timelineRes?.timeline || timelineRes || [],
        })
      } else {
        setRelationship(null)
      }
    } catch (err) {
      handleApiError(err, 'Failed to load relationship')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [id])

  useEffect(() => {
    if (id) loadDetail()
  }, [id, loadDetail])

  const handleMessage = async () => {
    try {
      const room = await apiService.createDirectChat(relationship?.otherParty?.id || '')
      const roomId = room?.id || room?.data?.id
      if (roomId) {
        ;(navigation as any).navigate('ChatDetail', { roomId, id: roomId })
      }
    } catch (err) {
      handleApiError(err, 'Failed to open chat')
    }
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.neon} />
        </View>
      </SafeAreaView>
    )
  }

  if (!relationship) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.md }}>
          <Text style={{ color: colors.error, fontSize: 16 }}>Relationship not found</Text>
          <Pressable style={({ pressed }) => [styles.outlinedBtn, pressed && { opacity: 0.8 }]} onPress={() => navigation.goBack()}>
            <Text style={styles.outlinedBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const st = relationship.status || 'pending'
  const s = STATUS_COLORS[st] || STATUS_COLORS.pending
  const initial = relationship.otherParty?.name?.charAt(0).toUpperCase() ?? '?'

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRefreshing(true); loadDetail() }} tintColor={colors.neon} />}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          {/* Header Card */}
          <View style={styles.headerCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <Text style={styles.name}>{relationship.otherParty?.name ?? 'Unknown'}</Text>
            <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
              <Text style={[styles.statusText, { color: s.fg }]}>{st.charAt(0).toUpperCase() + st.slice(1)}</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{relationship.totalCollaborations}</Text>
                <Text style={styles.statLabel}>Collaborations</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{relationship.averageRating?.toFixed(1) ?? '—'}</Text>
                <Text style={styles.statLabel}>Avg Rating</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>₹{(relationship.totalSpend ?? 0).toLocaleString('en-IN')}</Text>
                <Text style={styles.statLabel}>Total Spend</Text>
              </View>
            </View>

            <Pressable style={({ pressed }) => [styles.messageBtn, pressed && { opacity: 0.85 }]} onPress={handleMessage}>
              <Ionicons name="chatbubble-outline" size={16} color="#fff" />
              <Text style={styles.messageBtnText}>Message</Text>
            </Pressable>
          </View>

          {/* Collaborations */}
          {relationship.collaborations && relationship.collaborations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Collaborations</Text>
              <View style={styles.listCard}>
                {relationship.collaborations.map((c: any, idx: number) => (
                  <View key={c.id || idx} style={[styles.listRow, idx < relationship.collaborations!.length - 1 && styles.listRowDivider]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listTitle} numberOfLines={1}>{c.campaignTitle || 'Campaign'}</Text>
                      <Text style={styles.listMeta}>{c.status} · {c.startDate ? new Date(c.startDate).toLocaleDateString() : '—'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Timeline */}
          {relationship.timeline && relationship.timeline.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Timeline</Text>
              <View style={styles.listCard}>
                {relationship.timeline.map((t: any, idx: number) => (
                  <View key={idx} style={[styles.listRow, idx < relationship.timeline!.length - 1 && styles.listRowDivider]}>
                    <View style={styles.timelineDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listTitle}>{t.type}</Text>
                      <Text style={styles.listMeta}>{t.description || ''} · {new Date(t.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  headerCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.lg },
  avatar: { width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  name: { color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginTop: spacing.sm },
  statusText: { fontSize: 11, fontWeight: '700' },

  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, width: '100%' },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  statValue: { color: '#fff', fontSize: 18, fontWeight: '700' },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2, letterSpacing: 0.3 },

  messageBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.blue, borderRadius: radius.pill, paddingHorizontal: 20, paddingVertical: 12, marginTop: spacing.lg },
  messageBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  section: { marginBottom: spacing.lg },
  sectionTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm },

  listCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  listRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  listTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  listMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blue, marginRight: spacing.md },

  outlinedBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong },
  outlinedBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
