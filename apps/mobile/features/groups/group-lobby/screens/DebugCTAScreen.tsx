// DEBUG SCREEN — Remove after done tweaking LobbyPredictionsCTA
// Shows all 5 modes with mock data so you can visually debug each state.

import React, { useState } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/lib/theme";
import { isFinished as isFinishedState } from "@repo/utils";
import { LobbyPredictionsCTA } from "../components/LobbyPredictionsCTA";
import type { FixtureItem } from "@/types/common";

const now = new Date();
const hours = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000).toISOString();
const minutes = (m: number) => new Date(now.getTime() + m * 60 * 1000).toISOString();
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

const HOME_TEAMS = [
  team(1, "Liverpool", "LIV"),
  team(3, "Chelsea", "CHE"),
  team(5, "Tottenham Hotspur", "TOT"),
  team(7, "Manchester City", "MCI"),
  team(9, "Aston Villa", "AVL"),
  team(11, "West Ham United", "WHU"),
  team(13, "Wolverhampton", "WOL"),
  team(15, "Brighton", "BHA"),
];

const AWAY_TEAMS = [
  team(2, "Arsenal", "ARS"),
  team(4, "Manchester United", "MUN"),
  team(6, "Newcastle United", "NEW"),
  team(8, "Everton", "EVE"),
  team(10, "Fulham", "FUL"),
  team(12, "Crystal Palace", "CRY"),
  team(14, "Bournemouth", "BOU"),
  team(16, "Nottm Forest", "NFO"),
];

function mockFixture(
  id: number,
  opts: {
    state?: string;
    kickoffAt?: string;
    prediction?: { home: number; away: number } | null;
    homeScore90?: number | null;
    awayScore90?: number | null;
    liveMinute?: number | null;
    points?: number | null;
  } = {},
): FixtureItem {
  const homeIdx = (id - 1) % HOME_TEAMS.length;
  const awayIdx = (id - 1) % AWAY_TEAMS.length;
  const isFinished = isFinishedState(opts.state ?? "NS");
  return {
    id,
    name: `${HOME_TEAMS[homeIdx].name} vs ${AWAY_TEAMS[awayIdx].name}`,
    kickoffAt: opts.kickoffAt ?? hours(2),
    startTs: Math.floor(new Date(opts.kickoffAt ?? hours(2)).getTime() / 1000),
    state: opts.state ?? "NS",
    stage: null,
    round: null,
    leg: null,
    liveMinute: opts.liveMinute ?? null,
    homeTeam: HOME_TEAMS[homeIdx],
    awayTeam: AWAY_TEAMS[awayIdx],
    homeScore90: opts.homeScore90 ?? null,
    awayScore90: opts.awayScore90 ?? null,
    result: null,
    prediction: opts.prediction
      ? { home: opts.prediction.home, away: opts.prediction.away, updatedAt: now.toISOString(), placedAt: now.toISOString(), settled: isFinished, points: opts.points ?? null }
      : undefined,
  } as FixtureItem;
}

// ── MODE: ACTION (CRITICAL) — all unpredicted within 1 day ──
const actionCriticalFixtures: FixtureItem[] = [
  mockFixture(1, { kickoffAt: hours(2) }),
  mockFixture(2, { kickoffAt: hours(4) }),
  mockFixture(3, { kickoffAt: hours(6) }),
  mockFixture(4, { kickoffAt: hours(8), prediction: { home: 2, away: 1 } }),
  mockFixture(5, { kickoffAt: hours(10) }),
  mockFixture(6, { kickoffAt: hours(12) }),
  mockFixture(7, { kickoffAt: hours(14) }),
];

// ── MODE: ACTION (CRITICAL + WARNING MIX) — some < 1 day, some 1-3 days ──
const actionMixFixtures: FixtureItem[] = [
  mockFixture(1, { kickoffAt: hours(3) }),
  mockFixture(2, { kickoffAt: hours(10) }),
  mockFixture(3, { kickoffAt: hours(36) }),
  mockFixture(4, { kickoffAt: hours(48) }),
  mockFixture(5, { kickoffAt: hours(60), prediction: { home: 1, away: 0 } }),
  mockFixture(6, { kickoffAt: hours(70) }),
];

