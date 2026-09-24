import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, RouteProp } from '@react-navigation/native'
import { colors, spacing } from '@/src/theme'
import { Button } from '@shared/components/ui/Button'
import { Input } from '@shared/components/ui/Input'
import apiService, { handleApiError } from '@shared/services/api'
import { InfluencerNavigationProp } from '@/src/types/navigation'

type RouteParams = RouteProp<{ resetPassword: { token?: string } }, 'resetPassword'>

interface ResetPasswordScreenProps {
  navigation?: InfluencerNavigationProp
}

const validatePassword = (value: string): string | null => {
  if (value.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(value)) return 'Password must contain an uppercase letter'
  if (!/[a-z]/.test(value)) return 'Password must contain a lowercase letter'
  if (!/[0-9]/.test(value)) return 'Password must contain a number'
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return 'Password must contain a special character'
  return null
}

export default function ResetPasswordScreen({ navigation }: ResetPasswordScreenProps) {
  const route = useRoute<RouteParams>()
  const [token, setToken] = useState(route.params?.token || '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!token.trim()) {
      Alert.alert('Missing token', 'Paste the reset token from your email.')
      return
    }
    const err = validatePassword(password)
    if (err) {
      Alert.alert('Weak password', err)
      return
    }
    if (password !== confirm) {
      Alert.alert("Passwords don't match", 'Enter the same password twice.')
      return
    }
    setSubmitting(true)
    try {
      await apiService.resetPassword(token.trim(), password)
      Alert.alert('Password reset', 'Sign in with your new password.', [
        { text: 'Sign in', onPress: () => navigation?.navigate('SignIn') },
      ])
    } catch (e) {
      handleApiError(e, "Couldn't reset your password. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeInDown.duration(320)} style={{ flex: 1 }}>
        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.subtitle}>
            Paste the token from your email, then pick a new password.
          </Text>
  
          <Input
            label="Reset token"
            value={token}
            onChangeText={setToken}
            placeholder="Paste reset token"
            style={styles.input}
          />
  
          <Input
            label="New password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            style={styles.input}
          />
  
          <Input
            label="Confirm password"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repeat password"
            secureTextEntry
            style={styles.input}
          />
  
          <Button
            title={submitting ? 'Resetting…' : 'Reset password'}
            onPress={handleSubmit}
            disabled={submitting}
            loading={submitting}
            fullWidth
            style={styles.submitBtn}
          />
  
          <Button
            title="Back to sign in"
            variant="ghost"
            onPress={() => navigation?.navigate('SignIn')}
            fullWidth
          />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  input: { marginBottom: spacing.lg },
  submitBtn: { marginBottom: spacing.md },
})
