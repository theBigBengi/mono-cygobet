"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type GroupItem = {
  id: number;
  name: string;
  description: string | null;
  privacy: "private" | "public";
  status: "draft" | "active" | "ended";
  memberCount: number;
  fixtureCount: number;
  predictableCount: number;
  unpredictedCount: number;
  avatarType: string | null;
  avatarValue: string | null;
  role: "owner" | "admin" | "member";
  nextGame?: {
    id: number;
    name: string;
    kickoffAt: string;
    startTs: number;
    homeTeam: { id: number; name: string; imagePath: string | null };
    awayTeam: { id: number; name: string; imagePath: string | null };
  } | null;
};

type GroupsResponse = {
  status: string;
  data: GroupItem[];
  message?: string;
};

export function useGroups() {
  return useQuery({
    queryKey: ["groups"],
    queryFn: () => apiClient.fetch<GroupsResponse>("/api/groups"),
    select: (data) => data.data,
  });
}

export type RankingItem = {
  rank: number;
  userId: number;
  username: string | null;
  totalPoints: number;
  predictionCount: number;
  correctScoreCount: number;
  correctDifferenceCount: number;
  correctOutcomeCount: number;
  previousRank?: number;
  rankChange?: number;
};

type RankingResponse = {
  status: string;
  data: RankingItem[];
};

export function useGroupRanking(groupId: number) {
  return useQuery({
    queryKey: ["groups", groupId, "ranking"],
    queryFn: () =>
      apiClient.fetch<RankingResponse>(`/api/groups/${groupId}/ranking`),
    select: (data) => data.data,
  });
}

type LobbySummaryResponse = {
  status: string;
  data: {
    liveFixtures: {
      id: number;
      name: string;
      startTs: number;
      homeTeam: { id: number; name: string; imagePath: string | null };
      awayTeam: { id: number; name: string; imagePath: string | null };
      homeScore90: number | null;
      awayScore90: number | null;
      liveMinute: number | null;
      state: string;
    }[];
    upcomingFixtures: {
      id: number;
      name: string;
      startTs: number;
      kickoffAt: string;
      homeTeam: { id: number; name: string; imagePath: string | null };
      awayTeam: { id: number; name: string; imagePath: string | null };
      state: string;
      prediction?: { home: number; away: number } | null;
    }[];
    recentFinishedFixtures: {
      id: number;
      name: string;
      homeTeam: { id: number; name: string; imagePath: string | null };
      awayTeam: { id: number; name: string; imagePath: string | null };
      homeScore90: number | null;
      awayScore90: number | null;
      result: string | null;
      state: string;
    }[];
    totalFixtures: number;
    predictionsCount: number;
    completedFixturesCount: number;
    predictableCount: number;
    unpredictedCount: number;
  };
};

export function useGroupLobbySummary(groupId: number) {
  return useQuery({
    queryKey: ["groups", groupId, "lobby-summary"],
    queryFn: () =>
      apiClient.fetch<LobbySummaryResponse>(
        `/api/groups/${groupId}/lobby-summary`,
      ),
    select: (data) => data.data,
  });
}
