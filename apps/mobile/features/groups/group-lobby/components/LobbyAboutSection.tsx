import React, { useMemo } from "react";
import { View, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useTheme } from "@/lib/theme";
import type { Colors } from "@/lib/theme/colors";
import type { ApiGroupItem } from "@repo/types";

interface LobbyAboutSectionProps {
  group: ApiGroupItem;
}

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

function AboutRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: IoniconsName;
  label: string;
  value: string;
  colors: Colors;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: colors.textPrimary }]}>
        <Ionicons name={icon} size={13} color="#FFFFFF" />
      </View>
      <View style={styles.rowTextCol}>
        <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
          {label}
        </Text>
        <Text style={[styles.rowValue, { color: colors.textPrimary }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function buildRows(group: ApiGroupItem, t: TFunction) {
  const rows: { icon: IoniconsName; label: string; value: string }[] = [];

  // Prediction mode
  const isCorrectScore = group.predictionMode === "CorrectScore";
  rows.push({
    icon: "stats-chart-outline",
    label: t("groupInfo.predictionMode"),
    value: isCorrectScore
      ? t("groupInfo.rules.correctScoreMode")
      : t("groupInfo.rules.matchWinnerMode"),
  });

  // Scoring — only for CorrectScore
  if (isCorrectScore) {
    const exact = group.onTheNosePoints ?? 3;
    const diff = group.correctDifferencePoints ?? 2;
    const outcome = group.outcomePoints ?? 1;
    rows.push({
      icon: "trophy-outline",
      label: t("groupInfo.scoring"),
      value: `${exact} / ${diff} / ${outcome}`,
    });
  }

  // Game selection
  const selectionKey = group.selectionMode ?? "games";
  rows.push({
    icon: "football-outline",
    label: t("groupInfo.selectionMode"),
    value: t(`groupInfo.selectionValues.${selectionKey}`),
  });

  // KO round mode
  if (group.koRoundMode && group.koRoundMode !== "FullTime") {
    rows.push({
      icon: "flag-outline",
      label: t("groupInfo.countUntil"),
      value:
        group.koRoundMode === "Penalties"
          ? t("groupInfo.penalties")
          : t("groupInfo.extraTime"),
    });
  }

  // Privacy
  rows.push({
    icon: group.privacy === "private" ? "lock-closed-outline" : "globe-outline",
    label: t("groupInfo.privacy"),
    value: t(`groupInfo.privacyValues.${group.privacy}`),
  });

  return rows;
}

function LobbyAboutSectionInner({ group }: LobbyAboutSectionProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const rows = useMemo(() => buildRows(group, t), [group, t]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          {t("lobby.about")}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.cardBackground }]}>
        {rows.map((row, i) => (
          <AboutRow
            key={i}
            icon={row.icon}
            label={row.label}
            value={row.value}
            colors={theme.colors}
          />
        ))}
      </View>
    </View>
  );
}

export const LobbyAboutSection = React.memo(LobbyAboutSectionInner);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 20,
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
  card: {
    borderRadius: 14,
    padding: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  rowIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTextCol: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  rowValue: {
    fontSize: 13,
    fontWeight: "600",
  },
});
