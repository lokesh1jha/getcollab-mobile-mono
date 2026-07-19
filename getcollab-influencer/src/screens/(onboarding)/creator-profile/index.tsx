import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  ScrollView,
} from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "@/src/theme";
import OnboardingHeader from "../../../components/OnboardingHeader";
import ProfileImagePicker from "@shared/components/ProfileImagePicker";
import { Button, Input } from "@shared/components/ui";
import CountryPickerField from "@shared/components/CountryPickerField";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/src/stores";
export default function CreatorProfileScreen({ navigation }: any) {
  const user = useAuthStore((state) => state.user);

  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user]);

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
            showBack={false}
            onSkip={() => navigation.navigate("Category")}
          />
          <View style={styles.body}>
            <Text style={styles.heading}>Setup your profile</Text>
            <Text style={styles.sub}>
              Tell us a bit about yourself to get started on your creative
              journey.
            </Text>
            <ProfileImagePicker onImageSelected={handleImage} />
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <View style={{ marginTop: spacing.lg }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: spacing.xs,
                }}
              >
                <Text style={styles.label}>Bio</Text>
                <Text style={styles.count}>{bio.length}/150</Text>
              </View>

              <Input
                placeholder="Tell brands about yourself..."
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
                maxLength={150}
              />
            </View>
            <CountryPickerField value={country} onChange={setCountry} />
            <Button
              title="Continue"
              onPress={() => navigation.navigate("Category")}
              rightIcon={
                <Ionicons name="arrow-forward" size={18} color="white" />
              }
              fullWidth
            />
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
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textMuted,
  },
  count: {
    fontSize: 12,
    color: colors.textMuted,
  },
  button: {
    marginTop: spacing.xl,
  },
});
