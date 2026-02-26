// features/groups/group-lobby/components/LobbyPredictionsCTA.tsx
// Lobby predictions CTA - dynamic smart card with mode-based content

import React, { useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";
import {
  isFinished as isFinishedState,
  isCancelled as isCancelledState,
  isLive as isLiveState,
} from "@repo/utils";

import { TeamLogo } from "@/components/ui";
import type { FixtureItem } from "@/types/common";

export interface LobbyPredictionsCTAProps {
  predictionsCount: number;
  totalFixtures: number;
  onPress: (fixtureId?: number) => void;
  fixtures?: FixtureItem[];
  isLoading?: boolean;
}

const LIVE_COLOR = "#EF4444";
const ACTION_COLOR = "#F59E0B";
const MAX_ROWS = 5;

type CTAMode = "action" | "live" | "liveAction" | "allSet" | "results";

function getTimeUntil(
  kickoffAt: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const diff = new Date(kickoffAt).getTime() - Date.now();
  if (diff <= 0) return "";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return t("time.hoursShort", { count: hours });
  return t("time.minutesShort", { count: minutes || 1 });
}

function FixtureRow({
  fixture,
  onPress,
  theme,
  vsLabel,
}: {
  fixture: FixtureItem;
  onPress: (fixtureId?: number) => void;
  theme: any;
  vsLabel: string;
}) {
  const isLive = isLiveState(fixture.state);
  const isFinished = isFinishedState(fixture.state);
  const hasPrediction =
    fixture.prediction?.home != null && fixture.prediction?.away != null;
  const predictionText = hasPrediction
    ? `${fixture.prediction!.home}:${fixture.prediction!.away}`
    : "\u2013:\u2013";

  return (
    <Pressable
      onPress={() => onPress(fixture.id)}
      style={({ pressed }) => [styles.fixtureRow, pressed && styles.pressed]}
    >
      {/* Status (time / live / FT) — fixed left column */}
      <View style={styles.statusCol}>
        {isLive ? (
          <View style={styles.liveStatusRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveMinuteText}>
              {fixture.liveMinute ?? 0}{"\u2032"}
            </Text>
          </View>
        ) : (
          <Text
            style={[styles.statusText, { color: theme.colors.textSecondary }]}
          >
            {isFinished
              ? "FT"
              : fixture.kickoffAt
                ? `${new Date(fixture.kickoffAt).getDate().toString().padStart(2, "0")}/${(new Date(fixture.kickoffAt).getMonth() + 1).toString().padStart(2, "0")}`
                : "\u2014"}
          </Text>
        )}
      </View>

      {/* Home logo — fixed column */}
      <View style={styles.logoCol}>
        <TeamLogo
          imagePath={fixture.homeTeam?.imagePath}
          teamName={fixture.homeTeam?.name ?? ""}
          size={20}
        />
      </View>

      {/* Home name — flex, right-aligned toward vs */}
      <Text
        style={[styles.teamName, styles.homeTeamName, { color: theme.colors.textPrimary }]}
        numberOfLines={1}
      >
        {fixture.homeTeam?.shortCode ?? fixture.homeTeam?.name ?? ""}
      </Text>

      {/* VS / Live score — fixed center */}
      {isLive ? (
        <Text style={[styles.vsText, { color: LIVE_COLOR, fontWeight: "700", opacity: 1, fontSize: 13 }]}>
          {fixture.homeScore90 ?? 0}:{fixture.awayScore90 ?? 0}
        </Text>
      ) : (
        <Text style={[styles.vsText, { color: theme.colors.textSecondary }]}>
          {vsLabel}
        </Text>
      )}

      {/* Away name — flex, left-aligned from vs */}
      <Text
        style={[styles.teamName, styles.awayTeamName, { color: theme.colors.textPrimary }]}
        numberOfLines={1}
      >
        {fixture.awayTeam?.shortCode ?? fixture.awayTeam?.name ?? ""}
      </Text>

      {/* Away logo — fixed column */}
      <View style={styles.logoCol}>
        <TeamLogo
          imagePath={fixture.awayTeam?.imagePath}
          teamName={fixture.awayTeam?.name ?? ""}
          size={20}
        />
      </View>

      {/* Right column — prediction */}
      <View style={styles.rightCol}>
        <Text
          style={[
            styles.predictionText,
            hasPrediction
              ? { color: theme.colors.textPrimary }
              : { color: theme.colors.textSecondary + "80" },
          ]}
        >
          {predictionText}
        </Text>
      </View>

    </Pressable>
  );
}

export function LobbyPredictionsCTA({
  predictionsCount,
  totalFixtures,
  onPress,
  fixtures = [],
  isLoading = false,
}: LobbyPredictionsCTAProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const skeletonOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (isLoading) {
      skeletonOpacity.value = withRepeat(
        withTiming(1, { duration: 800 }),
        -1,
        true,
      );
    }
  }, [isLoading, skeletonOpacity]);

  const skeletonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: skeletonOpacity.value,
  }));

  // --- Mode computation ---
  const { mode, liveFixtures, unpredictedFixtures, nextKickoffAt } =
    useMemo(() => {
      if (fixtures.length === 0)
        return {
          mode: "allSet" as CTAMode,
          liveFixtures: [] as FixtureItem[],
          unpredictedFixtures: [] as FixtureItem[],
          nextKickoffAt: null as string | null,
        };

      const now = Date.now();

      const live = fixtures.filter(
        (f) => isLiveState(f.state) && !isCancelledState(f.state),
      );

      const unpredicted = fixtures
        .filter((f) => {
          if (!f.kickoffAt || isCancelledState(f.state)) return false;
          const isUpcoming = new Date(f.kickoffAt).getTime() > now;
          const hasPred =
            f.prediction?.home != null && f.prediction?.away != null;
          return isUpcoming && !hasPred;
        })
        .sort(
          (a, b) =>
            new Date(a.kickoffAt!).getTime() -
            new Date(b.kickoffAt!).getTime(),
        );

      const allFinished = fixtures.every(
        (f) => isFinishedState(f.state) || isCancelledState(f.state),
      );

      // Find next kickoff time
      let kickoffAt: string | null = null;
      if (unpredicted.length > 0) {
        kickoffAt = unpredicted[0].kickoffAt!;
      } else {
        const nextUpcoming = fixtures.find((f) => {
          if (!f.kickoffAt || isCancelledState(f.state)) return false;
          return new Date(f.kickoffAt).getTime() > now;
        });
        if (nextUpcoming?.kickoffAt) kickoffAt = nextUpcoming.kickoffAt;
      }

      let computedMode: CTAMode;
      if (live.length > 0 && unpredicted.length > 0)
        computedMode = "liveAction";
      else if (live.length > 0) computedMode = "live";
      else if (unpredicted.length > 0) computedMode = "action";
      else if (allFinished) computedMode = "results";
      else computedMode = "allSet";

      return {
        mode: computedMode,
        liveFixtures: live,
        unpredictedFixtures: unpredicted,
        nextKickoffAt: kickoffAt,
      };
    }, [fixtures]);

  const nextKickoffTime = nextKickoffAt
    ? getTimeUntil(nextKickoffAt, t)
    : "";

  // --- Skeleton ---
  if (isLoading) {
    return (
      <View style={styles.wrapper}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <Animated.View
              style={[
                styles.skeletonBar,
                { backgroundColor: theme.colors.border },
                skeletonAnimatedStyle,
              ]}
            />
            <Animated.View
              style={[
                styles.skeletonBarSmall,
                { backgroundColor: theme.colors.border },
                skeletonAnimatedStyle,
              ]}
            />
          </View>
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.skeletonRow,
                { backgroundColor: theme.colors.border },
                skeletonAnimatedStyle,
              ]}
            />
          ))}
          <Animated.View
            style={[
              styles.skeletonButton,
              { backgroundColor: theme.colors.border },
              skeletonAnimatedStyle,
            ]}
          />
        </View>
      </View>
    );
  }

  // --- Empty ---
  if (fixtures.length === 0 && totalFixtures === 0) return null;

  const vsLabel = t("lobby.ctaVs");
  const borderBottomColor = theme.colors.textSecondary + "40";
  const primaryIconBg = theme.colors.primary + "15";

  // Progress text (shown in all mode headers)
  const progressEl = (
    <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
      {t("lobby.predictionsProgress", {
        count: predictionsCount,
        total: totalFixtures,
      })}
    </Text>
  );

  // --- Fixture rows helper ---
  const renderRows = (list: FixtureItem[], max: number) => {
    const visible = list.slice(0, max);
    const overflow = list.length - max;
    return (
      <>
        {visible.map((f) => (
          <FixtureRow
            key={f.id}
            fixture={f}
            onPress={onPress}
            theme={theme}
            vsLabel={vsLabel}
          />
        ))}
        {overflow > 0 && (
          <Pressable
            onPress={() => onPress()}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={[styles.moreText, { color: theme.colors.primary }]}>
              {t("lobby.ctaMoreGames", { count: overflow })}
            </Text>
          </Pressable>
        )}
      </>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.border,
            borderBottomColor,
          },
        ]}
      >
        {/* === HEADER === */}
        {mode === "action" && (
          <View
            style={[
              styles.alertStrip,
              { backgroundColor: ACTION_COLOR + "12" },
            ]}
          >
            <Text
              style={[styles.alertText, { color: ACTION_COLOR }]}
              numberOfLines={2}
            >
              {t("lobby.ctaGamesNeedPredictions", {
                count: unpredictedFixtures.length,
              })}
              {nextKickoffTime
                ? ` \u00B7 ${t("lobby.ctaNextKickoff", { time: nextKickoffTime })}`
                : ""}
            </Text>
            {progressEl}
          </View>
        )}

        {(mode === "live" || mode === "liveAction") && (
          <View style={styles.headerRow}>
            {progressEl}
          </View>
        )}

        {mode === "allSet" && (
          <View style={styles.headerRow}>
            <Text
              style={[
                styles.headerTitle,
                { color: theme.colors.textPrimary },
              ]}
              numberOfLines={2}
            >
              {t("lobby.ctaAllSet")}
              {nextKickoffTime
                ? ` \u00B7 ${t("lobby.ctaNextGame", { time: nextKickoffTime })}`
                : ""}
            </Text>
            {progressEl}
          </View>
        )}

        {mode === "results" && (
          <View style={styles.headerRow}>
            <Text
              style={[
                styles.headerTitle,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t("lobby.ctaAllFinished")}
            </Text>
            {progressEl}
          </View>
        )}

        {/* === CONTENT === */}
        {mode === "action" && renderRows(unpredictedFixtures, MAX_ROWS)}

        {mode === "live" && renderRows(liveFixtures, liveFixtures.length)}

        {mode === "liveAction" && (
          <>
            {renderRows(liveFixtures, liveFixtures.length)}
            <View
              style={[
                styles.sectionDivider,
                { backgroundColor: theme.colors.border },
              ]}
            />
            <View
              style={[
                styles.alertStrip,
                { backgroundColor: ACTION_COLOR + "12" },
              ]}
            >
              <Text style={[styles.alertText, { color: ACTION_COLOR }]}>
                {t("lobby.ctaGamesNeedPredictions", {
                  count: unpredictedFixtures.length,
                })}
              </Text>
            </View>
            {renderRows(unpredictedFixtures, MAX_ROWS)}
          </>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  container: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  alertStrip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    alignItems: "center",
  },
  alertText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  progressText: {
    fontSize: 12,
    fontWeight: "500",
    flexShrink: 0,
  },
  fixtureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  logoCol: {
    width: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  teamName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  homeTeamName: {
    textAlign: "right",
    marginLeft: 8,
  },
  awayTeamName: {
    textAlign: "left",
    marginRight: 8,
  },
  vsText: {
    fontSize: 10,
    fontWeight: "500",
    marginHorizontal: 4,
    opacity: 0.4,
  },
  statusCol: {
    width: 64,
    alignItems: "flex-start",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "500",
  },
  liveStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: LIVE_COLOR,
  },
  liveMinuteText: {
    fontSize: 11,
    fontWeight: "700",
    color: LIVE_COLOR,
  },
  rightCol: {
    width: 64,
    alignItems: "flex-end",
  },
  liveScoreText: {
    fontSize: 13,
    fontWeight: "700",
    color: LIVE_COLOR,
  },
  predictionText: {
    fontSize: 13,
    fontWeight: "700",
    width: "100%",
    textAlign: "right",
  },
  sectionDivider: {
    height: 1,
    marginVertical: 8,
    marginHorizontal: 4,
  },
  moreText: {
    fontSize: 12,
    fontWeight: "600",
    paddingVertical: 4,
    paddingHorizontal: 4,
    textAlign: "center",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 3,
  },
  buttonIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  pressed: {
    opacity: 0.8,
  },
  // Skeleton
  skeletonBar: {
    width: 160,
    height: 14,
    borderRadius: 4,
  },
  skeletonBarSmall: {
    width: 80,
    height: 12,
    borderRadius: 4,
  },
  skeletonRow: {
    height: 32,
    borderRadius: 6,
    marginBottom: 6,
  },
  skeletonButton: {
    height: 44,
    borderRadius: 12,
    marginTop: 12,
  },
});
