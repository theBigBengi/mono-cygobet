// DEBUG SCREEN — Remove after done tweaking LobbyLeaderboard
// Shows all states with mock data so you can visually debug each state.

import React, { useState } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/lib/theme";
import { LobbyLeaderboard } from "../components/LobbyLeaderboard";
import type { ApiRankingItem } from "@repo/types";

function mockRanking(
  rank: number,
  userId: number,
  username: string,
  totalPoints: number,
  opts?: Partial<ApiRankingItem>,
): ApiRankingItem {
  return {
    rank,
    userId,
    username,
    totalPoints,
    predictionCount: opts?.predictionCount ?? 10,
    correctScoreCount: opts?.correctScoreCount ?? 2,
    correctDifferenceCount: opts?.correctDifferenceCount ?? 3,
    correctOutcomeCount: opts?.correctOutcomeCount ?? 5,
    nudgeable: opts?.nudgeable,
    nudgeFixtureId: opts?.nudgeFixtureId,
    nudgedByMe: opts?.nudgedByMe,
    nudgeReceivedCount: opts?.nudgeReceivedCount,
    previousRank: opts?.previousRank,
    rankChange: opts?.rankChange,
  };
}

const CURRENT_USER_ID = 42;

// ── STATE: LOADING ──
// Handled via isLoading prop (no ranking data needed)

// ── STATE: EMPTY — no ranking data yet ──
const emptyRanking: ApiRankingItem[] = [];

// ── STATE: TOP 3 — user is #1 ──
const top3UserFirst: ApiRankingItem[] = [
  mockRanking(1, CURRENT_USER_ID, "You", 87, { previousRank: 2, rankChange: 1 }),
  mockRanking(2, 101, "David Cohen", 72, { previousRank: 1, rankChange: -1 }),
  mockRanking(3, 102, "Sarah Levi", 65, { previousRank: 3, rankChange: 0 }),
];

// ── STATE: TOP 3 — user is #2 ──
const top3UserSecond: ApiRankingItem[] = [
  mockRanking(1, 101, "David Cohen", 87, { previousRank: 1, rankChange: 0 }),
  mockRanking(2, CURRENT_USER_ID, "You", 72, { previousRank: 3, rankChange: 1 }),
  mockRanking(3, 102, "Sarah Levi", 65, { previousRank: 2, rankChange: -1 }),
];

// ── STATE: TOP 3 — user is #3 ──
const top3UserThird: ApiRankingItem[] = [
  mockRanking(1, 101, "David Cohen", 95, { previousRank: 1, rankChange: 0 }),
  mockRanking(2, 102, "Sarah Levi", 82, { previousRank: 2, rankChange: 0 }),
  mockRanking(3, CURRENT_USER_ID, "You", 65, { previousRank: 4, rankChange: 1 }),
];

// ── STATE: USER NOT IN TOP 3 (rank 5) ──
const userRank5: ApiRankingItem[] = [
  mockRanking(1, 101, "David Cohen", 95),
  mockRanking(2, 102, "Sarah Levi", 82),
  mockRanking(3, 103, "Yossi Peretz", 78),
  mockRanking(4, 104, "Noa Katz", 71),
  mockRanking(5, CURRENT_USER_ID, "You", 60),
  mockRanking(6, 105, "Eyal Mizrahi", 55),
];

// ── STATE: USER NOT IN TOP 3 (rank 12) — far from top ──
const userRank12: ApiRankingItem[] = [
  mockRanking(1, 101, "David Cohen", 142),
  mockRanking(2, 102, "Sarah Levi", 128),
  mockRanking(3, 103, "Yossi Peretz", 115),
  mockRanking(4, 104, "Noa Katz", 108),
  mockRanking(5, 105, "Eyal Mizrahi", 95),
  mockRanking(6, 106, "Tal Avraham", 92),
  mockRanking(7, 107, "Rotem Haim", 88),
  mockRanking(8, 108, "Amit Bar", 85),
  mockRanking(9, 109, "Gal Shamir", 79),
  mockRanking(10, 110, "Oren Dayan", 72),
  mockRanking(11, 111, "Maya Fuchs", 68),
  mockRanking(12, CURRENT_USER_ID, "You", 45),
];

// ── STATE: ONLY 1 MEMBER ──
const singleMember: ApiRankingItem[] = [
  mockRanking(1, CURRENT_USER_ID, "You", 15),
];

// ── STATE: ONLY 2 MEMBERS ──
const twoMembers: ApiRankingItem[] = [
  mockRanking(1, 101, "David Cohen", 45),
  mockRanking(2, CURRENT_USER_ID, "You", 30),
];

// ── STATE: ALL TIED — same points ──
const allTied: ApiRankingItem[] = [
  mockRanking(1, 101, "David Cohen", 50),
  mockRanking(1, CURRENT_USER_ID, "You", 50),
  mockRanking(1, 102, "Sarah Levi", 50),
];

