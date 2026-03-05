// DEBUG SCREEN — Remove after done tweaking GroupGamesScreen
// Shows games/teams/leagues modes with different fixture counts.
// Purpose: quickly test different selectionMode + fixture count combos
// to understand how filters, grouping, and layout should behave.

import React, { useState, useMemo, useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/lib/theme";
import { groupsKeys } from "@/domains/groups";
import { GroupGamesScreen } from "./GroupGamesScreen";
import type { FixtureItem } from "@/types/common";

const now = new Date();
const hours = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000).toISOString();
const yesterday = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();

const team = (id: number, name: string, shortCode: string) => ({
  id,
  name,
  shortCode,
  imagePath: null,
  firstKitColor: null,
  secondKitColor: null,
  thirdKitColor: null,
});

const league = (id: number, name: string, country?: string) => ({
  id,
  name,
  country: country ?? "England",
  imagePath: null,
});

const TEAMS = [
  team(1, "Liverpool", "LIV"),
  team(2, "Arsenal", "ARS"),
  team(3, "Chelsea", "CHE"),
  team(4, "Manchester United", "MUN"),
  team(5, "Tottenham Hotspur", "TOT"),
  team(6, "Newcastle United", "NEW"),
  team(7, "Manchester City", "MCI"),
  team(8, "Everton", "EVE"),
  team(9, "Aston Villa", "AVL"),
  team(10, "Fulham", "FUL"),
  team(11, "West Ham United", "WHU"),
  team(12, "Crystal Palace", "CRY"),
  team(13, "Wolverhampton", "WOL"),
  team(14, "Bournemouth", "BOU"),
  team(15, "Brighton", "BHA"),
  team(16, "Nottm Forest", "NFO"),
  team(17, "Real Madrid", "RMA"),
  team(18, "Barcelona", "BAR"),
  team(19, "Bayern Munich", "BAY"),
  team(20, "PSG", "PSG"),
];

const LEAGUES = [
  league(1, "Premier League", "England"),
  league(2, "Champions League", "Europe"),
  league(3, "La Liga", "Spain"),
];

function mockFixture(
  id: number,
  opts: {
    homeTeamIdx?: number;
    awayTeamIdx?: number;
    leagueId?: number;
    round?: string;
    state?: string;
    kickoffAt?: string;
    prediction?: { home: number; away: number } | null;
    homeScore90?: number | null;
    awayScore90?: number | null;
    liveMinute?: number | null;
    points?: number | null;
  } = {},
): FixtureItem {
  const homeIdx = opts.homeTeamIdx ?? ((id * 2 - 2) % TEAMS.length);
  const awayIdx = opts.awayTeamIdx ?? ((id * 2 - 1) % TEAMS.length);
  const leagueObj = LEAGUES.find((l) => l.id === (opts.leagueId ?? 1)) ?? LEAGUES[0];
  const isFinished = opts.state === "FT" || opts.state === "FT_PEN" || opts.state === "AET";
  return {
    id,
    name: `${TEAMS[homeIdx].name} vs ${TEAMS[awayIdx].name}`,
    kickoffAt: opts.kickoffAt ?? hours(2),
    startTs: Math.floor(new Date(opts.kickoffAt ?? hours(2)).getTime() / 1000),
    state: opts.state ?? "NS",
    stage: null,
    round: opts.round ?? null,
    leg: null,
    liveMinute: opts.liveMinute ?? null,
    homeTeam: TEAMS[homeIdx],
    awayTeam: TEAMS[awayIdx],
    homeScore90: opts.homeScore90 ?? null,
    awayScore90: opts.awayScore90 ?? null,
    result: null,
    league: leagueObj,
    prediction: opts.prediction
      ? { home: opts.prediction.home, away: opts.prediction.away, updatedAt: now.toISOString(), placedAt: now.toISOString(), settled: isFinished, points: opts.points ?? null }
      : undefined,
  } as FixtureItem;
}

// ── FEW (3 fixtures) — single league, single round ──
const fewFixtures: FixtureItem[] = [
  mockFixture(101, { homeTeamIdx: 0, awayTeamIdx: 1, leagueId: 1, round: "20", kickoffAt: hours(3) }),
  mockFixture(102, { homeTeamIdx: 2, awayTeamIdx: 3, leagueId: 1, round: "20", kickoffAt: hours(3), prediction: { home: 2, away: 1 } }),
  mockFixture(103, { homeTeamIdx: 4, awayTeamIdx: 5, leagueId: 2, round: "QF", kickoffAt: hours(26) }),
];