// ── MODE: ACTION (WARNING) — all unpredicted 1-3 days away ──
const actionWarningFixtures: FixtureItem[] = [
  mockFixture(1, { kickoffAt: hours(30) }),
  mockFixture(2, { kickoffAt: hours(36) }),
  mockFixture(3, { kickoffAt: hours(48) }),
  mockFixture(4, { kickoffAt: hours(60), prediction: { home: 2, away: 2 } }),
  mockFixture(5, { kickoffAt: hours(70) }),
];

// ── MODE: ACTION (MUTED) — all unpredicted > 3 days away ──
const actionMutedFixtures: FixtureItem[] = [
  mockFixture(1, { kickoffAt: hours(80) }),
  mockFixture(2, { kickoffAt: hours(96) }),
  mockFixture(3, { kickoffAt: hours(120) }),
  mockFixture(4, { kickoffAt: hours(144), prediction: { home: 0, away: 1 } }),
  mockFixture(5, { kickoffAt: hours(168) }),
];

// ── MODE: LIVE — games in progress, all predicted ──
const liveFixtures: FixtureItem[] = [
  mockFixture(1, { state: "INPLAY_1ST_HALF", kickoffAt: yesterday(1), prediction: { home: 2, away: 1 }, homeScore90: 1, awayScore90: 0, liveMinute: 34 }),
  mockFixture(2, { state: "INPLAY_1ST_HALF", kickoffAt: yesterday(1), prediction: { home: 0, away: 0 }, homeScore90: 2, awayScore90: 2, liveMinute: 67 }),
  mockFixture(3, { kickoffAt: hours(4), prediction: { home: 1, away: 1 } }),
  mockFixture(4, { kickoffAt: hours(6), prediction: { home: 3, away: 0 } }),
];

// ── MODE: LIVE + ACTION — live AND unpredicted ──
const liveActionFixtures: FixtureItem[] = [
  mockFixture(1, { state: "INPLAY_1ST_HALF", kickoffAt: yesterday(1), prediction: { home: 1, away: 0 }, homeScore90: 1, awayScore90: 1, liveMinute: 45 }),
  mockFixture(2, { state: "INPLAY_1ST_HALF", kickoffAt: yesterday(1), prediction: { home: 2, away: 2 }, homeScore90: 0, awayScore90: 3, liveMinute: 78 }),
  mockFixture(3, { kickoffAt: hours(2) }),
  mockFixture(4, { kickoffAt: hours(3) }),
  mockFixture(5, { kickoffAt: hours(5), prediction: { home: 1, away: 1 } }),
];

// ── MODE: ALL SET — all predicted, nothing live ──
const allSetFixtures: FixtureItem[] = [
  mockFixture(1, { kickoffAt: hours(2), prediction: { home: 2, away: 1 } }),
  mockFixture(2, { kickoffAt: hours(4), prediction: { home: 0, away: 0 } }),
  mockFixture(3, { kickoffAt: hours(6), prediction: { home: 1, away: 3 } }),
  mockFixture(4, { kickoffAt: hours(8), prediction: { home: 1, away: 1 } }),
  mockFixture(5, { kickoffAt: hours(10), prediction: { home: 3, away: 2 } }),
  mockFixture(6, { kickoffAt: hours(24), prediction: { home: 0, away: 1 } }),
  mockFixture(7, { kickoffAt: hours(48), prediction: { home: 2, away: 0 } }),
  mockFixture(8, { kickoffAt: hours(72), prediction: { home: 1, away: 2 } }),
];

// ── MODE: RESULTS — all finished ──
const resultsFixtures: FixtureItem[] = [
  mockFixture(1, { state: "FT", kickoffAt: yesterday(6), prediction: { home: 2, away: 1 }, homeScore90: 2, awayScore90: 1, points: 3 }),
  mockFixture(2, { state: "FT", kickoffAt: yesterday(6), prediction: { home: 0, away: 0 }, homeScore90: 1, awayScore90: 0, points: 0 }),
  mockFixture(3, { state: "FT", kickoffAt: yesterday(4), prediction: { home: 1, away: 3 }, homeScore90: 0, awayScore90: 2, points: 1 }),
  mockFixture(4, { state: "FT", kickoffAt: yesterday(4), prediction: { home: 1, away: 1 }, homeScore90: 3, awayScore90: 3, points: 2 }),
];

