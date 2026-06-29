import React, { useEffect, useState, useRef } from 'react'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing } from '@/src/theme'
import { useAuthStore } from '@shared/stores/auth-store'
import { useChatStore } from '@shared/stores/chat-store'
import { notificationService, navigationRef } from '@shared/services/notification-service'
import { apiService } from '@shared/services/api'
import { initObservability } from '@shared/services/observability'
import { logger } from '@shared/services/logger'
import { ErrorBoundary } from '@shared/components/ErrorBoundary'
import { NetworkBanner } from '@shared/components/NetworkBanner'

import LandingScreen from './src/app/(public)/landing'
import SignInScreen from './src/app/(auth)/signin'
import SignUpScreen from './src/app/(auth)/signup'
import MainTabs from './src/navigation/MainTabs'
import MaintenanceScreen from '@shared/screens/MaintenanceScreen'

const Stack = createNativeStackNavigator()

const navigationTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.neon,
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
        <View style={styles.logoRow}>
          <Image source={require('./assets/icon.png')} style={styles.logoImg} resizeMode="contain" />
          <Text style={styles.logoText}>
            <Text style={styles.logoGet}>Get</Text>
            <Text style={styles.logoCollab}>Collab</Text>
          </Text>
        </View>
        <Text style={styles.subtitle}>For Creators</Text>
        <ActivityIndicator size="large" color={colors.neon} style={styles.loading} />
      </View>
    </SafeAreaView>
  )
}

export default function App() {
  const [appReady, setAppReady] = useState(false)
  const [apiError, setApiError] = useState(false)
  const { isAuthenticated, user, fetchCurrentUser } = useAuthStore()
  const splashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const initializeApp = async () => {
    try {
      setApiError(false)
      await initObservability()
      await fetchCurrentUser()
      const currentUser = useAuthStore.getState().user
      if (currentUser) {
        logger.identify(currentUser.id, { role: currentUser.role, email: currentUser.email })
        await notificationService.initialize()
      }
    } catch (error: any) {
      logger.error('API Error during initialization', error)
      setApiError(true)
    } finally {
      splashTimeoutRef.current = setTimeout(() => setAppReady(true), 1500)
    }
  }

  useEffect(() => {
    apiService.setOnUnauthorizedCallback(() => useAuthStore.getState().signOut())
  }, [])

  useEffect(() => {
    if (isAuthenticated && user) {
      notificationService.initialize().catch((e) => logger.warn('Notification init failed', { error: e?.message }))
    }
  }, [isAuthenticated, user?.id])

  useEffect(() => {
    initializeApp()
    return () => {
      if (splashTimeoutRef.current) clearTimeout(splashTimeoutRef.current)
      notificationService.cleanup()
      const chatStore = useChatStore.getState()
      if (chatStore.socket) chatStore.disconnectSocket()
    }
  }, [fetchCurrentUser])

  if (!appReady) return <SplashScreen />
  if (apiError) return <MaintenanceScreen onRetry={initializeApp} logo={require('./assets/icon.png')} />

  return (
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
                <Stack.Screen name="ForgotPassword" getComponent={() => require('./src/app/(auth)/forgot-password').default} options={{ headerShown: false }} />
                <Stack.Screen name="ResetPassword" getComponent={() => require('./src/app/(auth)/reset-password').default} options={{ headerShown: false }} />
              </>
            ) : (
              <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
        <NetworkBanner />
      </ErrorBoundary>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoImg: { width: 36, height: 36 },
  logoText: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  logoGet: { color: colors.text },
  logoCollab: { color: colors.neon },
  subtitle: { fontSize: 14, color: colors.textMuted },
  loading: { marginTop: spacing.xl },
})
