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
        <View style={[styles.cardShadow, { backgroundColor: theme.colors.background }]}>
        <Pressable
          onPress={cardsAction.onPress}
          style={({ pressed }) => [
            styles.cardWrapper,
            pressed && { opacity: 0.8 },
          ]}
        >
          <View style={[styles.card]}>
              <View style={styles.cardsRow}>
                <View style={[styles.cardsIconBg, { backgroundColor: "#9CA3AF15" }]}>
                  <View style={[styles.cardsIconCircle, { borderColor: theme.colors.border }]}>
                    <MaterialCommunityIcons name="cards-outline" size={22} color={theme.colors.textSecondary} />
                  </View>
                </View>
                <View style={styles.cardsTextCol}>
                  <Text style={[styles.cardsTitle, { color: theme.colors.textPrimary }]}>
                    Predict All
                  </Text>
                  <Text style={[styles.cardsSubtitle, { color: theme.colors.textSecondary }]}>
                    {totalFixtures - predictionsCount} of {totalFixtures} left
                  </Text>
                </View>
                <View style={[styles.chevronCircle, { backgroundColor: theme.colors.border + "40" }]}>
                  <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary} />
                </View>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
                <LinearGradient
                  colors={["#9CA3AF", "#000000"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: totalFixtures > 0 ? `${(predictionsCount / totalFixtures) * 100}%` : "0%" }]}
                />
              </View>
          </View>
        </Pressable>
        </View>
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
    marginTop: 10,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  cardShadow: {
    borderRadius: 12,
  },
  cardWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#9CA3AF40",
  },
  card: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
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
    gap: 10,
  },
  cardsTextCol: {
    flex: 1,
  },
  cardsTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardsSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 1,
  },
  cardsIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cardsIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
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
