// components/CategorySelector.tsx

import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "@shared/constants";

interface Props {
  value: string[];
  onChange: (categories: string[]) => void;
  maxSelection?: number;
}

const PRIMARY_CATEGORIES = [
  "Lifestyle",
  "Fashion",
  "Tech",
  "Gaming",
  "Fitness",
  "Travel",
  "Education",
  "Beauty",
];

const EXTRA_CATEGORIES = [
  "Food",
  "Finance",
  "Business",
  "Photography",
  "Music",
  "Sports",
  "Other",
];

export default function CategorySelector({
  value,
  onChange,
  maxSelection = 5,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const categories = useMemo(
    () =>
      expanded
        ? [...PRIMARY_CATEGORIES, ...EXTRA_CATEGORIES]
        : PRIMARY_CATEGORIES,
    [expanded],
  );

  const toggleCategory = (category: string) => {
    const exists = value.includes(category);

    if (exists) {
      onChange(value.filter((item) => item !== category));
      return;
    }

    if (value.length >= maxSelection) return;

    onChange([...value, category]);
  };

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>Categories</Text>

        <Text style={styles.count}>
          {value.length}/{maxSelection} selected
        </Text>
      </View>

      <View style={styles.container}>
        {categories.map((category) => {
          const selected = value.includes(category);

          return (
            <Pressable
              key={category}
              onPress={() => toggleCategory(category)}
              style={[styles.chip, selected && styles.selectedChip]}
            >
              <Text style={[styles.chipText, selected && styles.selectedText]}>
                {category}
              </Text>
            </Pressable>
          );
        })}

        {!expanded && (
          <Pressable style={styles.moreChip} onPress={() => setExpanded(true)}>
            <Ionicons name="add" size={16} color={colors.textMuted} />

            <Text style={styles.moreText}>More</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },

  count: {
    fontSize: 13,
    color: colors.textMuted,
  },

  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },

  selectedChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  chipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "400",
  },

  selectedText: {
    color: "#fff",
    fontWeight: "500",
  },

  moreChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.textMuted,
  },

  moreText: {
    color: colors.textMuted,
    fontWeight: "700",
    fontSize: 14,
  },
});
