import React from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { MaterialCommunityIcons, Foundation, Ionicons } from "@expo/vector-icons";
import { TextModeIcon } from "./TextModeIcon";
import * as Haptics from "expo-haptics";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { GroupGamesSkeleton } from "./GroupGamesSkeleton";
import { RoundNavigator } from "./RoundNavigator";

type Props = {
  isReady: boolean;
  emptyState: { message: string; suggestion?: { label: string; action: () => void } } | null;
  filteredFixturesCount: number;
  totalPoints: number;
  predictedCount: number;
  totalCount: number;
  accuracy: number;
  maxAccuracy?: number;
  useFullName?: boolean;
  onToggleFullName?: () => void;
  cardLayout?: "vertical" | "horizontal";
  onToggleCardLayout?: () => void;
  onFilterSortPress?: () => void;
  activeFilterLabel?: string;
  /** Leagues mode: round navigation */
  roundNav?: {
    selectedRound: string;
    canGoPrev: boolean;
    canGoNext: boolean;
    onPrev: () => void;
    onNext: () => void;
    onOpenPicker: () => void;
    labelOverride?: string;
  };
};

export const GroupGamesListHeader = React.memo(function GroupGamesListHeader({
  isReady,
  emptyState,
  filteredFixturesCount,
  totalCount,
  predictedCount,
  accuracy,
  maxAccuracy = 0,
  useFullName = true,
  onToggleFullName,
  cardLayout = "vertical",
  onToggleCardLayout,
  onFilterSortPress,
  activeFilterLabel,
  roundNav,
}: Props) {
  const { theme } = useTheme();

  if (!isReady) {
    return <GroupGamesSkeleton cardLayout={cardLayout} />;
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
      {/* Round navigator for leagues mode */}
      {roundNav && (
        <RoundNavigator
          selectedRound={roundNav.selectedRound}
          onPrev={roundNav.onPrev}
          onNext={roundNav.onNext}
          onOpenPicker={roundNav.onOpenPicker}
          canGoPrev={roundNav.canGoPrev}
          canGoNext={roundNav.canGoNext}
          labelOverride={roundNav.labelOverride}
        />
      )}

      <View style={styles.toolbar}>
        {!roundNav && onFilterSortPress && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onFilterSortPress();
            }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={({ pressed }) => [
              styles.filterBtn,
                            pressed && { opacity: 0.6 },
            ]}
          >
            <Ionicons name="options-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.filterBtnLabel, { color: theme.colors.textSecondary }]}>
              {activeFilterLabel || "Filter & Sort"}
            </Text>
          </Pressable>
        )}
        {roundNav && <View />}
        <View style={styles.toolbarRight}>
          <Pressable
            onPress={onToggleFullName}
            style={({ pressed }) => [
              styles.toolbarBtn,
                            pressed && { opacity: 0.6 },
            ]}
          >
            <TextModeIcon
              expanded={useFullName}
              size={18}
              color={theme.colors.textSecondary}
            />
          </Pressable>
          <Pressable
            onPress={onToggleCardLayout}
            style={({ pressed }) => [
              styles.toolbarBtn,
                            pressed && { opacity: 0.6 },
            ]}
          >
            {cardLayout === "vertical" ? (
              <Foundation name="list" size={16} color={theme.colors.textSecondary} />
            ) : (
              <MaterialCommunityIcons name="format-list-text" size={20} color={theme.colors.textSecondary} />
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.toolbarBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <MaterialCommunityIcons name="cards-outline" size={20} color={theme.colors.textSecondary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  toolbarBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  toolbarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  filterBtnLabel: {
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
