import React, { useMemo } from "react";
import { View, StyleSheet, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { useTheme } from "@/lib/theme";
import { getShadowStyle } from "@/lib/theme/shadows";
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
  const { theme } = useTheme();
  const styles = createStyles(theme);
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
  const { theme } = useTheme();
  const styles = createStyles(theme);
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
  const { theme } = useTheme();
  const styles = createStyles(theme);
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

/* ── main component ──────────────────────────────────── */

function generateRulesSummary(group: ApiGroupItem, t: TFunction): string {
  const parts: string[] = [];

  // Prediction mode
  if (group.predictionMode === "CorrectScore") {
    parts.push(t("groupInfo.summary.predictExactScore"));
  } else {
    parts.push(t("groupInfo.summary.predictWinner"));
  }

  // Scoring (only for CorrectScore)
  if (group.predictionMode === "CorrectScore") {
    parts.push(
      t("groupInfo.summary.scoring", {
        exact: group.onTheNosePoints ?? 3,
        diff: group.correctDifferencePoints ?? 2,
        outcome: group.outcomePoints ?? 1,
      })
    );
  }

  // KO round mode
  if (group.koRoundMode === "Penalties") {
    parts.push(t("groupInfo.summary.koPenalties"));
  } else if (group.koRoundMode === "ExtraTime") {
    parts.push(t("groupInfo.summary.koExtraTime"));
  } else {
    parts.push(t("groupInfo.summary.koRegularTime"));
  }

  return parts.join(" ");
}

function LobbyAboutSectionInner({ group }: LobbyAboutSectionProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const c = theme.colors;

  const summary = useMemo(
    () => generateRulesSummary(group, t),
    [group, t]
  );

  const isCorrectScore = group.predictionMode === "CorrectScore";
  const hasKoRound =
    group.koRoundMode === "ExtraTime" || group.koRoundMode === "Penalties";

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: c.surface, ...getShadowStyle("sm") }]}>
        <Text style={[styles.groupName, { color: c.textPrimary }]} numberOfLines={1}>
          {group.name}
        </Text>

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

        {/* Summary */}
        <Divider colors={c} />
        <Text style={[styles.summaryText, { color: c.textSecondary }]}>
          {summary}
        </Text>

        {/* See More */}
        <Pressable
          onPress={() => router.push({ pathname: "/groups/[id]/about", params: { id: String(group.id) } })}
          style={({ pressed }) => [
            styles.seeMoreButton,
            { backgroundColor: c.textPrimary + "08" },
            pressed && { opacity: 0.6 },
          ]}
        >
          <Text style={[styles.seeMoreText, { color: c.textPrimary }]}>
            {t("lobby.seeMore")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export const LobbyAboutSection = React.memo(LobbyAboutSectionInner);

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    card: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: "700",
      marginBottom: theme.spacing.sm,
    },
    groupName: {
      fontSize: 16,
      fontWeight: "700",
      marginBottom: theme.spacing.ms,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginTop: 6,
      marginBottom: theme.spacing.sm,
    },
    sectionHeaderText: {
      fontSize: 13,
      fontWeight: "700",
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 6,
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
      marginVertical: theme.spacing.ms,
    },
    summaryText: {
      fontSize: 13,
      lineHeight: 20,
      paddingBottom: theme.spacing.xxs,
    },
    seeMoreButton: {
      marginTop: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radius.xl,
      alignSelf: "center",
    },
    seeMoreText: {
      fontSize: 13,
      fontWeight: "600",
    },
  });
