// features/groups/chat/components/MentionPicker.tsx
// Dropdown picker for @mentions — members and fixtures.

import React, { useMemo } from "react";
import { View, FlatList, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";

export interface MentionOption {
  type: "user" | "fixture";
  id: number;
  display: string;
}

interface MentionPickerProps {
  query: string;
  members: MentionOption[];
  fixtures: MentionOption[];
  onSelect: (option: MentionOption) => void;
}

export function MentionPicker({
  query,
  members,
  fixtures,
  onSelect,
}: MentionPickerProps) {
  const { theme } = useTheme();

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const matchedMembers = members.filter((m) =>
      m.display.toLowerCase().includes(q)
    );
    const matchedFixtures = fixtures.filter((f) =>
      f.display.toLowerCase().includes(q)
    );
    return [...matchedMembers, ...matchedFixtures].slice(0, 8);
  }, [query, members, fixtures]);

  if (filtered.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        keyboardShouldPersistTaps="always"
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSelect(item)}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: pressed
                  ? theme.colors.border
                  : "transparent",
              },
            ]}
          >
            <AppText
              variant="caption"
              color="secondary"
              style={styles.optionType}
            >
              {item.type === "user" ? "Member" : "Game"}
            </AppText>
            <AppText variant="body" style={styles.optionDisplay}>
              {item.display}
            </AppText>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 200,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  optionType: {
    width: 56,
    fontSize: 11,
    fontWeight: "600",
  },
  optionDisplay: {
    flex: 1,
  },
});
