// features/groups/group-lobby/screens/GroupAboutScreen.tsx
// Full about screen for a group — shows all group details and prediction rules.

import React, { useMemo } from "react";
import { View, StyleSheet, Text, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/theme";
import { GroupAvatar } from "@/components/ui";
import { useGroupQuery } from "@/domains/groups";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { getInitials } from "@/utils/string";
import { formatDate } from "@/utils/date";
import type { ApiGroupItem } from "@repo/types";
import type { TFunction } from "i18next";
import type { Colors } from "@/lib/theme/colors";

interface GroupAboutScreenProps {
  groupId: number | null;
}

function generateRulesSummary(group: ApiGroupItem, t: TFunction): string {
  const parts: string[] = [];

  if (group.predictionMode === "CorrectScore") {
    parts.push(t("groupInfo.summary.predictExactScore"));
  } else {
    parts.push(t("groupInfo.summary.predictWinner"));
  }

  if (group.predictionMode === "CorrectScore") {
    parts.push(
      t("groupInfo.summary.scoring", {
        exact: group.onTheNosePoints ?? 3,
        diff: group.correctDifferencePoints ?? 2,
        outcome: group.outcomePoints ?? 1,
      })
    );
  }

  if (group.koRoundMode === "Penalties") {
    parts.push(t("groupInfo.summary.koPenalties"));
  } else if (group.koRoundMode === "ExtraTime") {
    parts.push(t("groupInfo.summary.koExtraTime"));
  } else {
    parts.push(t("groupInfo.summary.koRegularTime"));
  }

  return parts.join(" ");
}

export function GroupAboutScreen({ groupId }: GroupAboutScreenProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const c = theme.colors;

  const { data, isLoading } = useGroupQuery(groupId);

  const group = data?.data ?? null;

  const summary = useMemo(
    () => (group ? generateRulesSummary(group, t) : ""),
    [group, t]
  );

  if (isLoading || !group) {
    return <QueryLoadingView message={t("groups.loadingPool")} />;
  }

  const initials = getInitials(group.name);

  const isCorrectScore = group.predictionMode === "CorrectScore";

  const exactPts = group.onTheNosePoints ?? 3;
  const diffPts = group.correctDifferencePoints ?? 2;
  const outcomePts = group.outcomePoints ?? 1;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar + Name */}
      <View style={styles.header}>
        <GroupAvatar
          avatarType={group.avatarType}
          avatarValue={group.avatarValue}
          initials={initials}
          size={72}
          borderRadius={18}
          flat
        />
        <Text style={[styles.groupName, { color: c.textPrimary }]} numberOfLines={2}>
          {group.name}
        </Text>
        {group.description ? (
          <Text style={[styles.description, { color: c.textSecondary }]}>
            {group.description}
          </Text>
        ) : null}
      </View>

      <Divider color={c.border} />

      {/* General Info */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
          {t("groupInfo.general")}
        </Text>
        <InfoRow label={t("groupInfo.status")} value={t(`groupInfo.statusValues.${group.status}`)} colors={c} />
        <InfoRow label={t("groupInfo.members")} value={`${group.memberCount ?? 0}/${group.maxMembers ?? 50}`} colors={c} />
        <InfoRow label={t("groupInfo.privacy")} value={t(`groupInfo.privacyValues.${group.privacy}`)} colors={c} />
        {group.totalFixtures != null && (
          <InfoRow label={t("lobby.games")} value={String(group.totalFixtures)} colors={c} />
        )}
        {group.createdAt && (
          <InfoRow label={t("groupAbout.created")} value={formatDate(group.createdAt)} colors={c} />
        )}
      </View>

      <Divider color={c.border} />

      {/* Predictions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
          {t("groupAbout.rules.predictionsTitle")}
        </Text>
        <Text style={[styles.bodyText, { color: c.textSecondary }]}>
          {t("groupAbout.rules.deadline")}
        </Text>
        <Text style={[styles.bodyText, { color: c.textSecondary, marginTop: 8 }]}>
          {t("groupAbout.rules.visibility")}
        </Text>
      </View>

      <Divider color={c.border} />

      {/* Live Updates */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
          {t("groupAbout.rules.liveTitle")}
        </Text>
        <Text style={[styles.bodyText, { color: c.textSecondary }]}>
          {t("groupAbout.rules.liveDesc")}
        </Text>
      </View>

      <Divider color={c.border} />

      {/* Scoring */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
          {t("groupAbout.rules.scoringTitle")}
        </Text>

        {isCorrectScore ? (
          <>
            <Text style={[styles.bodyText, { color: c.textSecondary }]}>
              {t("groupAbout.rules.scoringIntroCorrectScore")}
            </Text>

            <View style={styles.scoringList}>
              <ScoringTier
                label={t("groupAbout.rules.exactScoreDesc", { points: exactPts })}
                hint={t("groupAbout.rules.exactScoreHint")}
                colors={c}
              />
              <ScoringTier
                label={t("groupAbout.rules.correctDiffDesc", { points: diffPts })}
                hint={t("groupAbout.rules.correctDiffHint")}
                colors={c}
              />
              <ScoringTier
                label={t("groupAbout.rules.correctOutcomeDesc", { points: outcomePts })}
                hint={t("groupAbout.rules.correctOutcomeHint")}
                colors={c}
              />
              <ScoringTier
                label={t("groupAbout.rules.noPointsDesc")}
                hint={t("groupAbout.rules.noPointsHint")}
                colors={c}
              />
            </View>
          </>
        ) : (
          <Text style={[styles.bodyText, { color: c.textSecondary }]}>
            {t("groupAbout.rules.scoringIntroMatchWinner")}
          </Text>
        )}
      </View>

      {/* Examples (only for CorrectScore) */}
      {isCorrectScore && (
        <>
          <Divider color={c.border} />
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
              {t("groupAbout.rules.examplesTitle")}
            </Text>
            <ExamplesTable
              exactPts={exactPts}
              diffPts={diffPts}
              outcomePts={outcomePts}
              colors={c}
              t={t}
            />
          </View>
        </>
      )}

      {/* Tiebreakers (only for CorrectScore) */}
      {isCorrectScore && (
        <>
          <Divider color={c.border} />
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
              {t("groupAbout.rules.tiebreakersTitle")}
            </Text>
            <Text style={[styles.bodyText, { color: c.textSecondary }]}>
              {t("groupAbout.rules.tiebreakersDesc")}
            </Text>
          </View>
        </>
      )}

      <Divider color={c.border} />

      {/* KO Rounds */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
          {t("groupAbout.rules.koTitle")}
        </Text>
        <Text style={[styles.bodyText, { color: c.textSecondary }]}>
          {group.koRoundMode === "Penalties"
            ? t("groupAbout.rules.koPenaltiesDesc")
            : group.koRoundMode === "ExtraTime"
              ? t("groupAbout.rules.koExtraTimeDesc")
              : t("groupAbout.rules.koFullTimeDesc")}
        </Text>
      </View>

      <Divider color={c.border} />

      {/* Cancelled / Special Cases */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
          {t("groupAbout.rules.cancelledTitle")}
        </Text>
        <Text style={[styles.bodyText, { color: c.textSecondary }]}>
          {t("groupAbout.rules.cancelledDesc")}
        </Text>
      </View>

      <Divider color={c.border} />

      {/* Summary */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
          {t("groupAbout.howItWorks")}
        </Text>
        <Text style={[styles.bodyText, { color: c.textSecondary }]}>
          {summary}
        </Text>
      </View>
    </ScrollView>
  );
}

/* ── Sub-components ─────────────────────────────── */

function InfoRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { textSecondary: string; textPrimary: string };
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

function Divider({ color }: { color: string }) {
  return <View style={[styles.divider, { backgroundColor: color }]} />;
}

function ScoringTier({
  label,
  hint,
  colors,
}: {
  label: string;
  hint: string;
  colors: Colors;
}) {
  return (
    <View style={styles.scoringTier}>
      <Text style={[styles.scoringLabel, { color: colors.textPrimary }]}>
        {label}
      </Text>
      <Text style={[styles.scoringHint, { color: colors.textSecondary }]}>
        {hint}
      </Text>
    </View>
  );
}

function ExamplesTable({
  exactPts,
  diffPts,
  outcomePts,
  colors,
  t,
}: {
  exactPts: number;
  diffPts: number;
  outcomePts: number;
  colors: Colors;
  t: TFunction;
}) {
  const examples = [
    { result: "2 - 1", prediction: "2 - 1", points: exactPts, type: t("groupAbout.rules.exampleExact") },
    { result: "2 - 1", prediction: "3 - 2", points: diffPts, type: t("groupAbout.rules.exampleDiff") },
    { result: "2 - 1", prediction: "1 - 0", points: outcomePts, type: t("groupAbout.rules.exampleOutcome") },
    { result: "2 - 1", prediction: "0 - 0", points: 0, type: t("groupAbout.rules.exampleNone") },
  ];

  return (
    <View>
      {/* Header */}
      <View style={[styles.tableRow, styles.tableHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.tableHeaderText, styles.tableColResult, { color: colors.textSecondary }]}>
          {t("groupAbout.rules.exampleResult")}
        </Text>
        <Text style={[styles.tableHeaderText, styles.tableColPrediction, { color: colors.textSecondary }]}>
          {t("groupAbout.rules.examplePrediction")}
        </Text>
        <Text style={[styles.tableHeaderText, styles.tableColPoints, { color: colors.textSecondary }]}>
          {t("groupAbout.rules.examplePoints")}
        </Text>
      </View>

      {/* Rows */}
      {examples.map((ex, i) => (
        <View
          key={i}
          style={[
            styles.tableRow,
            i < examples.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
          ]}
        >
          <Text style={[styles.tableCell, styles.tableColResult, { color: colors.textPrimary }]}>
            {ex.result}
          </Text>
          <Text style={[styles.tableCell, styles.tableColPrediction, { color: colors.textPrimary }]}>
            {ex.prediction}
          </Text>
          <View style={[styles.tableColPoints, { flexDirection: "row", alignItems: "center", gap: 4 }]}>
            <Text style={[styles.tableCellBold, { color: colors.textPrimary }]}>
              {ex.points}
            </Text>
            <Text style={[styles.tableTypeLabel, { color: colors.textSecondary }]}>
              {ex.type}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    gap: 10,
    paddingBottom: 8,
  },
  groupName: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  section: {
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "400",
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 21,
  },

  /* Scoring tiers */
  scoringList: {
    marginTop: 12,
    gap: 12,
  },
  scoringTier: {
    gap: 2,
  },
  scoringLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  scoringHint: {
    fontSize: 13,
    lineHeight: 19,
  },

  /* Examples table */
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  tableHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  tableColResult: {
    flex: 1,
  },
  tableColPrediction: {
    flex: 1,
  },
  tableColPoints: {
    flex: 1.2,
    alignItems: "flex-end",
  },
  tableCell: {
    fontSize: 14,
    fontWeight: "400",
  },
  tableCellBold: {
    fontSize: 14,
    fontWeight: "700",
  },
  tableTypeLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
});
