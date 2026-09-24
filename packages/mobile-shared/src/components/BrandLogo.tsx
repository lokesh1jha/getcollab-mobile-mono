import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { colors } from '@/src/theme'

const LOGO = require('../../assets/getcollab-logo.png')

// Matches the web wordmark (getcollab/src/components/ui/brand-logo.tsx):
// icon on a white rounded tile, "Get" in white, "Collab" in the logo blue.
export function BrandLogo({ size = 28 }: { size?: number }) {
  return (
    <View style={styles.row} accessibilityRole="image" accessibilityLabel="GetCollab">
      <View style={[styles.tile, { width: size, height: size, borderRadius: Math.round(size * 0.28) }]}>
        <Image source={LOGO} style={{ width: size - 4, height: size - 4 }} contentFit="contain" />
      </View>
      <Text style={[styles.word, { fontSize: Math.round(size * 0.64) }]}>
        <Text style={{ color: colors.text }}>Get</Text>
        <Text style={{ color: colors.logoAccent }}>Collab</Text>
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tile: { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  word: { fontWeight: '800', letterSpacing: -0.4 },
})
