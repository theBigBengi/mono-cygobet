// DEBUG SCREEN — Remove after done tweaking PredictionsOverviewTable
// Shows the table with mock data so you can visually debug styling.

import React from "react";
import { View, StyleSheet, ScrollView, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";
import { PredictionsOverviewTable } from "@/features/groups/predictions-overview/components/PredictionsOverviewTable";
import type { ApiPredictionsOverviewData } from "@repo/types";

const team = (id: number, name: string, shortCode: string) => ({
  id,
  name,
  shortCode,
  imagePath: null,
  firstKitColor: null,
  secondKitColor: null,
  thirdKitColor: null,
});

const now = Math.floor(Date.now() / 1000);
const hoursAgo = (h: number) => now - h * 3600;
const hoursFromNow = (h: number) => now + h * 3600;

const MOCK_DATA: ApiPredictionsOverviewData = {
  participants: [
    { id: 6, username: "Avi", number: 1, totalPoints: 42 },
    { id: 2, username: "Yossi_123", number: 2, totalPoints: 38 },
    { id: 3, username: "MaccabiKing", number: 3, totalPoints: 35 },
    { id: 4, username: "GoalMaster", number: 4, totalPoints: 31 },
    { id: 5, username: "ChaimThePredictor", number: 5, totalPoints: 28 },
    { id: 7, username: "Dor", number: 6, totalPoints: 25 },
    { id: 1, username: "ShlomoFootball", number: 7, totalPoints: 22 },
    { id: 8, username: "DaniBet", number: 8, totalPoints: 19 },
    { id: 9, username: "RotemScore", number: 9, totalPoints: 15 },
    { id: 10, username: "NirPredict", number: 10, totalPoints: 12 },
    { id: 11, username: "TalKick", number: 11, totalPoints: 9 },
    { id: 12, username: "OmerGoal", number: 12, totalPoints: 6 },
  ],
  fixtures: [
    {
      id: 101,
      name: "Liverpool vs Arsenal",
      homeTeam: team(1, "Liverpool", "LIV"),
      awayTeam: team(2, "Arsenal", "ARS"),
      result: "2-1",
      startTs: hoursAgo(48),
      state: "FT",
      liveMinute: null,
      homeScore90: 2,
      awayScore90: 1,
    },
    {
      id: 102,
      name: "Chelsea vs Man United",
      homeTeam: team(3, "Chelsea", "CHE"),
      awayTeam: team(4, "Manchester United", "MUN"),
      result: "1-1",
      startTs: hoursAgo(24),
      state: "FT",
      liveMinute: null,
      homeScore90: 1,
      awayScore90: 1,
    },
    {
      id: 103,
      name: "Tottenham vs Newcastle",
      homeTeam: team(5, "Tottenham Hotspur", "TOT"),
      awayTeam: team(6, "Newcastle United", "NEW"),
      result: "0-3",
      startTs: hoursAgo(12),
      state: "FT",
      liveMinute: null,
      homeScore90: 0,
      awayScore90: 3,
    },
    {
      id: 104,
      name: "Man City vs Everton",
      homeTeam: team(7, "Manchester City", "MCI"),
      awayTeam: team(8, "Everton", "EVE"),
      result: "4-0",
      startTs: hoursAgo(6),
      state: "FT",
      liveMinute: null,
      homeScore90: 4,
      awayScore90: 0,
    },
    {
      id: 105,
      name: "Aston Villa vs Fulham",
      homeTeam: team(9, "Aston Villa", "AVL"),
      awayTeam: team(10, "Fulham", "FUL"),
      result: "1-2",
      startTs: hoursAgo(1),
      state: "2H",
      liveMinute: 67,
      homeScore90: 1,
      awayScore90: 2,
    },
    {
      id: 106,
      name: "West Ham vs Crystal Palace",
      homeTeam: team(11, "West Ham United", "WHU"),
      awayTeam: team(12, "Crystal Palace", "CRY"),
      result: null,
      startTs: hoursFromNow(24),
      state: "NS",
      liveMinute: null,
      homeScore90: null,
      awayScore90: null,
    },
    {
      id: 107,
      name: "Wolves vs Bournemouth",
      homeTeam: team(13, "Wolverhampton", "WOL"),
      awayTeam: team(14, "Bournemouth", "BOU"),
      result: null,
      startTs: hoursFromNow(48),
      state: "NS",
      liveMinute: null,
      homeScore90: null,
      awayScore90: null,
    },
    {
      id: 108,
      name: "Brighton vs Nottm Forest",
      homeTeam: team(15, "Brighton", "BHA"),
      awayTeam: team(16, "Nottm Forest", "NFO"),
      result: null,
      startTs: hoursFromNow(72),
      state: "NS",
      liveMinute: null,
      homeScore90: null,
      awayScore90: null,
    },
  ],
  predictions: {
    // User 1 (Dor - current user) — predictions for all fixtures
    "1_101": "2-1", "1_102": "2-0", "1_103": "1-2", "1_104": "3-0",
    "1_105": "2-1", "1_106": "1-0", "1_107": "0-0", "1_108": "3-2",
    // User 2
    "2_101": "1-1", "2_102": "1-1", "2_103": "0-2", "2_104": "4-0",
    "2_105": "1-1", "2_106": "2-1", "2_107": "1-0", "2_108": "2-2",
    // User 3
    "3_101": "2-0", "3_102": "0-1", "3_103": "1-3", "3_104": "2-1",
    "3_105": "0-0", "3_106": null, "3_107": "1-1", "3_108": null,
    // User 4
    "4_101": "3-1", "4_102": "2-2", "4_103": "0-3", "4_104": "5-0",
    "4_105": "3-0", "4_106": "2-2", "4_107": null, "4_108": "1-0",
    // User 5
    "5_101": "1-0", "5_102": "1-1", "5_103": "2-1", "5_104": "3-1",
    "5_105": null, "5_106": "0-1", "5_107": "2-0", "5_108": "1-1",
    // User 6
    "6_101": "2-1", "6_102": "0-0", "6_103": "1-1", "6_104": "2-0",
    "6_105": "1-2", "6_106": null, "6_107": null, "6_108": null,
    // User 7
    "7_101": "0-2", "7_102": "3-1", "7_103": "0-4", "7_104": "4-1",
    "7_105": "2-0", "7_106": "1-1", "7_107": "0-0", "7_108": "2-1",
    // User 8
    "8_101": "1-1", "8_102": "2-1", "8_103": "1-2", "8_104": "3-0",
    "8_105": null, "8_106": null, "8_107": null, "8_108": null,
    // User 9
    "9_101": "2-2", "9_102": "0-0", "9_103": "0-1", "9_104": "2-0",
    "9_105": "1-0", "9_106": "3-1", "9_107": "1-2", "9_108": "0-0",
    // User 10
    "10_101": "1-0", "10_102": "1-2", "10_103": "2-3", "10_104": "1-0",
    "10_105": null, "10_106": null, "10_107": "0-1", "10_108": "2-1",
    // User 11
    "11_101": "0-0", "11_102": "1-1", "11_103": "0-2", "11_104": "3-0",
    "11_105": "2-2", "11_106": "1-0", "11_107": null, "11_108": null,
    // User 12
    "12_101": "3-2", "12_102": "0-1", "12_103": "1-0", "12_104": "2-2",
    "12_105": null, "12_106": "0-0", "12_107": "1-1", "12_108": "0-2",
  },
  predictionPoints: {
    // Fixture 101: result 2-1
    "1_101": "3", "2_101": "1", "3_101": "2", "4_101": "2", "5_101": "0",
    "6_101": "3", "7_101": "0", "8_101": "1", "9_101": "1", "10_101": "0",
    "11_101": "0", "12_101": "2",
    // Fixture 102: result 1-1
    "1_102": "0", "2_102": "3", "3_102": "0", "4_102": "1", "5_102": "3",
    "6_102": "1", "7_102": "0", "8_102": "0", "9_102": "1", "10_102": "0",
    "11_102": "3", "12_102": "0",
    // Fixture 103: result 0-3
    "1_103": "0", "2_103": "2", "3_103": "2", "4_103": "3", "5_103": "0",
    "6_103": "0", "7_103": "2", "8_103": "0", "9_103": "0", "10_103": "2",
    "11_103": "2", "12_103": "0",
    // Fixture 104: result 4-0
    "1_104": "2", "2_104": "3", "3_104": "0", "4_104": "2", "5_104": "2",
    "6_104": "0", "7_104": "2", "8_104": "2", "9_104": "0", "10_104": "0",
    "11_104": "2", "12_104": "0",
    // Fixtures 105-108: not started — no points
  },
};

export function DebugPredictionsOverviewScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
        DEBUG — Predictions Overview Table
      </Text>
      <View style={styles.tableContainer}>
        <PredictionsOverviewTable data={MOCK_DATA} groupId={999} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 12,
  },
  tableContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
});