// ── MEDIUM (12 fixtures — all states & prediction combos) ──
const mediumFixtures: FixtureItem[] = [
  // Finished — exact score → max points (green)
  mockFixture(201, { homeTeamIdx: 0, awayTeamIdx: 1, leagueId: 1, round: "19", state: "FT", kickoffAt: yesterday(48), prediction: { home: 2, away: 1 }, homeScore90: 2, awayScore90: 1, points: 3 }),
  // Finished — right direction → partial points (yellow)
  mockFixture(202, { homeTeamIdx: 2, awayTeamIdx: 3, leagueId: 1, round: "19", state: "FT", kickoffAt: yesterday(48), prediction: { home: 3, away: 0 }, homeScore90: 1, awayScore90: 0, points: 1 }),
  // Finished — wrong prediction → 0 points (red)
  mockFixture(209, { homeTeamIdx: 14, awayTeamIdx: 15, leagueId: 1, round: "19", state: "FT", kickoffAt: yesterday(48), prediction: { home: 0, away: 2 }, homeScore90: 2, awayScore90: 2, points: 0 }),
  // Finished — no prediction at all → 0 points (red)
  mockFixture(210, { homeTeamIdx: 6, awayTeamIdx: 7, leagueId: 1, round: "19", state: "FT", kickoffAt: yesterday(48), homeScore90: 0, awayScore90: 3 }),
  // Live — with prediction
  mockFixture(203, { homeTeamIdx: 8, awayTeamIdx: 9, leagueId: 2, round: "5", state: "INPLAY_1ST_HALF", kickoffAt: yesterday(1), prediction: { home: 1, away: 0 }, homeScore90: 1, awayScore90: 2, liveMinute: 67 }),
  // Live — no prediction
  mockFixture(211, { homeTeamIdx: 10, awayTeamIdx: 11, leagueId: 2, round: "5", state: "INPLAY_2ND_HALF", kickoffAt: yesterday(1), homeScore90: 0, awayScore90: 1, liveMinute: 82 }),
  // Today — with prediction
  mockFixture(205, { homeTeamIdx: 4, awayTeamIdx: 5, leagueId: 1, round: "20", kickoffAt: hours(3), prediction: { home: 1, away: 1 } }),
  // Today — no prediction
  mockFixture(204, { homeTeamIdx: 12, awayTeamIdx: 13, leagueId: 1, round: "20", kickoffAt: hours(3) }),
  // Today — soon
  mockFixture(206, { homeTeamIdx: 16, awayTeamIdx: 17, leagueId: 2, round: "5", kickoffAt: hours(0.5) }),
  // Tomorrow — with prediction
  mockFixture(208, { homeTeamIdx: 18, awayTeamIdx: 19, leagueId: 3, round: "22", kickoffAt: hours(28), prediction: { home: 0, away: 2 } }),
  // Tomorrow — no prediction
  mockFixture(207, { homeTeamIdx: 0, awayTeamIdx: 3, leagueId: 3, round: "22", kickoffAt: hours(28) }),
  // Later
  mockFixture(212, { homeTeamIdx: 2, awayTeamIdx: 5, leagueId: 3, round: "23", kickoffAt: hours(72) }),
  // Postponed
  mockFixture(213, { homeTeamIdx: 6, awayTeamIdx: 9, leagueId: 1, round: "20", state: "POSTPONED", kickoffAt: yesterday(24) }),
  // Cancelled
  mockFixture(214, { homeTeamIdx: 10, awayTeamIdx: 13, leagueId: 2, round: "5", state: "CANCELLED", kickoffAt: yesterday(24), prediction: { home: 1, away: 0 } }),
  // Abandoned (mid-game)
  mockFixture(215, { homeTeamIdx: 14, awayTeamIdx: 17, leagueId: 3, round: "22", state: "ABANDONED", kickoffAt: yesterday(6), homeScore90: 1, awayScore90: 0, prediction: { home: 1, away: 0 } }),
];

