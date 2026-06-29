import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, ActivityIndicator } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService } from '@shared/services/api'
import { useChatStore } from '@shared/stores/chat-store'

interface Chat { id: string; influencerName: string; influencerHandle: string; lastMessage: string; timestamp: string; unread: number; campaignTitle: string }
interface Props { navigation?: any }

const formatTimestamp = (date: Date): string => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return date.toLocaleDateString()
}

export default function BrandChatScreen({ navigation }: Props) {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const initializeSocketConnection = useCallback(async () => {
    const chatStore = useChatStore.getState()
    if (!chatStore.socket) await chatStore.initializeSocket()
  }, [])

  const loadChats = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiService.getChats()
      const rooms = response?.data || response || []
      const mapped: Chat[] = (Array.isArray(rooms) ? rooms : []).map((room: any) => ({
        id: room.id,
        influencerName: room.influencerName || room.influencer?.name || 'Unknown',
        influencerHandle: room.influencerHandle || room.influencer?.handle || '',
        lastMessage: room.lastMessage?.content || room.lastMessage || 'No messages yet',
        timestamp: room.lastMessage?.createdAt ? formatTimestamp(new Date(room.lastMessage.createdAt)) : 'New',
        unread: room.unreadCount || 0,
        campaignTitle: room.campaign?.title || room.campaignTitle || 'Direct Message',
      }))
      setChats(mapped)
    } catch (error) { console.error('Failed to load chats:', error) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadChats(); initializeSocketConnection() }, [loadChats, initializeSocketConnection])
  useFocusEffect(useCallback(() => { loadChats() }, [loadChats]))

  const filtered = useMemo(() => chats.filter((c) => c.influencerName.toLowerCase().includes(searchQuery.toLowerCase()) || c.influencerHandle.toLowerCase().includes(searchQuery.toLowerCase()) || c.campaignTitle.toLowerCase().includes(searchQuery.toLowerCase())), [chats, searchQuery])
  const totalUnread = chats.reduce((acc, c) => acc + c.unread, 0)

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.neon} />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Inbox</Text>
            <Text style={styles.subtitle}>{totalUnread} unread · {chats.length} conversations</Text>
          </View>
          <Pressable style={styles.iconBtn}>
            <Ionicons name="create-outline" size={20} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search conversations" placeholderTextColor={colors.textSubtle} style={styles.searchInput} />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 40).duration(320)}>
              <Pressable
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.card }]}
                onPress={() => navigation?.navigate('ChatDetail', { chat: item, roomId: item.id })}
              >
                <View>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.influencerName.charAt(0)}</Text>
                  </View>
                </View>
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={styles.name} numberOfLines={1}>{item.influencerName}</Text>
                    <Text style={[styles.time, item.unread > 0 && { color: colors.blue, fontWeight: '700' }]}>{item.timestamp}</Text>
                  </View>
                  <View style={styles.rowBottom}>
                    <Text style={[styles.preview, item.unread > 0 && { color: '#fff' }]} numberOfLines={1}>{item.lastMessage}</Text>
                    {item.unread > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{item.unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="chatbubbles-outline" size={26} color={colors.textMuted} /></View>
              <Text style={styles.emptyTitle}>No conversations</Text>
              <Text style={styles.emptySub}>Reach out to creators to start a chat.</Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, padding: 0 },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  rowBody: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1, paddingRight: 8 },
  time: { color: colors.textMuted, fontSize: 11 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  preview: { color: colors.textMuted, fontSize: 13, flex: 1, paddingRight: 8 },
  unreadBadge: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  sep: { height: 1, backgroundColor: colors.border, marginLeft: spacing.lg + 52 + spacing.md },

  empty: { alignItems: 'center', paddingTop: spacing.xxxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13 },
})
