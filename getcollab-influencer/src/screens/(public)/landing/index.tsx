import React, { useEffect } from 'react'
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { spacing } from '@/src/theme'
import { useAuthStore } from '@shared/stores/auth-store'

const { width } = Dimensions.get('window')

export default function LandingScreen({ navigation }: any) {
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
            <View style={styles.logoBox}>
              <Image source={require('../../../../assets/icon.png')} style={styles.logoImg} resizeMode="contain" />
            </View>
            <Text style={styles.logoText}>
              <Text style={styles.logoGet}>GET</Text>
              <Text style={styles.logoCollab}>COLLAB</Text>
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.headingWrap}>
            <View style={styles.eyebrowRow}>
              <View style={styles.eyebrowDash} />
              <Text style={styles.eyebrow}>FOR CREATORS & INFLUENCERS</Text>
            </View>
            <Text style={styles.heading}>
              Turn your{'\n'}audience into{'\n'}
              <Text style={styles.headingAccent}>income.</Text>
            </Text>
            <Text style={styles.subheading}>
              Discover brand campaigns, apply in seconds, and get paid — all in one place.
            </Text>
          </Animated.View>
        </View>

        {/* Footer CTAs */}
        <Animated.View entering={FadeInDown.delay(280).duration(500)} style={styles.footer}>
          <View style={styles.statsRow}>
            <Stat value="50M+" label="Creators" />
            <View style={styles.statDivider} />
            <Stat value="12K" label="Brands" />
            <View style={styles.statDivider} />
            <Stat value="4.8×" label="Avg ROAS" />
          </View>

          <Pressable
            testID="landing-creator-btn"
            onPress={() => navigation.navigate('SignUp')}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
            ]}
          >
            <View style={styles.primaryInner}>
              <Ionicons name="flash" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Start as Creator</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </View>
          </Pressable>

          <Pressable
            testID="landing-signin-btn"
            onPress={() => navigation.navigate('SignIn')}
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.secondaryBtnText}>I already have an account</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  safe: { flex: 1, justifyContent: 'space-between' },

  // Soft blurred purple glows — cheap, GPU-friendly approximation of a glow
  glowTop: {
    position: 'absolute',
    top: -120,
    right: -110,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(109,106,253,0.16)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -150,
    left: -90,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(124,124,255,0.10)',
  },

  gridBg: { position: 'absolute', inset: 0 },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(124,124,255,0.09)' },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(124,124,255,0.06)' },
  dot: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(141,139,255,0.4)' },
  cornerTL: {
    position: 'absolute', top: 24, left: spacing.xl, width: 18, height: 18,
    borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: 'rgba(141,139,255,0.55)',
  },
  cornerBR: {
    position: 'absolute', bottom: 24, right: spacing.xl, width: 18, height: 18,
    borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: 'rgba(141,139,255,0.55)',
  },

  hero: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  logoBox: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#17171C',
    borderWidth: 1, borderColor: 'rgba(124,124,255,0.28)', alignItems: 'center', justifyContent: 'center',
  },
  logoImg: { width: 22, height: 22 },
  logoText: { fontSize: 19, fontWeight: '800', letterSpacing: 1.2 },
  logoGet: { color: '#8B8BA0' },
  logoCollab: { color: '#FFFFFF' },

  headingWrap: { marginTop: spacing.xxxl },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  eyebrowDash: { width: 20, height: 2, backgroundColor: '#8D8BFF' },
  eyebrow: { color: '#8B8BA0', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  heading: { color: '#FFFFFF', fontSize: 44, fontWeight: '800', lineHeight: 50, letterSpacing: -1.5 },
  headingAccent: { color: '#8D8BFF' },
  subheading: { color: '#C7C7D4', fontSize: 15, lineHeight: 22, marginTop: spacing.lg, maxWidth: 320 },

  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.md },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(124,124,255,0.18)',
    borderRadius: 20, paddingVertical: spacing.lg, paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    shadowColor: '#6D6AFD', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20,
    elevation: 4,
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(124,124,255,0.18)' },
  statValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  statLabel: { color: '#8B8BA0', fontSize: 11, marginTop: 2, letterSpacing: 0.4 },

  primaryBtn: {
    borderRadius: 999, overflow: 'hidden',
    shadowColor: '#6D6AFD', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 20,
    elevation: 8,
  },
  primaryInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 18, backgroundColor: '#6D6AFD',
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },

  secondaryBtn: { alignItems: 'center', paddingVertical: spacing.md },
  secondaryBtnText: { color: '#8B8BA0', fontSize: 14, fontWeight: '500' },
})