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
import { colors, spacing } from "@shared/constants";
import CategorySelector from "@/src/components/CategorySelector";
import SocialConnectCard from "@/src/components/SocialConnectCard";
import { Button } from "@shared/components/ui/Button";
import { Ionicons } from "@expo/vector-icons";
import ContentLanguageSelector from "@/src/components/ContentLanguageSelector";

export default function CategoryScreen({ navigation }: any) {
  const [categories, setCategories] = useState<string[]>([]);
  const [language, setLanguage] = useState("English");
  const [socialAccounts, setSocialAccounts] = useState({
    instagram: "",
    youtube: "",
    facebook: "",
  });

  const updateSocial = (
    platform: keyof typeof socialAccounts,
    value: string,
  ) => {
    setSocialAccounts((prev) => ({
      ...prev,
      [platform]: value,
    }));
  };
  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <OnboardingHeader
          currentStep={2}
          totalSteps={3}
          onBack={() => navigation.goBack()}
          onSkip={() => navigation.navigate("ReviewProfile")}
          heading="Tell us what you create"
          subheading="Help us personalize your dashboard by selecting your niche and connecting your socials."
        />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.body}>
            <CategorySelector
              value={categories}
              onChange={setCategories}
              maxSelection={5}
            />
            <Text style={styles.title}>Content Language</Text>

            <ContentLanguageSelector value={language} onChange={setLanguage} />
            <Text style={styles.title}>Connect Platforms</Text>
            <SocialConnectCard
              icon="logo-instagram"
              iconColor="#E1306C"
              title="Instagram"
              subtitle="Personal or Creator"
              value={socialAccounts.instagram}
              onSave={(value) => updateSocial("instagram", value)}
            />

            <SocialConnectCard
              icon="logo-youtube"
              iconColor="#FF0000"
              title="YouTube"
              subtitle="Channel Handle or URL"
              value={socialAccounts.youtube}
              onSave={(value) => updateSocial("youtube", value)}
            />

            <SocialConnectCard
              icon="logo-facebook"
              iconColor="#1877F2"
              title="Facebook"
              subtitle="Creator Page or Profile"
              value={socialAccounts.facebook}
              onSave={(value) => updateSocial("facebook", value)}
            />
            <Button
              title="Continue"
              onPress={() => navigation.navigate("AcceptTerms")}
              rightIcon={
                <Ionicons name="arrow-forward" size={18} color="white" />
              }
              fullWidth
            />
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
  },

  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
});
