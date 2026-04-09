"use client";

import { use } from "react";
import {
  Users,
  Trophy,
  Calendar,
  Target,
  Clock,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useGroupRanking, useGroupLobbySummary, type RankingItem } from "@/hooks/use-groups";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type GroupDetail = {
  id: number;
  name: string;
  description: string | null;
  privacy: "private" | "public";
  status: "draft" | "active" | "ended";
  memberCount: number;
};

function useGroupDetail(id: number) {
  return useQuery({
    queryKey: ["groups", id],
    queryFn: () =>
      apiClient.fetch<{ status: string; data: GroupDetail }>(
        `/api/groups/${id}`,
      ),
    select: (res) => res.data,
  });
}

function formatKickoff(ts: number) {
  const date = new Date(ts * 1000);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (diff < 0) return "Started";
  if (hours > 24) {
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function GroupLobbyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const groupId = Number(id);
  const { data: group } = useGroupDetail(groupId);
  const { data: ranking, isLoading: rankingLoading } = useGroupRanking(groupId);
  const { data: summary, isLoading: summaryLoading } = useGroupLobbySummary(groupId);

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={Users}
          label="Members"
          value={group?.memberCount ?? "—"}
        />
        <StatsCard
          icon={Calendar}
          label="Total Games"
          value={summary?.totalFixtures ?? "—"}
          loading={summaryLoading}
        />
        <StatsCard
          icon={Target}
          label="Predictions Made"
          value={summary?.predictionsCount ?? "—"}
          loading={summaryLoading}
        />
        <StatsCard
          icon={Trophy}
          label="Completed"
          value={summary?.completedFixturesCount ?? "—"}
          loading={summaryLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Fixtures */}
        <div className="space-y-6 lg:col-span-2">
          {/* Live fixtures */}
          {summary?.liveFixtures && summary.liveFixtures.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  Live
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.liveFixtures.map((fixture) => (
                  <div
                    key={fixture.id}
                    className="flex items-center justify-between rounded-lg bg-red-50 p-3 dark:bg-red-950/20"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">
                        {fixture.homeTeam.name}
                      </span>
                      <span className="font-bold">
                        {fixture.homeScore90 ?? 0} - {fixture.awayScore90 ?? 0}
                      </span>
                      <span className="font-medium">
                        {fixture.awayTeam.name}
                      </span>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      {fixture.liveMinute}&apos;
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Upcoming fixtures */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Upcoming Games
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : summary?.upcomingFixtures &&
                summary.upcomingFixtures.length > 0 ? (
                <div className="space-y-2">
                  {summary.upcomingFixtures.slice(0, 5).map((fixture) => (
                    <div
                      key={fixture.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="text-sm">
                        <span className="font-medium">
                          {fixture.homeTeam.name}
                        </span>
                        <span className="mx-2 text-muted-foreground">vs</span>
                        <span className="font-medium">
                          {fixture.awayTeam.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {fixture.prediction ? (
                          <Badge variant="secondary" className="text-xs">
                            {fixture.prediction.home}-
                            {fixture.prediction.away}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            No prediction
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatKickoff(fixture.startTs)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No upcoming games
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent results */}
          {summary?.recentFinishedFixtures &&
            summary.recentFinishedFixtures.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Recent Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {summary.recentFinishedFixtures.slice(0, 5).map((fixture) => (
                    <div
                      key={fixture.id}
                      className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span>{fixture.homeTeam.name}</span>
                        <span className="font-bold">
                          {fixture.homeScore90} - {fixture.awayScore90}
                        </span>
                        <span>{fixture.awayTeam.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        FT
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
        </div>

        {/* Right column: Leaderboard */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-4 w-4" />
                Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rankingLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : ranking && ranking.length > 0 ? (
                <div className="space-y-1">
                  {ranking.slice(0, 10).map((item, index) => (
                    <LeaderboardRow
                      key={item.userId}
                      item={item}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No rankings yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatsCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-5 w-12" />
          ) : (
            <p className="text-lg font-bold">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LeaderboardRow({
  item,
  index,
}: {
  item: RankingItem;
  index: number;
}) {
  const rankChange = item.rankChange ?? 0;

  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50">
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          index === 0
            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
            : index === 1
              ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              : index === 2
                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                : "text-muted-foreground"
        }`}
      >
        {item.rank}
      </span>
      <span className="flex-1 truncate text-sm font-medium">
        {item.username ?? `User ${item.userId}`}
      </span>
      {rankChange !== 0 && (
        <span
          className={`flex items-center text-xs ${
            rankChange > 0 ? "text-green-600" : "text-red-500"
          }`}
        >
          {rankChange > 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
        </span>
      )}
      <span className="text-sm font-bold">{item.totalPoints}</span>
      <span className="text-xs text-muted-foreground">pts</span>
    </div>
  );
}
