import React, { useState } from 'react'
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, spacing } from '@/src/theme'
import { handleApiError } from '@shared/services/api'
import { useAuthStore } from '@shared/stores/auth-store'

interface ScreenProps { navigation?: any }

export default function SignInScreen({ navigation }: ScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({ email: '', password: '' })

  const validateForm = () => {
    let valid = true
    const newErrors = { email: '', password: '' }
    if (!email) { newErrors.email = 'Email is required'; valid = false }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { newErrors.email = 'Please enter a valid email'; valid = false }
    if (!password) { newErrors.password = 'Password is required'; valid = false }
    else if (password.length < 6) { newErrors.password = 'Min 6 characters'; valid = false }
    setErrors(newErrors)
    return valid
  }

  const handleSignIn = async () => {
    if (!validateForm()) return
    setLoading(true)
    try {
      await useAuthStore.getState().signIn(email, password)
    } catch (error: any) {
      handleApiError(error, 'Failed to sign in. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <View style={styles.root} testID="sign-in-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.header}>
            <Pressable testID="sign-in-back-btn" hitSlop={12} onPress={() => navigation?.goBack()} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.75 }]}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <View style={styles.brandRow}>
              <Image source={require('../../../../assets/getcollab_only_logo.png')} style={styles.logoImg} resizeMode="contain" />
              <Text style={styles.logoText}><Text style={styles.logoGet}>Get</Text><Text style={styles.logoCollab}>Collab</Text></Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Animated.View entering={FadeInDown.duration(400)} style={styles.body}>
              <Text style={styles.eyebrow}>WELCOME BACK</Text>
              <Text style={styles.heading}>Sign in to your{'\n'}brand workspace</Text>
              <Text style={styles.sub}>Continue where you left off.</Text>

              <View style={{ gap: spacing.md, marginTop: spacing.xxl }}>
                <View>
                  <Text style={styles.fieldLabel}>Work email</Text>
                  <View style={[styles.fieldWrap, errors.email && styles.fieldError]}>
                    <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
                    <TextInput
                      testID="sign-in-email"
                      value={email}
                      onChangeText={(v) => { setEmail(v); setErrors({ ...errors, email: '' }) }}
                      placeholder="you@company.com"
                      placeholderTextColor={colors.textSubtle}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      style={styles.fieldInput}
                    />
                  </View>
                  {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
                </View>

                <View>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <View style={[styles.fieldWrap, errors.password && styles.fieldError]}>
                    <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                    <TextInput
                      testID="sign-in-password"
                      value={password}
                      onChangeText={(v) => { setPassword(v); setErrors({ ...errors, password: '' }) }}
                      secureTextEntry
                      placeholder="Enter password"
                      placeholderTextColor={colors.textSubtle}
                      style={styles.fieldInput}
                    />
                  </View>
                  {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                </View>
              </View>

              <Pressable testID="sign-in-forgot" style={styles.forgotRow} onPress={() => navigation?.navigate('ForgotPassword')}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>

              <Pressable
                testID="sign-in-submit-btn"
                onPress={handleSignIn}
                disabled={loading}
                style={({ pressed }) => [styles.primaryBtn, pressed && !loading && { opacity: 0.85 }]}
              >
                <View style={styles.primaryGradient}>
                  <Text style={styles.primaryBtnText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
                  {!loading && <Ionicons name="arrow-forward" size={18} color="#000" />}
                </View>
              </Pressable>

              <View style={styles.divider}>
                <View style={styles.line} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.line} />
              </View>

              <Pressable testID="sign-in-google-btn" style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.85 }]}>
                <Ionicons name="logo-google" size={18} color="#fff" />
                <Text style={styles.socialBtnText}>Continue with Google</Text>
              </Pressable>

              <View style={styles.bottomRow}>
                <Text style={styles.bottomText}>New to GetCollab? </Text>
                <Pressable testID="sign-in-go-signup" onPress={() => navigation?.navigate('SignUp')}>
                  <Text style={styles.bottomLink}>Create account</Text>
                </Pressable>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  scrollContent: { flexGrow: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm,
  },
  iconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#1f1f1f', alignItems: 'center', justifyContent: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoImg: { width: 28, height: 28 },
  logoText: { fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  logoGet: { color: '#fff' },
  logoCollab: { color: colors.neon },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  eyebrow: { color: colors.neon, fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  heading: { color: '#fff', fontSize: 30, fontWeight: '800', lineHeight: 36, letterSpacing: -1, marginTop: spacing.md },
  sub: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: spacing.sm },

  fieldLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600', letterSpacing: 0.4, marginBottom: 8 },
  fieldWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#262626', borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: 14, backgroundColor: '#0A0A0A',
  },
  fieldError: { borderColor: colors.error },
  fieldInput: { flex: 1, color: '#fff', fontSize: 15, padding: 0 },
  errorText: { color: colors.error, fontSize: 11, marginTop: 4, marginLeft: 2 },

  forgotRow: { alignSelf: 'flex-end', marginTop: spacing.md },
  forgotText: { color: colors.neon, fontSize: 13, fontWeight: '600' },

  primaryBtn: { borderRadius: radius.pill, overflow: 'hidden', marginTop: spacing.xl },
  primaryGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 18, backgroundColor: colors.neon,
  },
  primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: spacing.xl },
  line: { flex: 1, height: 1, backgroundColor: '#1f1f1f' },
  dividerText: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },

  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: '#262626', borderRadius: radius.pill,
    paddingVertical: 16, marginTop: spacing.lg,
  },
  socialBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xxl, paddingBottom: spacing.xl },
  bottomText: { color: 'rgba(255,255,255,0.55)', fontSize: 13 },
  bottomLink: { color: colors.neon, fontSize: 13, fontWeight: '700' },
})
