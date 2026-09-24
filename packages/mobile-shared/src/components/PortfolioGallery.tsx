import React, { useState } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, Modal } from 'react-native'
import { Image } from 'expo-image'
import { colors, spacing } from '@/src/theme'

interface PortfolioItem {
  id: string
  url: string
}

// ponytail: read-only; the edit mode uploaded to /profile/upload, which the API
// does not have, and no screen enabled it. Add editing via uploadMediaBlob when needed.
export function PortfolioGallery({ items }: { items: PortfolioItem[] }) {
  const [preview, setPreview] = useState<PortfolioItem | null>(null)

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}
            onPress={() => setPreview(item)}
            accessibilityRole="imagebutton"
            accessibilityLabel="View portfolio image"
          >
            <Image transition={200} source={{ uri: item.url }} style={styles.tileImage} />
          </Pressable>
        ))}

        {items.length === 0 && <Text style={styles.emptyText}>No portfolio images yet.</Text>}
      </ScrollView>

      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable
          style={styles.previewOverlay}
          onPress={() => setPreview(null)}
          accessibilityRole="button"
          accessibilityLabel="Close preview"
        >
          {preview && <Image transition={200} source={{ uri: preview.url }} style={styles.previewImage} contentFit="contain" />}
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginVertical: spacing.sm },
  row: { gap: spacing.sm },
  tile: {
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.card,
    marginRight: spacing.sm,
  },
  tileImage: { width: '100%', height: '100%' },
  emptyText: { color: colors.textMuted, fontSize: 14, padding: spacing.lg },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: { width: '100%', height: '80%' },
})
