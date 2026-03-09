import React, { useMemo } from "react";
import { View, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useTheme } from "@/lib/theme";
import type { Colors } from "@/lib/theme/colors";
import type { ApiGroupItem } from "@repo/types";

interface LobbyAboutSectionProps {
  group: ApiGroupItem;
}

/* ── tiny sub-components ─────────────────────────────── */

function SectionHeader({
  title,
  colors,
}: {
  title: string;
  colors: Colors;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionHeaderText, { color: colors.textPrimary }]}>
        {title}
      </Text>
    </View>
  );
}

function InfoRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: Colors;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.rowValue, { color: colors.textPrimary }]}>
        {value}
      </Text>
    </View>
  );
}

function Divider({ colors }: { colors: Colors }) {
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

/* ── main component ──────────────────────────────────── */

function generateRulesExplanation(group: ApiGroupItem, t: TFunction): string {
  const parts: string[] = [];

  if (group.predictionMode === "CorrectScore") {
    parts.push(t("groupInfo.rules.correctScoreMode"));
  } else {
    parts.push(t("groupInfo.rules.matchWinnerMode"));
  }

  if (group.predictionMode === "CorrectScore") {
    parts.push(
      t("groupInfo.rules.scoring", {
        exact: group.onTheNosePoints ?? 3,
        diff: group.correctDifferencePoints ?? 2,
        outcome: group.outcomePoints ?? 1,
      })
    );
  }

  if (group.selectionMode === "leagues") {
    parts.push(t("groupInfo.rules.leaguesMode"));
  } else if (group.selectionMode === "teams") {
    parts.push(t("groupInfo.rules.teamsMode"));
  } else {
    parts.push(t("groupInfo.rules.gamesMode"));
  }

  if (group.koRoundMode === "Penalties") {
    parts.push(t("groupInfo.rules.koPenalties"));
  } else if (group.koRoundMode === "ExtraTime") {
    parts.push(t("groupInfo.rules.koExtraTime"));
  }

  return parts.join(" ");
}

function LobbyAboutSectionInner({ group }: LobbyAboutSectionProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const c = theme.colors;

  const explanation = useMemo(
    () => generateRulesExplanation(group, t),
    [group, t]
  );

  const isCorrectScore = group.predictionMode === "CorrectScore";
  const hasKoRound =
    group.koRoundMode === "ExtraTime" || group.koRoundMode === "Penalties";

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
          {t("lobby.about")}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: c.cardBackground }]}>
        {/* Prediction Type */}
        <SectionHeader
          title={t("groupInfo.predictionType")}
          colors={c}
        />
        <InfoRow
          label={t("groupInfo.predictionMode")}
          value={t(
            `groupInfo.predictionModeLabels.${group.predictionMode}`,
            t("groupInfo.predictionModeLabels.CorrectScore")
          )}
          colors={c}
        />
        <InfoRow
          label={t("groupInfo.selectionMode")}
          value={t(
            `groupInfo.selectionValues.${group.selectionMode ?? "games"}`
          )}
          colors={c}
        />

        {/* Scoring */}
        {isCorrectScore && (
          <>
            <Divider colors={c} />
            <SectionHeader
              title={t("groupInfo.scoring")}
              colors={c}
            />
            <InfoRow
              label={t("groupInfo.exactScore")}
              value={`${group.onTheNosePoints ?? 3} ${t("groupInfo.points")}`}
              colors={c}
            />
            <InfoRow
              label={t("groupInfo.correctDiff")}
              value={`${group.correctDifferencePoints ?? 2} ${t("groupInfo.points")}`}
              colors={c}
            />
            <InfoRow
              label={t("groupInfo.correctOutcome")}
              value={`${group.outcomePoints ?? 1} ${t("groupInfo.point")}`}
              colors={c}
            />
          </>
        )}

        {/* KO Rounds */}
        {hasKoRound && (
          <>
            <Divider colors={c} />
            <SectionHeader
              title={t("groupInfo.koRounds")}
              colors={c}
            />
            <InfoRow
              label={t("groupInfo.countUntil")}
              value={
                group.koRoundMode === "Penalties"
                  ? t("groupInfo.penalties")
                  : t("groupInfo.extraTime")
              }
              colors={c}
            />
          </>
        )}

        {/* Explanation */}
        {explanation ? (
          <>
            <Divider colors={c} />
            <SectionHeader
              title={t("groupInfo.explanation")}
              colors={c}
            />
            <Text style={[styles.explanationText, { color: c.textSecondary }]}>
              {explanation}
            </Text>
          </>
        ) : null}
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    marginBottom: 6,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  rowValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  explanationText: {
    fontSize: 13,
    lineHeight: 19,
    paddingBottom: 2,
  },
});
