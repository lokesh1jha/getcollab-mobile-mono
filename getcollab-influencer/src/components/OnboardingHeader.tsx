import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/src/theme";

interface Props {
  currentStep: number;
  totalSteps?: number;
  onBack?: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
  showBack?: boolean;

  // Optional
  heading?: string;
  subheading?: string;
}

const OnboardingHeader = ({
  currentStep,
  totalSteps = 3,
  onBack,
  onSkip,
  showSkip = true,
  showBack = true,
  heading,
  subheading,
}: Props) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      {/* Top Navigation */}
      <View style={styles.container}>
        {showBack ? (
          <TouchableOpacity onPress={onBack} style={styles.side}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.side} />
        )}

        {showSkip ? (
          <TouchableOpacity onPress={onSkip} style={styles.side}>
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.side} />
        )}
      </View>

      {/* Optional Heading */}
      {(heading || subheading) && (
        <View style={styles.textContainer}>
          {heading && <Text style={styles.heading}>{heading}</Text>}

          {subheading && <Text style={styles.sub}>{subheading}</Text>}
        </View>
      )}
    </>
  );
};

export default OnboardingHeader;

const styles = StyleSheet.create({
  progressContainer: {
    height: 4,
    width: "100%",
  },

  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

  container: {
    height: 60,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
  },

  side: {
    width: 60,
  },

  skip: {
    textAlign: "right",
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
    letterSpacing: 1,
  },

  textContainer: {
    paddingHorizontal: 20,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },

  heading: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
    letterSpacing: -1,
    marginTop: spacing.sm,
  },

  sub: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.sm,
    lineHeight: 22,
  },
});
