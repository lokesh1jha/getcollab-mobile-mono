import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { colors, spacing } from '../../constants'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
  visible: boolean
  onClose: () => void
}

export function Toast({ 
  message, 
  type = 'info', 
  duration = 3000, 
  visible, 
  onClose 
}: ToastProps) {
  const [fadeAnim] = useState(new Animated.Value(0))

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()

      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onClose()
        })
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [visible, duration, fadeAnim, onClose])

  if (!visible) return null

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return colors.success
      case 'error': return colors.error
      case 'warning': return colors.warning
      case 'info': return colors.primary
      default: return colors.primary
    }
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={[styles.toast, { backgroundColor: getBackgroundColor() }]}>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 1000,
    alignItems: 'center',
  },
  toast: {
    borderRadius: 8,
    padding: spacing.md,
    minWidth: 200,
    maxWidth: '90%',
  },
  message: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
})