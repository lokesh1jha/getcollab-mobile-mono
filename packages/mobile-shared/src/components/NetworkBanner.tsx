import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing } from '../constants'

type Listener = (state: NetworkBannerState) => void

interface NetworkBannerState {
  visible: boolean
  message: string
  onRetry?: () => void
}

class NetworkBannerStore {
  private state: NetworkBannerState = { visible: false, message: '' }
  private listeners = new Set<Listener>()

  show(message: string, onRetry?: () => void) {
    this.state = { visible: true, message, onRetry }
    this.notify()
  }

  hide() {
    this.state = { visible: false, message: '' }
    this.notify()
  }

  getState() {
    return this.state
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private notify() {
    this.listeners.forEach((l) => l(this.state))
  }
}

export const networkBanner = new NetworkBannerStore()

export function NetworkBanner() {
  const insets = useSafeAreaInsets()
  const [state, setState] = useState<NetworkBannerState>(networkBanner.getState())
  const [translateY] = useState(new Animated.Value(-80))
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    return networkBanner.subscribe(setState)
  }, [])

  useEffect(() => {
    if (state.visible) setMounted(true)
    Animated.timing(translateY, {
      toValue: state.visible ? 0 : -80,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      if (!state.visible) setMounted(false)
    })
  }, [state.visible, translateY])

  if (!mounted) return null

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }], paddingTop: insets.top + spacing.sm }]}
      pointerEvents={state.visible ? 'auto' : 'none'}
    >
      <Text style={styles.text} numberOfLines={2}>{state.message}</Text>
      {state.onRetry && (
        <TouchableOpacity
          onPress={() => { state.onRetry?.(); networkBanner.hide() }}
          style={styles.retryBtn}
          accessibilityRole="button"
          accessibilityLabel="Retry"
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={() => networkBanner.hide()}
        style={styles.closeBtn}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={18} color={colors.white} />
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    backgroundColor: colors.error,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  text: {
    flex: 1,
    color: colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  retryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    marginRight: spacing.sm,
    minHeight: 32,
    justifyContent: 'center',
  },
  retryText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
