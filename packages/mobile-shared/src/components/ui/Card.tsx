import React from 'react'
import { View, Text, StyleSheet, ViewStyle, StyleProp, Pressable } from 'react-native'
import { colors, spacing, radius } from '@/src/theme'

interface CardProps {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  onPress?: () => void
}

export const Card: React.FC<CardProps> = ({ children, style, onPress }) => {
  if (onPress) {
    return (
      <Pressable style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.85 }]} onPress={onPress}>
        {children}
      </Pressable>
    )
  }

  return <View style={[styles.card, style]}>{children}</View>
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  right?: React.ReactNode
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, right }) => (
  <View style={styles.header}>
    <View style={styles.headerText}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
    {right && <View style={styles.headerRight}>{right}</View>}
  </View>
)

interface CardContentProps {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}

export const CardContent: React.FC<CardContentProps> = ({ children, style }) => (
  <View style={[styles.content, style]}>{children}</View>
)

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  headerRight: {
    marginLeft: spacing.lg,
  },
  content: {
    padding: spacing.lg,
  },
})
