// features/group-creation/components/SelectionSummaryCard.tsx
// Compact summary card showing key selection info (date range, counts, etc.).

import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { AppText, Card } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { MaterialIcons } from "@expo/vector-icons";

export type SummaryItem = {
  icon: string;
  label: string;
  value: string;
};

interface SelectionSummaryCardProps {
  items: SummaryItem[];
  loading?: boolean;
  /** Number of skeleton slots to show when loading. Defaults to 3. */
  skeletonCount?: number;
}

/** Skeleton placeholder bar with pulse animation. */
function SkeletonBar({ width, height }: { width: number; height: number }) {
  const { theme } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: 4,
          backgroundColor: theme.colors.border,
        },
        animatedStyle,
      ]}
    />
  );
}

const DEFAULT_SKELETON_COUNT = 3;

export function SelectionSummaryCard({
  items,
  loading,
  skeletonCount = DEFAULT_SKELETON_COUNT,
}: SelectionSummaryCardProps) {
  const { theme } = useTheme();

  if (loading) {
    const count = Math.max(1, skeletonCount);
    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          {Array.from({ length: count }, (_, i) => i).map((i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
              )}
              <View style={styles.item}>
                <SkeletonBar width={20} height={20} />
                <SkeletonBar width={48} height={16} />
                <SkeletonBar width={60} height={12} />
              </View>
            </React.Fragment>
          ))}
        </View>
      </Card>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.border },
                ]}
              />
            )}
            <View style={styles.item}>
              <MaterialIcons
                name={
                  item.icon as React.ComponentProps<
                    typeof MaterialIcons
                  >["name"]
                }
                size={20}
                color={theme.colors.textSecondary}
              />
              <AppText variant="body" style={styles.value}>
                {item.value}
              </AppText>
              <AppText variant="caption" color="secondary">
                {item.label}
              </AppText>
            </View>
          </React.Fragment>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  value: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 22,
  },
  divider: {
    width: 1,
    alignSelf: "stretch",
    marginVertical: 2,
  },
});