// ── MANY (30 fixtures — stress test, all 3 leagues, many rounds) ──
const manyFixtures: FixtureItem[] = [
  // Finished — max points (green)
  mockFixture(301, { homeTeamIdx: 0, awayTeamIdx: 1, leagueId: 1, round: "18", state: "FT", kickoffAt: yesterday(96), prediction: { home: 3, away: 1 }, homeScore90: 3, awayScore90: 1, points: 3 }),
  // Finished — partial (yellow)
  mockFixture(302, { homeTeamIdx: 2, awayTeamIdx: 3, leagueId: 1, round: "18", state: "FT", kickoffAt: yesterday(96), prediction: { home: 1, away: 0 }, homeScore90: 2, awayScore90: 0, points: 1 }),
  // Finished — wrong (red, 0)
  mockFixture(303, { homeTeamIdx: 4, awayTeamIdx: 5, leagueId: 1, round: "19", state: "FT", kickoffAt: yesterday(48), prediction: { home: 2, away: 0 }, homeScore90: 0, awayScore90: 1, points: 0 }),
  // Finished — no prediction
  mockFixture(304, { homeTeamIdx: 6, awayTeamIdx: 7, leagueId: 2, round: "5", state: "FT", kickoffAt: yesterday(48), homeScore90: 2, awayScore90: 0 }),
  // Live (2)
  mockFixture(305, { homeTeamIdx: 8, awayTeamIdx: 9, leagueId: 2, round: "6", state: "INPLAY_1ST_HALF", kickoffAt: yesterday(1), prediction: { home: 1, away: 0 }, homeScore90: 0, awayScore90: 0, liveMinute: 22 }),
  mockFixture(306, { homeTeamIdx: 10, awayTeamIdx: 11, leagueId: 2, round: "6", state: "INPLAY_1ST_HALF", kickoffAt: yesterday(1), homeScore90: 3, awayScore90: 1, liveMinute: 78 }),
  // Today (4)
  mockFixture(307, { homeTeamIdx: 0, awayTeamIdx: 3, leagueId: 1, round: "20", kickoffAt: hours(2) }),
  mockFixture(308, { homeTeamIdx: 2, awayTeamIdx: 5, leagueId: 1, round: "20", kickoffAt: hours(2), prediction: { home: 1, away: 0 } }),
  mockFixture(309, { homeTeamIdx: 4, awayTeamIdx: 7, leagueId: 1, round: "20", kickoffAt: hours(4) }),
  mockFixture(310, { homeTeamIdx: 12, awayTeamIdx: 13, leagueId: 3, round: "22", kickoffAt: hours(5), prediction: { home: 0, away: 3 } }),
  // Tomorrow (4)
  mockFixture(311, { homeTeamIdx: 6, awayTeamIdx: 1, leagueId: 1, round: "20", kickoffAt: hours(26) }),
  mockFixture(312, { homeTeamIdx: 8, awayTeamIdx: 3, leagueId: 1, round: "20", kickoffAt: hours(26), prediction: { home: 2, away: 1 } }),
  mockFixture(313, { homeTeamIdx: 14, awayTeamIdx: 15, leagueId: 3, round: "22", kickoffAt: hours(28) }),
  mockFixture(314, { homeTeamIdx: 16, awayTeamIdx: 17, leagueId: 3, round: "22", kickoffAt: hours(28) }),
  // Later (6)
  mockFixture(315, { homeTeamIdx: 10, awayTeamIdx: 9, leagueId: 1, round: "21", kickoffAt: hours(72) }),
  mockFixture(316, { homeTeamIdx: 0, awayTeamIdx: 5, leagueId: 1, round: "21", kickoffAt: hours(72), prediction: { home: 1, away: 1 } }),
  mockFixture(317, { homeTeamIdx: 2, awayTeamIdx: 7, leagueId: 1, round: "21", kickoffAt: hours(96) }),
  mockFixture(318, { homeTeamIdx: 18, awayTeamIdx: 19, leagueId: 2, round: "7", kickoffAt: hours(96) }),
  mockFixture(319, { homeTeamIdx: 16, awayTeamIdx: 19, leagueId: 3, round: "23", kickoffAt: hours(120) }),
  mockFixture(320, { homeTeamIdx: 17, awayTeamIdx: 18, leagueId: 3, round: "23", kickoffAt: hours(120), prediction: { home: 0, away: 2 } }),
  // Even later (10 more)
  mockFixture(321, { homeTeamIdx: 1, awayTeamIdx: 6, leagueId: 1, round: "22", kickoffAt: hours(144) }),
  mockFixture(322, { homeTeamIdx: 3, awayTeamIdx: 8, leagueId: 1, round: "22", kickoffAt: hours(144), prediction: { home: 3, away: 0 } }),
  mockFixture(323, { homeTeamIdx: 5, awayTeamIdx: 10, leagueId: 1, round: "22", kickoffAt: hours(168) }),
  mockFixture(324, { homeTeamIdx: 7, awayTeamIdx: 12, leagueId: 1, round: "22", kickoffAt: hours(168) }),
  mockFixture(325, { homeTeamIdx: 9, awayTeamIdx: 14, leagueId: 2, round: "8", kickoffAt: hours(192), prediction: { home: 1, away: 2 } }),
  mockFixture(326, { homeTeamIdx: 11, awayTeamIdx: 16, leagueId: 2, round: "8", kickoffAt: hours(192) }),
  mockFixture(327, { homeTeamIdx: 13, awayTeamIdx: 18, leagueId: 3, round: "24", kickoffAt: hours(216) }),
  mockFixture(328, { homeTeamIdx: 15, awayTeamIdx: 19, leagueId: 3, round: "24", kickoffAt: hours(216), prediction: { home: 2, away: 2 } }),
  mockFixture(329, { homeTeamIdx: 0, awayTeamIdx: 17, leagueId: 2, round: "QF", kickoffAt: hours(240) }),
  mockFixture(330, { homeTeamIdx: 2, awayTeamIdx: 19, leagueId: 2, round: "QF", kickoffAt: hours(240) }),
];