// ── COMBO: LIVE + FINISHED — live games with some already finished ──
const liveFinishedFixtures: FixtureItem[] = [
  mockFixture(1, { state: "FT", kickoffAt: yesterday(4), prediction: { home: 2, away: 1 }, homeScore90: 2, awayScore90: 1 }),
  mockFixture(2, { state: "FT", kickoffAt: yesterday(4), prediction: { home: 0, away: 0 }, homeScore90: 1, awayScore90: 0 }),
  mockFixture(3, { state: "INPLAY_1ST_HALF", kickoffAt: yesterday(1), prediction: { home: 1, away: 0 }, homeScore90: 3, awayScore90: 1, liveMinute: 55 }),
  mockFixture(4, { state: "INPLAY_1ST_HALF", kickoffAt: yesterday(1), prediction: { home: 0, away: 2 }, homeScore90: 0, awayScore90: 0, liveMinute: 22 }),
];

// ── COMBO: LIVE + FINISHED + UPCOMING (all predicted) ──
const liveFinishedUpcomingFixtures: FixtureItem[] = [
  mockFixture(1, { state: "FT", kickoffAt: yesterday(6), prediction: { home: 1, away: 1 }, homeScore90: 1, awayScore90: 1 }),
  mockFixture(2, { state: "INPLAY_1ST_HALF", kickoffAt: yesterday(1), prediction: { home: 2, away: 0 }, homeScore90: 2, awayScore90: 1, liveMinute: 70 }),
  mockFixture(3, { kickoffAt: hours(3), prediction: { home: 0, away: 1 } }),
  mockFixture(4, { kickoffAt: hours(8), prediction: { home: 3, away: 2 } }),
];

// ── COMBO: LIVE + FINISHED + UNPREDICTED ──
const liveFinishedUnpredictedFixtures: FixtureItem[] = [
  mockFixture(1, { state: "FT", kickoffAt: yesterday(6), prediction: { home: 2, away: 1 }, homeScore90: 2, awayScore90: 1 }),
  mockFixture(2, { state: "FT", kickoffAt: yesterday(4), prediction: { home: 0, away: 0 }, homeScore90: 0, awayScore90: 3 }),
  mockFixture(3, { state: "INPLAY_1ST_HALF", kickoffAt: yesterday(1), prediction: { home: 1, away: 1 }, homeScore90: 1, awayScore90: 2, liveMinute: 88 }),
  mockFixture(4, { kickoffAt: hours(2) }),
  mockFixture(5, { kickoffAt: hours(4) }),
  mockFixture(6, { kickoffAt: hours(6), prediction: { home: 2, away: 0 } }),
];

// ── COMBO: FINISHED + UPCOMING UNPREDICTED (no live) ──
const finishedUnpredictedFixtures: FixtureItem[] = [
  mockFixture(1, { state: "FT", kickoffAt: yesterday(6), prediction: { home: 1, away: 0 }, homeScore90: 1, awayScore90: 0 }),
  mockFixture(2, { state: "FT", kickoffAt: yesterday(4), prediction: { home: 2, away: 2 }, homeScore90: 3, awayScore90: 1 }),
  mockFixture(3, { kickoffAt: hours(2) }),
  mockFixture(4, { kickoffAt: hours(5) }),
  mockFixture(5, { kickoffAt: hours(10), prediction: { home: 0, away: 1 } }),
];

// ── COMBO: FINISHED + ALL SET (upcoming all predicted, no live) ──
const finishedAllSetFixtures: FixtureItem[] = [
  mockFixture(1, { state: "FT", kickoffAt: yesterday(8), prediction: { home: 1, away: 0 }, homeScore90: 1, awayScore90: 0 }),
  mockFixture(2, { state: "FT", kickoffAt: yesterday(6), prediction: { home: 0, away: 2 }, homeScore90: 0, awayScore90: 2 }),
  mockFixture(3, { state: "FT", kickoffAt: yesterday(4), prediction: { home: 3, away: 1 }, homeScore90: 2, awayScore90: 1 }),
  mockFixture(4, { kickoffAt: hours(3), prediction: { home: 1, away: 1 } }),
  mockFixture(5, { kickoffAt: hours(6), prediction: { home: 2, away: 0 } }),
  mockFixture(6, { kickoffAt: hours(24), prediction: { home: 0, away: 3 } }),
];

// ── LIVE + NON-CRITICAL only (no critical) ──
const liveNonCriticalFixtures: FixtureItem[] = [
  mockFixture(1, { state: "INPLAY_1ST_HALF", kickoffAt: yesterday(1), prediction: { home: 1, away: 0 }, homeScore90: 1, awayScore90: 0, liveMinute: 38 }),
  mockFixture(2, { kickoffAt: hours(30) }),
  mockFixture(3, { kickoffAt: hours(48) }),
  mockFixture(4, { kickoffAt: hours(60), prediction: { home: 2, away: 1 } }),
];

