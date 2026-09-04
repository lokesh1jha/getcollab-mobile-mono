import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";

interface Props {
  value?: string;
  onChange: (language: string) => void;
}

const LANGUAGES = [
  "English",
  "Hindi",
  "Marathi",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Gujarati",
  "Punjabi",
  "Bengali",
  "Urdu",
  "Spanish",
  "French",
  "German",
  "Japanese",
  "Korean",
  "Chinese (Mandarin)",
  "Portuguese",
  "Russian",
  "Arabic",
  "Italian",
  "Dutch",
  "Turkish",
  "Vietnamese",
  "Thai",
  "Indonesian",
];

export default function ContentLanguageSelector({
  value = "English",
  onChange,
}: Props) {
  const [visible, setVisible] = useState(false);

  const selected = useMemo(() => value || "English", [value]);

  return (
    <>
      <Pressable style={styles.selector} onPress={() => setVisible(true)}>
        <Text style={styles.value}>{selected}</Text>

        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      <Modal visible={visible} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.title}>Select Content Language</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {LANGUAGES.map((language) => (
                <Pressable
                  key={language}
                  style={styles.item}
                  onPress={() => {
                    onChange(language);
                    setVisible(false);
                  }}
                >
                  <Text style={styles.itemText}>{language}</Text>

                  {selected === language && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={colors.primary}
                    />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    height: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.backgroundLight,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  value: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "500",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },

  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    maxHeight: "70%",
  },

  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: spacing.lg,
  },

  item: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },

  itemText: {
    color: colors.text,
    fontSize: 15,
  },
});
