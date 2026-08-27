import React, { useEffect } from 'react'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing } from '@/src/theme'
import { useAuthStore } from '@shared/stores/auth-store'
import { useChatStore } from '@shared/stores/chat-store'
import { notificationService, navigationRef } from '@shared/services/notification-service'
import { apiService } from '@shared/services/api'
import { useAppInit } from '@shared/hooks/useAppInit'
import { ErrorBoundary } from '@shared/components/ErrorBoundary'
import { NetworkBanner } from '@shared/components/NetworkBanner'

import LandingScreen from './src/app/(public)/landing'
import SignInScreen from './src/app/(auth)/signin'
import SignUpScreen from './src/app/(auth)/signup'
import MainTabs from './src/navigation/MainTabs'
import MaintenanceScreen from '@shared/screens/MaintenanceScreen'
import VerifyEmailScreen from './src/app/(main)/verify-email'

const Stack = createNativeStackNavigator()

const navigationTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.blue,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    notification: colors.neon,
  },
}

function SplashScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoBadge}>
          <View style={styles.logoDot} />
        </View>
        <Text style={styles.title}>GetCollab</Text>
        <Text style={styles.subtitle}>For Brands</Text>
        <ActivityIndicator size="large" color={colors.neon} style={styles.loading} />
      </View>
    </SafeAreaView>
  )
}

export default function App() {
  const { appReady, apiError, initializeApp } = useAppInit({ splashDelayMs: 2000 })
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    apiService.setOnUnauthorizedCallback(() => useAuthStore.getState().signOut())
  }, [])

  useEffect(() => {
    return () => {
      notificationService.cleanup()
      const chatStore = useChatStore.getState()
      if (chatStore.socket) chatStore.disconnectSocket()
    }
  }, [])

  if (!appReady) return <SplashScreen />
  if (apiError) return <MaintenanceScreen onRetry={initializeApp} logo={require('./assets/icon.png')} />

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <NavigationContainer ref={navigationRef} theme={navigationTheme}>
            <Stack.Navigator
              screenOptions={{
                headerStyle: { backgroundColor: colors.bg },
                headerTintColor: colors.text,
                headerTitleStyle: { fontSize: 15, fontWeight: '700' },
                contentStyle: { backgroundColor: colors.bg },
              }}
            >
              {!isAuthenticated ? (
                <>
                  <Stack.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="SignIn" component={SignInScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ForgotPassword" getComponent={() => require('./src/app/(auth)/forgot-password').default} options={{ headerShown: true, headerTitle: 'Forgot Password' }} />
                  <Stack.Screen name="ResetPassword" getComponent={() => require('./src/app/(auth)/reset-password').default} options={{ headerShown: true, headerTitle: 'Reset Password' }} />
                  <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ headerShown: false }} />
                </>
              ) : (
                <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
              )}
            </Stack.Navigator>
          </NavigationContainer>
          <NetworkBanner />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  logoBadge: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: colors.neon,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  logoDot: { width: 16, height: 16, borderRadius: 4, backgroundColor: colors.black },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.md },
  loading: { marginTop: spacing.sm },
})
