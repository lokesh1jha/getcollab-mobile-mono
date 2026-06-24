import React from 'react'
import { View, Text, StyleSheet, ViewStyle, StyleProp, TouchableOpacity } from 'react-native'
import { colors, spacing, borderRadius } from '../../constants'

interface CardProps {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  onPress?: () => void
}

export const Card: React.FC<CardProps> = ({ children, style, onPress }) => {
  if (onPress) {
    return (
      <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.8}>
        {children}
      </TouchableOpacity>
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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
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
    marginLeft: spacing.md,
  },
  content: {
    padding: spacing.md,
  },
})
