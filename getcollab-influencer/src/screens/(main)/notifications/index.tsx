import React, { useCallback, memo } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { useNotificationStore } from '@shared/stores/notification-store'

function notifIcon(type: string): string {
  if (type?.includes('bid') || type?.includes('campaign')) return 'megaphone-outline'
  if (type?.includes('payment') || type?.includes('earning')) return 'cash-outline'
  if (type?.includes('message') || type?.includes('chat')) return 'chatbubble-outline'
  if (type?.includes('accept')) return 'checkmark-circle-outline'
  if (type?.includes('reject')) return 'close-circle-outline'
  return 'notifications-outline'
}

function formatTime(v?: string): string {
  if (!v) return ''
  const diffMs = Date.now() - new Date(v).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const NotifItem = memo(({ item, index, onRead }: { item: any; index: number; onRead: (id: string) => void }) => {
  const isUnread = !item.read
  const icon = notifIcon(item.type || '')
  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(320)}>
      <Pressable onPress={() => onRead(item.id)} style={[styles.row, isUnread && styles.rowUnread]}>
        {isUnread && <View style={styles.unreadBar} />}
        <View style={[styles.iconWrap, isUnread && { backgroundColor: colors.blueSoft }]}>
          <Ionicons name={icon as any} size={18} color={isUnread ? colors.blue : colors.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.notifText, isUnread && styles.notifTextUnread]}>{item.message || item.title || 'Notification'}</Text>
          {item.createdAt ? <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text> : null}
        </View>
      </Pressable>
    </Animated.View>
  )
})

export default function NotificationsScreen({ navigation }: any) {
  const { notifications, isLoading, fetchNotifications, markAsRead, markAllAsRead, unreadCount } = useNotificationStore()

  useFocusEffect(useCallback(() => { fetchNotifications() }, [fetchNotifications]))

  if (isLoading && notifications.length === 0) return (
    <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={colors.neon} />
    </View>
  )

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <Pressable hitSlop={12} onPress={() => navigation?.goBack()} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.75 }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1, paddingHorizontal: spacing.md }}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && <Text style={styles.unreadLabel}>{unreadCount} unread</Text>}
          </View>
          {unreadCount > 0 && (
            <Pressable onPress={markAllAsRead} hitSlop={8}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </Pressable>
          )}
        </View>

        <FlatList
          data={notifications}
          renderItem={({ item, index }) => <NotifItem item={item} index={index} onRead={markAsRead} />}
          keyExtractor={n => String(n.id)}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="notifications-outline" size={26} color={colors.textMuted} /></View>
              <Text style={styles.emptyTitle}>All caught up</Text>
              <Text style={styles.emptySub}>New campaign updates and payments will appear here.</Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  unreadLabel: { color: colors.neon, fontSize: 12, fontWeight: '600', marginTop: 1 },
  markAllText: { color: colors.blue, fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md },
  rowUnread: { backgroundColor: 'rgba(59,130,246,0.04)' },
  unreadBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.blue, borderRadius: 2 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifText: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  notifTextUnread: { color: colors.text, fontWeight: '500' },
  notifTime: { color: colors.textSubtle, fontSize: 11, marginTop: 4 },
  separator: { height: 0.5, backgroundColor: colors.border, marginLeft: 72 },
  empty: { alignItems: 'center', paddingTop: spacing.xxxl + spacing.xl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: spacing.xl },
})
