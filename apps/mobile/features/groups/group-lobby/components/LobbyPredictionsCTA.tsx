// features/groups/group-lobby/components/LobbyPredictionsCTA.tsx
// Lobby predictions CTA - dynamic smart card with mode-based content

import React, { useMemo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
} from "react-native-reanimated";
import { useTheme } from "@/lib/theme";
import {
  isFinished as isFinishedState,
  isCancelled as isCancelledState,
  isLive as isLiveState,
} from "@repo/utils";

import { Ionicons, Fontisto } from "@expo/vector-icons";
import { TeamLogo } from "@/components/ui";
import type { FixtureItem } from "@/types/common";

export interface LobbyPredictionsCTAProps {
  predictionsCount: number;
  totalFixtures: number;
  onPress: (fixtureId?: number) => void;
  fixtures?: FixtureItem[];
  isLoading?: boolean;
  /** Number of completed fixtures in the group — used to compute game numbers */
  completedFixturesCount?: number;
}

// LIVE_COLOR and CRITICAL_COLOR removed — use theme.colors.danger instead

function FixtureRow({
  fixture,
  onPress,
  theme,
  vsLabel,
  urgencyColor,
  gameNumber,
  useFullName,
}: {
  fixture: FixtureItem;
  onPress: (fixtureId?: number) => void;
  theme: import("@/lib/theme/theme.types").Theme;
  vsLabel: string;
  urgencyColor?: string;
  gameNumber?: number;
  useFullName?: boolean;
}) {
  const isLive = isLiveState(fixture.state);
  const isFinished = isFinishedState(fixture.state);
  const hasPrediction =
    fixture.prediction?.home != null && fixture.prediction?.away != null;

  // Prediction result coloring for finished games
  const isExact = isFinished && hasPrediction &&
    fixture.prediction!.home === fixture.homeScore90 &&
    fixture.prediction!.away === fixture.awayScore90;
  const hasPoints = isFinished && (fixture.prediction?.points ?? 0) > 0;
  const predictionResult: "max" | true | false | undefined = isFinished && hasPrediction
    ? (isExact ? "max" : hasPoints ? true : false)
    : undefined;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <Pressable
      onPress={() => onPress(fixture.id)}
      style={({ pressed }) => [styles.fixtureRow, pressed && styles.pressed]}
    >
      {/* Game number */}
      {gameNumber != null && (
        <Text style={[styles.gameNumber, { color: theme.colors.textSecondary }]}>
          {gameNumber}
        </Text>
      )}

      {/* Status (time / live / points / FT) — fixed left column */}
      <View style={styles.statusCol}>
        {isLive ? (
          <View style={[styles.statusBox, { backgroundColor: theme.colors.live + "15" }]}>
            <Text style={[styles.statusDayText, { color: theme.colors.live }]}>{fixture.liveMinute ?? 0}</Text>
            <Text style={[styles.statusMonthText, { color: theme.colors.live }]}>Live</Text>
          </View>
        ) : isFinished && fixture.prediction?.points != null ? (
          <View style={[styles.pointsBadge, {
            backgroundColor: predictionResult === "max" ? theme.colors.success + "20"
              : predictionResult === true ? theme.colors.warning + "20"
              : theme.colors.danger + "15",
          }]}>
            <Text style={[styles.pointsBadgeText, {
              color: predictionResult === "max" ? theme.colors.success
                : predictionResult === true ? theme.colors.warning
                : theme.colors.danger,
            }]}>
              {fixture.prediction.points} pts
            </Text>
          </View>
        ) : (() => {
          let statusLabel = "\u2014";
          let statusUrgent = false;
          let statusIcon: "av-timer" | "schedule" | "event" | undefined;
          if (isFinished) {
            statusLabel = "FT";
          } else if (fixture.kickoffAt) {
            const k = new Date(fixture.kickoffAt);
            const n = new Date();
            const tmr = new Date(n);
            tmr.setDate(tmr.getDate() + 1);
            const isToday = k.getDate() === n.getDate() && k.getMonth() === n.getMonth() && k.getFullYear() === n.getFullYear();
            const isTomorrow = k.getDate() === tmr.getDate() && k.getMonth() === tmr.getMonth() && k.getFullYear() === tmr.getFullYear();
            if (isToday) {
              const urgentColor = !hasPrediction ? theme.colors.danger : theme.colors.textSecondary;
              const diff = k.getTime() - n.getTime();
              if (diff <= 0) {
                const hh = k.getHours().toString().padStart(2, "0");
                const mm = k.getMinutes().toString().padStart(2, "0");
                return (
                  <View style={[styles.statusBox, { backgroundColor: urgentColor + "12" }]}>
                    <Text style={[styles.statusDayText, { color: urgentColor }]}>{hh}</Text>
                    <Text style={[styles.statusMonthText, { color: urgentColor }]}>{mm}</Text>
                  </View>
                );
              } else {
                const totalMin = Math.floor(diff / 60000);
                const h = Math.floor(totalMin / 60);
                const m = totalMin % 60;
                if (h === 0) {
                  return (
                    <View style={[styles.statusBox, { backgroundColor: urgentColor + "12" }]}>
                      <Text style={[styles.statusDayText, { color: urgentColor }]}>{m}</Text>
                      <Text style={[styles.statusMonthText, { color: urgentColor }]}>min</Text>
                    </View>
                  );
                } else {
                  return (
                    <View style={[styles.statusBox, { backgroundColor: urgentColor + "12" }]}>
                      <Text style={[styles.statusDayText, { color: urgentColor }]}>{h}h</Text>
                      <Text style={[styles.statusMonthText, { color: urgentColor }]}>{m}m</Text>
                    </View>
                  );
                }
              }
            } else if (isTomorrow) {
              const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
              const sc = theme.colors.textPrimary + "CC";
              return (
                <View style={[styles.statusBox, { backgroundColor: theme.colors.textSecondary + "12" }]}>
                  <Text style={[styles.statusMonthText, { color: sc }]}>{MONTHS[k.getMonth()]}</Text>
                  <Text style={[styles.statusDayText, { color: sc }]}>{k.getDate()}</Text>
                </View>
              );
            } else {
              const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
              const statusMonth = MONTHS[k.getMonth()];
              const statusDay = k.getDate();
              const sc = theme.colors.textPrimary + "CC";
              return (
                <View style={[styles.statusBox, { backgroundColor: theme.colors.textSecondary + "12" }]}>
                  <Text style={[styles.statusMonthText, { color: sc }]}>{statusMonth}</Text>
                  <Text style={[styles.statusDayText, { color: sc }]}>{statusDay}</Text>
                </View>
              );
            }
          }
          const statusColor = statusUrgent ? theme.colors.danger : theme.colors.textSecondary;
          return (
            <View style={[styles.statusBox, { backgroundColor: theme.colors.textSecondary + "12" }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          );
        })()}
      </View>

      {/* Team names stacked vertically */}
      <View style={styles.teamsCol}>
        <Text
          style={[styles.teamNameStacked, { color: theme.colors.textPrimary }]}
          numberOfLines={1}
        >
          {useFullName ? (fixture.homeTeam?.name ?? "") : (fixture.homeTeam?.shortCode ?? fixture.homeTeam?.name ?? "")}
        </Text>
        <Text
          style={[styles.teamNameStacked, { color: theme.colors.textPrimary }]}
          numberOfLines={1}
        >
          {useFullName ? (fixture.awayTeam?.name ?? "") : (fixture.awayTeam?.shortCode ?? fixture.awayTeam?.name ?? "")}
        </Text>
      </View>

      {/* Live/Finished: score first, then prediction */}
      {/* Upcoming: prediction only */}

      <View style={{ flex: 1 }} />

      {(isLive || isFinished) && (
        <View style={styles.vsCol}>
          <Text style={[styles.vsText, { color: isLive ? theme.colors.live : theme.colors.textPrimary }]}>
            {fixture.homeScore90 ?? 0}
          </Text>
          <Text style={[styles.vsText, { color: isLive ? theme.colors.live : theme.colors.textPrimary }]}>
            {fixture.awayScore90 ?? 0}
          </Text>
        </View>
      )}

      <View style={styles.predictionCompact}>
        {hasPrediction ? (
          <>
            <Text style={[styles.predictionCompactText, {
              color: predictionResult === "max" ? theme.colors.success + "90"
                : predictionResult === true ? theme.colors.warning + "90"
                : predictionResult === false ? theme.colors.danger + "90"
                : theme.colors.textPrimary + "80",
            }]}>
              {fixture.prediction!.home}
            </Text>
            <Text style={[styles.predictionCompactText, {
              color: predictionResult === "max" ? theme.colors.success + "90"
                : predictionResult === true ? theme.colors.warning + "90"
                : predictionResult === false ? theme.colors.danger + "90"
                : theme.colors.textPrimary + "80",
            }]}>
              {fixture.prediction!.away}
            </Text>
          </>
        ) : (
          <Text style={[styles.predictionCompactText, {
            color: theme.colors.textPrimary,
          }]}>
            {"\u2013"}
          </Text>
        )}
      </View>

      <View style={[styles.checkCircle, hasPrediction
        ? { backgroundColor: theme.colors.textSecondary + "15" }
        : { borderWidth: 1, borderColor: theme.colors.textSecondary + "40" }
      ]}>
        <Ionicons name={hasPrediction ? "checkmark" : "add"} size={hasPrediction ? 12 : 14} color={hasPrediction ? theme.colors.textSecondary : theme.colors.textPrimary} />
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
  completedFixturesCount = 0,
}: LobbyPredictionsCTAProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const [useFullName, setUseFullName] = useState(false);
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

  const liveCount = useMemo(() => {
    return fixtures.filter((f) => isLiveState(f.state) && !isCancelledState(f.state)).length;
  }, [fixtures]);

  const nextGames = useMemo(() => {
    const now = Date.now();
    return fixtures
      .filter((f) => {
        if (!f.kickoffAt || isCancelledState(f.state)) return false;
        return new Date(f.kickoffAt).getTime() > now && !isLiveState(f.state) && !isFinishedState(f.state);
      })
      .sort((a, b) => new Date(a.kickoffAt!).getTime() - new Date(b.kickoffAt!).getTime())
      .slice(0, 5);
  }, [fixtures]);

  // --- Skeleton ---
  if (isLoading) {
    return (
      <View style={styles.outerWrapper}>
        {/* Section title skeleton */}
        <Animated.View
          style={[
            { width: 80, height: 14, borderRadius: 6, backgroundColor: theme.colors.border, marginBottom: 8 },
            skeletonAnimatedStyle,
          ]}
        />
        {/* Fixture rows skeleton */}
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 5, gap: 8 }}>
            <Animated.View
              style={[
                { width: 42, height: 42, borderRadius: 6, backgroundColor: theme.colors.border },
                skeletonAnimatedStyle,
              ]}
            />
            <View style={{ flex: 1, gap: 4 }}>
              <Animated.View
                style={[
                  { width: 60, height: 12, borderRadius: 4, backgroundColor: theme.colors.border },
                  skeletonAnimatedStyle,
                ]}
              />
              <Animated.View
                style={[
                  { width: 50, height: 12, borderRadius: 4, backgroundColor: theme.colors.border },
                  skeletonAnimatedStyle,
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    );
  }

  // --- Empty ---
  if (fixtures.length === 0 && totalFixtures === 0) return null;

  const vsLabel = t("lobby.ctaVs");

  return (
    <View style={styles.outerWrapper}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          Upcoming
        </Text>
      </View>
      <View style={styles.container}>
        {nextGames.map((f, i) => {
          const isToday = f.kickoffAt ? (() => {
            const k = new Date(f.kickoffAt);
            const n = new Date();
            return k.getDate() === n.getDate() && k.getMonth() === n.getMonth() && k.getFullYear() === n.getFullYear();
          })() : false;
          const hasPred = f.prediction?.home != null && f.prediction?.away != null;
          const urgent = isToday && !hasPred ? theme.colors.danger : undefined;
          return (
            <FixtureRow
              key={f.id}
              fixture={f}
              onPress={onPress}
              theme={theme}
              vsLabel={vsLabel}
              urgencyColor={urgent}
              gameNumber={completedFixturesCount + liveCount + i + 1}
              useFullName={useFullName}
            />
          );
        })}

      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  viewAllCenter: {
    alignItems: "center",
    marginTop: 10,
  },
  viewAllBtn: {
    paddingVertical: 7,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  viewAllBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  container: {
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
  fixtureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  gameNumber: {
    fontSize: 11,
    fontWeight: "600",
    marginRight: 10,
    textAlign: "left",
  },
  logoCol: {
    width: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  teamsCol: {
    gap: 2,
    marginLeft: 4,
  },
  teamNameStacked: {
    fontSize: 13,
    fontWeight: "600",
  },
  teamName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  homeTeamName: {
    textAlign: "right",
    marginRight: 8,
  },
  awayTeamName: {
    textAlign: "left",
    marginLeft: 8,
  },
  vsCol: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: -4,
  },
  vsText: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 18,
  },
  statusCol: {
    width: 46,
  },
  statusBox: {
    width: 42,
    height: 42,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusMonthText: {
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
  },
  statusDayText: {
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 19,
  },
  statusTimeText: {
    fontSize: 11,
    fontWeight: "700",
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
    // backgroundColor set dynamically via theme.colors.live
  },
  liveMinuteText: {
    fontSize: 11,
    fontWeight: "700",
    // color set dynamically via theme.colors.live
  },
  predictionCompact: {
    width: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  predictionCompactText: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 18,
  },
  predictionBoxes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginLeft: 6,
  },
  predictionBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  predictionBoxText: {
    fontSize: 12,
    fontWeight: "700",
  },
  predictionSeparator: {
    fontSize: 10,
    fontWeight: "600",
  },
  predictionDivider: {
    width: "80%",
    height: 1,
  },
  pointsBadge: {
    paddingHorizontal: 6,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  pointsBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  footerSummaryRow: {
    alignItems: "center",
    marginTop: 8,
  },
  viewAllButton: {
    paddingVertical: 7,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "700",
  },
  dayHeader: {
    marginBottom: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: "700",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingHorizontal: 4,
  },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  progressText: {
    fontSize: 10,
    fontWeight: "500",
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  pressed: {
    opacity: 0.8,
  },
  summaryText: {
    width: "50%",
    fontSize: 11,
    fontWeight: "500",
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
    height: 34,
    borderRadius: 20,
    marginTop: 12,
    width: 120,
    alignSelf: "center",
  },
});
