import React, { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError, uploadMediaBlob } from '@shared/services/api'

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
const ACCEPT_MIMES = [...IMAGE_MIMES, 'application/pdf', 'video/mp4', 'video/webm']

export default function AssetsScreen() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await apiService.getMediaLibrary()
      setItems(r?.items || r?.data || [])
    } catch (e) { handleApiError(e, 'Failed to load assets') }
    finally { setLoading(false) }
  }, [])
  useFocusEffect(useCallback(() => { load() }, [load]))

  const upload = async (file: { uri: string; mime: string; size: number; width?: number; height?: number }) => {
    if (!ACCEPT_MIMES.includes(file.mime)) {
      Alert.alert('Unsupported file', 'Only images, PDF, MP4 and WebM are supported.')
      return
    }
    setUploading(true)
    try {
      await uploadMediaBlob({ uri: file.uri, mime: file.mime, sizeBytes: file.size, width: file.width, height: file.height })
      Alert.alert('Uploaded', 'Your asset was uploaded and queued for review.')
      load()
    } catch (e) { handleApiError(e, 'Upload failed') }
    finally { setUploading(false) }
  }

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Permission needed', 'Enable photo library access to upload.'); return }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 })
    if (result.canceled || !result.assets[0]) return
    const a = result.assets[0]
    upload({ uri: a.uri, mime: a.mimeType || 'image/jpeg', size: a.fileSize || 0, width: a.width, height: a.height })
  }

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'video/mp4', 'video/webm'], copyToCacheDirectory: true })
    if (result.canceled || !result.assets[0]) return
    const a = result.assets[0]
    upload({ uri: a.uri, mime: a.mimeType || 'application/pdf', size: a.size || 0 })
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.neon} /></View>
  return (
    <View style={styles.root}>
      <View style={styles.uploadRow}>
        <Pressable disabled={uploading} onPress={pickPhoto} style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.85 }, uploading && { opacity: 0.5 }]}>
          <Ionicons name="image-outline" size={16} color="#000" />
          <Text style={styles.uploadText}>{uploading ? 'Uploading…' : 'Upload photo'}</Text>
        </Pressable>
        <Pressable disabled={uploading} onPress={pickFile} style={({ pressed }) => [styles.uploadBtnSecondary, pressed && { opacity: 0.85 }, uploading && { opacity: 0.5 }]}>
          <Ionicons name="document-outline" size={16} color={colors.text} />
          <Text style={styles.uploadSecondaryText}>PDF / video</Text>
        </Pressable>
      </View>
      <FlatList
        style={styles.root}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.neon} />}
        data={items}
        keyExtractor={(x) => String(x.id)}
        numColumns={2}
        columnWrapperStyle={styles.columns}
        ListEmptyComponent={<Text style={styles.empty}>No assets yet — upload your first one above.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.preview_url || item.previewUrl ? <Image source={{ uri: item.preview_url || item.previewUrl }} style={styles.image} /> : (
              <View style={styles.file}><Text style={styles.fileText}>{String(item.mime || 'FILE').split('/').pop()?.toUpperCase()}</Text></View>
            )}
            <Text style={styles.meta}>{Math.round(Number(item.size_bytes || item.sizeBytes || 0) / 1024)} KB · {item.scan_status || item.scanStatus || 'pending'}</Text>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  uploadRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  uploadBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.neon, borderRadius: radius.pill, paddingVertical: 12 },
  uploadText: { color: '#000', fontWeight: '800', fontSize: 13 },
  uploadBtnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingVertical: 12 },
  uploadSecondaryText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  list: { padding: spacing.lg, flexGrow: 1 },
  columns: { gap: spacing.md },
  card: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md },
  image: { width: '100%', aspectRatio: 1, borderRadius: radius.sm },
  file: { aspectRatio: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.elevated, borderRadius: radius.sm },
  fileText: { color: colors.text, fontWeight: '800' },
  meta: { color: colors.textMuted, fontSize: 11, marginTop: spacing.sm },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxxl },
})