// ── LIVE + CRITICAL + NON-CRITICAL ──
const liveCritNonCritFixtures: FixtureItem[] = [
  mockFixture(1, { state: "INPLAY_1ST_HALF", kickoffAt: yesterday(1), prediction: { home: 0, away: 1 }, homeScore90: 2, awayScore90: 1, liveMinute: 72 }),
  mockFixture(2, { kickoffAt: hours(3) }),
  mockFixture(3, { kickoffAt: hours(8) }),
  mockFixture(4, { kickoffAt: hours(36) }),
  mockFixture(5, { kickoffAt: hours(48) }),
  mockFixture(6, { kickoffAt: hours(72), prediction: { home: 1, away: 1 } }),
];

// ── TODAY — all predicted, next game is today ──
const todayFixtures: FixtureItem[] = [
  mockFixture(1, { kickoffAt: hours(2), prediction: { home: 2, away: 1 } }),
  mockFixture(2, { kickoffAt: hours(4), prediction: { home: 0, away: 0 } }),
  mockFixture(3, { kickoffAt: hours(24), prediction: { home: 1, away: 3 } }),
  mockFixture(4, { kickoffAt: hours(48), prediction: { home: 1, away: 1 } }),
];

// ── TOMORROW — all predicted, next game is tomorrow ──
const tomorrowFixtures: FixtureItem[] = [
  mockFixture(1, { kickoffAt: hours(30), prediction: { home: 3, away: 0 } }),
  mockFixture(2, { kickoffAt: hours(36), prediction: { home: 1, away: 2 } }),
  mockFixture(3, { kickoffAt: hours(48), prediction: { home: 0, away: 1 } }),
  mockFixture(4, { kickoffAt: hours(72), prediction: { home: 2, away: 2 } }),
];

// ── MIX — games today + tomorrow + later, all predicted ──
const mixAllPredictedFixtures: FixtureItem[] = [
  // Today
  mockFixture(1, { kickoffAt: hours(2), prediction: { home: 2, away: 1 } }),
  mockFixture(2, { kickoffAt: hours(2), prediction: { home: 0, away: 0 } }),
  mockFixture(3, { kickoffAt: hours(5), prediction: { home: 1, away: 3 } }),
  // Tomorrow
  mockFixture(4, { kickoffAt: hours(28), prediction: { home: 1, away: 1 } }),
  mockFixture(5, { kickoffAt: hours(32), prediction: { home: 3, away: 0 } }),
  // Later
  mockFixture(6, { kickoffAt: hours(72), prediction: { home: 0, away: 2 } }),
  mockFixture(7, { kickoffAt: hours(96), prediction: { home: 2, away: 2 } }),
  mockFixture(8, { kickoffAt: hours(120), prediction: { home: 1, away: 0 } }),
];

// ── TODAY MIXED — today has 1 predicted + 1 unpredicted, tomorrow + later all predicted ──
const todayMixedFixtures: FixtureItem[] = [
  // Today: 1 predicted, 1 unpredicted
  mockFixture(1, { kickoffAt: hours(2), prediction: { home: 2, away: 1 } }),
  mockFixture(2, { kickoffAt: hours(4) }),
  // Tomorrow: all predicted
  mockFixture(3, { kickoffAt: hours(28), prediction: { home: 1, away: 0 } }),
  mockFixture(4, { kickoffAt: hours(32), prediction: { home: 0, away: 2 } }),
  // Later: all predicted
  mockFixture(5, { kickoffAt: hours(72), prediction: { home: 3, away: 1 } }),
  mockFixture(6, { kickoffAt: hours(96), prediction: { home: 1, away: 1 } }),
];

// ── SINGLE PREDICTED — single game, predicted ──
const singlePredictedFixtures: FixtureItem[] = [
  mockFixture(1, { kickoffAt: hours(3), prediction: { home: 1, away: 0 } }),
];

