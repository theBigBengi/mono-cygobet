"use client";

import Link from "next/link";
import { Users, Calendar, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GroupItem } from "@/hooks/use-groups";

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GroupCard({ group }: { group: GroupItem }) {
  const unpredicted = group.unpredictedCount;

  return (
    <Link href={`/groups/${group.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <GroupAvatar group={group} />
              <div>
                <CardTitle className="text-base">{group.name}</CardTitle>
                {group.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {group.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusBadge status={group.status} />
              {unpredicted > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unpredicted} left
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {group.memberCount}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {group.fixtureCount} games
            </span>
            <span className="flex items-center gap-1">
              <Target className="h-3.5 w-3.5" />
              {group.predictableCount - group.unpredictedCount}/
              {group.predictableCount} predicted
            </span>
          </div>

          {group.nextGame && (
            <div className="mt-3 rounded-lg bg-muted/50 p-2.5">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Next game
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="truncate">
                  {group.nextGame.homeTeam.name} vs{" "}
                  {group.nextGame.awayTeam.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(group.nextGame.startTs)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function GroupAvatar({ group }: { group: GroupItem }) {
  const initials = group.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
      {group.avatarValue ? (
        <span className="text-lg">{group.avatarValue}</span>
      ) : (
        initials
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <Badge variant="secondary" className="text-xs">
        Active
      </Badge>
    );
  }
  if (status === "ended") {
    return (
      <Badge variant="outline" className="text-xs">
        Ended
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs">
      Draft
    </Badge>
  );
}

export function GroupCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-48 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-4">
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}