// ── STATE: HIGH SCORES — large numbers ──
const highScores: ApiRankingItem[] = [
  mockRanking(1, 101, "David Cohen", 1250, { predictionCount: 150, correctScoreCount: 45 }),
  mockRanking(2, 102, "Sarah Levi", 1180, { predictionCount: 150, correctScoreCount: 40 }),
  mockRanking(3, 103, "Yossi Peretz", 1095, { predictionCount: 148, correctScoreCount: 35 }),
  mockRanking(4, CURRENT_USER_ID, "You", 980, { predictionCount: 145, correctScoreCount: 30 }),
];

// ── STATE: LONG NAMES ──
const longNames: ApiRankingItem[] = [
  mockRanking(1, 101, "Christopher Alexander Wellington III", 95),
  mockRanking(2, 102, "محمد عبدالرحمن الشريف", 82),
  mockRanking(3, CURRENT_USER_ID, "You", 78),
];

// ── STATE: MIXED POINTS — some with points, some with 0 ──
const mixedPoints: ApiRankingItem[] = [
  mockRanking(1, 101, "David Cohen", 12),
  mockRanking(2, 102, "Sarah Levi", 5),
  mockRanking(3, CURRENT_USER_ID, "You", 0),
];

// ── STATE: ZERO POINTS (small) — 3 members, no games settled ──
const zeroPoints: ApiRankingItem[] = [
  mockRanking(1, 101, "David Cohen", 0),
  mockRanking(1, CURRENT_USER_ID, "You", 0),
  mockRanking(1, 102, "Sarah Levi", 0),
];

// ── STATE: ZERO POINTS (large) — 20 members, no games settled ──
const zeroPointsLarge: ApiRankingItem[] = Array.from({ length: 20 }, (_, i) =>
  mockRanking(1, i === 3 ? CURRENT_USER_ID : 200 + i, i === 3 ? "You" : `Player ${i + 1}`, 0),
);

type ModeName =
  | "loading"
  | "empty"
  | "top3First"
  | "top3Second"
  | "top3Third"
  | "rank5"
  | "rank12"
  | "single"
  | "two"
  | "allTied"
  | "highScores"
  | "longNames"
  | "mixedPoints"
  | "zeroPoints"
  | "zeroPointsLarge";

const MODES: {
  key: ModeName;
  label: string;
  ranking: ApiRankingItem[];
  isLoading: boolean;
  memberCount: number;
}[] = [
  { key: "loading", label: "LOADING", ranking: [], isLoading: true, memberCount: 8 },
  { key: "empty", label: "EMPTY", ranking: emptyRanking, isLoading: false, memberCount: 5 },
  { key: "top3First", label: "USER #1", ranking: top3UserFirst, isLoading: false, memberCount: 3 },
  { key: "top3Second", label: "USER #2", ranking: top3UserSecond, isLoading: false, memberCount: 3 },
  { key: "top3Third", label: "USER #3", ranking: top3UserThird, isLoading: false, memberCount: 3 },
  { key: "rank5", label: "USER #5", ranking: userRank5, isLoading: false, memberCount: 6 },
  { key: "rank12", label: "USER #12", ranking: userRank12, isLoading: false, memberCount: 12 },
  { key: "single", label: "1 MEMBER", ranking: singleMember, isLoading: false, memberCount: 1 },
  { key: "two", label: "2 MEMBERS", ranking: twoMembers, isLoading: false, memberCount: 2 },
  { key: "allTied", label: "ALL TIED", ranking: allTied, isLoading: false, memberCount: 3 },
  { key: "highScores", label: "HIGH SCORES", ranking: highScores, isLoading: false, memberCount: 4 },
  { key: "longNames", label: "LONG NAMES", ranking: longNames, isLoading: false, memberCount: 3 },
  { key: "mixedPoints", label: "MIXED PTS", ranking: mixedPoints, isLoading: false, memberCount: 3 },
  { key: "zeroPoints", label: "0 PTS (3)", ranking: zeroPoints, isLoading: false, memberCount: 3 },
  { key: "zeroPointsLarge", label: "0 PTS (20)", ranking: zeroPointsLarge, isLoading: false, memberCount: 20 },
];

export function DebugLeaderboardScreen() {
  const { theme } = useTheme();
  const [activeMode, setActiveMode] = useState<ModeName>("top3First");
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
                backgroundColor:
                  activeMode === m.key ? theme.colors.primary : theme.colors.cardBackground,
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

      {/* Card preview */}
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.modeTitle, { color: theme.colors.textSecondary }]}>
          Mode: {current.label}
        </Text>
        <LobbyLeaderboard
          ranking={current.ranking}
          currentUserId={CURRENT_USER_ID}
          isLoading={current.isLoading}
          onPress={() => console.log("press ranking")}
          memberCount={current.memberCount}
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
