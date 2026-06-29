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
    if (isAuthenticated) {
      navigation.replace('Main')
    }
  }, [isAuthenticated, navigation])

  return (
    <View style={styles.root} testID="landing-screen">
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.hero}>
          <View style={styles.gridBg} pointerEvents="none">
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={[styles.dot, { top: 40 + i * 36, left: (i * 53) % (width - 60) }]} />
            ))}
          </View>

          <Animated.View entering={FadeIn.duration(400)} style={styles.logoWrap}>
            <Image source={require('../../../../assets/getcollab_only_logo.png')} style={styles.logoImg} resizeMode="contain" />
            <Text style={styles.logoText}><Text style={styles.logoGet}>Get</Text><Text style={styles.logoCollab}>Collab</Text></Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.headingWrap}>
            <Text style={styles.eyebrow}>AI-POWERED INFLUENCER MARKETING</Text>
            <Text style={styles.heading}>
              Find creators that{'\n'}actually <Text style={styles.headingAccent}>convert.</Text>
            </Text>
            <Text style={styles.subheading}>
              Discover, evaluate, and collaborate with the right creators — powered by AI matching across 50M+ profiles.
            </Text>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.footer}>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>50M+</Text>
              <Text style={styles.statLabel}>Creators</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>12K</Text>
              <Text style={styles.statLabel}>Brands</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>4.8×</Text>
              <Text style={styles.statLabel}>Avg ROAS</Text>
            </View>
          </View>

          <Pressable
            testID="landing-get-started-btn"
            onPress={() => navigation.navigate('SignUp')}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.primaryGradient}>
              <Text style={styles.primaryBtnText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={18} color="#000" />
            </View>
          </Pressable>

          <Pressable
            testID="landing-sign-in-btn"
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  safe: { flex: 1, justifyContent: 'space-between' },
  hero: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  gridBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  dot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(217,255,0,0.35)' },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  logoImg: { width: 36, height: 36 },
  logoText: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  logoGet: { color: '#fff' },
  logoCollab: { color: colors.neon },

  headingWrap: { marginTop: spacing.xxxl + spacing.lg },
  eyebrow: { color: colors.neon, fontSize: 11, fontWeight: '700', letterSpacing: 1.4, marginBottom: spacing.md },
  heading: { color: '#fff', fontSize: 40, fontWeight: '800', lineHeight: 46, letterSpacing: -1.2 },
  headingAccent: { color: colors.neon },
  subheading: { color: 'rgba(255,255,255,0.65)', fontSize: 15, lineHeight: 22, marginTop: spacing.lg, maxWidth: 320 },

  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.md },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#1f1f1f',
    borderRadius: radius.lg, paddingVertical: spacing.lg, paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 28, backgroundColor: '#1f1f1f' },
  statValue: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2, letterSpacing: 0.4 },

  primaryBtn: { borderRadius: radius.pill, overflow: 'hidden' },
  primaryGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 18, backgroundColor: colors.neon,
  },
  primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  secondaryBtn: { alignItems: 'center', paddingVertical: spacing.md },
  secondaryBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },
})
