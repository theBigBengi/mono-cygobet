import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
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
 * Game-like 3D design with haptics.
 */
export function GameDetailTabs({ tabs, activeTab, onSelectTab }: Props) {
  const { theme } = useTheme();

  if (tabs.length === 0) return null;

  const handleTabPress = (tabId: TabId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectTab(tabId);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <Pressable
            key={tab.id}
            onPress={() => handleTabPress(tab.id)}
            style={({ pressed }) => [
              styles.tab,
              {
                backgroundColor: isActive
                  ? theme.colors.primary
                  : theme.colors.surface,
                shadowColor: "#000",
                shadowOpacity: pressed ? 0 : isActive ? 0.3 : 0.1,
                transform: [{ scale: pressed ? 0.95 : 1 }],
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
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  tabTextActive: {
    fontWeight: "700",
  },
});
