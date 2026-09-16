import React from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, spacing } from '@/src/theme'

const TIPS = [
  {
    icon: 'globe-outline',
    title: 'Connect your website',
    body: 'Link your brand site so we can analyse SEO and creator-marketing alignment.',
  },
  {
    icon: 'search-outline',
    title: 'Run an SEO audit',
    body: 'Get a simple score for how your website and creator marketing work together.',
  },
  {
    icon: 'trending-up-outline',
    title: 'Track AI visibility',
    body: 'See how often your brand appears in AI search answers and recommendations.',
  },
  {
    icon: 'bulb-outline',
    title: 'Discover opportunities',
    body: 'Find high-intent keywords and content gaps your creators can fill.',
  },
]

export default function GrowthScreen({ navigation }: any) {
  const openWebGrowth = () => {
    Linking.openURL('https://app.getcollab.in/dashboard/growth').catch(() => {
      // fallback silent
    })
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={styles.title}>Growth</Text>
            <Text style={styles.subtitle}>SEO, AI visibility & opportunities</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.webCard}>
            <View style={styles.webIcon}>
              <Ionicons name="desktop-outline" size={24} color={colors.blue} />
            </View>
            <Text style={styles.webTitle}>Open Growth Workspace</Text>
            <Text style={styles.webBody}>
              The full Growth suite — SEO audits, AI visibility, keyword opportunities and search console — is available on the web dashboard.
            </Text>
            <Pressable style={({ pressed }) => [styles.webBtn, pressed && { opacity: 0.85 }]} onPress={openWebGrowth}>
              <Text style={styles.webBtnText}>Open in Browser</Text>
              <Ionicons name="open-outline" size={14} color="#000" />
            </Pressable>
          </Animated.View>

          <Text style={styles.sectionLabel}>QUICK TIPS</Text>
          {TIPS.map((tip, i) => (
            <Animated.View key={tip.title} entering={FadeInDown.delay(150 + i * 60).duration(320)} style={styles.tipCard}>
              <View style={styles.tipIcon}>
                <Ionicons name={tip.icon as any} size={18} color={colors.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipBody}>{tip.body}</Text>
              </View>
            </Animated.View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2, marginBottom: spacing.lg },

  webCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.lg },
  webIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  webTitle: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  webBody: { color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20, marginTop: spacing.sm },
  webBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.neon, borderRadius: radius.pill, paddingHorizontal: 20, paddingVertical: 12, marginTop: spacing.lg },
  webBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },

  sectionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.md },

  tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  tipIcon: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  tipTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  tipBody: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 2 },
})
