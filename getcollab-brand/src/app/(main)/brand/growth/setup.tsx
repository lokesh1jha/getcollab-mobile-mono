import React, { useState } from 'react'
import { View, Text, TextInput, Pressable, Alert, ScrollView, StyleSheet } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing, radius } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import { growthStyles } from '../../../../components/growth/growth-shared'

export default function GrowthSetupScreen({ navigation }: { navigation?: any }) {
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    const url = websiteUrl.trim()
    if (!url) {
      Alert.alert('Website needed', 'Enter your website URL.')
      return
    }
    setSaving(true)
    try {
      const siteRes = await apiService.upsertGrowthSite(url)
      const site = siteRes?.site || siteRes?.data || siteRes
      if (site?.id) {
        // Saving a site kicks off the first crawl so Overview has data on arrival.
        await apiService.analyzeGrowthSite(site.id).catch(() => undefined)
      }
      navigation?.navigate('Growth')
    } catch (err) {
      handleApiError(err, 'Could not save website')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={styles.title}>Set up Growth</Text>
            <Text style={styles.subtitle}>
              We’ll check your public pages and show what to fix first.
            </Text>

            <View style={styles.card}>
              <Text style={growthStyles.label}>Website URL</Text>
              <TextInput
                style={growthStyles.input}
                value={websiteUrl}
                onChangeText={setWebsiteUrl}
                placeholder="https://yourbrand.com"
                placeholderTextColor={colors.textSubtle}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <Text style={[growthStyles.meta, { marginTop: spacing.sm }]}>
                Public https sites only.
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={handleSubmit}
                disabled={saving}
                style={({ pressed }) => [growthStyles.primaryBtn, { marginTop: spacing.lg }, (pressed || saving) && { opacity: 0.7 }]}
              >
                <Text style={growthStyles.primaryBtnText}>{saving ? 'Starting…' : 'Analyze'}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
})
