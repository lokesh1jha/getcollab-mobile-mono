import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, Alert, ActivityIndicator, RefreshControl, TextInput } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import type { TeamMember, TeamInvite } from '@shared/types'
import * as Haptics from 'expo-haptics'

export default function TeamSettingsScreen() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  const loadTeam = useCallback(async () => {
    try {
      const [membersRes, invitesRes] = await Promise.all([
        apiService.getTeamMembers().catch(() => null),
        apiService.get<{ invites?: TeamInvite[]; data?: TeamInvite[] }>('/orgs/invites').catch(() => null),
      ])
      const m = membersRes?.members || membersRes?.data || []
      const i = (invitesRes as any)?.invites || (invitesRes as any)?.data || []
      setMembers(Array.isArray(m) ? m : [])
      setInvites(Array.isArray(i) ? i : [])
    } catch (err) {
      handleApiError(err, 'Failed to load team')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadTeam()
    }, [loadTeam])
  )

  const handleInvite = async () => {
    if (!email.trim() || !email.includes('@')) { Alert.alert('Error', 'Enter a valid email'); return }
    setInviting(true)
    try {
      await apiService.inviteTeamMember(email.trim())
      setEmail('')
      loadTeam()
      Alert.alert('Invited', `Invitation sent to ${email.trim()}`)
    } catch (err) {
      handleApiError(err, 'Failed to invite team member')
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = async (member: TeamMember) => {
    Alert.alert('Remove member?', `Remove ${member.name || member.email}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiService.removeTeamMember(member.id)
            setMembers((prev) => prev.filter((m) => m.id !== member.id))
          } catch (err) {
            handleApiError(err, 'Failed to remove member')
          }
        },
      },
    ])
  }

  const renderMember = ({ item, index }: { item: TeamMember; index: number }) => {
    const initial = item.name?.charAt(0).toUpperCase() || item.email?.charAt(0).toUpperCase() || '?'
    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 80).duration(320)}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{item.name || item.email}</Text>
            <Text style={styles.meta}>{item.role} · {item.email}</Text>
          </View>
          {item.role !== 'owner' && (
            <Pressable style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.75 }]} onPress={() => handleRemove(item)}>
              <Text style={styles.removeBtnText}>Remove</Text>
            </Pressable>
          )}
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
        <FlatList automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled"
          data={members}
          renderItem={renderMember}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          ListHeaderComponent={
            <View>
              <View style={styles.header}>
                <Text style={styles.title}>Team</Text>
                <Text style={styles.subtitle}>{members.length} member{members.length !== 1 ? 's' : ''}</Text>
              </View>

              <View style={styles.inviteCard}>
                <Text style={styles.label}>Invite by email</Text>
                <View style={styles.inviteRow}>
                  <TextInput
                    style={styles.inviteInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="colleague@company.com"
                    placeholderTextColor={colors.textSubtle}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <Pressable style={({ pressed }) => [styles.inviteBtn, pressed && { opacity: 0.85 }]} onPress={handleInvite} disabled={inviting}>
                    <Text style={styles.inviteBtnText}>{inviting ? '…' : 'Invite'}</Text>
                  </Pressable>
                </View>
              </View>

              {invites.length > 0 && (
                <View style={{ marginBottom: spacing.md }}>
                  <Text style={styles.sectionLabel}>{invites.length} pending invitation{invites.length !== 1 ? 's' : ''}</Text>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No team members</Text>
              <Text style={styles.emptySub}>Invite colleagues to collaborate.</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRefreshing(true); loadTeam() }} tintColor={colors.neon} />}
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

  inviteCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.4, marginBottom: 8 },
  inviteRow: { flexDirection: 'row', gap: spacing.sm },
  inviteInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 12, color: '#fff', fontSize: 14, backgroundColor: colors.bg },
  inviteBtn: { backgroundColor: colors.neon, borderRadius: radius.pill, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  inviteBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },

  sectionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  name: { color: '#fff', fontSize: 15, fontWeight: '600' },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  removeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.error + '55', backgroundColor: 'rgba(239,68,68,0.08)' },
  removeBtnText: { color: colors.error, fontSize: 12, fontWeight: '600' },

  divider: { height: 1, backgroundColor: colors.border },

  empty: { alignItems: 'center', paddingVertical: spacing.xxxl },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  emptySub: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
})
