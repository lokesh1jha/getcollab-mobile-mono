import React, { useState, useEffect, useCallback } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { useChatStore } from '@shared/stores/chat-store'

function formatTime(value?: string): string {
  if (!value) return ''
  const diffMs = Date.now() - new Date(value).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'Now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function InfluencerChat({ navigation }: any) {
  const { rooms, fetchRooms, unreadByRoom, isLoading } = useChatStore()
  const [query, setQuery] = useState('')

  useFocusEffect(useCallback(() => { fetchRooms() }, [fetchRooms]))

  const filtered = query.trim()
    ? rooms.filter(r => ((r as any).brandName || r.brand?.name || (r as any).name || '').toLowerCase().includes(query.toLowerCase()) || (r.lastMessage?.content || '').toLowerCase().includes(query.toLowerCase()))
    : rooms

  const totalUnread = Object.values(unreadByRoom).reduce((s, n) => s + n, 0)

  const renderRoom = ({ item, index }: { item: any; index: number }) => {
    const unread = unreadByRoom[item.id] || 0
    const name = (item as any).brandName || item.brand?.name || (item as any).name || 'Brand'
    const lastMsg = item.lastMessage?.content || 'Start a conversation'
    const isRead = unread === 0
    return (
      <Animated.View entering={FadeInDown.delay(index * 40).duration(320)}>
        <Pressable
          onPress={() => navigation?.navigate('ChatDetail', { roomId: item.id, chat: { id: item.id, influencerName: name } })}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.elevated }]}
        >
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
            </View>
            {item.online && <View style={styles.onlineDot} />}
          </View>

          <View style={styles.rowContent}>
            <View style={styles.rowTop}>
              <Text style={[styles.name, !isRead && styles.nameUnread]}>{name}</Text>
              <Text style={[styles.time, !isRead && styles.timeUnread]}>{formatTime(item.lastMessage?.createdAt || item.updatedAt)}</Text>
            </View>
            <View style={styles.rowBottom}>
              <Text style={[styles.preview, !isRead && styles.previewUnread]} numberOfLines={1}>{lastMsg}</Text>
              {unread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    )
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Messages</Text>
            {totalUnread > 0 && <Text style={styles.unreadCount}>{totalUnread} unread</Text>}
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search conversations…" placeholderTextColor={colors.textSubtle} style={styles.searchInput} />
          {query.length > 0 && <Pressable onPress={() => setQuery('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={colors.textMuted} /></Pressable>}
        </View>

        {isLoading && rooms.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.neon} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            renderItem={renderRoom}
            keyExtractor={r => r.id}
            contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: spacing.xxl }}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}><Ionicons name="chatbubbles-outline" size={26} color={colors.textMuted} /></View>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptySub}>Apply to campaigns to start chatting with brands.</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  unreadCount: { color: colors.neon, fontSize: 12, fontWeight: '600', marginTop: 2 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: spacing.lg, marginBottom: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, padding: 0 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md },
  avatarWrap: { position: 'relative' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.text, fontSize: 18, fontWeight: '700' },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.onlineGreen, borderWidth: 2, borderColor: colors.bg },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { color: colors.textMuted, fontSize: 15, fontWeight: '500' },
  nameUnread: { color: colors.text, fontWeight: '700' },
  time: { color: colors.textSubtle, fontSize: 11 },
  timeUnread: { color: colors.blue, fontWeight: '600' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  preview: { color: colors.textSubtle, fontSize: 13, flex: 1 },
  previewUnread: { color: colors.textMuted },
  badge: { backgroundColor: colors.blue, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  separator: { height: 0.5, backgroundColor: colors.border, marginLeft: 80 },
  empty: { alignItems: 'center', paddingTop: spacing.xxxl + spacing.xl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: spacing.xl },
})
