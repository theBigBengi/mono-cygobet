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

function LobbyActivityBannerInner({ groupId, unreadCount, onPress }: LobbyActivityBannerProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
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
  const collapsedHeight = collapsedCount * ROW_HEIGHT + ROW_HEIGHT * 0.6;
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
    } else {
      animHeight.value = withTiming(collapsedHeight, config);
      fadeOpacity.value = withTiming(1, { duration: 250 });
    }
    setExpanded(next);
  }, [expanded, expandedHeight, collapsedHeight, animHeight, fadeOpacity]);

  const surfaceColor = theme.colors.surface;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.wrapper}>
          <View style={styles.headerRow}>
            <Animated.View
              style={[
                { width: 80, height: 14, borderRadius: 6, backgroundColor: theme.colors.border },
                skeletonStyle,
              ]}
            />
            <Animated.View
              style={[
                { width: 50, height: 12, borderRadius: 6, backgroundColor: theme.colors.border },
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
                    { width: "80%", height: 12, borderRadius: 4, backgroundColor: theme.colors.border },
                    skeletonStyle,
                  ]}
                />
                <Animated.View
                  style={[
                    { width: 28, height: 10, borderRadius: 4, marginTop: 3, backgroundColor: theme.colors.border },
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
      <View style={styles.wrapper}>
        <View style={styles.headerRow}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            {t("lobby.activity")}
          </Text>
          {hasItems && (
            <Pressable
              onPress={onPress}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Text style={[styles.headerViewAll, { color: theme.colors.textSecondary }]}>
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
                    colors={[surfaceColor + "00", surfaceColor]}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
                <Pressable
                  onPress={handleToggle}
                  style={({ pressed }) => [
                    styles.toggleButton,
                    { borderColor: theme.colors.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.buttonText, { color: theme.colors.textPrimary }]}>
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

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  wrapper: {
    borderRadius: 16,
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  headerViewAll: {
    fontSize: 12,
    fontWeight: "700",
  },
  listWrapper: {
    position: "relative",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: ROW_HEIGHT,
  },
  rowTextCol: {
    flex: 1,
  },
  rowTime: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  rowBody: {
    fontSize: 13,
    fontWeight: "500",
  },
  rowIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "500",
  },
  buttonContainer: {
    alignItems: "center",
    marginTop: 4,
  },
  fadeGradient: {
    position: "absolute",
    top: -65,
    left: 0,
    right: 0,
    height: 65,
  },
  toggleButton: {
    marginTop: -4,
    paddingVertical: 7,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.8,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: ROW_HEIGHT,
  },
  skeletonCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  skeletonTextCol: {
    flex: 1,
  },
});
