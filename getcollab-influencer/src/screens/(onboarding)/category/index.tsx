import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import OnboardingHeader from "@/src/components/OnboardingHeader";
import { colors, spacing } from "@/src/theme";
import CategorySelector from "@/src/components/CategorySelector";

export default function CategoryScreen({ navigation }: any) {
  const [categories, setCategories] = useState<string[]>([]);
  return (
    <ScrollView style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <OnboardingHeader
            currentStep={2}
            totalSteps={3}
            onBack={() => navigation.goBack()}
            onSkip={() => navigation.navigate("ReviewProfile")}
            heading="Tell us what you create"
            subheading="Help us personalize your dashboard by selecting your niche and connecting your socials."
          />
          <View style={styles.body}>
            <CategorySelector
              value={categories}
              onChange={setCategories}
              maxSelection={5}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
});
