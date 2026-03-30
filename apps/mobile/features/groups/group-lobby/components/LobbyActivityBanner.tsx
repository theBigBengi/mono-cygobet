// features/groups/group-lobby/components/LobbyActivityBanner.tsx
// Activity feed with expand/collapse.

import React, { useMemo, useState, useCallback, useEffect } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/theme";
import { getShadowStyle } from "@/lib/theme/shadows";
import { useGroupActivityQuery } from "@/domains/groups";
import { formatRelativeTime } from "@/utils/date";
import type { ApiGroupActivityItem } from "@repo/types";

const COLLAPSED_COUNT = 4;
const EXPANDED_COUNT = 10;
// row height = body line (18) + time line (16) + marginTop 2 + marginBottom 12 + gap
const ROW_HEIGHT = 46;

export interface LobbyActivityBannerProps {
  groupId: number;
  unreadCount: number;
  onPress: () => void;
  /** Called when expand/collapse toggles, with the height delta to scroll by */
  onExpandChange?: (deltaHeight: number) => void;
}

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

function getEventIcon(eventType: string): IoniconsName {
  switch (eventType) {
    case "member_joined": return "person-add";
    case "member_left": return "person-remove";
    case "rules_changed": return "settings";
    case "games_added": return "add-circle";
    case "games_removed": return "remove-circle";
    case "group_info_changed": return "create";
    case "group_published": return "rocket";
    case "fixture_live": return "football";
    case "fixture_ft": return "checkmark";
    default: return "ellipse";
  }
}

function ActivityRow({ item, colors }: { item: ApiGroupActivityItem; colors: import("@/lib/theme/colors").Colors }) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const iconName = getEventIcon(item.eventType);

  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: colors.textPrimary }]}>
        <Ionicons name={iconName} size={13} color={colors.textInverse} />
      </View>
      <View style={styles.rowTextCol}>
        <Text style={[styles.rowBody, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.body}
        </Text>
        <Text style={[styles.rowTime, { color: colors.textSecondary }]}>
          {formatRelativeTime(item.createdAt)}
        </Text>
      </View>
    </View>
  );
}

