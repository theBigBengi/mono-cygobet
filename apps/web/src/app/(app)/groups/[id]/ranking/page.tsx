"use client";

import { use } from "react";
import { useGroupRanking, type RankingItem } from "@/hooks/use-groups";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Target,
  Crosshair,
  ArrowUpDown,
  Hash,
} from "lucide-react";

export default function RankingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const groupId = Number(id);
  const { data: ranking, isLoading } = useGroupRanking(groupId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!ranking || ranking.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <Trophy className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-medium">No rankings yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Rankings will appear after predictions are settled
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top 3 podium */}
      {ranking.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          <PodiumCard item={ranking[1]!} place={2} />
          <PodiumCard item={ranking[0]!} place={1} />
          <PodiumCard item={ranking[2]!} place={3} />
        </div>
      )}

      {/* Full table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Full Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Header */}
          <div className="mb-2 grid grid-cols-[2.5rem_1fr_4rem_4rem_4rem_4rem_5rem] items-center gap-2 px-2 text-xs font-medium text-muted-foreground">
            <span>#</span>
            <span>Player</span>
            <span className="text-center" title="Predictions">
              <Hash className="mx-auto h-3 w-3" />
            </span>
            <span className="text-center" title="Exact score">
              <Crosshair className="mx-auto h-3 w-3" />
            </span>
            <span className="text-center" title="Correct difference">
              <ArrowUpDown className="mx-auto h-3 w-3" />
            </span>
            <span className="text-center" title="Correct outcome">
              <Target className="mx-auto h-3 w-3" />
            </span>
            <span className="text-right">Points</span>
          </div>

          {/* Rows */}
          <div className="space-y-1">
            {ranking.map((item, index) => (
              <RankingRow key={item.userId} item={item} index={index} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PodiumCard({ item, place }: { item: RankingItem; place: 1 | 2 | 3 }) {
  const colors = {
    1: "from-yellow-400/20 to-yellow-400/5 border-yellow-300",
    2: "from-gray-300/20 to-gray-300/5 border-gray-300",
    3: "from-orange-400/20 to-orange-400/5 border-orange-300",
  };

  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const sizes = { 1: "pt-4 pb-6", 2: "pt-6 pb-4", 3: "pt-6 pb-4" };

  return (
    <Card
      className={`bg-gradient-to-b ${colors[place]} ${sizes[place]} text-center`}
    >
      <CardContent className="p-3">
        <span className="text-2xl">{medals[place]}</span>
        <p className="mt-1 truncate text-sm font-bold">
          {item.username ?? `User ${item.userId}`}
        </p>
        <p className="text-2xl font-bold text-primary">{item.totalPoints}</p>
        <p className="text-xs text-muted-foreground">points</p>
      </CardContent>
    </Card>
  );
}

function RankingRow({ item, index }: { item: RankingItem; index: number }) {
  const rankChange = item.rankChange ?? 0;

  return (
    <div
      className={`grid grid-cols-[2.5rem_1fr_4rem_4rem_4rem_4rem_5rem] items-center gap-2 rounded-lg px-2 py-2.5 ${
        index < 3 ? "bg-muted/30" : "hover:bg-muted/30"
      }`}
    >
      {/* Rank */}
      <div className="flex items-center gap-1">
        <span
          className={`text-sm font-bold ${
            index === 0
              ? "text-yellow-600"
              : index === 1
                ? "text-gray-500"
                : index === 2
                  ? "text-orange-600"
                  : "text-muted-foreground"
          }`}
        >
          {item.rank}
        </span>
        {rankChange !== 0 && (
          <span
            className={`text-xs ${
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
      </div>

      {/* Name */}
      <span className="truncate text-sm font-medium">
        {item.username ?? `User ${item.userId}`}
      </span>

      {/* Stats */}
      <span className="text-center text-sm">{item.predictionCount}</span>
      <span className="text-center text-sm font-medium text-green-600">
        {item.correctScoreCount}
      </span>
      <span className="text-center text-sm">{item.correctDifferenceCount}</span>
      <span className="text-center text-sm">{item.correctOutcomeCount}</span>

      {/* Points */}
      <span className="text-right text-sm font-bold">{item.totalPoints}</span>
    </div>
  );
}
