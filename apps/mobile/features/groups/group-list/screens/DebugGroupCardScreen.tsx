// DEBUG SCREEN — Remove after done tweaking GroupCard
// Shows all card scenarios with mock ApiGroupItem data so you can visually debug each state.

import React, { useState } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/lib/theme";
import { GroupCard } from "../components/GroupCard";
import type { ApiGroupItem } from "@repo/types";

const now = new Date();
const hours = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000).toISOString();

const mockTeam = (id: number, name: string, shortCode: string) => ({
  id,
  name,
  shortCode,
  imagePath: null,
  firstKitColor: null,
  secondKitColor: null,
  thirdKitColor: null,
});

const MATCH_PAIRS = [
  { home: mockTeam(1, "Liverpool", "LIV"), away: mockTeam(2, "Arsenal", "ARS") },
  { home: mockTeam(3, "Chelsea", "CHE"), away: mockTeam(4, "Manchester United", "MUN") },
  { home: mockTeam(5, "Tottenham", "TOT"), away: mockTeam(6, "Newcastle", "NEW") },
  { home: mockTeam(7, "Man City", "MCI"), away: mockTeam(8, "Everton", "EVE") },
  { home: mockTeam(9, "Aston Villa", "AVL"), away: mockTeam(10, "Fulham", "FUL") },
];

const mockFixture = (index: number, kickoffAt: string) => ({
  id: 100 + index,
  name: `${MATCH_PAIRS[index].home.name} vs ${MATCH_PAIRS[index].away.name}`,
  kickoffAt,
  startTs: Math.floor(new Date(kickoffAt).getTime() / 1000),
  state: "NS" as const,
  stage: null,
  round: null,
  liveMinute: null,
  homeTeam: MATCH_PAIRS[index].home,
  awayTeam: MATCH_PAIRS[index].away,
  homeScore90: null,
  awayScore90: null,
  result: null,
});

const mockNextGame = (
  opts: {
    kickoffAt?: string;
    prediction?: { home: number; away: number } | null;
    leagueName?: string;
  } = {},
) => ({
  id: 101,
  name: "Liverpool vs Arsenal",
  kickoffAt: opts.kickoffAt ?? hours(48),
  startTs: Math.floor(new Date(opts.kickoffAt ?? hours(48)).getTime() / 1000),
  state: "NS" as const,
  stage: null,
  round: null,
  liveMinute: null,
  homeTeam: mockTeam(1, "Liverpool", "LIV"),
  awayTeam: mockTeam(2, "Arsenal", "ARS"),
  homeScore90: null,
  awayScore90: null,
  result: null,
  ...(opts.leagueName
    ? { league: { id: 1, name: opts.leagueName, imagePath: null } }
    : {}),
  ...(opts.prediction
    ? {
        prediction: {
          home: opts.prediction.home,
          away: opts.prediction.away,
          updatedAt: now.toISOString(),
          placedAt: now.toISOString(),
          settled: false,
          points: null,
        },
      }
    : {}),
});

const BASE_GROUP: ApiGroupItem = {
  id: 1,
  name: "Premier League Pals",
  description: null,
  privacy: "private",
  status: "active",
  creatorId: 1,
  userRole: "owner",
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
  memberCount: 8,
  totalFixtures: 20,
  predictionsCount: 14,
  completedFixturesCount: 6,
  liveGamesCount: 0,
  userRank: 2,
  userRankChange: 1,
  avatarType: "gradient",
  avatarValue: "3",
  selectionMode: "games",
};

type ScenarioKey =
  | "activePredicted"
  | "activeNoPrediction"
  | "allPredicted"
  | "nextPredicted"
  | "nextNotPredicted"
  | "next1"
  | "next2"
  | "next3"
  | "next5"
  | "urgencyToday"
  | "urgencyTomorrow"
  | "urgencyWeek"
  | "live"
  | "draft"
  | "ended"
  | "official"
  | "noNextGame"
  | "leagues"
  | "teams"
  | "chatUnread"
  | "activityUnread"
  | "bothUnread"
  | "noNotifications";

interface Scenario {
  key: ScenarioKey;
  label: string;
  group: ApiGroupItem;
  unreadCount?: number;
  unreadActivityCount?: number;
}