function LobbyActivityBannerInner({ groupId, unreadCount, onPress, onExpandChange }: LobbyActivityBannerProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading } = useGroupActivityQuery(groupId);

  const skeletonOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (isLoading) {
      skeletonOpacity.value = withRepeat(
        withTiming(1, { duration: 800 }),
        -1,
        true
      );
    }
  }, [isLoading, skeletonOpacity]);

  const skeletonStyle = useAnimatedStyle(() => ({
    opacity: skeletonOpacity.value,
  }));

  const allItems = useMemo(
    () => data?.pages.flatMap((p) => p.data.items) ?? [],
    [data]
  );

  // Always render up to EXPANDED_COUNT, clip with animated height
  const renderItems = useMemo(
    () => allItems.slice(0, EXPANDED_COUNT),
    [allItems]
  );

  const canToggle = allItems.length > COLLAPSED_COUNT;
  const hasItems = allItems.length > 0;

  const collapsedCount = Math.min(allItems.length, COLLAPSED_COUNT);
  const expandedCount = Math.min(allItems.length, EXPANDED_COUNT);
  const collapsedHeight = collapsedCount * ROW_HEIGHT + ROW_HEIGHT;
  const expandedHeight = expandedCount * ROW_HEIGHT;

  const animHeight = useSharedValue(collapsedHeight);
  const fadeOpacity = useSharedValue(1);

  useEffect(() => {
    if (!expanded) {
      animHeight.value = collapsedHeight;
    }
  }, [collapsedHeight]);

  const listStyle = useAnimatedStyle(() => ({
    height: animHeight.value,
    overflow: "hidden" as const,
  }));

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
  }));

  const handleToggle = useCallback(() => {
    const next = !expanded;
    const config = { duration: 350, easing: Easing.out(Easing.cubic) };

    if (next) {
      animHeight.value = withTiming(expandedHeight, config);
      fadeOpacity.value = withTiming(0, { duration: 200 });
      onExpandChange?.(expandedHeight - collapsedHeight);
    } else {
      animHeight.value = withTiming(collapsedHeight, config);
      fadeOpacity.value = withTiming(1, { duration: 250 });
    }
    setExpanded(next);
  }, [expanded, expandedHeight, collapsedHeight, animHeight, fadeOpacity, onExpandChange]);

  // Build rgba gradient colors from surface hex to avoid 8-digit hex rendering issues
  const bgHex = theme.colors.surface;
  const r = parseInt(bgHex.slice(1, 3), 16);
  const g = parseInt(bgHex.slice(3, 5), 16);
  const b = parseInt(bgHex.slice(5, 7), 16);
  const fadeTo = (alpha: number) => `rgba(${r},${g},${b},${alpha})`;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.wrapper, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.headerRow}>
            <Animated.View
              style={[
                { width: 80, height: 14, borderRadius: theme.radius.xs, backgroundColor: theme.colors.border },
                skeletonStyle,
              ]}
            />
            <Animated.View
              style={[
                { width: 50, height: 12, borderRadius: theme.radius.xs, backgroundColor: theme.colors.border },
                skeletonStyle,
              ]}
            />
          </View>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.skeletonRow}>
              <Animated.View
                style={[
                  styles.skeletonCircle,
                  { backgroundColor: theme.colors.border },
                  skeletonStyle,
                ]}
              />
              <View style={styles.skeletonTextCol}>
                <Animated.View
                  style={[
                    { width: "80%", height: 12, borderRadius: theme.spacing.xs, backgroundColor: theme.colors.border },
                    skeletonStyle,
                  ]}
                />
                <Animated.View
                  style={[
                    { width: 28, height: 10, borderRadius: theme.spacing.xs, marginTop: 3, backgroundColor: theme.colors.border },
                    skeletonStyle,
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.wrapper, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            {t("lobby.activity")}
          </Text>
          {hasItems && (
            <Pressable
              onPress={onPress}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>
                {t("lobby.seeAll")}
              </Text>
            </Pressable>
          )}
        </View>

        {hasItems ? (
          <View style={styles.listWrapper}>
            <Animated.View style={listStyle}>
              {renderItems.map((item) => (
                <ActivityRow key={item.id} item={item} colors={theme.colors} />
              ))}
            </Animated.View>

            {canToggle && (
              <View style={styles.buttonContainer}>
                <Animated.View style={[styles.fadeGradient, fadeStyle]} pointerEvents="none">
                  <LinearGradient
                    colors={[fadeTo(0), fadeTo(0.15), fadeTo(0.5), fadeTo(0.85), fadeTo(1)]}
                    locations={[0, 0.2, 0.5, 0.8, 1]}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
                <Pressable
                  onPress={handleToggle}
                  style={({ pressed }) => [
                    styles.toggleButton,
                    { backgroundColor: theme.colors.primary + "30" },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.buttonText, { color: theme.colors.primary }]}>
                    {expanded ? t("lobby.seeLess") : t("lobby.seeMore")}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {t("activity.empty")}
          </Text>
        )}
      </View>
    </View>
  );
}

export const LobbyActivityBanner = React.memo(LobbyActivityBannerInner);

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    wrapper: {
      borderRadius: theme.radius.sm,
      padding: theme.spacing.lg,
      ...getShadowStyle("md"),
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.ms,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
    },
    seeAllText: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.primary,
    },
    listWrapper: {
      position: "relative",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.ms,
      height: ROW_HEIGHT,
    },
    rowTextCol: {
      flex: 1,
    },
    rowTime: {
      fontSize: 12,
      fontWeight: "500",
      marginTop: theme.spacing.xxs,
    },
    rowBody: {
      fontSize: 14,
      fontWeight: "500",
    },
    rowIcon: {
      width: theme.spacing.lg,
      height: theme.spacing.lg,
      borderRadius: theme.radius.full,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: {
      fontSize: 13,
      fontWeight: "500",
    },
    buttonContainer: {
      alignItems: "center",
      marginTop: theme.spacing.xs,
    },
    fadeGradient: {
      position: "absolute",
      top: -120,
      left: 0,
      right: 0,
      height: 120,
    },
    toggleButton: {
      marginTop: -4,
      paddingVertical: theme.spacing.ms,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radius.full,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: "700",
    },
    pressed: {
      opacity: 0.8,
    },
    skeletonRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.ms,
      height: ROW_HEIGHT,
    },
    skeletonCircle: {
      width: theme.spacing.lg,
      height: theme.spacing.lg,
      borderRadius: theme.radius.full,
    },
    skeletonTextCol: {
      flex: 1,
    },
  });
