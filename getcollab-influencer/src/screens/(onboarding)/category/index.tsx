import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import OnboardingHeader from "@/src/components/OnboardingHeader";
import { colors, spacing } from "@/src/theme";

export default function CategoryScreen({ navigation }: any) {
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
          />
          <View style={styles.body}>
            <Text>CategoryScreen</Text>
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
