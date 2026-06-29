import React, { useEffect } from 'react'
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, spacing } from '@/src/theme'
import { useAuthStore } from '@shared/stores/auth-store'

const { width } = Dimensions.get('window')

export default function LandingScreen({ navigation }: any) {
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) navigation.replace('Main')
  }, [isAuthenticated, navigation])

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Decorative neon dots */}
        <View style={styles.gridBg} pointerEvents="none">
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={[styles.dot, { top: 60 + i * 48, left: (i * 67) % (width - 60) }]} />
          ))}
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Animated.View entering={FadeIn.duration(400)} style={styles.logoWrap}>
            <Image source={require('../../../../assets/icon.png')} style={styles.logoImg} resizeMode="contain" />
            <Text style={styles.logoText}>
              <Text style={styles.logoGet}>Get</Text>
              <Text style={styles.logoCollab}>Collab</Text>
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.headingWrap}>
            <Text style={styles.eyebrow}>FOR CREATORS & INFLUENCERS</Text>
            <Text style={styles.heading}>
              Turn your{'\n'}audience into{'\n'}<Text style={styles.headingAccent}>income.</Text>
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
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.primaryGradient}>
              <Ionicons name="flash" size={18} color="#000" />
              <Text style={styles.primaryBtnText}>Start as Creator</Text>
              <Ionicons name="arrow-forward" size={18} color="#000" />
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
  root: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1, justifyContent: 'space-between' },
  gridBg: { position: 'absolute', inset: 0 },
  dot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: colors.neonSoft },

  hero: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  logoImg: { width: 32, height: 32 },
  logoText: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  logoGet: { color: colors.text },
  logoCollab: { color: colors.neon },

  headingWrap: { marginTop: spacing.xxxl },
  eyebrow: { color: colors.neon, fontSize: 11, fontWeight: '700', letterSpacing: 1.4, marginBottom: spacing.md },
  heading: { color: colors.text, fontSize: 44, fontWeight: '800', lineHeight: 50, letterSpacing: -1.5 },
  headingAccent: { color: colors.neon },
  subheading: { color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 22, marginTop: spacing.lg, maxWidth: 320 },

  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.md },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, paddingVertical: spacing.lg, paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2, letterSpacing: 0.4 },

  primaryBtn: { borderRadius: radius.pill, overflow: 'hidden' },
  primaryGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 18, backgroundColor: colors.neon,
  },
  primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },

  secondaryBtn: { alignItems: 'center', paddingVertical: spacing.md },
  secondaryBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '500' },
})
