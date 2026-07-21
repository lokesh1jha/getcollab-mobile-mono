import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, borderRadius, spacing } from "@shared/constants";

interface Props {
  checked: boolean;
  onToggle: () => void;
  onPressTerms?: () => void;
  onPressPrivacy?: () => void;
}

export default function TermsAndConditionsCard({
  checked,
  onToggle,
  onPressTerms,
  onPressPrivacy,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Pressable
          onPress={onToggle}
          style={[styles.checkbox, checked && styles.checkboxChecked]}
        >
          {checked && <Ionicons name="checkmark" size={16} color="#fff" />}
        </Pressable>

        <Text style={styles.text}>
          I agree to the{" "}
          <Text style={styles.link} onPress={onPressTerms}>
            Terms of Service
          </Text>{" "}
          and{" "}
          <Text style={styles.link} onPress={onPressPrivacy}>
            Privacy Policy
          </Text>
          .
        </Text>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.iconContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={colors.primary}
          />
        </View>

        <Text style={styles.infoText}>
          By tapping <Text style={styles.bold}>Complete Setup</Text>, you agree
          to our <Text style={styles.link}>Terms of Service</Text> and{" "}
          <Text style={styles.link}>Privacy Policy</Text>.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },

  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  text: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
  },

  link: {
    color: colors.primary,
    fontWeight: "700",
  },

  infoRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },

  iconContainer: {
    width: 28,
    alignItems: "center",
    marginTop: 2,
  },

  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },

  bold: {
    fontWeight: "700",
    color: colors.text,
  },
});
