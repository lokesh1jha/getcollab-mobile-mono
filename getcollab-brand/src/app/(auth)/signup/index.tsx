import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Image, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing, borderRadius, typography } from '@shared/constants'
import { Button } from '@shared/components/ui/Button'
import { Input } from '@shared/components/ui/Input'
import { apiService, handleApiError } from '@shared/services/api'
import { useAuthStore } from '@shared/stores/auth-store'

interface ScreenProps {
  navigation?: any
  route?: any
}

export default function SignUpScreen({ navigation, route }: ScreenProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<'brand' | 'influencer' | null>(route?.params?.selectedRole || null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({ name: '', email: '', password: '', role: '' })

  const validateForm = () => {
    let valid = true
    const newErrors = { name: '', email: '', password: '', role: '' }

    if (!name) {
      newErrors.name = 'Name is required'
      valid = false
    } else if (name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
      valid = false
    }

    if (!email) {
      newErrors.email = 'Email is required'
      valid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email'
      valid = false
    }

    if (!password) {
      newErrors.password = 'Password is required'
      valid = false
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
      valid = false
    }

    if (!selectedRole) {
      newErrors.role = 'Please select a role'
      valid = false
    }

    setErrors(newErrors)
    return valid
  }

  const handleSignUp = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      // Create the account with selected role
      if (selectedRole) {
        await useAuthStore.getState().signUp(name, email, password, selectedRole)
      }

      Alert.alert('Success', `Account created successfully! You're now registered as a ${selectedRole}.`)
      navigation?.navigate('Main')
    } catch (error: any) {
      handleApiError(error, 'Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.wrapper}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../../../assets/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Welcome Text */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the creator economy</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            <View style={styles.form}>
              <Input
                label="Full Name"
                placeholder="John Doe"
                value={name}
                onChangeText={setName}
                error={errors.name}
                style={styles.input}
              />

              <Input
                label="Email Address"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                error={errors.email}
                style={styles.input}
              />

              <Input
                label="Password"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                error={errors.password}
                style={styles.input}
              />

              {/* Role Selection */}
              <View style={styles.roleSection}>
                <Text style={styles.roleLabel}>I want to use GetCollab as:</Text>
                <View style={styles.roleContainer}>
                  <TouchableOpacity
                    style={[styles.roleCard, selectedRole === 'brand' && styles.selectedRoleCard]}
                    onPress={() => setSelectedRole('brand')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.roleIcon}>🏢</Text>
                    <Text style={[styles.roleTitle, selectedRole === 'brand' && styles.selectedRoleTitle]}>Brand</Text>
                    <Text style={styles.roleDescription}>Create & manage campaigns</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.roleCard, selectedRole === 'influencer' && styles.selectedRoleCard]}
                    onPress={() => setSelectedRole('influencer')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.roleIcon}>⭐</Text>
                    <Text style={[styles.roleTitle, selectedRole === 'influencer' && styles.selectedRoleTitle]}>Creator</Text>
                    <Text style={styles.roleDescription}>Apply & collaborate</Text>
                  </TouchableOpacity>
                </View>
                {errors.role ? <Text style={styles.errorText}>{errors.role}</Text> : null}
              </View>
            </View>

            {/* Sign Up Button */}
            <Button
              title="Create Account"
              onPress={handleSignUp}
              loading={loading}
              fullWidth
              style={styles.button}
            />

            {/* Sign In Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Already have an account?{' '}
                <Text
                  style={styles.link}
                  onPress={() => navigation?.navigate('SignIn')}
                >
                  Sign In
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  wrapper: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  logo: {
    width: 100,
    height: 100,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  formContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  form: {
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.lg,
  },
  roleSection: {
    marginTop: spacing.lg,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  roleContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  roleCard: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  selectedRoleCard: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}12`,
  },
  roleIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  roleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  selectedRoleTitle: {
    color: colors.primary,
  },
  roleDescription: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  button: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
  },
})
