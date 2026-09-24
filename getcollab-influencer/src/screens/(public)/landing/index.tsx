import React, { useEffect } from 'react'
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, overline } from '@/src/theme'
import { useAuthStore } from '@shared/stores/auth-store'
import { InfluencerNavigationProp } from '@/src/types/navigation'
import * as Haptics from 'expo-haptics'
import { BrandLogo } from '@shared/components/BrandLogo'

const { width } = Dimensions.get('window')

export default function LandingScreen({ navigation }: { navigation: InfluencerNavigationProp }) {
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) navigation.replace('Main')
  }, [isAuthenticated, navigation])

  return (
    <View style={styles.root}>
      {/* Ambient purple glow */}
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Decorative grid + scan line */}
        <View style={styles.gridBg} pointerEvents="none">
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={`h-${i}`} style={[styles.gridLineH, { top: 90 + i * 90 }]} />
          ))}
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={`v-${i}`} style={[styles.gridLineV, { left: (width / 4) * i }]} />
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <View
              key={`d-${i}`}
              style={[
                styles.dot,
                { top: 70 + i * 62, left: (i * 83) % (width - 60) },
              ]}
            />
          ))}
          <View style={styles.cornerTL} />
          <View style={styles.cornerBR} />
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Animated.View entering={FadeIn.duration(400)} style={styles.logoWrap}>
            <BrandLogo size={36} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.headingWrap}>
            <View style={styles.eyebrowRow}>
              <View style={styles.eyebrowDash} />
              <Text style={styles.eyebrow}>For creators</Text>
            </View>
            <Text style={styles.heading}>
              Turn your{'\n'}audience into{'\n'}
              <Text style={styles.headingAccent}>income.</Text>
            </Text>
            <Text style={styles.subheading}>
              Find brand campaigns, apply and get paid.
            </Text>
          </Animated.View>
        </View>

        {/* Footer CTAs */}
        <Animated.View entering={FadeInDown.delay(280).duration(500)} style={styles.footer}>

          <Pressable
            testID="landing-creator-btn"
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('SignUp') }}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
            ]}
          >
            <View style={styles.primaryInner}>
              <Ionicons name="flash" size={18} color={colors.black} />
              <Text style={styles.primaryBtnText}>Sign up</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.black} />
            </View>
          </Pressable>

          <Pressable
            testID="landing-signin-btn"
            onPress={() => navigation.navigate('SignIn')}
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.secondaryBtnText}>Sign in</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  safe: { flex: 1, justifyContent: 'space-between' },

  // Soft white glows — cheap, GPU-friendly approximation of a glow
  glowTop: {
    position: 'absolute',
    top: -120,
    right: -110,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -150,
    left: -90,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },

  gridBg: { position: 'absolute', inset: 0 },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.04)' },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.03)' },
  dot: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.25)' },
  cornerTL: {
    position: 'absolute', top: 24, left: spacing.xl, width: 18, height: 18,
    borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
  },
  cornerBR: {
    position: 'absolute', bottom: 24, right: spacing.xl, width: 18, height: 18,
    borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
  },

  hero: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },

  headingWrap: { marginTop: spacing.xxxl },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  eyebrowDash: { width: 20, height: 2, backgroundColor: colors.primary },
  eyebrow: { ...overline },
  heading: { color: colors.text, fontSize: 44, fontWeight: '800', lineHeight: 50, letterSpacing: -1.5 },
  headingAccent: { color: colors.primary },
  subheading: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: spacing.lg, maxWidth: 320 },

  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.md },

  primaryBtn: {
    borderRadius: 999, overflow: 'hidden',
  },
  primaryInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 18, backgroundColor: colors.primary,
  },
  primaryBtnText: { color: colors.black, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },

  secondaryBtn: { alignItems: 'center', paddingVertical: spacing.md },
  secondaryBtnText: { color: colors.textMuted, fontSize: 14, fontWeight: '500' },
})