const SCENARIOS: Scenario[] = [
  {
    key: "activePredicted",
    label: "Active + Predicted",
    group: {
      ...BASE_GROUP,
      nextGame: mockNextGame({
        kickoffAt: hours(48),
        prediction: { home: 2, away: 1 },
      }),
    },
  },
  {
    key: "activeNoPrediction",
    label: "No Prediction",
    group: {
      ...BASE_GROUP,
      nextGame: mockNextGame({ kickoffAt: hours(48) }),
      predictionsCount: 13,
      hasUnpredictedGames: true,
      unpredictedGamesCount: 7,
    },
  },
  {
    key: "allPredicted",
    label: "All Predicted",
    group: {
      ...BASE_GROUP,
      predictionsCount: 20,
      totalFixtures: 20,
      hasUnpredictedGames: false,
      unpredictedGamesCount: 0,
      nextGame: mockNextGame({
        kickoffAt: hours(48),
        prediction: { home: 1, away: 0 },
      }),
    },
  },
  {
    key: "nextPredicted",
    label: "Next Predicted",
    group: {
      ...BASE_GROUP,
      predictionsCount: 14,
      nextGame: mockNextGame({
        kickoffAt: hours(48),
        prediction: { home: 3, away: 1 },
      }),
    },
  },
  {
    key: "nextNotPredicted",
    label: "Next Not Predicted",
    group: {
      ...BASE_GROUP,
      predictionsCount: 13,
      hasUnpredictedGames: true,
      unpredictedGamesCount: 7,
      nextGame: mockNextGame({ kickoffAt: hours(48) }),
    },
  },
  {
    key: "next1",
    label: "1 Game",
    group: {
      ...BASE_GROUP,
      totalFixtures: 1,
      predictionsCount: 0,
      nextGame: mockFixture(0, hours(48)),
      fixtures: [mockFixture(0, hours(48))],
    },
  },
  {
    key: "next2",
    label: "2 Games",
    group: {
      ...BASE_GROUP,
      totalFixtures: 2,
      predictionsCount: 0,
      nextGame: mockFixture(0, hours(48)),
      fixtures: [mockFixture(0, hours(48)), mockFixture(1, hours(48))],
    },
  },
  {
    key: "next3",
    label: "3 Games",
    group: {
      ...BASE_GROUP,
      totalFixtures: 3,
      predictionsCount: 0,
      nextGame: mockFixture(0, hours(48)),
      fixtures: [mockFixture(0, hours(48)), mockFixture(1, hours(48)), mockFixture(2, hours(48))],
    },
  },
  {
    key: "next5",
    label: "5 Games",
    group: {
      ...BASE_GROUP,
      totalFixtures: 5,
      predictionsCount: 0,
      nextGame: mockFixture(0, hours(48)),
      fixtures: [mockFixture(0, hours(48)), mockFixture(1, hours(48)), mockFixture(2, hours(48)), mockFixture(3, hours(48)), mockFixture(4, hours(48))],
    },
  },
  {
    key: "urgencyToday",
    label: "Urgency Today",
    group: {
      ...BASE_GROUP,
      nextGame: mockNextGame({ kickoffAt: hours(3) }),
      predictionsCount: 13,
      hasUnpredictedGames: true,
      unpredictedGamesCount: 7,
      todayGamesCount: 1,
      todayUnpredictedCount: 1,
    },
  },
  {
    key: "urgencyTomorrow",
    label: "Urgency Tomorrow",
    group: {
      ...BASE_GROUP,
      nextGame: mockNextGame({ kickoffAt: hours(28) }),
      predictionsCount: 13,
      hasUnpredictedGames: true,
      unpredictedGamesCount: 7,
    },
  },
  {
    key: "urgencyWeek",
    label: "Urgency Week",
    group: {
      ...BASE_GROUP,
      nextGame: mockNextGame({ kickoffAt: hours(120) }),
      predictionsCount: 13,
      hasUnpredictedGames: true,
      unpredictedGamesCount: 7,
    },
  },
  {
    key: "live",
    label: "Live",
    group: {
      ...BASE_GROUP,
      liveGamesCount: 2,
      nextGame: mockNextGame({
        kickoffAt: hours(48),
        prediction: { home: 1, away: 0 },
      }),
    },
  },
  {
    key: "draft",
    label: "Draft",
    group: {
      ...BASE_GROUP,
      id: 2,
      name: "My New Group",
      status: "draft",
      totalFixtures: 0,
      predictionsCount: 0,
      completedFixturesCount: 0,
      nextGame: null,
      userRank: undefined,
      userRankChange: undefined,
      avatarType: "emoji",
      avatarValue: "soccer",
    },
  },
  {
    key: "ended",
    label: "Ended",
    group: {
      ...BASE_GROUP,
      id: 3,
      name: "Champions League 24/25",
      status: "ended",
      totalFixtures: 20,
      predictionsCount: 20,
      completedFixturesCount: 20,
      nextGame: null,
      userRank: 1,
      userRankChange: 0,
    },
  },
  {
    key: "official",
    label: "Official",
    group: {
      ...BASE_GROUP,
      id: 4,
      name: "CygoBet Official",
      isOfficial: true,
      memberCount: 1423,
      nextGame: mockNextGame({
        kickoffAt: hours(24),
        prediction: { home: 3, away: 2 },
      }),
    },
  },
  {
    key: "noNextGame",
    label: "No Next Game",
    group: {
      ...BASE_GROUP,
      id: 5,
      name: "Season Break FC",
      nextGame: null,
    },
  },
  {
    key: "leagues",
    label: "Leagues Mode",
    group: {
      ...BASE_GROUP,
      id: 6,
      name: "La Liga Lovers",
      selectionMode: "leagues",
      nextGame: mockNextGame({
        kickoffAt: hours(48),
        prediction: { home: 0, away: 1 },
        leagueName: "La Liga",
      }),
    },
  },
  {
    key: "teams",
    label: "Teams Mode",
    group: {
      ...BASE_GROUP,
      id: 7,
      name: "Top 4 Tracker",
      selectionMode: "teams",
      groupTeams: [
        { id: 1, name: "Liverpool", shortCode: "LIV", imagePath: null },
        { id: 2, name: "Arsenal", shortCode: "ARS", imagePath: null },
        { id: 3, name: "Chelsea", shortCode: "CHE", imagePath: null },
        { id: 4, name: "Manchester City", shortCode: "MCI", imagePath: null },
      ],
      nextGame: mockNextGame({
        kickoffAt: hours(48),
        prediction: { home: 2, away: 2 },
      }),
    },
  },
  {
    key: "chatUnread",
    label: "Chat Unread",
    group: {
      ...BASE_GROUP,
      nextGame: mockNextGame({
        kickoffAt: hours(48),
        prediction: { home: 2, away: 1 },
      }),
    },
    unreadCount: 5,
  },
  {
    key: "activityUnread",
    label: "Activity Unread",
    group: {
      ...BASE_GROUP,
      nextGame: mockNextGame({
        kickoffAt: hours(48),
        prediction: { home: 2, away: 1 },
      }),
    },
    unreadActivityCount: 3,
  },
  {
    key: "bothUnread",
    label: "Both Unread",
    group: {
      ...BASE_GROUP,
      nextGame: mockNextGame({
        kickoffAt: hours(48),
        prediction: { home: 2, away: 1 },
      }),
    },
    unreadCount: 12,
    unreadActivityCount: 7,
  },
  {
    key: "noNotifications",
    label: "No Notifications",
    group: {
      ...BASE_GROUP,
      nextGame: mockNextGame({
        kickoffAt: hours(48),
        prediction: { home: 2, away: 1 },
      }),
    },
    unreadCount: 0,
    unreadActivityCount: 0,
  },
];

export function DebugGroupCardScreen() {
  const { theme } = useTheme();
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>("activePredicted");
  const current = SCENARIOS.find((s) => s.key === activeScenario)!;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      {/* Scenario tabs */}
      <View style={styles.tabs}>
        {SCENARIOS.map((s) => (
          <Pressable
            key={s.key}
            onPress={() => setActiveScenario(s.key)}
            style={[
              styles.tab,
              {
                backgroundColor:
                  activeScenario === s.key
                    ? theme.colors.primary
                    : theme.colors.cardBackground,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeScenario === s.key
                      ? "#fff"
                      : theme.colors.textPrimary,
                },
              ]}
            >
              {s.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Card preview */}
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.modeTitle, { color: theme.colors.textSecondary }]}>
          {current.label}
        </Text>
        <GroupCard
          group={current.group}
          onPress={(id) => console.log("GroupCard press", id)}
          unreadCount={current.unreadCount}
          unreadActivityCount={current.unreadActivityCount}
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
