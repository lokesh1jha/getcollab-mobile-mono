import React, { useState } from 'react'
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { spacing } from '@/src/theme'
import { showSignInError } from '@shared/services/api'
import { useAuthStore } from '@shared/stores/auth-store'

interface Props { navigation?: any }

const palette = {
  bg: '#09090B',
  card: 'rgba(255,255,255,0.04)',
  border: 'rgba(124,124,255,0.18)',
  text: '#FFFFFF',
  textSecondary: '#C7C7D4',
  textMuted: '#8B8BA0',
  textSubtle: 'rgba(255,255,255,0.28)',
  accent: '#6D6AFD',
  accentBright: '#8D8BFF',
  error: '#FF6B6B',
}

export default function SignInScreen({ navigation }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({ email: '', password: '' })

  const validate = () => {
    let valid = true
    const e = { email: '', password: '' }
    if (!email) { e.email = 'Email is required'; valid = false }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { e.email = 'Enter a valid email'; valid = false }
    if (!password) { e.password = 'Password is required'; valid = false }
    else if (password.length < 6) { e.password = 'Min 6 characters'; valid = false }
    setErrors(e)
    return valid
  }

  const handleSignIn = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      await useAuthStore.getState().signIn(email, password)
    } catch (error: any) {
      if (error.code === 'email_unverified') {
        navigation?.navigate('VerifyEmail', { email })
      } else {
        showSignInError(error, () => navigation?.navigate('SignUp'))
      }
    } finally { setLoading(false) }
  }

  const handleSocialSignIn = async (provider: 'google' | 'facebook' | 'instagram') => {
    // TODO: wire up to your OAuth flow, e.g. useAuthStore.getState().signInWithProvider(provider)
    console.log(`Sign in with ${provider}`)
  }

  return (
    <View style={styles.root}>
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.header}>
            <Pressable hitSlop={12} onPress={() => navigation?.goBack()} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.75 }]}>
              <Ionicons name="chevron-back" size={22} color={palette.text} />
            </Pressable>
            <View style={styles.brandRow}>
              <Image source={require('../../../../assets/icon.png')} style={styles.logoImg} resizeMode="contain" />
              <Text style={styles.logoText}><Text style={styles.logoGet}>Get</Text><Text style={styles.logoCollab}>Collab</Text></Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.body}>
              <Text style={styles.eyebrow}>WELCOME BACK</Text>
              <Text style={styles.heading}>Sign in to your{'\n'}creator account</Text>
              <Text style={styles.sub}>Pick up where you left off.</Text>

              <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
                <FieldInput label="Email" icon="mail-outline" value={email} onChange={setEmail} error={errors.email} clearError={() => setErrors({ ...errors, email: '' })} placeholder="you@example.com" keyboard="email-address" />
                <FieldInput label="Password" icon="lock-closed-outline" value={password} onChange={setPassword} error={errors.password} clearError={() => setErrors({ ...errors, password: '' })} placeholder="Enter password" secure />
              </View>

              <Pressable style={styles.forgotRow} onPress={() => navigation?.navigate('ForgotPassword')}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>

              <Pressable
                onPress={handleSignIn}
                disabled={loading}
                style={({ pressed }) => [styles.primaryBtn, pressed && !loading && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
              >
                <View style={styles.primaryInner}>
                  <Ionicons name="flash" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
                  {!loading && <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
                </View>
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialRow}>
                <Pressable onPress={() => handleSocialSignIn('google')} style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.7 }]}>
                  <Ionicons name="logo-google" size={20} color={palette.text} />
                </Pressable>
                <Pressable onPress={() => handleSocialSignIn('facebook')} style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.7 }]}>
                  <Ionicons name="logo-facebook" size={20} color="#1877F2" />
                </Pressable>
                <Pressable onPress={() => handleSocialSignIn('instagram')} style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.7 }]}>
                  <Ionicons name="logo-instagram" size={20} color="#E1306C" />
                </Pressable>
              </View>

              <View style={styles.bottomRow}>
                <Text style={styles.bottomText}>New to GetCollab? </Text>
                <Pressable onPress={() => navigation?.navigate('SignUp')}>
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

function FieldInput({ label, icon, value, onChange, error, clearError, placeholder, secure, keyboard }: {
  label: string; icon: any; value: string; onChange: (v: string) => void;
  error?: string; clearError?: () => void; placeholder?: string; secure?: boolean; keyboard?: any
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldWrap, !!error && styles.fieldError]}>
        <Ionicons name={icon} size={18} color={palette.textMuted} />
        <TextInput
          value={value}
          onChangeText={(v) => { onChange(v); clearError?.() }}
          placeholder={placeholder}
          placeholderTextColor={palette.textSubtle}
          autoCapitalize="none"
          keyboardType={keyboard}
          secureTextEntry={secure}
          style={styles.fieldInput}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },

  glowTop: {
    position: 'absolute',
    top: -100,
    left: -110,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(109,106,253,0.14)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -130,
    right: -90,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(124,124,255,0.10)',
  },

  scrollContent: { flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  iconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: palette.border, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoImg: { width: 26, height: 26 },
  logoText: { fontSize: 17, fontWeight: '800', letterSpacing: -0.4 },
  logoGet: { color: palette.text },
  logoCollab: { color: palette.accentBright },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  eyebrow: { color: palette.accentBright, fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  heading: { color: palette.text, fontSize: 30, fontWeight: '800', lineHeight: 36, letterSpacing: -1, marginTop: spacing.md },
  sub: { color: palette.textSecondary, fontSize: 14, marginTop: spacing.sm },
  fieldLabel: { color: palette.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.4, marginBottom: 8 },
  fieldWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: palette.border,
    borderRadius: 14, paddingHorizontal: spacing.lg, paddingVertical: 14, backgroundColor: palette.card,
  },
  fieldError: { borderColor: palette.error },
  fieldInput: { flex: 1, color: palette.text, fontSize: 15, padding: 0 },
  errorText: { color: palette.error, fontSize: 11, marginTop: 4 },
  forgotRow: { alignSelf: 'flex-end', marginTop: spacing.md },
  forgotText: { color: palette.accentBright, fontSize: 13, fontWeight: '600' },
  primaryBtn: {
    borderRadius: 999, overflow: 'hidden', marginTop: spacing.xl,
    shadowColor: palette.accent, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 20,
    elevation: 8,
  },
  primaryInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, backgroundColor: palette.accent },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.xl },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: palette.border },
  dividerText: { color: palette.textMuted, fontSize: 12, fontWeight: '600' },
  socialRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  socialBtn: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xxl },
  bottomText: { color: palette.textMuted, fontSize: 13 },
  bottomLink: { color: palette.accentBright, fontSize: 13, fontWeight: '700' },
})