type SelectionMode = "games" | "teams" | "leagues";
type SizeKey = "few" | "medium" | "many";

const SIZE_OPTIONS: { key: SizeKey; label: string; fixtures: FixtureItem[] }[] = [
  { key: "few", label: "Few (3)", fixtures: fewFixtures },
  { key: "medium", label: "Medium (8)", fixtures: mediumFixtures },
  { key: "many", label: "Many (30)", fixtures: manyFixtures },
];

const MODE_OPTIONS: { key: SelectionMode; label: string; desc: string }[] = [
  { key: "games", label: "Games", desc: "Full filters, league names shown" },
  { key: "teams", label: "Teams", desc: "Team/competition filter, league names shown" },
  { key: "leagues", label: "Leagues", desc: "Round nav, league names hidden" },
];

/** Build pending predictions map from fixtures that have prediction data */
function buildPendingPredictions(fixtures: FixtureItem[]) {
  const pending: Record<string, { home: number | null; away: number | null }> = {};
  for (const f of fixtures) {
    if (f.prediction && f.prediction.home != null && f.prediction.away != null) {
      pending[String(f.id)] = { home: f.prediction.home, away: f.prediction.away };
    }
  }
  return pending;
}

export function DebugGamesScreen() {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<SelectionMode>("games");
  const [size, setSize] = useState<SizeKey>("medium");

  const currentFixtures = SIZE_OPTIONS.find((s) => s.key === size)!.fixtures;
  const currentMode = MODE_OPTIONS.find((m) => m.key === mode)!;

  // Seed the pending predictions cache so useGroupPredictions picks up mock predictions
  useEffect(() => {
    const pending = buildPendingPredictions(currentFixtures);
    queryClient.setQueryData(groupsKeys.pendingPredictions(999), pending);
  }, [currentFixtures, queryClient]);

  const groupTeamsIds = useMemo(() => {
    if (mode !== "teams") return undefined;
    return [1, 2, 3, 4];
  }, [mode]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
          {/* Mode selector */}
          <View style={styles.controlsRow}>
            <Text style={[styles.controlLabel, { color: theme.colors.textSecondary }]}>Mode:</Text>
            {MODE_OPTIONS.map((m) => (
              <Pressable
                key={m.key}
                onPress={() => setMode(m.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: mode === m.key ? theme.colors.textPrimary : theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: mode === m.key ? "#fff" : theme.colors.textPrimary }]}>
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Size selector */}
          <View style={styles.controlsRow}>
            <Text style={[styles.controlLabel, { color: theme.colors.textSecondary }]}>Size:</Text>
            {SIZE_OPTIONS.map((s) => (
              <Pressable
                key={s.key}
                onPress={() => setSize(s.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: size === s.key ? theme.colors.textPrimary : theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: size === s.key ? "#fff" : theme.colors.textPrimary }]}>
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Info line */}
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            {mode.toUpperCase()} · {currentFixtures.length} fixtures · {currentMode.desc}
          </Text>

          {/* Games screen — full GroupGamesScreen with all its internal filters */}
          <View style={styles.gamesContainer}>
            <GroupGamesScreen
              key={`${mode}-${size}`}
              groupId={999}
              fixtures={currentFixtures}
              predictionMode="CorrectScore"
              maxPossiblePoints={3}
              groupName="Debug Group"
              selectionMode={mode}
              groupTeamsIds={groupTeamsIds}
            />
          </View>
        </View>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 60,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: "600",
    width: 40,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  infoText: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  gamesContainer: {
    flex: 1,
  },
});
