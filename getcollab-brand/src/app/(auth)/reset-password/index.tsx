import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert, ScrollView, Pressable, TextInput } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, RouteProp } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import apiService, { handleApiError } from '@shared/services/api'

type RouteParams = RouteProp<{ resetPassword: { token?: string } }, 'resetPassword'>
interface Props { navigation?: any }

const validatePassword = (value: string): string | null => {
  if (value.length < 8) return 'At least 8 characters'
  if (!/[A-Z]/.test(value)) return 'Add an uppercase letter'
  if (!/[a-z]/.test(value)) return 'Add a lowercase letter'
  if (!/[0-9]/.test(value)) return 'Add a number'
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return 'Add a special character'
  return null
}

export default function ResetPasswordScreen({ navigation }: Props) {
  const route = useRoute<RouteParams>()
  const [token, setToken] = useState(route.params?.token || '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!token.trim()) { Alert.alert('Missing token', 'Paste the reset token from your email.'); return }
    const err = validatePassword(password)
    if (err) { Alert.alert('Weak password', err); return }
    if (password !== confirm) { Alert.alert('Mismatch', 'Passwords do not match.'); return }
    setSubmitting(true)
    try {
      await apiService.resetPassword(token.trim(), password)
      Alert.alert('Password reset', 'You can now sign in with your new password.', [
        { text: 'Sign In', onPress: () => navigation?.navigate('SignIn') },
      ])
    } catch (e) { handleApiError(e, 'Failed to reset password') }
    finally { setSubmitting(false) }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={styles.title}>Reset your password</Text>
            <Text style={styles.subtitle}>Paste the token from your email and choose a new password.</Text>

            <Text style={styles.fieldLabel}>Reset Token</Text>
            <View style={styles.fieldWrap}>
              <TextInput value={token} onChangeText={setToken} placeholder="Paste reset token" placeholderTextColor={colors.textSubtle} style={styles.fieldInput} />
            </View>

            <View style={{ height: spacing.lg }} />

            <Text style={styles.fieldLabel}>New Password</Text>
            <View style={styles.fieldWrap}>
              <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 8 chars" placeholderTextColor={colors.textSubtle} style={styles.fieldInput} />
            </View>

            <View style={{ height: spacing.lg }} />

            <Text style={styles.fieldLabel}>Confirm Password</Text>
            <View style={styles.fieldWrap}>
              <TextInput value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Repeat password" placeholderTextColor={colors.textSubtle} style={styles.fieldInput} />
            </View>

            <View style={styles.requirements}>
              <Text style={styles.reqTitle}>Requirements</Text>
              {['At least 8 characters', 'One uppercase letter', 'One lowercase letter', 'One number', 'One special character'].map((r) => (
                <Text key={r} style={styles.reqText}>• {r}</Text>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.primaryBtnText}>{submitting ? 'Resetting...' : 'Reset Password'}</Text>
            </Pressable>

            <Pressable style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.7 }]} onPress={() => navigation?.navigate('SignIn')}>
              <Text style={styles.ghostBtnText}>Back to Sign In</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  content: { padding: spacing.xl },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: -0.8, marginTop: spacing.lg, marginBottom: spacing.sm },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 20, marginBottom: spacing.xl },

  fieldLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600', letterSpacing: 0.4, marginBottom: 8 },
  fieldWrap: {
    borderWidth: 1, borderColor: '#262626', borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: 14, backgroundColor: '#0A0A0A',
  },
  fieldInput: { color: '#fff', fontSize: 15, padding: 0 },

  requirements: {
    backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, marginTop: spacing.xl, marginBottom: spacing.lg,
  },
  reqTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: spacing.sm },
  reqText: { color: colors.textMuted, fontSize: 13, paddingVertical: 2 },

  primaryBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue, borderRadius: radius.pill, paddingVertical: 18 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  ghostBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, marginTop: spacing.md },
  ghostBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },
})
