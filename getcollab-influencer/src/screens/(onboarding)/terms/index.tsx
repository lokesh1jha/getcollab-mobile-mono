import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import OnboardingHeader from "@/src/components/OnboardingHeader";
import { colors, spacing } from "@shared/constants";
import { Button } from "@shared/components/ui";
import TermsAndConditionsCard from "@/src/components/TermsAndConditionsCard";
export default function AcceptTerms({ navigation }: any) {
  const [accepted, setAccepted] = useState(true);
  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <OnboardingHeader
          currentStep={3}
          totalSteps={3}
          onBack={() => navigation.goBack()}
          showSkip={false}
          heading="Almost there!"
          subheading="Your creator profile is ready. Before you continue, please review and accept our Terms of Service and Privacy Policy."
        />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.body}>
            <TermsAndConditionsCard
              checked={accepted}
              onToggle={() => {}}
              onPressTerms={() => navigation.navigate("Terms")}
              onPressPrivacy={() => navigation.navigate("Privacy")}
            />
            <Button title="Complete Setup" onPress={() => {}} fullWidth />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingBottom: spacing.xxl, // or 80
    flex: 1,
    justifyContent: "center",
    // alignItems: "center",
  },

  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
});
