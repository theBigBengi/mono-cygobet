// features/group-creation/components/SelectionSummaryCard.tsx
// Minimal summary strip — single line with dot separators.

import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
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
  skeletonCount?: number;
}

const DEFAULT_SKELETON_COUNT = 3;

export function SelectionSummaryCard({
  items,
  loading,
}: SelectionSummaryCardProps) {
  const { theme } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (loading) {
      opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    }
  }, [loading, opacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (loading) {
    return (
      <View style={styles.strip}>
        <Animated.View
          style={[
            { width: 180, height: 14, borderRadius: 4, backgroundColor: theme.colors.border },
            pulseStyle,
          ]}
        />
      </View>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.strip}>
      <View style={styles.row}>
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <Text style={[styles.dot, { color: theme.colors.border }]}>·</Text>
            )}
            <View style={styles.item}>
              <MaterialIcons
                name={item.icon as React.ComponentProps<typeof MaterialIcons>["name"]}
                size={14}
                color={theme.colors.textSecondary}
              />
              <Text style={[styles.itemText, { color: theme.colors.textSecondary }]}>
                {item.value}
              </Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  item: {
    alignItems: "center",
    gap: 3,
  },
  itemText: {
    fontSize: 13,
    fontWeight: "600",
  },
  dot: {
    fontSize: 12,
  },
});
