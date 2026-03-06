import React from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { MaterialCommunityIcons, Fontisto, Foundation, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { GroupGamesSkeleton } from "./GroupGamesSkeleton";

type Props = {
  isReady: boolean;
  emptyState: { message: string; suggestion?: { label: string; action: () => void } } | null;
  filteredFixturesCount: number;
  totalPoints: number;
  predictedCount: number;
  totalCount: number;
  accuracy: number;
  useFullName?: boolean;
  onToggleFullName?: () => void;
  cardLayout?: "vertical" | "horizontal";
  onToggleCardLayout?: () => void;
  onFilterSortPress?: () => void;
  activeFilterLabel?: string;
};

export const GroupGamesListHeader = React.memo(function GroupGamesListHeader({
  isReady,
  emptyState,
  filteredFixturesCount,
  useFullName = true,
  onToggleFullName,
  cardLayout = "vertical",
  onToggleCardLayout,
  onFilterSortPress,
  activeFilterLabel,
}: Props) {
  const { theme } = useTheme();

  if (!isReady) {
    return <GroupGamesSkeleton />;
  }
  if (emptyState && filteredFixturesCount === 0) {
    return (
      <View style={styles.emptyStateContainer}>
        <AppText
          variant="body"
          color="secondary"
          style={styles.emptyStateMessage}
        >
          {emptyState.message}
        </AppText>
        {emptyState.suggestion && (
          <AppText
            variant="body"
            style={[
              styles.emptyStateSuggestion,
              { color: theme.colors.primary },
            ]}
            onPress={emptyState.suggestion.action}
          >
            {emptyState.suggestion.label}
          </AppText>
        )}
      </View>
    );
  }
  return (
    <View>
      <View style={styles.topRow}>
        <View style={styles.leftIcons}>
          <Pressable onPress={onToggleFullName} style={styles.toggleBtn}>
            <Fontisto
              name="text-width"
              size={18}
              color={useFullName ? theme.colors.primary : theme.colors.textSecondary}
            />
          </Pressable>
          <Pressable onPress={onToggleCardLayout} style={styles.toggleBtn}>
            {cardLayout === "vertical" ? (
              <Foundation name="list" size={18} color={theme.colors.textSecondary} />
            ) : (
              <MaterialCommunityIcons name="format-list-text" size={22} color={theme.colors.textSecondary} />
            )}
          </Pressable>
        </View>
        <View style={[styles.iconCircle, { borderColor: theme.colors.border }]}>
          <MaterialCommunityIcons name="cards-outline" size={28} color={theme.colors.textSecondary} />
        </View>
      </View>
      {onFilterSortPress && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onFilterSortPress();
          }}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={({ pressed }) => [
            styles.filterSortButton,
            pressed && { opacity: 0.5 },
          ]}
        >
          <Ionicons name="options-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={[styles.filterSortLabel, { color: theme.colors.textSecondary }]}>
            {activeFilterLabel || "Filter & Sort"}
          </Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  leftIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toggleBtn: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderRadius: 6,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterSortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 12,
  },
  filterSortLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyStateContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  emptyStateMessage: {
    textAlign: "center",
    marginBottom: 12,
  },
  emptyStateSuggestion: {
    fontWeight: "600",
  },
});