// ── STRESS: LIVE + many CRITICAL + many WARNING ──
const stressFixtures: FixtureItem[] = [
  // 3 live
  mockFixture(1, { state: "INPLAY_1ST_HALF", kickoffAt: yesterday(1), prediction: { home: 1, away: 0 }, homeScore90: 2, awayScore90: 0, liveMinute: 33 }),
  mockFixture(2, { state: "INPLAY_1ST_HALF", kickoffAt: yesterday(1), prediction: { home: 0, away: 1 }, homeScore90: 1, awayScore90: 1, liveMinute: 61 }),
  mockFixture(3, { state: "HT", kickoffAt: yesterday(1), prediction: { home: 2, away: 2 }, homeScore90: 0, awayScore90: 0, liveMinute: 45 }),
  // 4 critical (< 1 day)
  mockFixture(4, { kickoffAt: hours(2) }),
  mockFixture(5, { kickoffAt: hours(5) }),
  mockFixture(6, { kickoffAt: hours(8) }),
  mockFixture(7, { kickoffAt: hours(12) }),
  // 10 warning (1-3 days)
  mockFixture(8, { kickoffAt: hours(30) }),
  mockFixture(1, { kickoffAt: hours(36) }),
  mockFixture(2, { kickoffAt: hours(40) }),
  mockFixture(3, { kickoffAt: hours(44) }),
  mockFixture(4, { kickoffAt: hours(48) }),
  mockFixture(5, { kickoffAt: hours(52) }),
  mockFixture(6, { kickoffAt: hours(56) }),
  mockFixture(7, { kickoffAt: hours(60) }),
  mockFixture(8, { kickoffAt: hours(64) }),
  mockFixture(1, { kickoffAt: hours(68) }),
];

// ── NEXT MULTI — multiple games at same kickoff time (all predicted → allSet, NEXT shows) ──
const nextMultiFixtures: FixtureItem[] = [
  mockFixture(1, { kickoffAt: hours(3), prediction: { home: 2, away: 1 } }),
  mockFixture(2, { kickoffAt: hours(3), prediction: { home: 0, away: 0 } }),
  mockFixture(3, { kickoffAt: hours(3), prediction: { home: 1, away: 2 } }),
  mockFixture(4, { kickoffAt: hours(24), prediction: { home: 1, away: 1 } }),
  mockFixture(5, { kickoffAt: hours(48), prediction: { home: 3, away: 0 } }),
];

// ── NEXT PREDICTED + ACTION — next is predicted, unpredicted are > 1 day (non-critical, so NEXT shows) ──
const nextPredictedActionFixtures: FixtureItem[] = [
  mockFixture(1, { kickoffAt: hours(2), prediction: { home: 1, away: 0 } }),
  mockFixture(2, { kickoffAt: hours(30) }),
  mockFixture(3, { kickoffAt: hours(48) }),
  mockFixture(4, { kickoffAt: hours(60) }),
  mockFixture(5, { kickoffAt: hours(72), prediction: { home: 2, away: 2 } }),
];

// ── SINGLE GAME — only 1 fixture total ──
const singleFixtures: FixtureItem[] = [
  mockFixture(1, { kickoffAt: hours(3) }),
];

// ── SINGLE LIVE — only 1 live fixture ──
const singleLiveFixtures: FixtureItem[] = [
  mockFixture(1, { state: "INPLAY_1ST_HALF", kickoffAt: yesterday(1), prediction: { home: 1, away: 0 }, homeScore90: 2, awayScore90: 1, liveMinute: 55 }),
];

// ── TODAY URGENT — games starting within the hour ──
const todayUrgentFixtures: FixtureItem[] = [
  mockFixture(1, { kickoffAt: minutes(12) }),
  mockFixture(2, { kickoffAt: minutes(35), prediction: { home: 1, away: 0 } }),
  mockFixture(3, { kickoffAt: minutes(55) }),
  mockFixture(4, { kickoffAt: hours(3), prediction: { home: 2, away: 2 } }),
  mockFixture(5, { kickoffAt: hours(5) }),
];

type ModeName = "actionCritical" | "actionMix" | "actionWarning" | "actionMuted"
  | "live" | "liveAction" | "allSet" | "results"
  | "liveFinished" | "liveFinishedUpcoming" | "liveFinishedUnpredicted" | "finishedUnpredicted" | "finishedAllSet"
  | "stress"
  | "nextMulti" | "nextPredAction" | "single" | "singleLive"
  | "liveNonCrit" | "liveCritNonCrit" | "today" | "tomorrow" | "mixAllPredicted" | "todayMixed" | "singlePredicted"
  | "todayUrgent";

