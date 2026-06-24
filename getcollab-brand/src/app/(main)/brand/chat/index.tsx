import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { colors, spacing } from '@shared/constants'
import { apiService } from '@shared/services/api'
import { useChatStore } from '@shared/stores/chat-store'

interface Chat {
  id: string
  influencerName: string
  influencerHandle: string
  lastMessage: string
  timestamp: string
  unread: number
  campaignTitle: string
}

interface BrandChatScreenProps {
  navigation?: any
}

const formatTimestamp = (date: Date): string => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

export default function BrandChatScreen({ navigation }: BrandChatScreenProps) {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const initializeSocketConnection = useCallback(async () => {
    const chatStore = useChatStore.getState()
    if (!chatStore.socket) {
      await chatStore.initializeSocket()
    }
  }, [])

  const loadChats = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiService.getChats()
      const rooms = response?.data || response || []
      const mappedChats: Chat[] = (Array.isArray(rooms) ? rooms : []).map((room: any) => ({
        id: room.id,
        influencerName: room.influencerName || room.influencer?.name || 'Unknown',
        influencerHandle: room.influencerHandle || room.influencer?.handle || '',
        lastMessage: room.lastMessage?.content || room.lastMessage || 'No messages yet',
        timestamp: room.lastMessage?.createdAt
          ? formatTimestamp(new Date(room.lastMessage.createdAt))
          : 'New',
        unread: room.unreadCount || 0,
        campaignTitle: room.campaign?.title || room.campaignTitle || 'Direct Message',
      }))
      setChats(mappedChats)
    } catch (error) {
      console.error('Failed to load chats:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadChats()
    initializeSocketConnection()
  }, [loadChats, initializeSocketConnection])

  useFocusEffect(
    useCallback(() => {
      loadChats()
    }, [loadChats])
  )

  const filteredChats = useMemo(
    () =>
      chats.filter(
        (chat) =>
          chat.influencerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          chat.influencerHandle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          chat.campaignTitle.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [chats, searchQuery]
  )

  const renderChat = useCallback(
    ({ item }: { item: Chat }) => (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => navigation?.navigate('ChatDetail', { chat: item, roomId: item.id })}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.influencerName.charAt(0)}</Text>
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <View>
              <Text style={styles.influencerName}>{item.influencerName}</Text>
              <Text style={styles.influencerHandle}>{item.influencerHandle}</Text>
            </View>
            <View style={styles.rightHeader}>
              <Text style={styles.timestamp}>{item.timestamp}</Text>
              {item.unread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.unread}</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.campaignTitle}>{item.campaignTitle}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [navigation]
  )

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptySubtitle}>
        When creators apply to your campaigns, you can message them here
      </Text>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.subtitle}>Communicate with creators</Text>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredChats}
          renderItem={renderChat}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
  },
  searchContainer: {
    marginBottom: spacing.lg,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listContainer: {
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '80',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  influencerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  influencerHandle: {
    fontSize: 14,
    color: colors.primary,
  },
  rightHeader: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textMuted,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  campaignTitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  lastMessage: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
})
