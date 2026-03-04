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
import { useTheme } from "@/lib/theme";
import {
  isFinished as isFinishedState,
  isCancelled as isCancelledState,
  isLive as isLiveState,
} from "@repo/utils";

import { MaterialIcons, Ionicons } from "@expo/vector-icons";
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
const CRITICAL_COLOR = "#EF4444";
const SUCCESS_COLOR = "#22C55E";

const ONE_DAY = 24 * 60 * 60 * 1000;

type CTAMode = "action" | "live" | "liveAction" | "allSet" | "results";

function FixtureRow({
  fixture,
  onPress,
  theme,
  vsLabel,
  urgencyColor,
}: {
  fixture: FixtureItem;
  onPress: (fixtureId?: number) => void;
  theme: any;
  vsLabel: string;
  urgencyColor?: string;
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
      {/* Status (time / live / points / FT) — fixed left column */}
      <View style={styles.statusCol}>
        {isLive ? (
          <View style={[styles.statusBox, { backgroundColor: "#3B82F6" + "15" }]}>
            <Text style={[styles.statusDayText, { color: "#3B82F6" }]}>{fixture.liveMinute ?? 0}</Text>
            <Text style={[styles.statusMonthText, { color: "#3B82F6" }]}>Live</Text>
          </View>
        ) : isFinished && fixture.prediction?.points != null ? (
          <View style={[styles.pointsBadge, {
            backgroundColor: predictionResult === "max" ? "#10B981" + "20"
              : predictionResult === true ? "#FFB020" + "20"
              : "#EF4444" + "15",
          }]}>
            <Text style={[styles.pointsBadgeText, {
              color: predictionResult === "max" ? "#10B981"
                : predictionResult === true ? "#FFB020"
                : "#EF4444",
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
              const urgentColor = !hasPrediction ? CRITICAL_COLOR : theme.colors.textSecondary;
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
          const statusColor = statusUrgent ? CRITICAL_COLOR : theme.colors.textSecondary;
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
          {fixture.homeTeam?.shortCode ?? fixture.homeTeam?.name ?? ""}
        </Text>
        <Text
          style={[styles.teamNameStacked, { color: theme.colors.textPrimary }]}
          numberOfLines={1}
        >
          {fixture.awayTeam?.shortCode ?? fixture.awayTeam?.name ?? ""}
        </Text>
      </View>

      {/* Live/Finished: score first, then prediction */}
      {/* Upcoming: prediction only */}

      <View style={{ flex: 1 }} />

      {(isLive || isFinished) && (
        <View style={styles.vsCol}>
          <Text style={[styles.vsText, { color: isLive ? "#3B82F6" : theme.colors.textPrimary }]}>
            {fixture.homeScore90 ?? 0}
          </Text>
          <Text style={[styles.vsText, { color: isLive ? "#3B82F6" : theme.colors.textPrimary }]}>
            {fixture.awayScore90 ?? 0}
          </Text>
        </View>
      )}

      <View style={styles.predictionCompact}>
        {hasPrediction ? (
          <>
            <Text style={[styles.predictionCompactText, {
              color: predictionResult === "max" ? "#10B981"
                : predictionResult === true ? "#FFB020"
                : predictionResult === false ? "#EF4444"
                : theme.colors.textPrimary,
            }]}>
              {fixture.prediction!.home}
            </Text>
            <Text style={[styles.predictionCompactText, {
              color: predictionResult === "max" ? "#10B981"
                : predictionResult === true ? "#FFB020"
                : predictionResult === false ? "#EF4444"
                : theme.colors.textPrimary,
                          }]}>
              {fixture.prediction!.away}
            </Text>
          </>
        ) : (
          <Text style={[styles.predictionCompactText, {
            color: urgencyColor ?? theme.colors.textSecondary + "60",
          }]}>
            {"\u2013"}
          </Text>
        )}
      </View>

      <View style={[styles.checkCircle, hasPrediction
        ? { backgroundColor: theme.colors.textSecondary + "15" }
        : { borderWidth: 1, borderColor: theme.colors.textSecondary + "40" }
      ]}>
        <Ionicons name={hasPrediction ? "checkmark" : "add"} size={12} color={theme.colors.textSecondary} />
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
  const { mode, liveFixtures, upcomingFixtures, finishedFixtures } =
    useMemo(() => {
      const empty = {
        mode: "allSet" as CTAMode,
        liveFixtures: [] as FixtureItem[],
        upcomingFixtures: [] as FixtureItem[],
        finishedFixtures: [] as FixtureItem[],
      };
      if (fixtures.length === 0) return empty;

      const now = Date.now();

      const live = fixtures.filter(
        (f) => isLiveState(f.state) && !isCancelledState(f.state),
      );

      const unpredicted = fixtures.filter((f) => {
        if (!f.kickoffAt || isCancelledState(f.state)) return false;
        const isUpcoming = new Date(f.kickoffAt).getTime() > now;
        const hasPred = f.prediction?.home != null && f.prediction?.away != null;
        return isUpcoming && !hasPred;
      });

      const allFinished = fixtures.every(
        (f) => isFinishedState(f.state) || isCancelledState(f.state),
      );

      const upcoming = fixtures
        .filter((f) => {
          if (!f.kickoffAt || isCancelledState(f.state)) return false;
          return new Date(f.kickoffAt).getTime() > now && !isLiveState(f.state);
        })
        .sort(
          (a, b) =>
            new Date(a.kickoffAt!).getTime() -
            new Date(b.kickoffAt!).getTime(),
        );

      const finished = fixtures
        .filter((f) => isFinishedState(f.state) && !isCancelledState(f.state))
        .sort(
          (a, b) =>
            new Date(b.kickoffAt!).getTime() -
            new Date(a.kickoffAt!).getTime(),
        );

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
        upcomingFixtures: upcoming,
        finishedFixtures: finished,
      };
    }, [fixtures]);

  // --- Last saved time ---
  const lastSavedAt = useMemo(() => {
    let latest = 0;
    for (const f of fixtures) {
      if (f.prediction?.updatedAt) {
        const t = new Date(f.prediction.updatedAt).getTime();
        if (t > latest) latest = t;
      }
    }
    if (latest === 0) return null;
    const d = new Date(latest);
    const time = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    const date = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
    return `${date} ${time}`;
  }, [fixtures]);

  // --- Skeleton ---
  if (isLoading) {
    return (
      <View style={styles.outerWrapper}>
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
          <View style={styles.viewAllContainer}>
            <Pressable
              onPress={() => onPress()}
              style={({ pressed }) => [
                styles.viewAllButton,
                { borderColor: theme.colors.border },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.viewAllText, { color: theme.colors.textPrimary }]}>
                {t("lobby.ctaMoreGames", { count: overflow })}
              </Text>
            </Pressable>
          </View>
        )}
      </>
    );
  };

  return (
    <View style={styles.outerWrapper}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
        Predictions
      </Text>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.cardBackground,
          },
        ]}
      >
          {/* === RESULTS — last finished games with scores + predictions + points === */}
        {mode === "results" && (() => {
          const MAX_RESULTS = 4;
          const recentResults = finishedFixtures.slice(0, MAX_RESULTS);
          const overflow = finishedFixtures.length - MAX_RESULTS;
          return (
            <>
              {recentResults.map((f) => (
                <FixtureRow key={f.id} fixture={f} onPress={onPress} theme={theme} vsLabel={vsLabel} />
              ))}
              <View style={styles.viewAllContainer}>
                <Pressable
                  onPress={() => onPress()}
                  style={({ pressed }) => [
                    styles.viewAllButton,
                    { borderColor: theme.colors.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.viewAllText, { color: theme.colors.textPrimary }]}>
                    {overflow > 0 ? t("lobby.ctaMoreGames", { count: overflow }) : t("lobby.viewAllGames")}
                  </Text>
                </Pressable>
              </View>
            </>
          );
        })()}

        {/* === LIVE SECTION (live & liveAction) === */}
        {(mode === "live" || mode === "liveAction") && (
          <>
            {renderRows(liveFixtures, liveFixtures.length)}
            {upcomingFixtures.length > 0 && <View style={{ height: 8 }} />}
          </>
        )}

        {/* === DAY-GROUPED UPCOMING — unified for action, liveAction, live, allSet === */}
        {mode !== "results" && (() => {
          const now = new Date();
          const tmr = new Date(now);
          tmr.setDate(tmr.getDate() + 1);
          const isSameDay = (d: Date, ref: Date) => d.getDate() === ref.getDate() && d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();

          const allToday = upcomingFixtures.filter((f) => isSameDay(new Date(f.kickoffAt!), now));
          const allTomorrow = upcomingFixtures.filter((f) => isSameDay(new Date(f.kickoffAt!), tmr));
          const allLater = upcomingFixtures.filter((f) => !isSameDay(new Date(f.kickoffAt!), now) && !isSameDay(new Date(f.kickoffAt!), tmr));

          const MAX_ROWS = 8;
          const LATER_MIN = 3;
          const liveCount = (mode === "live" || mode === "liveAction") ? liveFixtures.length : 0;
          const todayGames = allToday.slice(0, MAX_ROWS);
          const tomorrowGames = allTomorrow.slice(0, Math.max(0, MAX_ROWS - todayGames.length));
          const beforeLater = liveCount + todayGames.length + tomorrowGames.length;
          const laterSlots = MAX_ROWS - beforeLater;
          const laterGames = beforeLater >= MAX_ROWS || laterSlots < LATER_MIN
            ? []
            : allLater.slice(0, laterSlots);
          const totalShown = todayGames.length + tomorrowGames.length + laterGames.length;
          const totalAll = allToday.length + allTomorrow.length + allLater.length;
          const overflow = totalAll - totalShown;

          if (totalAll === 0) return null;

          // Header color: any unpredicted → urgency color, else green
          const hasUnpredicted = (list: FixtureItem[]) => list.some((f) => f.prediction?.home == null || f.prediction?.away == null);
          const todayColor = todayGames.length > 0 && hasUnpredicted(allToday) ? CRITICAL_COLOR : SUCCESS_COLOR;
          const tomorrowColor = tomorrowGames.length > 0 && hasUnpredicted(allTomorrow) ? ACTION_COLOR : SUCCESS_COLOR;
          const laterColor = laterGames.length > 0 && hasUnpredicted(allLater) ? ACTION_COLOR : SUCCESS_COLOR;

          // Button color = highest urgency in card
          const buttonColor = todayColor === CRITICAL_COLOR ? CRITICAL_COLOR
            : tomorrowColor === ACTION_COLOR || laterColor === ACTION_COLOR ? ACTION_COLOR
            : SUCCESS_COLOR;

          let groupIndex = 0;

          return (
            <>
              {todayGames.map((f) => (
                <FixtureRow key={f.id} fixture={f} onPress={onPress} theme={theme} vsLabel={vsLabel} urgencyColor={todayColor !== SUCCESS_COLOR ? todayColor : undefined} />
              ))}
              {tomorrowGames.map((f) => (
                <FixtureRow key={f.id} fixture={f} onPress={onPress} theme={theme} vsLabel={vsLabel} urgencyColor={tomorrowColor !== SUCCESS_COLOR ? tomorrowColor : undefined} />
              ))}
              {laterGames.map((f) => (
                <FixtureRow key={f.id} fixture={f} onPress={onPress} theme={theme} vsLabel={vsLabel} urgencyColor={laterColor !== SUCCESS_COLOR ? laterColor : undefined} />
              ))}

              <View style={styles.viewAllContainer}>
                <Pressable
                  onPress={() => onPress()}
                  style={({ pressed }) => [
                    styles.viewAllButton,
                    { borderColor: theme.colors.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.viewAllText, { color: theme.colors.textPrimary }]}>
                    {overflow > 0 ? t("lobby.ctaMoreGames", { count: overflow }) : t("lobby.viewAllGames")}
                  </Text>
                </Pressable>
              </View>
            </>
          );
        })()}


        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
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
    paddingHorizontal: 4,
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
    width: 56,
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
    backgroundColor: "#3B82F6",
  },
  liveMinuteText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#3B82F6",
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
  viewAllContainer: {
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
