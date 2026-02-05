import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

export type TabId = "predict" | "predictions" | "statistics";

export type Tab = {
  id: TabId;
  label: string;
};

type Props = {
  tabs: Tab[];
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
};

/**
 * Horizontal row of pill-shaped tab buttons for game detail view.
 * Active tab: primary background + white text.
 * Inactive: surface background + secondary text.
 */
export function GameDetailTabs({ tabs, activeTab, onSelectTab }: Props) {
  const { theme } = useTheme();

  if (tabs.length === 0) return null;

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onSelectTab(tab.id)}
            style={[
              styles.tab,
              {
                backgroundColor: isActive
                  ? theme.colors.primary
                  : theme.colors.surface,
              },
            ]}
          >
            <AppText
              variant="caption"
              style={{
                color: isActive ? "#fff" : theme.colors.textSecondary,
                fontWeight: isActive ? "600" : "500",
              }}
            >
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
});
