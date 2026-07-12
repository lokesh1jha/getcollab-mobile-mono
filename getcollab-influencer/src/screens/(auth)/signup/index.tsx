import React, { useState } from 'react'
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, spacing } from '@/src/theme'
import { handleApiError } from '@shared/services/api'
import { useAuthStore } from '@shared/stores/auth-store'

interface Props { navigation?: any; route?: any }

export default function SignUpScreen({ navigation, route }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({ name: '', email: '', password: '' })

  const validate = () => {
    let valid = true
    const e = { name: '', email: '', password: '' }
    if (!name || name.length < 2) { e.name = 'Name must be at least 2 characters'; valid = false }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { e.email = 'Enter a valid email'; valid = false }
    if (!password || password.length < 6) { e.password = 'Min 6 characters'; valid = false }
    setErrors(e)
    return valid
  }

  const handleSignUp = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      await useAuthStore.getState().signUp(name, email, password, 'influencer')
    } catch (error: any) {
      handleApiError(error, 'Failed to create account. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.header}>
            <Pressable hitSlop={12} onPress={() => navigation?.goBack()} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.75 }]}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <View style={styles.brandRow}>
              <Image source={require('../../../../assets/icon.png')} style={styles.logoImg} resizeMode="contain" />
              <Text style={styles.logoText}><Text style={styles.logoGet}>Get</Text><Text style={styles.logoCollab}>Collab</Text></Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.body}>
              <Text style={styles.eyebrow}>JOIN AS CREATOR</Text>
              <Text style={styles.heading}>Create your{'\n'}creator profile</Text>
              <Text style={styles.sub}>Free forever. No credit card required.</Text>

              <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
                <FieldInput label="Full name" icon="person-outline" value={name} onChange={setName} error={errors.name} clearError={() => setErrors({ ...errors, name: '' })} placeholder="Your name" />
                <FieldInput label="Email" icon="mail-outline" value={email} onChange={setEmail} error={errors.email} clearError={() => setErrors({ ...errors, email: '' })} placeholder="you@example.com" keyboard="email-address" />
                <FieldInput label="Password" icon="lock-closed-outline" value={password} onChange={setPassword} error={errors.password} clearError={() => setErrors({ ...errors, password: '' })} placeholder="Min 6 characters" secure />
              </View>

              <View style={styles.terms}>
                <View style={styles.checkbox}><Ionicons name="checkmark" size={12} color="#000" /></View>
                <Text style={styles.termsText}>
                  I agree to GetCollab's <Text style={styles.termsLink}>Terms</Text> & <Text style={styles.termsLink}>Privacy Policy</Text>.
                </Text>
              </View>

              <Pressable onPress={handleSignUp} disabled={loading} style={({ pressed }) => [styles.primaryBtn, pressed && !loading && { opacity: 0.85 }]}>
                <View style={styles.primaryInner}>
                  <Ionicons name="flash" size={18} color="#000" />
                  <Text style={styles.primaryBtnText}>{loading ? 'Creating…' : 'Start Creating'}</Text>
                  {!loading && <Ionicons name="arrow-forward" size={18} color="#000" />}
                </View>
              </Pressable>

              <View style={styles.bottomRow}>
                <Text style={styles.bottomText}>Already a creator? </Text>
                <Pressable onPress={() => navigation?.navigate('SignIn')}>
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

function FieldInput({ label, icon, value, onChange, error, clearError, placeholder, secure, keyboard }: {
  label: string; icon: any; value: string; onChange: (v: string) => void;
  error?: string; clearError?: () => void; placeholder?: string; secure?: boolean; keyboard?: any
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldWrap, !!error && styles.fieldError]}>
        <Ionicons name={icon} size={18} color={colors.textMuted} />
        <TextInput
          value={value}
          onChangeText={(v) => { onChange(v); clearError?.() }}
          placeholder={placeholder}
          placeholderTextColor={colors.textSubtle}
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
  root: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  iconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoImg: { width: 26, height: 26 },
  logoText: { fontSize: 17, fontWeight: '800', letterSpacing: -0.4 },
  logoGet: { color: colors.text },
  logoCollab: { color: colors.neon },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  eyebrow: { color: colors.neon, fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  heading: { color: colors.text, fontSize: 30, fontWeight: '800', lineHeight: 36, letterSpacing: -1, marginTop: spacing.md },
  sub: { color: 'rgba(255,255,255,0.55)', fontSize: 14, marginTop: spacing.sm },
  fieldLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '600', letterSpacing: 0.4, marginBottom: 8 },
  fieldWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 14, backgroundColor: colors.card },
  fieldError: { borderColor: colors.error },
  fieldInput: { flex: 1, color: colors.text, fontSize: 15, padding: 0 },
  errorText: { color: colors.error, fontSize: 11, marginTop: 4 },
  terms: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.lg },
  checkbox: { width: 18, height: 18, borderRadius: 5, backgroundColor: colors.neon, alignItems: 'center', justifyContent: 'center' },
  termsText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, flex: 1 },
  termsLink: { color: colors.text, fontWeight: '600' },
  primaryBtn: { borderRadius: radius.pill, overflow: 'hidden', marginTop: spacing.xl },
  primaryInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, backgroundColor: colors.neon },
  primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xxl },
  bottomText: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  bottomLink: { color: colors.neon, fontSize: 13, fontWeight: '700' },
})
