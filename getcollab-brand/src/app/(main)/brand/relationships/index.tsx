import React, { useState, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import type { Relationship } from '@shared/types'

const STATUS_COLORS: Record<string, { fg: string; bg: string }> = {
  active: { fg: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  pending: { fg: '#F59E0B', bg: 'rgba(245,158,11,0.14)' },
  inactive: { fg: '#A1A1AA', bg: 'rgba(161,161,170,0.12)' },
  blocked: { fg: '#EF4444', bg: 'rgba(239,68,68,0.14)' },
}

interface Props {
  navigation?: any
}

export default function RelationshipsScreen({ navigation }: Props) {
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadRelationships = useCallback(async () => {
    try {
      const res = await apiService.getRelationships()
      const list = res?.relationships || res?.data || []
      setRelationships(Array.isArray(list) ? list : [])
    } catch (err) {
      handleApiError(err, 'Failed to load relationships')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadRelationships()
    }, [loadRelationships])
  )

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    if (value.trim().length >= 2) {
      searchDebounce.current = setTimeout(async () => {
        try {
          const res = await apiService.searchRelationships(value.trim())
          const list = res?.results || res?.data || []
          setRelationships(Array.isArray(list) ? list : [])
        } catch (err) {
          handleApiError(err, 'Search failed')
        }
      }, 800)
    } else if (value.trim().length === 0) {
      loadRelationships()
    }
  }

  const handleAddRelationship = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Error', 'Enter an email or user ID')
      return
    }
    setAdding(true)
    try {
      await apiService.createRelationship({ targetUserId: newEmail.trim(), message: '' })
      setDialogOpen(false)
      setNewEmail('')
      loadRelationships()
    } catch (err: any) {
      handleApiError(err, 'Failed to add relationship')
    } finally {
      setAdding(false)
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return relationships
    const q = search.toLowerCase()
    return relationships.filter(
      (r) =>
        r.otherParty?.name?.toLowerCase().includes(q) ||
        r.lastCampaign?.toLowerCase().includes(q)
    )
  }, [relationships, search])

  const renderItem = ({ item, index }: { item: Relationship; index: number }) => {
    const st = item.status || 'pending'
    const s = STATUS_COLORS[st] || STATUS_COLORS.pending
    const initial = item.otherParty?.name?.charAt(0).toUpperCase() ?? '?'
    return (
      <Animated.View entering={FadeInDown.delay(index * 40).duration(320)}>
        <Pressable
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
          onPress={() => navigation?.navigate('RelationshipDetail', { id: item.id })}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {item.otherParty?.name ?? 'Unknown'}
            </Text>
            <Text style={styles.meta}>
              {item.totalCollaborations} collaboration{item.totalCollaborations !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.fg }]}>{st.charAt(0).toUpperCase() + st.slice(1)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
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
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          ListHeaderComponent={
            <View>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Relationships</Text>
                  <Text style={styles.subtitle}>Manage your creator relationships</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
                  onPress={() => setDialogOpen(true)}
                >
                  <Ionicons name="add" size={16} color="#000" />
                  <Text style={styles.addBtnText}>Add</Text>
                </Pressable>
              </View>

              <View style={styles.searchWrap}>
                <Ionicons name="search" size={18} color={colors.textMuted} />
                <TextInput
                  value={search}
                  onChangeText={handleSearchChange}
                  placeholder="Search relationships..."
                  placeholderTextColor={colors.textSubtle}
                  style={styles.searchInput}
                />
                {search.length > 0 && (
                  <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => { setSearch(''); loadRelationships() }} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={26} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>
                {search.trim() ? 'No relationships match your search' : 'No relationships yet'}
              </Text>
              <Text style={styles.emptySub}>
                {search.trim()
                  ? 'Try a different search term.'
                  : 'Add a creator to start tracking collaborations and conversations.'}
              </Text>
              {!search.trim() && (
                <Pressable
                  style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.85 }]}
                  onPress={() => setDialogOpen(true)}
                >
                  <Text style={styles.emptyCtaText}>Add relationship</Text>
                </Pressable>
              )}
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRelationships() }} tintColor={colors.neon} />}
        />
      </SafeAreaView>

      {/* Add Relationship Modal */}
      {dialogOpen && (
        <Pressable style={styles.modalOverlay} onPress={() => setDialogOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Relationship</Text>
            <Text style={styles.modalBody}>Enter the creator's user ID or email to add them.</Text>
            <TextInput
              style={styles.input}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="User ID or email"
              placeholderTextColor={colors.textSubtle}
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <Pressable style={({ pressed }) => [styles.outlinedBtn, { flex: 1 }, pressed && { opacity: 0.8 }]} onPress={() => setDialogOpen(false)}>
                <Text style={styles.outlinedBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, { flex: 1 }, pressed && { opacity: 0.85 }]}
                onPress={handleAddRelationship}
                disabled={adding}
              >
                <Text style={styles.primaryBtnText}>{adding ? 'Adding…' : 'Add'}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: spacing.md, marginBottom: spacing.md },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.neon, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill },
  addBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.lg, paddingVertical: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, marginBottom: spacing.md },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, padding: 0 },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  name: { color: '#fff', fontSize: 15, fontWeight: '600' },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginRight: spacing.sm },
  statusText: { fontSize: 11, fontWeight: '700' },

  divider: { height: 1, backgroundColor: colors.border },

  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  emptyCta: { backgroundColor: colors.neon, paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.pill, marginTop: spacing.md },
  emptyCtaText: { color: '#000', fontSize: 13, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, width: '100%', maxWidth: 400 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  modalBody: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: spacing.lg },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 12, color: '#fff', fontSize: 14, backgroundColor: colors.bg },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  outlinedBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong },
  outlinedBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  primaryBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: radius.pill, backgroundColor: colors.neon },
  primaryBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },
})
