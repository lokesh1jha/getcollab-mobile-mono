import React from 'react'
import {
  TouchableOpacity,
  Text,
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
    const styleArray: StyleProp<ViewStyle>[] = [styles.button, styles[size as keyof typeof styles] as ViewStyle]

    if (variant === 'primary') styleArray.push(styles.primary)
    else if (variant === 'secondary') styleArray.push(styles.secondary)
    else if (variant === 'outline') styleArray.push(styles.outline)
    else if (variant === 'ghost') styleArray.push(styles.ghost)
    else if (variant === 'danger') styleArray.push(styles.danger)

    if (disabled || loading) styleArray.push(styles.disabled)
    if (fullWidth) styleArray.push(styles.fullWidth)

    return styleArray
  }

  const getTextStyle = (): StyleProp<TextStyle> => {
    const styleArray: StyleProp<TextStyle>[] = [styles.text, styles[`${size}Text` as keyof typeof styles] as TextStyle]

    if (variant === 'primary') styleArray.push(styles.primaryText)
    else if (variant === 'secondary') styleArray.push(styles.secondaryText)
    else if (variant === 'outline') styleArray.push(styles.outlineText)
    else if (variant === 'ghost') styleArray.push(styles.ghostText)
    else if (variant === 'danger') styleArray.push(styles.dangerText)

    if (disabled) styleArray.push(styles.disabledText)

    return styleArray
  }

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading }}
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
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  md: {
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.lg,
  },
  lg: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.error,
  },
  disabled: {
    opacity: 0.5,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontWeight: '600',
  },
  smText: {
    fontSize: 14,
  },
  mdText: {
    fontSize: 16,
  },
  lgText: {
    fontSize: 18,
  },
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.white,
  },
  outlineText: {
    color: colors.primary,
  },
  ghostText: {
    color: colors.primary,
  },
  dangerText: {
    color: colors.white,
  },
  disabledText: {
    color: colors.textMuted,
  },
})
