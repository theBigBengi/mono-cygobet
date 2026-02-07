// features/profile/stats/components/BadgesCard.tsx
// Badge list with current/target, progress bar, and info sheet.

import React, { useRef } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiBadge } from "@repo/types";
import { MaterialIcons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { BadgesInfoSheet } from "./BadgesInfoSheet";

interface BadgesCardProps {
  badges: ApiBadge[];
}

function BadgeRow({ badge }: { badge: ApiBadge }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.badgeRow, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.badgeHeader}>
        <AppText variant="body" style={styles.badgeName}>
          {badge.name}
        </AppText>
        {badge.earned ? (
          <AppText
            style={[styles.badgeStatus, { color: theme.colors.success }]}
          >
            Done ✓
          </AppText>
        ) : (
          <AppText
            style={[styles.badgeStatus, { color: theme.colors.textSecondary }]}
          >
            {badge.current}/{badge.target}
          </AppText>
        )}
      </View>
      <View style={styles.badgeProgress}>
        <AppText variant="caption" color="secondary" style={styles.badgeDesc}>
          {badge.description}
        </AppText>
        <View
          style={[styles.progressBar, { backgroundColor: theme.colors.border }]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${badge.progress}%`,
                backgroundColor: badge.earned
                  ? theme.colors.success
                  : theme.colors.primary,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

export function BadgesCard({ badges }: BadgesCardProps) {
  const { theme } = useTheme();
  const sheetRef = useRef<React.ComponentRef<typeof BottomSheetModal>>(null);

  const sortedBadges = [...badges].sort((a, b) => {
    if (a.earned !== b.earned) return a.earned ? 1 : -1;
    return b.progress - a.progress;
  });

  return (
    <Card>
      <View style={styles.titleRow}>
        <AppText variant="subtitle">Badges</AppText>
        <Pressable onPress={() => sheetRef.current?.present()} hitSlop={10}>
          <MaterialIcons
            name="help-outline"
            size={20}
            color={theme.colors.textSecondary}
          />
        </Pressable>
      </View>
      {sortedBadges.map((badge) => (
        <BadgeRow key={badge.id} badge={badge} />
      ))}
      <BadgesInfoSheet sheetRef={sheetRef} badges={badges} />
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  badgeRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  badgeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  badgeName: {
    fontWeight: "600",
  },
  badgeStatus: {
    fontSize: 14,
    fontWeight: "600",
  },
  badgeProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  badgeDesc: {
    flex: 1,
  },
  progressBar: {
    width: 80,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
});
