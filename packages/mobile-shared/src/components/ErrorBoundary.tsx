import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { colors, spacing } from '@/src/theme'
import { logger } from '../services/logger'

interface State {
  hasError: boolean
  error: Error | null
}

interface Props {
  children: React.ReactNode
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('Unhandled error in React tree', error, { componentStack: info.componentStack })
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {__DEV__ ? this.state.error?.message : "We've been notified. Try again."}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}
            onPress={this.reset}
            accessibilityRole="button"
          >
            <Text style={styles.btnText}>Try again</Text>
          </Pressable>
        </View>
      )
    }
    return this.props.children as any
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: 12,
  },
  btnText: {
    color: colors.black,
    fontWeight: '600',
  },
})
