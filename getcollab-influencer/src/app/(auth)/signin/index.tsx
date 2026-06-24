import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing, borderRadius, typography } from '@shared/constants'
import { Button } from '@shared/components/ui/Button'
import { Input } from '@shared/components/ui/Input'
import { apiService, handleApiError } from '@shared/services/api'
import { useAuthStore } from '@shared/stores/auth-store'

interface ScreenProps {
  navigation?: any
}

export default function SignInScreen({ navigation }: ScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({ email: '', password: '' })

  const validateForm = () => {
    let valid = true
    const newErrors = { email: '', password: '' }
    
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
    
    setErrors(newErrors)
    return valid
  }

  const handleSignIn = async () => {
    if (!validateForm()) return
    
    setLoading(true)
    try {
      await useAuthStore.getState().signIn(email, password)
      
      Alert.alert('Success', 'Signed in successfully!')
      navigation?.navigate('Main')
    } catch (error: any) {
      handleApiError(error, 'Failed to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
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
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue your journey</Text>
        </View>
        
        {/* Form Section */}
        <View style={styles.formContainer}>
          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              error={errors.email}
              style={styles.input}
            />
            
            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={errors.password}
              style={styles.input}
            />
            
            <Button
              title="Sign In"
              onPress={handleSignIn}
              loading={loading}
              fullWidth
              style={styles.button}
            />

            <TouchableOpacity
              onPress={() => navigation?.navigate('ForgotPassword')}
              style={{ marginTop: 12, alignItems: 'center' }}
            >
              <Text style={styles.link}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity onPress={() => navigation?.navigate('SignUp')}>
              <Text style={styles.linkText}>
                Don't have an account? <Text style={styles.link}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    justifyContent: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    marginTop: spacing.xl,
  },
  logo: {
    width: 120,
    height: 120,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
  formContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  form: {
    marginBottom: spacing.lg,
  },
  button: {
    marginTop: spacing.md,
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  linkText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  link: {
    color: colors.primary,
    fontWeight: '600',
  },
  input: {
    marginBottom: spacing.lg,
  },
})
