import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, radius } from "@/src/theme";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle: string;
  value: string;
  onSave: (value: string) => void;
}

export default function SocialConnectCard({
  icon,
  iconColor = colors.blue,
  title,
  subtitle,
  value,
  onSave,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState(value);

  useEffect(() => {
    setInput(value);
  }, [value]);

  const connected = value.trim().length > 0;

  const handleSave = () => {
    onSave(input.trim());
    setExpanded(false);
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={24} color={iconColor} />
        </View>

        <View style={styles.info}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {!expanded ? (
          <Pressable
            onPress={() => setExpanded(true)}
            style={[styles.button, connected && styles.connectedButton]}
          >
            {connected && (
              <Ionicons
                name="checkmark-circle"
                size={16}
                color="#16A34A"
                style={{ marginRight: 4 }}
              />
            )}

            <Text
              style={[styles.buttonText, connected && styles.connectedText]}
            >
              {connected ? "Connected" : "Connect"}
            </Text>
          </Pressable>
        ) : (
          <Pressable onPress={handleSave} style={styles.button}>
            <Ionicons
              name="checkmark"
              size={16}
              color={colors.primary}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.buttonText}>Save</Text>
          </Pressable>
        )}
      </View>

      {expanded && (
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="@username or profile link"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  info: {
    flex: 1,
    marginHorizontal: spacing.md,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },

  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },

  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  connectedButton: {
    backgroundColor: "#ECFDF3",
    borderColor: "#22C55E",
  },

  buttonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },

  connectedText: {
    color: "#16A34A",
  },

  input: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
});
