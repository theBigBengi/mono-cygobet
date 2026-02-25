import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";

type Props = {
  totalPoints: number;
  predictedCount: number;
  totalCount: number;
  accuracy: number;
};

export function GamesSummaryCard({
  totalPoints,
  predictedCount,
  totalCount,
  accuracy,
}: Props) {
  const { theme } = useTheme();

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.row}>
          <View style={styles.stat}>
            <Ionicons name="flash" size={16} color={theme.colors.primary} />
            <Text style={[styles.value, { color: theme.colors.textPrimary }]}>
              {totalPoints}
            </Text>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              pts
            </Text>
          </View>

          <View
            style={[styles.divider, { backgroundColor: theme.colors.border }]}
          />

          <View style={styles.stat}>
            <Ionicons
              name="football-outline"
              size={16}
              color={theme.colors.primary}
            />
            <Text style={[styles.value, { color: theme.colors.textPrimary }]}>
              {predictedCount}
              <Text style={[styles.total, { color: theme.colors.textSecondary }]}>
                /{totalCount}
              </Text>
            </Text>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              predicted
            </Text>
          </View>

          <View
            style={[styles.divider, { backgroundColor: theme.colors.border }]}
          />

          <View style={styles.stat}>
            <Ionicons
              name="trophy-outline"
              size={16}
              color={accuracy > 50 ? "#10B981" : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.value,
                {
                  color:
                    accuracy > 50 ? "#10B981" : theme.colors.textPrimary,
                },
              ]}
            >
              {accuracy}%
            </Text>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              accuracy
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 20,
    marginBottom: 20,
  },
  card: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  stat: {
    alignItems: "center",
    gap: 2,
    flex: 1,
  },
  value: {
    fontSize: 18,
    fontWeight: "800",
  },
  total: {
    fontSize: 14,
    fontWeight: "600",
  },
  label: {
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  divider: {
    width: 1,
    height: 28,
  },
});
