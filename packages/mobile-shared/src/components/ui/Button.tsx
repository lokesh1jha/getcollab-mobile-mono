import React from "react";
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from "react-native";
import { colors, spacing, radius } from '@/src/theme'
import * as Haptics from 'expo-haptics'

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: "primary" | "outline" | "secondary" | "ghost";
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
  variant = "primary",
}) => {
  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress() }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variant === "outline" && styles.outline,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#000" />
      ) : (
        <View style={styles.inner}>
          {leftIcon}

          <Text style={[styles.text, variant !== "primary" && styles.outlineText, textStyle]}>{title}</Text>

          {rightIcon}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.pill,
    overflow: "hidden",
    marginTop: spacing.xxl,
    backgroundColor: colors.neon,
  },

  fullWidth: {
    width: "100%",
  },

  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },

  text: {
    color: colors.black,
    fontSize: 16,
    fontWeight: "700",
  },

  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.85,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondary: {
    backgroundColor: colors.card,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  outlineText: {
    color: colors.text,
  },
});
