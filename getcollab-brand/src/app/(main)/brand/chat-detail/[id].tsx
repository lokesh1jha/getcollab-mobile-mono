import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { StyleSheet, View, ActivityIndicator, Text, Pressable, TextInput, Alert, FlatList, Image, KeyboardAvoidingView, Platform } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePickerLib from 'expo-image-picker'
import { colors, radius, spacing } from '@/src/theme'
import { useChatStore } from '@shared/stores/chat-store'
import { useAuthStore } from '@shared/stores/auth-store'
import { handleApiError } from '@shared/services/api'
import type { Message } from '@shared/types'

interface Props { navigation?: any; route?: any }

export default function ChatDetailScreen({ navigation, route }: Props) {
  const roomId = route?.params?.id || route?.params?.roomId
  const chatMeta = route?.params?.chat
  const otherUserId = chatMeta?.influencerId || chatMeta?.userId || chatMeta?.brandId

  const { messages, fetchMessages, sendMessage, sendImage, isLoading, isSending, markRoomRead, setTyping, typingUsers, presence, socket, initializeSocket } = useChatStore()
  const { user } = useAuthStore()
  const [input, setInput] = useState('')
  const [searchMode, setSearchMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listRef = useRef<FlatList<Message>>(null)

  useEffect(() => {
    if (roomId) { fetchMessages(roomId); markRoomRead(roomId) }
    if (!socket) initializeSocket()
    return () => { if (typingTimer.current) clearTimeout(typingTimer.current) }
  }, [roomId])

  const handleSend = async () => {
    if (!input.trim() || !roomId) return
    const text = input.trim(); setInput(''); setTyping(roomId, false)
    try { await sendMessage(roomId, text) } catch (err) { handleApiError(err, 'Failed to send') }
  }

  const handleAttach = async () => {
    const { status } = await ImagePickerLib.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Permission Denied', 'Enable photo library access in settings.'); return }
    try {
      const result = await ImagePickerLib.launchImageLibraryAsync({ mediaTypes: ImagePickerLib.MediaTypeOptions.Images, quality: 0.7, base64: true })
      if (result.canceled || !result.assets[0]?.base64) return
      await sendImage(roomId, `data:image/jpeg;base64,${result.assets[0].base64}`)
    } catch (err) { handleApiError(err, 'Image send failed') }
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

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.senderId === user?.id
    const isImage = item.type === 'image' || item.attachmentUrl
    const prev = messages[index - 1]
    const showAvatar = !isMe && (!prev || prev.senderId !== item.senderId)
    return (
      <View style={[styles.bubbleRow, isMe && { justifyContent: 'flex-end' }]}>
        {!isMe && (showAvatar ? <View style={styles.bubbleAvatar}><Text style={styles.bubbleAvatarText}>{(chatMeta?.influencerName || '?').charAt(0)}</Text></View> : <View style={styles.bubbleAvatarSpacer} />)}
        <View style={[styles.bubble, isMe ? styles.bubbleMine : styles.bubbleTheirs]}>
          {isImage ? (
            <Image source={{ uri: item.attachmentUrl || item.content }} style={styles.bubbleImage} />
          ) : (
            <Text style={styles.bubbleText}>{item.content}</Text>
          )}
          <Text style={[styles.bubbleTime, isMe && { color: 'rgba(255,255,255,0.45)' }]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    )
  }

  if (isLoading && messages.length === 0) {
    return <SafeAreaView style={styles.root}><View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={colors.neon} /></View></SafeAreaView>
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1 }}>
          <View style={styles.header}>
            <Pressable hitSlop={12} onPress={() => navigation?.goBack()} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.75 }]}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <View style={styles.peerWrap}>
              <View>
                <View style={styles.peerAvatar}><Text style={styles.peerAvatarText}>{(chatMeta?.influencerName || 'C').charAt(0)}</Text></View>
                {otherPresence?.online && <View style={styles.onlineDot} />}
              </View>
              <View>
                <Text style={styles.peerName} numberOfLines={1}>{chatMeta?.influencerName || chatMeta?.name || 'Chat'}</Text>
                <Text style={styles.peerStatus}>{isOtherTyping ? 'typing…' : otherPresence?.online ? 'Online' : ''}</Text>
              </View>
            </View>
            <Pressable hitSlop={12} onPress={() => setSearchMode((s) => !s)} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.75 }]}>
              <Ionicons name={searchMode ? 'close' : 'search'} size={20} color="#fff" />
            </Pressable>
          </View>

          {searchMode && (
            <View style={styles.searchBar}>
              <TextInput style={styles.searchInput} placeholder="Search this conversation…" placeholderTextColor={colors.textSubtle} value={searchQuery} onChangeText={setSearchQuery} autoFocus />
            </View>
          )}

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={64}>
            <FlatList
              ref={listRef}
              data={filteredMessages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 6 }}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            />

            {isOtherTyping && <View style={styles.typingHint}><Text style={styles.typingHintText}>typing…</Text></View>}

            <View style={styles.composer}>
              <Pressable hitSlop={8} style={({ pressed }) => [styles.attachBtn, pressed && { opacity: 0.75 }]} onPress={handleAttach}>
                <Ionicons name="add" size={20} color="#fff" />
              </Pressable>
              <TextInput style={styles.composerInput} placeholder="Message…" placeholderTextColor={colors.textSubtle} value={input} onChangeText={handleInputChange} multiline />
              <Pressable
                style={({ pressed }) => [styles.sendBtn, !input.trim() && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}
                disabled={!input.trim() || isSending}
                onPress={handleSend}
              >
                <Ionicons name="arrow-up" size={18} color="#000" />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  peerWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.md },
  peerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  peerAvatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.bg },
  peerName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  peerStatus: { color: colors.textMuted, fontSize: 11, marginTop: 1 },

  searchBar: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  searchInput: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: '#fff', fontSize: 14 },

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  bubbleAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  bubbleAvatarText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  bubbleAvatarSpacer: { width: 24 },
  bubble: { maxWidth: '78%', paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: 18, gap: 2 },
  bubbleMine: { backgroundColor: colors.blue, borderBottomRightRadius: 6 },
  bubbleTheirs: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 6 },
  bubbleText: { color: '#fff', fontSize: 14, lineHeight: 19 },
  bubbleTime: { color: colors.textMuted, fontSize: 10, alignSelf: 'flex-end', marginTop: 2 },
  bubbleImage: { width: 200, height: 200, borderRadius: 12 },

  typingHint: { paddingHorizontal: spacing.md, paddingBottom: spacing.xs },
  typingHintText: { color: colors.textMuted, fontStyle: 'italic', fontSize: 12 },

  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, paddingBottom: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  attachBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  composerInput: { flex: 1, color: '#fff', fontSize: 14, lineHeight: 19, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: spacing.md, paddingVertical: 10, maxHeight: 110 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.neon, alignItems: 'center', justifyContent: 'center' },
})
