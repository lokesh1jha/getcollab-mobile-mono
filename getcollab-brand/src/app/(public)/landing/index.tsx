import React, { useEffect } from 'react'
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, spacing, overline } from '@/src/theme'
import { useAuthStore } from '@shared/stores/auth-store'
import * as Haptics from 'expo-haptics'
import { BrandLogo } from '@shared/components/BrandLogo'

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
            <BrandLogo size={36} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.headingWrap}>
            <Text style={styles.eyebrow}>For brands</Text>
            <Text style={styles.heading}>
              Find creators that{'\n'}actually <Text style={styles.headingAccent}>convert.</Text>
            </Text>
            <Text style={styles.subheading}>
              Run campaigns and pay creators, all in one app.
            </Text>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.footer}>

          <Pressable
            testID="landing-get-started-btn"
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('SignUp') }}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.primaryGradient}>
              <Text style={styles.primaryBtnText}>Get started</Text>
              <Ionicons name="arrow-forward" size={18} color="#000" />
            </View>
          </Pressable>

          <Pressable
            testID="landing-sign-in-btn"
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
  root: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1, justifyContent: 'space-between' },
  hero: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  gridBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  dot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },

  headingWrap: { marginTop: spacing.xxxl + spacing.lg },
  eyebrow: { ...overline, marginBottom: spacing.md },
  heading: { color: '#fff', fontSize: 40, fontWeight: '800', lineHeight: 46, letterSpacing: -1.2 },
  headingAccent: { color: colors.primary },
  subheading: { color: 'rgba(255,255,255,0.65)', fontSize: 15, lineHeight: 22, marginTop: spacing.lg, maxWidth: 320 },

  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.md },

  primaryBtn: { borderRadius: radius.pill, overflow: 'hidden' },
  primaryGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 18, backgroundColor: colors.primary,
  },
  primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  secondaryBtn: { alignItems: 'center', paddingVertical: spacing.md },
  secondaryBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },
})
