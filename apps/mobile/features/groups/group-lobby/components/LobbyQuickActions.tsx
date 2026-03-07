// features/groups/group-lobby/components/LobbyQuickActions.tsx
// Compact pill-row quick action buttons.

import React, { useEffect } from "react";
import { Animated as RNAnimated, View, ScrollView, StyleSheet, Pressable, Text } from "react-native";
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/lib/theme";
import { AnimatedGradientCard } from "./AnimatedGradientCard";

export interface QuickAction {
  icon: "cards" | "chat" | "stats" | "activity";
  label: string;
  badge?: number;
  onPress: () => void;
}

export interface LobbyQuickActionsProps {
  actions: QuickAction[];
  isLoading?: boolean;
  predictionsCount?: number;
  totalFixtures?: number;
}

function renderIcon(icon: QuickAction["icon"], color: string, size: number) {
  switch (icon) {
case "cards":
      return <MaterialCommunityIcons name="cards-outline" size={size + 2} color={color} />;
    case "chat":
      return <Ionicons name="chatbubbles-outline" size={size} color={color} />;
case "stats":
      return <MaterialIcons name="view-comfortable" size={size + 4} color={color} />;
    case "activity":
      return <Ionicons name="newspaper-outline" size={size} color={color} />;
  }
}

function LobbyQuickActionsInner({
  actions,
  isLoading = false,
  predictionsCount = 0,
  totalFixtures = 0,
}: LobbyQuickActionsProps) {
  const { theme } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (isLoading) {
      opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    }
  }, [isLoading, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.skeletonCard,
            { backgroundColor: theme.colors.border },
            animatedStyle,
          ]}
        />
      </View>
    );
  }

  const renderAction = (action: QuickAction, index: number) => {
    const hasBadge = action.badge != null && action.badge > 0;
    const isFirst = action.icon === "cards";
    return (
      <Pressable
        key={index}
        onPress={action.onPress}
        style={({ pressed }) => [
          styles.pill,
          isFirst && styles.primaryPill,
          {
            backgroundColor: pressed ? theme.colors.textPrimary + "10" : "transparent",
            borderColor: isFirst ? theme.colors.textPrimary + "20" : "transparent",
          },
        ]}
      >
        {renderIcon(action.icon, isFirst ? theme.colors.textPrimary : theme.colors.textSecondary, 22)}
        {hasBadge && (
          <View
            style={[
              styles.badge,
              { backgroundColor: theme.colors.danger },
            ]}
          >
            <Text style={styles.badgeText}>
              {action.badge! > 99 ? "99+" : action.badge}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  const cardsAction = actions.find((a) => a.icon === "cards");
  const otherActions = actions.filter((a) => a.icon !== "cards");

  return (
    <View style={styles.container}>
      {cardsAction && (
        <Pressable
          onPress={cardsAction.onPress}
          style={({ pressed }) => [
            styles.cardWrapper,
            { backgroundColor: theme.colors.textPrimary + "08" },
            pressed && { opacity: 0.7 },
          ]}
        >
          <View style={styles.cardsRow}>
            <MaterialCommunityIcons name="cards-outline" size={18} color={theme.colors.textPrimary} />
            <Text style={[styles.cardsSubtitle, { color: theme.colors.textPrimary }]}>
              {totalFixtures - predictionsCount} of {totalFixtures} left
            </Text>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary} />
          </View>
        </Pressable>
      )}
      <View style={styles.row}>
        <View style={styles.leftGroup}>
          {otherActions.map((a, i) => renderAction(a, i + 1))}
        </View>
      </View>
    </View>
  );
}

export const LobbyQuickActions = React.memo(LobbyQuickActionsInner);

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginBottom: 20,
    paddingHorizontal: 0,
  },
  cardWrapper: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginHorizontal: 16,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardsSubtitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  leftGroup: {
    flexDirection: "row",
    gap: 8,
    flex: 1,
    justifyContent: "center",
  },
pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  primaryPill: {
    borderWidth: 1,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 10,
  },
  skeletonPill: {
    width: 90,
    height: 36,
    borderRadius: 20,
  },
  skeletonCard: {
    height: 52,
    borderRadius: 12,
  },
});
