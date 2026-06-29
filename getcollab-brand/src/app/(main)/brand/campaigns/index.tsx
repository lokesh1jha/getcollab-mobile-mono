import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator, Modal, Alert, ScrollView, TextInput } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'

const FILTERS = ['All', 'active', 'draft', 'completed', 'paused'] as const

const STATUS_COLORS: Record<string, { fg: string; bg: string; dot: string }> = {
  active: { fg: '#22C55E', bg: 'rgba(34,197,94,0.12)', dot: '#22C55E' },
  draft: { fg: '#A1A1AA', bg: 'rgba(161,161,170,0.12)', dot: '#A1A1AA' },
  completed: { fg: '#3B82F6', bg: 'rgba(59,130,246,0.14)', dot: '#3B82F6' },
  paused: { fg: '#F59E0B', bg: 'rgba(245,158,11,0.14)', dot: '#F59E0B' },
  cancelled: { fg: '#EF4444', bg: 'rgba(239,68,68,0.14)', dot: '#EF4444' },
}

interface Campaign { id: string; title: string; status: string; budget: number; bidCount?: number; applications?: number; createdAt: string }
interface Props { navigation?: any }

export default function BrandCampaignsScreen({ navigation }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<string>('All')
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiService.deleteCampaign(deleteTarget.id)
      setCampaigns((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setDeleteTarget(null)
      Alert.alert('Deleted', 'Campaign has been deleted.')
    } catch (err) { handleApiError(err, 'Failed to delete campaign') }
    finally { setDeleting(false) }
  }

  const loadCampaigns = useCallback(async () => {
    try {
      const response = await apiService.getMyCampaigns()
      const list: Campaign[] = response?.data || response?.campaigns || response || []
      setCampaigns(Array.isArray(list) ? list : [])
    } catch (error: any) { handleApiError(error, 'Failed to load campaigns') }
    finally { setLoading(false) }
  }, [])

  useFocusEffect(useCallback(() => { loadCampaigns() }, [loadCampaigns]))

  const onRefresh = async () => { setRefreshing(true); await loadCampaigns(); setRefreshing(false) }

  const filtered = filter === 'All' ? campaigns : campaigns.filter((c) => c.status === filter)
  const formatDate = (v?: string) => { if (!v) return '-'; try { return new Date(v).toLocaleDateString() } catch { return v } }

  const renderCampaign = ({ item, index }: { item: Campaign; index: number }) => {
    const st = item.status || 'draft'
    const s = STATUS_COLORS[st] || STATUS_COLORS.draft
    return (
      <Animated.View entering={FadeInDown.delay(index * 40).duration(320)} style={styles.card}>
        <Pressable onPress={() => navigation?.navigate('CampaignDetails', { id: item.id, campaign: item })} style={({ pressed }) => [{}, pressed && { opacity: 0.9 }]}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.cardBudget}>₹{item.budget.toLocaleString()} budget</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
              <Text style={[styles.statusText, { color: s.fg }]}>{st.charAt(0).toUpperCase() + st.slice(1)}</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{item.bidCount || item.applications || 0}</Text>
              <Text style={styles.metricLabel}>Bids</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{formatDate(item.createdAt)}</Text>
              <Text style={styles.metricLabel}>Created</Text>
            </View>
          </View>
        </Pressable>

        <View style={styles.actionsRow}>
          <Pressable style={({ pressed }) => [styles.outlinedBtnSmall, pressed && { opacity: 0.85 }]} onPress={() => navigation?.navigate('Bids', { campaignId: item.id })}>
            <Text style={styles.outlinedBtnSmallText}>View Bids</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.blueBtnSmall, pressed && { opacity: 0.85 }]} onPress={() => navigation?.navigate('CampaignAnalytics', { id: item.id, title: item.title })}>
            <Text style={styles.blueBtnSmallText}>Analytics</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.75 }]} onPress={() => setDeleteTarget(item)} hitSlop={10}>
            <Ionicons name="trash-outline" size={16} color={colors.error} />
          </Pressable>
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
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <FlatList
          data={filtered}
          renderItem={renderCampaign}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListHeaderComponent={
            <View>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Campaigns</Text>
                  <Text style={styles.subtitle}>{campaigns.length} total</Text>
                </View>
                <Pressable testID="campaigns-create-btn" style={({ pressed }) => [styles.createBtn, pressed && { opacity: 0.85 }]} onPress={() => navigation?.navigate('CreateCampaign')}>
                  <Ionicons name="add" size={16} color="#000" />
                  <Text style={styles.createBtnText}>Create</Text>
                </Pressable>
              </View>

              <View style={styles.chipsRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                  {FILTERS.map((f) => {
                    const active = f === filter
                    return (
                      <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, active && styles.chipActive]}>
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
                      </Pressable>
                    )
                  })}
                </ScrollView>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="rocket-outline" size={26} color={colors.textMuted} /></View>
              <Text style={styles.emptyTitle}>No campaigns yet</Text>
              <Text style={styles.emptySub}>Create your first campaign to start discovering creators.</Text>
              <Pressable style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.85 }]} onPress={() => navigation?.navigate('CreateCampaign')}>
                <Text style={styles.emptyCtaText}>Create Campaign</Text>
              </Pressable>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neon} />}
        />

        <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Delete campaign?</Text>
              <Text style={styles.modalBody}>"{deleteTarget?.title}" will be permanently deleted. All associated bids will be cancelled. This action cannot be undone.</Text>
              <View style={styles.modalActions}>
                <Pressable style={({ pressed }) => [styles.outlinedBtnSmall, { flex: 1 }, pressed && { opacity: 0.8 }]} onPress={() => setDeleteTarget(null)} disabled={deleting}>
                  <Text style={styles.outlinedBtnSmallText}>Cancel</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.deleteModalBtn, { flex: 1 }, pressed && { opacity: 0.85 }]} onPress={handleDelete} disabled={deleting}>
                  <Text style={styles.deleteModalBtnText}>{deleting ? 'Deleting...' : 'Delete'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: { flexDirection: 'row', alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.neon, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  createBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },

  chipsRow: { height: 50, justifyContent: 'center' },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: '#fff', borderColor: '#fff' },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#000' },

  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  cardName: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  cardBudget: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  metricsRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  metric: { flex: 1, alignItems: 'flex-start' },
  metricDivider: { width: 1, height: 28, backgroundColor: colors.border },
  metricValue: { color: '#fff', fontSize: 16, fontWeight: '700' },
  metricLabel: { color: colors.textMuted, fontSize: 11, marginTop: 4, letterSpacing: 0.3 },

  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  outlinedBtnSmall: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  outlinedBtnSmallText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  blueBtnSmall: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  blueBtnSmallText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  deleteBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },

  empty: { alignItems: 'center', paddingTop: spacing.xxxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  emptyCta: { backgroundColor: colors.neon, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999, marginTop: spacing.md },
  emptyCtaText: { color: '#000', fontSize: 13, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, width: '100%', maxWidth: 400 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  modalBody: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: spacing.lg },
  modalActions: { flexDirection: 'row', gap: spacing.md },
  deleteModalBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center' },
  deleteModalBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
})
