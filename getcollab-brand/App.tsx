import React, { useEffect, useState, useRef } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '@shared/constants'
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

function SplashScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image 
          source={require('./assets/icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>GetCollab Brands</Text>
        <Text style={styles.subtitle}>Grow your brand with creators</Text>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </SafeAreaView>
  )
}

// Removed AuthStack since we navigate directly to specific screens from LandingScreen

export default function App() {
  const [appReady, setAppReady] = useState(false)
  const [apiError, setApiError] = useState(false)
  const { isAuthenticated, user, fetchCurrentUser } = useAuthStore()

  // Store timeout ID for cleanup
  const splashTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
      // Simulate splash screen delay
      splashTimeoutRef.current = setTimeout(() => {
        setAppReady(true)
      }, 2000)
    }
  }

  // Setup 401 handler to auto logout
  useEffect(() => {
    apiService.setOnUnauthorizedCallback(() => {
      useAuthStore.getState().signOut()
    })
  }, [])

  const MainTabsWrapper = () => <MainTabs />

  useEffect(() => {
    initializeApp()

    // Cleanup on unmount
    return () => {
      if (splashTimeoutRef.current) {
        clearTimeout(splashTimeoutRef.current)
      }
      // Clean up notification listeners
      notificationService.cleanup()
      // Disconnect socket on logout/unmount
      const chatStore = useChatStore.getState()
      if (chatStore.socket) {
        chatStore.disconnectSocket()
      }
    }
  }, [fetchCurrentUser])

  // Show splash screen while checking authentication
  if (!appReady) {
    return <SplashScreen />
  }

  // Show maintenance screen if API error
  if (apiError) {
    return <MaintenanceScreen onRetry={initializeApp} />
  }

  return (
    <ErrorBoundary>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator>
          {!isAuthenticated ? (
            <>
              <Stack.Screen
                name="Landing"
                component={LandingScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="SignIn"
                component={SignInScreen}
                options={{ headerShown: true }}
              />
              <Stack.Screen
                name="SignUp"
                component={SignUpScreen}
                options={{ headerShown: true }}
              />
              <Stack.Screen
                name="ForgotPassword"
                getComponent={() => require('./src/app/(auth)/forgot-password').default}
                options={{ headerShown: true, headerTitle: 'Forgot Password' }}
              />
              <Stack.Screen
                name="ResetPassword"
                getComponent={() => require('./src/app/(auth)/reset-password').default}
                options={{ headerShown: true, headerTitle: 'Reset Password' }}
              />
            </>
          ) : (
            <Stack.Screen
              name="Main"
              component={MainTabsWrapper}
              options={{ headerShown: false }}
            />
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <NetworkBanner />
    </ErrorBoundary>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 30,
  },
  loading: {
    marginVertical: 30,
  },
  loadingText: {
    fontSize: 16,
    color: colors.primary,
    textAlign: 'center',
  },
})