const MODES: { key: ModeName; label: string; fixtures: FixtureItem[]; predicted: number; total: number }[] = [
  { key: "actionCritical", label: "ACTION 🔴", fixtures: actionCriticalFixtures, predicted: 1, total: 7 },
  { key: "actionMix", label: "ACTION 🔴🟠", fixtures: actionMixFixtures, predicted: 1, total: 6 },
  { key: "actionWarning", label: "ACTION 🟠", fixtures: actionWarningFixtures, predicted: 1, total: 5 },
  { key: "actionMuted", label: "ACTION ⚪", fixtures: actionMutedFixtures, predicted: 1, total: 5 },
  { key: "live", label: "LIVE", fixtures: liveFixtures, predicted: 4, total: 4 },
  { key: "liveAction", label: "LIVE+ACTION", fixtures: liveActionFixtures, predicted: 3, total: 5 },
  { key: "allSet", label: "ALL SET", fixtures: allSetFixtures, predicted: 8, total: 8 },
  { key: "results", label: "RESULTS", fixtures: resultsFixtures, predicted: 4, total: 4 },
  { key: "liveFinished", label: "LIVE+FT", fixtures: liveFinishedFixtures, predicted: 4, total: 4 },
  { key: "liveFinishedUpcoming", label: "LIVE+FT+UP", fixtures: liveFinishedUpcomingFixtures, predicted: 4, total: 4 },
  { key: "liveFinishedUnpredicted", label: "LIVE+FT+UNPR", fixtures: liveFinishedUnpredictedFixtures, predicted: 4, total: 6 },
  { key: "finishedUnpredicted", label: "FT+UNPR", fixtures: finishedUnpredictedFixtures, predicted: 3, total: 5 },
  { key: "finishedAllSet", label: "FT+ALL SET", fixtures: finishedAllSetFixtures, predicted: 6, total: 6 },
  { key: "nextMulti", label: "NEXT x3", fixtures: nextMultiFixtures, predicted: 5, total: 5 },
  { key: "nextPredAction", label: "NEXT ✅+🔴", fixtures: nextPredictedActionFixtures, predicted: 3, total: 5 },
  { key: "liveNonCrit", label: "LIVE+🟠", fixtures: liveNonCriticalFixtures, predicted: 2, total: 4 },
  { key: "liveCritNonCrit", label: "LIVE+🔴🟠", fixtures: liveCritNonCritFixtures, predicted: 2, total: 6 },
  { key: "today", label: "TODAY", fixtures: todayFixtures, predicted: 4, total: 4 },
  { key: "tomorrow", label: "TOMORROW", fixtures: tomorrowFixtures, predicted: 4, total: 4 },
  { key: "mixAllPredicted", label: "TODAY+TMR+LATER", fixtures: mixAllPredictedFixtures, predicted: 8, total: 8 },
  { key: "todayMixed", label: "TODAY ❌+✅", fixtures: todayMixedFixtures, predicted: 5, total: 6 },
  { key: "todayUrgent", label: "TODAY ⏰", fixtures: todayUrgentFixtures, predicted: 2, total: 5 },
  { key: "single", label: "SINGLE", fixtures: singleFixtures, predicted: 0, total: 1 },
  { key: "singlePredicted", label: "SINGLE ✅", fixtures: singlePredictedFixtures, predicted: 1, total: 1 },
  { key: "singleLive", label: "SINGLE LIVE", fixtures: singleLiveFixtures, predicted: 1, total: 1 },
  { key: "stress", label: "STRESS 🔥", fixtures: stressFixtures, predicted: 3, total: 17 },
];

export function DebugCTAScreen() {
  const { theme } = useTheme();
  const [activeMode, setActiveMode] = useState<ModeName>("actionCritical");
  const current = MODES.find((m) => m.key === activeMode)!;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      {/* Mode tabs */}
      <View style={styles.tabs}>
        {MODES.map((m) => (
          <Pressable
            key={m.key}
            onPress={() => setActiveMode(m.key)}
            style={[
              styles.tab,
              {
                backgroundColor: activeMode === m.key ? theme.colors.primary : theme.colors.cardBackground,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeMode === m.key ? "#fff" : theme.colors.textPrimary },
              ]}
            >
              {m.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Banner preview */}
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.modeTitle, { color: theme.colors.textSecondary }]}>
          Mode: {current.label}
        </Text>
        <LobbyPredictionsCTA
          predictionsCount={current.predicted}
          totalFixtures={current.total}
          onPress={(id) => console.log("press", id)}
          fixtures={current.fixtures}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 60,
  },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 11,
    fontWeight: "700",
  },
  content: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  modeTitle: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },
});
