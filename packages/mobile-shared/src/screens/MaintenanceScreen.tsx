import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageSourcePropType } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing } from '../constants'

interface MaintenanceScreenProps {
  onRetry: () => void
  logo?: ImageSourcePropType
}

export default function MaintenanceScreen({ onRetry, logo }: MaintenanceScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {logo ? (
          <Image
            source={logo}
            style={styles.logo}
            resizeMode="contain"
          />
        ) : null}

        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔧</Text>
        </View>

        <Text style={styles.title}>Under Maintenance</Text>
        <Text style={styles.subtitle}>We'll be back soon</Text>

        <Text style={styles.description}>
          We're currently performing maintenance to improve your experience. Please try again in a few moments.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Need help? Contact us at support@getcollab.com
        </Text>
      </View>
    </SafeAreaView>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: spacing.xl,
    opacity: 0.5,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  icon: {
    fontSize: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
})
