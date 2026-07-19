import React, { useState } from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import CountryPicker, {
  Country,
  CountryCode,
} from "react-native-country-picker-modal";
import { Ionicons } from "@expo/vector-icons";
import { borderRadius, colors, spacing } from "../constants";

interface Props {
  value: string;
  onChange: (country: string) => void;
}

export default function CountryPickerField({ value, onChange }: Props) {
  const [visible, setVisible] = useState(false);
  const [countryCode, setCountryCode] = useState<CountryCode>("IN");

  const handleSelect = (country: Country) => {
    setCountryCode(country.cca2);

    const countryName =
      typeof country.name === "string" ? country.name : country.name.common;

    onChange(countryName);
    setVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Location</Text>

      <Pressable style={styles.field} onPress={() => setVisible(true)}>
        <Ionicons
          name="location-outline"
          size={20}
          color={colors.textMuted}
          style={styles.icon}
        />

        <Text
          style={[styles.text, !value && styles.placeholder]}
          numberOfLines={1}
        >
          {value || "Search country"}
        </Text>
      </Pressable>
      <View style={{ width: 0, height: 0, overflow: "hidden" }}>
        <CountryPicker
          countryCode={countryCode}
          visible={visible}
          withFilter
          withFlag // Show flags in the list
          withEmoji
          onClose={() => setVisible(false)}
          onSelect={handleSelect}
          theme={{
            backgroundColor: "#111827", // Modal background
            primaryColor: "#6366F1", // Accent color
            primaryColorVariant: "#1F2937",
            fontSize: 16,
            onBackgroundTextColor: "#FFFFFF", // White text
            filterPlaceholderTextColor: "#9CA3AF",
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },

  label: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textMuted,
    marginBottom: spacing.xs,
    letterSpacing: 0.1,
  },

  field: {
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
  },

  icon: {
    marginRight: 10,
  },

  text: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },

  placeholder: {
    color: colors.textMuted,
  },
});
