import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePickerLib from 'expo-image-picker'
import * as DocumentPickerLib from 'expo-document-picker'
import { colors, spacing } from '@shared/constants'
import { useChatStore } from '@shared/stores/chat-store'
import { useAuthStore } from '@shared/stores/auth-store'
import { handleApiError } from '@shared/services/api'
import type { Message, ChatAttachment } from '@shared/types'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
    markRoomRead,
    setTyping,
    typingUsers,
    presence,
    socket,
    initializeSocket,
  } = useChatStore()
  const { user } = useAuthStore()
  const [input, setInput] = useState('')
  const [searchMode, setSearchMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
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

  const isOtherTyping = otherUserId && typingUsers[roomId]?.has(otherUserId)
  const otherPresence = otherUserId ? presence[otherUserId] : undefined

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages
    const q = searchQuery.toLowerCase()
    return messages.filter((m) => m.content?.toLowerCase().includes(q))
  }, [messages, searchQuery])

  const renderAttachment = (attachment: ChatAttachment) => {
    if (attachment.type === 'IMAGE') {
      return <Image key={attachment.id} source={{ uri: attachment.url }} style={styles.bubbleImage} />
    }
    return (
      <TouchableOpacity
        key={attachment.id}
        style={styles.attachmentFile}
        onPress={() => Linking.openURL(attachment.url)}
      >
        <Text style={styles.attachmentFileIcon}>
          {attachment.type === 'VIDEO' ? '🎬' : attachment.type === 'AUDIO' ? '🎵' : '📄'}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.attachmentFileName} numberOfLines={1}>{attachment.fileName}</Text>
          <Text style={styles.attachmentFileSize}>{formatFileSize(attachment.fileSize)}</Text>
        </View>
      </TouchableOpacity>
    )
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.id
    const isLegacyImage = !item.attachments?.length && (item.type === 'image' || item.attachmentUrl)
    return (
      <View style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowOther]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          {item.attachments && item.attachments.length > 0 && (
            <View style={{ gap: spacing.xs, marginBottom: item.content ? spacing.xs : 0 }}>
              {item.attachments.map(renderAttachment)}
            </View>
          )}
          {isLegacyImage ? (
            <Image source={{ uri: item.attachmentUrl || item.content }} style={styles.bubbleImage} />
          ) : item.content ? (
            <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
              {item.content}
            </Text>
          ) : null}
          <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeOther]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {isMe ? ' · ✓' : ''}
          </Text>
        </View>
      </View>
    )
  }

  if (isLoading && messages.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {chatMeta?.influencerName || chatMeta?.name || 'Chat'}
          </Text>
          <Text style={styles.headerStatus}>
            {isOtherTyping ? 'typing…' : otherPresence?.online ? '● Online' : otherPresence?.lastSeen ? `Last seen ${new Date(otherPresence.lastSeen).toLocaleString()}` : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setSearchMode((s) => !s)} style={styles.headerAction}>
          <Text style={styles.headerActionText}>{searchMode ? '×' : '🔍'}</Text>
        </TouchableOpacity>
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
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {isOtherTyping && (
          <View style={styles.typingHint}>
            <Text style={styles.typingHintText}>typing…</Text>
          </View>
        )}

        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachBtn} onPress={handleAttach}>
            <Text style={styles.attachText}>🖼️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachBtn} onPress={handleAttachDocument}>
            <Text style={styles.attachText}>📎</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={handleInputChange}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            disabled={!input.trim() || isSending}
            onPress={handleSend}
          >
            <Text style={styles.sendText}>{isSending ? '…' : '➤'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerBack: { paddingRight: spacing.sm },
  headerBackText: { color: colors.primary, fontSize: 28, fontWeight: '300' },
  headerTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  headerStatus: { color: colors.textMuted, fontSize: 12 },
  headerAction: { paddingHorizontal: spacing.sm },
  headerActionText: { color: colors.text, fontSize: 18 },
  searchBar: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  searchInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
  },
  messagesList: { padding: spacing.md, paddingBottom: spacing.lg },
  bubbleRow: { flexDirection: 'row', marginBottom: spacing.sm },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubbleRowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 16, padding: spacing.sm, paddingHorizontal: spacing.md },
  bubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextMe: { color: colors.white },
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
  typingHint: { paddingHorizontal: spacing.md, paddingBottom: spacing.xs },
  typingHintText: { color: colors.textMuted, fontStyle: 'italic', fontSize: 12 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  attachBtn: { padding: spacing.sm },
  attachText: { fontSize: 22 },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    maxHeight: 100,
    fontSize: 15,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: colors.white, fontSize: 18 },
})
