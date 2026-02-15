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
 * Matches SmartFilterChips design from other screens.
 */
export function GameDetailTabs({ tabs, activeTab, onSelectTab }: Props) {
  const { theme } = useTheme();

  if (tabs.length === 0) return null;

  return (
    <View style={[styles.container, { borderBottomColor: theme.colors.border }]}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onSelectTab(tab.id)}
            style={({ pressed }) => [
              styles.tab,
              pressed && styles.tabPressed,
              {
                backgroundColor: isActive
                  ? theme.colors.primary
                  : theme.colors.border,
              },
            ]}
          >
            <AppText
              variant="caption"
              style={[
                styles.tabText,
                {
                  color: isActive
                    ? theme.colors.primaryText
                    : theme.colors.textSecondary,
                },
                isActive && styles.tabTextActive,
              ]}
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
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tabPressed: {
    opacity: 0.7,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  tabTextActive: {
    fontWeight: "600",
  },
});
