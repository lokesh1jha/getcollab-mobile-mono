import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { StyleSheet, View, ActivityIndicator, Text, TextInput, Alert, FlatList, KeyboardAvoidingView, Platform, Linking, Modal, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePickerLib from 'expo-image-picker'
import * as DocumentPickerLib from 'expo-document-picker'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing } from '@/src/theme'
import { useChatStore } from '@shared/stores/chat-store'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '@shared/stores/auth-store'
import { handleApiError } from '@shared/services/api'
import type { Message, ChatAttachment } from '@shared/types'
import * as Haptics from 'expo-haptics'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatMessageTime(dateStr: string): string {
  try { return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}

interface ChatDetailScreenProps {
  navigation?: any
  route?: any
}

export default function ChatDetailScreen({ navigation, route }: ChatDetailScreenProps) {
  const roomId = route?.params?.id || route?.params?.roomId
  const chatMeta = route?.params?.chat
  const otherUserId = chatMeta?.influencerId || chatMeta?.userId || chatMeta?.brandId

  const {
    messages,
    fetchMessages,
    sendMessage,
    sendImage,
    sendAttachments,
    isLoading,
    isSending,
    hasMoreMessages,
    markRoomRead,
    setTyping,
    typingUsers,
    readByUser,
    presence,
    socket,
    initializeSocket,
  } = useChatStore(
    useShallow((s) => ({ messages: s.messages, fetchMessages: s.fetchMessages, sendMessage: s.sendMessage, sendImage: s.sendImage, sendAttachments: s.sendAttachments, isLoading: s.isLoading, isSending: s.isSending, hasMoreMessages: s.hasMoreMessages, markRoomRead: s.markRoomRead, setTyping: s.setTyping, typingUsers: s.typingUsers, readByUser: s.readByUser, presence: s.presence, socket: s.socket, initializeSocket: s.initializeSocket })),
  )
  const { user } = useAuthStore()
  const [input, setInput] = useState('')
  const [searchMode, setSearchMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [previewUri, setPreviewUri] = useState<string | null>(null)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listRef = useRef<FlatList<Message>>(null)

  useEffect(() => {
    if (roomId) {
      fetchMessages(roomId)
      markRoomRead(roomId)
    }
    if (!socket) {
      initializeSocket()
    }
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current)
    }
  }, [roomId])

  const handleSend = async () => {
    if (!input.trim() || !roomId) return
    const text = input.trim()
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setInput('')
    setTyping(roomId, false)
    try {
      await sendMessage(roomId, text)
    } catch (err) {
      handleApiError(err, 'Failed to send')
    }
  }

  const handleAttach = async () => {
    const { status } = await ImagePickerLib.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Enable photo library access in settings.')
      return
    }
    try {
      const result = await ImagePickerLib.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.7,
        base64: true,
      })
      if (result.canceled || !result.assets[0]) return
      const asset = result.assets[0]

      if (asset.type === 'video') {
        await sendAttachments(roomId, [{
          uri: asset.uri,
          fileName: asset.fileName || 'video.mp4',
          mimeType: asset.mimeType || 'video/mp4',
          fileSize: asset.fileSize || 0,
        }])
        return
      }

      if (!asset.base64) return
      await sendImage(roomId, `data:image/jpeg;base64,${asset.base64}`)
    } catch (err) {
      handleApiError(err, 'Attachment send failed')
    }
  }

  const handleAttachDocument = async () => {
    try {
      const result = await DocumentPickerLib.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true })
      if (result.canceled || !result.assets[0]) return
      const asset = result.assets[0]
      await sendAttachments(roomId, [{
        uri: asset.uri,
        fileName: asset.name,
        mimeType: asset.mimeType || 'application/octet-stream',
        fileSize: asset.size || 0,
      }])
    } catch (err) {
      handleApiError(err, 'Document send failed')
    }
  }

  const handleInputChange = (text: string) => {
    setInput(text)
    if (!roomId) return
    setTyping(roomId, true)
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => setTyping(roomId, false), 1500)
  }

  const loadOlder = async () => {
    if (!roomId || loadingOlder || !hasMoreMessages) return
    setLoadingOlder(true)
    try {
      const oldest = messages[0]
      await fetchMessages(roomId, { before: oldest?.id })
    } catch (e) {
      handleApiError(e, 'Failed to load older messages')
    } finally {
      setLoadingOlder(false)
    }
  }

  const isOtherTyping = otherUserId && typingUsers[roomId]?.has(otherUserId)
  const otherPresence = otherUserId ? presence[otherUserId] : undefined
  const otherReadUpTo = otherUserId ? readByUser[otherUserId]?.[roomId] : undefined

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages
    const q = searchQuery.toLowerCase()
    return messages.filter((m) => m.content?.toLowerCase().includes(q))
  }, [messages, searchQuery])

  const renderAttachment = (attachment: ChatAttachment) => {
    if (attachment.type === 'IMAGE') {
      return (
        <Pressable key={attachment.id} onPress={() => setPreviewUri(attachment.url)} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
          <Image transition={200} source={{ uri: attachment.url }} style={styles.bubbleImage} />
        </Pressable>
      )
    }
    return (
      <Pressable
        key={attachment.id}
        style={({ pressed }) => [styles.attachmentFile, pressed && { opacity: 0.85 }]}
        onPress={() => Linking.openURL(attachment.url)}
      >
        <Text style={styles.attachmentFileIcon}>
          {attachment.type === 'VIDEO' ? '🎬' : attachment.type === 'AUDIO' ? '🎵' : '📄'}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.attachmentFileName} numberOfLines={1}>{attachment.fileName}</Text>
          <Text style={styles.attachmentFileSize}>{formatFileSize(attachment.fileSize)}</Text>
        </View>
      </Pressable>
    )
  }

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.senderId === user?.id
    const isLegacyImage = !item.attachments?.length && (item.type === 'image' || item.attachmentUrl)
    const isRead = isMe && otherReadUpTo && item.id && otherReadUpTo >= item.id
    const showRead = isMe && index === filteredMessages.length - 1

    return (
      <View style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowOther]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          {item.attachments && item.attachments.length > 0 && (
            <View style={{ gap: spacing.xs, marginBottom: item.content ? spacing.xs : 0 }}>
              {item.attachments.map(renderAttachment)}
            </View>
          )}
          {isLegacyImage ? (
            <Pressable onPress={() => setPreviewUri(item.attachmentUrl || item.content)} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
              <Image transition={200} source={{ uri: item.attachmentUrl || item.content }} style={styles.bubbleImage} />
            </Pressable>
          ) : item.content ? (
            <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
              {item.content}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: 4 }}>
            <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeOther]}>
              {formatMessageTime(item.createdAt)}
            </Text>
            {showRead && (
              <Ionicons name={isRead ? 'checkmark-done' : 'checkmark'} size={12} color={isRead ? colors.success : 'rgba(255,255,255,0.6)'} />
            )}
          </View>
        </View>
      </View>
    )
  }

  if (isLoading && messages.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.neon} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.headerBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation?.goBack()} style={({ pressed }) => [styles.headerBack, pressed && { opacity: 0.85 }]}>
          <Ionicons name="chevron-back" size={24} color={colors.neon} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {chatMeta?.influencerName || chatMeta?.name || chatMeta?.brandName || 'Chat'}
          </Text>
          <Text style={styles.headerStatus}>
            {isOtherTyping ? 'typing…' : otherPresence?.online ? '● Online' : otherPresence?.lastSeen ? `Last seen ${new Date(otherPresence.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={searchMode ? 'Close search' : 'Search messages'} onPress={() => setSearchMode((s) => !s)} style={({ pressed }) => [styles.headerAction, pressed && { opacity: 0.85 }]}>
          <Ionicons name={searchMode ? 'close' : 'search'} size={20} color={colors.text} />
        </Pressable>
      </View>

      {searchMode && (
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search this conversation..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={64}
      >
        <FlatList
          ref={listRef}
          data={filteredMessages}
          renderItem={renderMessage}
          keyExtractor={(item, index) => item.id ?? String(index)}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={
            hasMoreMessages ? (
              <Pressable onPress={loadOlder} disabled={loadingOlder} style={({ pressed }) => [styles.loadMoreBtn, pressed && { opacity: 0.7 }]}>
                {loadingOlder ? (
                  <ActivityIndicator size="small" color={colors.neon} />
                ) : (
                  <Text style={styles.loadMoreText}>Load older messages</Text>
                )}
              </Pressable>
            ) : messages.length > 0 ? (
              <View style={styles.chatStart}>
                <Text style={styles.chatStartText}>Beginning of conversation</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyChatTitle}>No messages yet</Text>
              <Text style={styles.emptyChatSub}>Say hello to start the conversation.</Text>
            </View>
          }
        />

        {isOtherTyping && (
          <View style={styles.typingHint}>
            <Text style={styles.typingHintText}>typing…</Text>
          </View>
        )}

        <View style={styles.inputBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Attach image" style={({ pressed }) => [styles.attachBtn, pressed && { opacity: 0.85 }]} onPress={handleAttach}>
            <Ionicons name="image-outline" size={22} color={colors.textMuted} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Attach file" style={({ pressed }) => [styles.attachBtn, pressed && { opacity: 0.85 }]} onPress={handleAttachDocument}>
            <Ionicons name="document-attach-outline" size={22} color={colors.textMuted} />
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={handleInputChange}
            multiline
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Send message"
            style={({ pressed }) => [styles.sendBtn, !input.trim() && styles.sendBtnDisabled, pressed && { opacity: 0.85 }]}
            disabled={!input.trim() || isSending}
            onPress={handleSend}
          >
            <Ionicons name="send" size={18} color={colors.black} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Image preview modal */}
      <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <Pressable style={({ pressed }) => [styles.previewOverlay, pressed && { opacity: 0.85 }]} onPress={() => setPreviewUri(null)}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              {previewUri && <Image transition={200} source={{ uri: previewUri }} style={styles.previewImage} contentFit="contain" />}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close preview" onPress={() => setPreviewUri(null)} style={({ pressed }) => [styles.previewClose, pressed && { opacity: 0.7 }]}>
              <Ionicons name="close" size={28} color={colors.text} />
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerBack: { paddingRight: spacing.sm },
  headerTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  headerStatus: { color: colors.textMuted, fontSize: 12 },
  headerAction: { paddingHorizontal: spacing.sm },
  searchBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.card },
  searchInput: {
    backgroundColor: colors.elevated,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    color: colors.text,
  },
  messagesList: { padding: spacing.lg, paddingBottom: spacing.xl },
  bubbleRow: { flexDirection: 'row', marginBottom: spacing.sm },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubbleRowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 16, padding: spacing.sm, paddingHorizontal: spacing.lg },
  bubbleMe: { backgroundColor: colors.blue, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.card, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextMe: { color: colors.text },
  bubbleTextOther: { color: colors.text },
  bubbleTime: { fontSize: 10, marginTop: 4 },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  bubbleTimeOther: { color: colors.textMuted },
  bubbleImage: { width: 200, height: 200, borderRadius: 12 },
  attachmentFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 12,
    padding: spacing.sm,
    minWidth: 180,
  },
  attachmentFileIcon: { fontSize: 22 },
  attachmentFileName: { color: colors.text, fontSize: 13, fontWeight: '600' },
  attachmentFileSize: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  typingHint: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
  typingHintText: { color: colors.textMuted, fontStyle: 'italic', fontSize: 12 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  attachBtn: { padding: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.elevated,
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    color: colors.text,
    maxHeight: 100,
    fontSize: 15,
  },
  sendBtn: {
    backgroundColor: colors.neon,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  sendBtnDisabled: { opacity: 0.4 },
  loadMoreBtn: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.card, marginBottom: spacing.sm },
  loadMoreText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  chatStart: { alignSelf: 'center', marginBottom: spacing.lg },
  chatStartText: { color: colors.textMuted, fontSize: 12 },
  emptyChat: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 8 },
  emptyChatTitle: { color: colors.textMuted, fontSize: 16, fontWeight: '700' },
  emptyChatSub: { color: colors.textMuted, fontSize: 13 },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
  previewImage: { width: '100%', height: '80%' },
  previewClose: { position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
})
