// features/groups/group-lobby/components/DraftLobbySkeleton.tsx
// Skeleton placeholder that mirrors the GroupLobbyDraftScreen layout.
// Uses elevated card style consistent with the active lobby screen.

import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/lib/theme";

export function DraftLobbySkeleton() {
  const { theme } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const skeletonColor = theme.colors.border;

  const elevatedCard = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderBottomColor: theme.colors.textSecondary + "40",
  };

  return (
    <Animated.View style={pulseStyle}>
      {/* Banner row skeleton */}
      <View
        style={[
          styles.bannerRow,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderBottomColor: theme.colors.textSecondary + "40",
            borderRadius: theme.radius.lg,
          },
        ]}
      >
        <View
          style={[styles.badgePlaceholder, { backgroundColor: skeletonColor }]}
        />
        <View
          style={[
            styles.bannerTextPlaceholder,
            { backgroundColor: skeletonColor },
          ]}
        />
      </View>

      {/* Name / Description card skeleton */}
      <View style={styles.sectionSpacing}>
        <View style={[styles.card, elevatedCard]}>
          <View
            style={[
              styles.nameRowPlaceholder,
              { borderBottomColor: theme.colors.border },
            ]}
          >
            <View
              style={[
                styles.nameLinePlaceholder,
                { backgroundColor: skeletonColor },
              ]}
            />
          </View>
          <View style={styles.descriptionArea}>
            <View
              style={[
                styles.descriptionLine,
                { backgroundColor: skeletonColor },
              ]}
            />
            <View
              style={[
                styles.descriptionLineShort,
                { backgroundColor: skeletonColor },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Games section skeleton */}
      <View style={styles.sectionSpacing}>
        <View
          style={[styles.sectionLabel, { backgroundColor: skeletonColor }]}
        />
        <View style={[styles.card, elevatedCard]}>
          <RowPlaceholder
            color={skeletonColor}
            borderColor={theme.colors.border}
          />
          <RowPlaceholder
            color={skeletonColor}
            borderColor={theme.colors.border}
            isLast
          />
        </View>
      </View>

      {/* Prediction rules section skeleton */}
      <View style={styles.sectionSpacing}>
        <View
          style={[styles.sectionLabel, { backgroundColor: skeletonColor }]}
        />
        <View style={[styles.card, elevatedCard]}>
          <RowPlaceholder
            color={skeletonColor}
            borderColor={theme.colors.border}
          />
          <RowPlaceholder
            color={skeletonColor}
            borderColor={theme.colors.border}
            isLast
          />
        </View>
      </View>

      {/* Info section skeleton */}
      <View style={styles.sectionSpacing}>
        <View
          style={[
            styles.sectionLabel,
            { backgroundColor: skeletonColor, width: 30 },
          ]}
        />
        <View style={[styles.card, elevatedCard]}>
          <RowPlaceholder
            color={skeletonColor}
            borderColor={theme.colors.border}
            isLast
          />
        </View>
      </View>
    </Animated.View>
  );
}

function RowPlaceholder({
  color,
  borderColor,
  isLast = false,
}: {
  color: string;
  borderColor: string;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.rowPlaceholder,
        !isLast && { borderBottomWidth: 1, borderBottomColor: borderColor },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: color }]} />
      <View style={styles.rowTextCol}>
        <View style={[styles.rowLabel, { backgroundColor: color }]} />
        <View style={[styles.rowValue, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* Banner */
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderBottomWidth: 3,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  badgePlaceholder: {
    width: 60,
    height: 24,
    borderRadius: 6,
  },
  bannerTextPlaceholder: {
    flex: 1,
    height: 14,
    borderRadius: 4,
  },

  /* Cards */
  sectionSpacing: {
    marginBottom: 12,
  },
  sectionLabel: {
    width: 80,
    height: 10,
    borderRadius: 3,
    marginBottom: 8,
    marginStart: 16,
  },
  card: {
    borderWidth: 1,
    borderBottomWidth: 3,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },

  /* Name / description */
  nameRowPlaceholder: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  nameLinePlaceholder: {
    width: "60%",
    height: 16,
    borderRadius: 4,
  },
  descriptionArea: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  descriptionLine: {
    width: "90%",
    height: 12,
    borderRadius: 4,
  },
  descriptionLineShort: {
    width: "55%",
    height: 12,
    borderRadius: 4,
  },

  /* Setting rows */
  rowPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  rowTextCol: {
    flex: 1,
    gap: 6,
  },
  rowLabel: {
    width: "50%",
    height: 12,
    borderRadius: 4,
  },
  rowValue: {
    width: "35%",
    height: 10,
    borderRadius: 3,
  },
});
