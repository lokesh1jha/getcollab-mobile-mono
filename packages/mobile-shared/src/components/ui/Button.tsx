import React from 'react'
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native'
import { colors, spacing, borderRadius } from '../../constants'

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
  icon?: React.ReactNode
  accessibilityLabel?: string
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  icon,
  accessibilityLabel,
}) => {
  const getButtonStyle = (): StyleProp<ViewStyle> => {
    const arr: StyleProp<ViewStyle>[] = [styles.button, styles[size as keyof typeof styles] as ViewStyle]
    if (variant === 'primary') arr.push(styles.primary)
    else if (variant === 'secondary') arr.push(styles.secondary)
    else if (variant === 'outline') arr.push(styles.outline)
    else if (variant === 'ghost') arr.push(styles.ghost)
    else if (variant === 'danger') arr.push(styles.danger)
    if (disabled || loading) arr.push(styles.disabled)
    if (fullWidth) arr.push(styles.fullWidth)
    return arr
  }

  const getTextStyle = (): StyleProp<TextStyle> => {
    const arr: StyleProp<TextStyle>[] = [styles.text, styles[`${size}Text` as keyof typeof styles] as TextStyle]
    if (variant === 'primary') arr.push(styles.primaryText)
    else if (variant === 'secondary') arr.push(styles.secondaryText)
    else if (variant === 'outline') arr.push(styles.outlineText)
    else if (variant === 'ghost') arr.push(styles.ghostText)
    else if (variant === 'danger') arr.push(styles.dangerText)
    if (disabled) arr.push(styles.disabledText)
    return arr
  }

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.white} />
      ) : (
        <View style={styles.contentRow}>
          {icon}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    // Minimum 44pt touch target (Apple HIG)
    minHeight: 44,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  md: {
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
  },
  lg: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 48,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.secondary },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.error },
  disabled: { opacity: 0.45 },
  fullWidth: { width: '100%' },
  text: { fontWeight: '600' },
  smText: { fontSize: 14 },
  mdText: { fontSize: 15 },
  lgText: { fontSize: 16 },
  primaryText: { color: colors.white },
  secondaryText: { color: colors.white },
  outlineText: { color: colors.primary },
  ghostText: { color: colors.primary },
  dangerText: { color: colors.white },
  disabledText: { color: colors.textMuted },
})
