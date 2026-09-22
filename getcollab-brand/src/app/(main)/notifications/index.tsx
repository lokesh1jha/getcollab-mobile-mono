import React, { useEffect, useCallback, memo } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { colors, spacing, radius } from '@/src/theme'
import { useNotificationStore } from '@shared/stores/notification-store'
import { navigateToNotification } from '@shared/services/notification-service'
import type { Notification } from '@shared/types'

interface NotificationItemProps {
  item: Notification
  onPress: () => void
}

const NotificationItem = memo(function NotificationItem({ item, onPress }: NotificationItemProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'bid_accepted':
      case 'bid_rejected':
        return 'cash-outline'
      case 'new_bid':
        return 'document-text-outline'
      case 'new_message':
        return 'chatbubble-outline'
      case 'payment_received':
        return 'checkmark-circle-outline'
      default:
        return 'notifications-outline'
    }
  }

  return (
    <Pressable style={({ pressed }) => [styles.notification, !item.read && styles.unread, pressed && { opacity: 0.85 }]} onPress={onPress}>
      <View style={[styles.iconContainer, !item.read && { backgroundColor: colors.blueSoft }]}>
        <Ionicons name={getIcon(item.type) as any} size={18} color={!item.read ? colors.blue : colors.textMuted} />
      </View>
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, !item.read && styles.unreadText]}>{item.title}</Text>
        <Text style={[styles.notificationMessage, !item.read && styles.unreadText]}>{item.message}</Text>
        <Text style={styles.notificationDate}>{formatDate(item.createdAt)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </Pressable>
  )
})

export default function NotificationsScreen() {
  const { notifications, unreadCount, isLoading, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore()

  useFocusEffect(
    React.useCallback(() => {
      fetchNotifications()
    }, [fetchNotifications])
  )

  const handleNotificationPress = useCallback(async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id)
    }
    // The row carries a web deep link (or an event type) for its target screen.
    navigateToNotification({ ...(notification.data || {}), ...notification } as Record<string, any>)
  }, [markAsRead])

  const handleMarkAllRead = useCallback(async () => {
    await markAllAsRead()
  }, [markAllAsRead])

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="notifications-outline" size={32} color={colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptySubtext}>You'll see updates about your campaigns, bids, and messages here</Text>
    </View>
  )

  if (isLoading && notifications.length === 0) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.neon} />
          </View>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <Text style={styles.unreadBadge}>{unreadCount} unread</Text>
            )}
          </View>
          {unreadCount > 0 && (
            <Pressable onPress={handleMarkAllRead}>
              <Text style={styles.markAllRead}>Mark all read</Text>
            </Pressable>
          )}
        </View>

        <FlatList
          data={notifications}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 30).duration(320)}>
              <NotificationItem item={item} onPress={() => handleNotificationPress(item)} />
            </Animated.View>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={notifications.length === 0 ? styles.emptyList : styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          getItemLayout={(data, index) => ({ length: 80, offset: 80 * index, index })}
        />
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
  unreadBadge: { fontSize: 13, color: colors.blue, marginTop: 2 },
  markAllRead: { fontSize: 13, color: colors.blue, fontWeight: '600' },
  listContainer: { padding: spacing.md },
  emptyList: { flex: 1, justifyContent: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  notification: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  unread: { borderLeftWidth: 3, borderLeftColor: colors.blue },
  iconContainer: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.elevated, justifyContent: 'center', alignItems: 'center',
    marginRight: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  notificationContent: { flex: 1 },
  notificationTitle: { fontSize: 15, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.xs },
  unreadText: { color: '#fff' },
  notificationMessage: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm, lineHeight: 18 },
  notificationDate: { fontSize: 11, color: colors.textSubtle },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blue, marginLeft: spacing.sm },

  emptyContainer: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xxxl },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: spacing.sm },
  emptySubtext: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
})
