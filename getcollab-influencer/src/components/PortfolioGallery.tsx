import React, { useState } from 'react'
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native'
import * as ImagePickerLib from 'expo-image-picker'
import { colors, spacing } from '@shared/constants'
import apiService, { handleApiError } from '@shared/services/api'

interface PortfolioItem {
  id: string
  url: string
  uploading?: boolean
}

interface PortfolioGalleryProps {
  items: PortfolioItem[]
  onChange: (items: PortfolioItem[]) => void
  editable?: boolean
  maxItems?: number
}

export function PortfolioGallery({ items, onChange, editable = false, maxItems = 9 }: PortfolioGalleryProps) {
  const [preview, setPreview] = useState<PortfolioItem | null>(null)

  const handleAdd = async () => {
    if (items.length >= maxItems) {
      Alert.alert('Limit reached', `Portfolio supports up to ${maxItems} images.`)
      return
    }
    const { status } = await ImagePickerLib.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please enable photo library access.')
      return
    }
    try {
      const result = await ImagePickerLib.launchImageLibraryAsync({
        mediaTypes: ImagePickerLib.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
        allowsEditing: false,
      })
      if (result.canceled || !result.assets[0]?.base64) return

      const tempId = `tmp-${Date.now()}`
      const draft: PortfolioItem = {
        id: tempId,
        url: result.assets[0].uri,
        uploading: true,
      }
      onChange([...items, draft])

      try {
        const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`
        const response = await apiService.uploadImage(base64)
        const url = response?.url || response?.imageUrl || response?.data?.url
        if (url) {
          onChange(replaceItem(items, tempId, { id: url, url, uploading: false }, draft))
        } else {
          throw new Error('Upload returned no URL')
        }
      } catch (err) {
        onChange(items)
        handleApiError(err, 'Portfolio upload failed')
      }
    } catch (err) {
      console.error('Portfolio pick failed:', err)
    }
  }

  const handleRemove = (id: string) => {
    Alert.alert('Remove image?', 'This will remove it from your portfolio.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => onChange(items.filter((i) => i.id !== id)),
      },
    ])
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.tile}
            onPress={() => (editable ? handleRemove(item.id) : setPreview(item))}
            onLongPress={() => editable && handleRemove(item.id)}
          >
            <Image source={{ uri: item.url }} style={styles.tileImage} />
            {item.uploading && (
              <View style={styles.tileOverlay}>
                <ActivityIndicator color={colors.white} />
              </View>
            )}
            {editable && !item.uploading && (
              <View style={styles.removeBadge}>
                <Text style={styles.removeText}>×</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        {editable && items.length < maxItems && (
          <TouchableOpacity style={[styles.tile, styles.addTile]} onPress={handleAdd}>
            <Text style={styles.addIcon}>＋</Text>
            <Text style={styles.addLabel}>Add</Text>
          </TouchableOpacity>
        )}

        {!editable && items.length === 0 && (
          <Text style={styles.emptyText}>No portfolio images yet.</Text>
        )}
      </ScrollView>

      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <TouchableOpacity style={styles.previewOverlay} activeOpacity={1} onPress={() => setPreview(null)}>
          {preview && <Image source={{ uri: preview.url }} style={styles.previewImage} resizeMode="contain" />}
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

function replaceItem(items: PortfolioItem[], tempId: string, next: PortfolioItem, draft: PortfolioItem): PortfolioItem[] {
  return [...items, draft].map((i) => (i.id === tempId ? next : i))
}

const styles = StyleSheet.create({
  container: { marginVertical: spacing.sm },
  row: { gap: spacing.sm },
  tile: {
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  tileImage: { width: '100%', height: '100%' },
  tileOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.error,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
  addTile: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcon: { fontSize: 28, color: colors.primary },
  addLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  emptyText: { color: colors.textMuted, fontSize: 14, padding: spacing.md },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: { width: '100%', height: '80%' },
})
