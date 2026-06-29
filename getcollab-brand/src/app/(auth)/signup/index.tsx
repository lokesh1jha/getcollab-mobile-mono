import React, { useState } from 'react'
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, spacing } from '@/src/theme'
import { handleApiError } from '@shared/services/api'
import { useAuthStore } from '@shared/stores/auth-store'

interface ScreenProps { navigation?: any; route?: any }

export default function SignUpScreen({ navigation }: ScreenProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({ name: '', email: '', password: '' })

  const validateForm = () => {
    let valid = true
    const newErrors = { name: '', email: '', password: '' }
    if (!name || name.length < 2) { newErrors.name = 'Name must be at least 2 characters'; valid = false }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { newErrors.email = 'Please enter a valid email'; valid = false }
    if (!password || password.length < 8) { newErrors.password = 'Min 8 characters'; valid = false }
    else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      newErrors.password = 'Include upper, lower, number, and special character'
      valid = false
    }
    setErrors(newErrors)
    return valid
  }

  const handleSignUp = async () => {
    if (!validateForm()) return
    setLoading(true)
    try {
      await useAuthStore.getState().signUp(name, email, password, 'brand')
    } catch (error: any) {
      handleApiError(error, 'Failed to create account. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <View style={styles.root} testID="sign-up-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.header}>
            <Pressable testID="sign-up-back-btn" hitSlop={12} onPress={() => navigation?.goBack()} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.75 }]}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <View style={styles.brandRow}>
              <Image source={require('../../../../assets/getcollab_only_logo.png')} style={styles.logoImg} resizeMode="contain" />
              <Text style={styles.logoText}><Text style={styles.logoGet}>Get</Text><Text style={styles.logoCollab}>Collab</Text></Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View entering={FadeInDown.duration(400)}>
              <Text style={styles.eyebrow}>JOIN GETCOLLAB</Text>
              <Text style={styles.heading}>Create your{'\n'}brand workspace</Text>
              <Text style={styles.sub}>Free 14-day trial. No credit card required.</Text>

              <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
                <Field label="Full name" icon="person-outline" value={name} onChange={setName} error={errors.name} setError={() => setErrors({ ...errors, name: '' })} testID="signup-name" />
                <Field label="Work email" icon="mail-outline" value={email} onChange={setEmail} error={errors.email} setError={() => setErrors({ ...errors, email: '' })} testID="signup-email" />
                <Field label="Password" icon="lock-closed-outline" value={password} onChange={setPassword} error={errors.password} setError={() => setErrors({ ...errors, password: '' })} secure placeholder="Min 8 chars + symbol" testID="signup-password" />
              </View>

              <View style={styles.terms}>
                <View style={styles.checkbox}><Ionicons name="checkmark" size={12} color="#000" /></View>
                <Text style={styles.termsText}>
                  I agree to GetCollab's <Text style={styles.termsLink}>Terms</Text> & <Text style={styles.termsLink}>Privacy Policy</Text>.
                </Text>
              </View>

              <Pressable
                testID="sign-up-submit-btn"
                onPress={handleSignUp}
                disabled={loading}
                style={({ pressed }) => [styles.primaryBtn, pressed && !loading && { opacity: 0.85 }]}
              >
                <View style={styles.primaryGradient}>
                  <Text style={styles.primaryBtnText}>{loading ? 'Creating...' : 'Create account'}</Text>
                  {!loading && <Ionicons name="arrow-forward" size={18} color="#000" />}
                </View>
              </Pressable>

              <View style={styles.bottomRow}>
                <Text style={styles.bottomText}>Already on GetCollab? </Text>
                <Pressable testID="signup-go-signin" onPress={() => navigation?.navigate('SignIn')}>
                  <Text style={styles.bottomLink}>Sign in</Text>
                </Pressable>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

function Field({
  label, icon, value, onChange, secure, placeholder, error, setError, testID,
}: { label: string; icon: any; value: string; onChange: (v: string) => void; secure?: boolean; placeholder?: string; error?: string; setError?: () => void; testID?: string }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldWrap, error && styles.fieldError]}>
        <Ionicons name={icon} size={18} color={colors.textMuted} />
        <TextInput
          testID={testID}
          value={value}
          onChangeText={(v) => { onChange(v); setError?.() }}
          secureTextEntry={secure}
          placeholder={placeholder}
          placeholderTextColor={colors.textSubtle}
          autoCapitalize="none"
          style={styles.fieldInput}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
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

  terms: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.lg },
  checkbox: { width: 18, height: 18, borderRadius: 5, backgroundColor: colors.neon, alignItems: 'center', justifyContent: 'center' },
  termsText: { color: 'rgba(255,255,255,0.65)', fontSize: 12, flex: 1 },
  termsLink: { color: '#fff', fontWeight: '600' },

  primaryBtn: { borderRadius: radius.pill, overflow: 'hidden', marginTop: spacing.xl },
  primaryGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, backgroundColor: colors.neon },
  primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },

  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xxl },
  bottomText: { color: 'rgba(255,255,255,0.55)', fontSize: 13 },
  bottomLink: { color: colors.neon, fontSize: 13, fontWeight: '700' },
})
