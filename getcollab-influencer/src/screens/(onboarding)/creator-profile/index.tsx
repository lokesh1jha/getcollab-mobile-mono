import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  ScrollView,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "@/src/theme";
import OnboardingHeader from "../../../components/OnboardingHeader";
import ProfileImagePicker from "@shared/components/ProfileImagePicker";
export default function CreatorProfileScreen({ navigation }: any) {
  const handleImage = (uri: string) => {
    console.log(uri);

    // send to API
  };
  return (
    <ScrollView style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <OnboardingHeader
            currentStep={1}
            totalSteps={3}
            // showBack={false}
            onSkip={() => navigation.navigate("Category")}
          />
          <View style={styles.body}>
            <Text style={styles.heading}>Setup your profile</Text>
            <Text style={styles.sub}>
              Tell us a bit about yourself to get started on your creative
              journey.
            </Text>
            <ProfileImagePicker onImageSelected={handleImage} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  eyebrow: {
    color: colors.neon,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  heading: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
    letterSpacing: -1,
    marginTop: spacing.md,
  },
  sub: { color: "rgba(255,255,255,0.55)", fontSize: 14, marginTop: spacing.sm },
  body: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
});
