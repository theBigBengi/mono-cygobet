"use client";

import { use, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Check, AlertCircle } from "lucide-react";

type Fixture = {
  id: number;
  name: string;
  startTs: number;
  kickoffAt: string;
  state: string;
  liveMinute?: number | null;
  homeTeam: { id: number; name: string; shortCode?: string; imagePath: string | null };
  awayTeam: { id: number; name: string; shortCode?: string; imagePath: string | null };
  homeScore90?: number | null;
  awayScore90?: number | null;
  result?: string | null;
  prediction?: { home: number; away: number; updatedAt: string } | null;
};

type FixturesResponse = {
  status: string;
  data: Fixture[];
};

type PredictionDraft = {
  fixtureId: number;
  home: string;
  away: string;
};

function useGroupFixtures(groupId: number) {
  return useQuery({
    queryKey: ["groups", groupId, "fixtures"],
    queryFn: () =>
      apiClient.fetch<FixturesResponse>(`/api/groups/${groupId}/fixtures`),
    select: (data) => data.data,
  });
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isUpcoming(state: string) {
  return state === "NS" || state === "TBD" || state === "POSTP";
}

function isFinished(state: string) {
  return state === "FT" || state === "AET" || state === "PEN";
}

function isLive(state: string) {
  return (
    state === "LIVE" ||
    state === "HT" ||
    state === "1H" ||
    state === "2H" ||
    state === "ET" ||
    state === "BT"
  );
}

export default function PredictionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const groupId = Number(id);
  const queryClient = useQueryClient();
  const { data: fixtures, isLoading } = useGroupFixtures(groupId);
  const [drafts, setDrafts] = useState<Map<number, PredictionDraft>>(new Map());
  const [saveSuccess, setSaveSuccess] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (predictions: { fixtureId: number; home: number; away: number }[]) => {
      return apiClient.fetch(`/api/groups/${groupId}/predictions`, {
        method: "PUT",
        body: { predictions },
      });
    },
    onSuccess: () => {
      setDrafts(new Map());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      queryClient.invalidateQueries({ queryKey: ["groups", groupId] });
    },
  });

  const updateDraft = useCallback(
    (fixtureId: number, side: "home" | "away", value: string) => {
      // Only allow single digits 0-9
      if (value !== "" && !/^[0-9]$/.test(value)) return;

      setDrafts((prev) => {
        const next = new Map(prev);
        const existing = next.get(fixtureId) ?? {
          fixtureId,
          home: "",
          away: "",
        };
        next.set(fixtureId, { ...existing, [side]: value });
        return next;
      });
    },
    [],
  );

  function getDisplayValue(fixture: Fixture, side: "home" | "away") {
    const draft = drafts.get(fixture.id);
    if (draft) return draft[side];
    if (fixture.prediction) return String(fixture.prediction[side]);
    return "";
  }

  function hasDraftChanged(fixture: Fixture) {
    const draft = drafts.get(fixture.id);
    if (!draft) return false;
    if (draft.home === "" && draft.away === "") return false;
    if (!fixture.prediction) return draft.home !== "" && draft.away !== "";
    return (
      draft.home !== String(fixture.prediction.home) ||
      draft.away !== String(fixture.prediction.away)
    );
  }

  const changedDrafts = fixtures
    ? fixtures.filter((f) => hasDraftChanged(f))
    : [];

  function handleSaveAll() {
    const predictions = changedDrafts
      .map((f) => {
        const draft = drafts.get(f.id)!;
        const home = draft.home !== "" ? Number(draft.home) : (f.prediction?.home ?? -1);
        const away = draft.away !== "" ? Number(draft.away) : (f.prediction?.away ?? -1);
        if (home < 0 || away < 0) return null;
        return { fixtureId: f.id, home, away };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    if (predictions.length > 0) {
      saveMutation.mutate(predictions);
    }
  }

  const upcoming = fixtures?.filter((f) => isUpcoming(f.state)) ?? [];
  const live = fixtures?.filter((f) => isLive(f.state)) ?? [];
  const finished = fixtures?.filter((f) => isFinished(f.state)) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save bar */}
      {changedDrafts.length > 0 && (
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg border bg-background p-3 shadow-sm">
          <span className="text-sm font-medium">
            {changedDrafts.length} prediction
            {changedDrafts.length > 1 ? "s" : ""} to save
          </span>
          <Button
            size="sm"
            onClick={handleSaveAll}
            disabled={saveMutation.isPending}
          >
            <Save className="mr-1 h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Save all"}
          </Button>
        </div>
      )}

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/20 dark:text-green-400">
          <Check className="h-4 w-4" />
          Predictions saved successfully
        </div>
      )}

      {saveMutation.isError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          Failed to save predictions. Please try again.
        </div>
      )}

      {/* Live games */}
      {live.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-muted-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Live
          </h2>
          <div className="space-y-3">
            {live.map((fixture) => (
              <FixtureCard
                key={fixture.id}
                fixture={fixture}
                getDisplayValue={getDisplayValue}
                updateDraft={updateDraft}
                disabled
              />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming - predictable */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
            Upcoming ({upcoming.length})
          </h2>
          <div className="space-y-3">
            {upcoming.map((fixture) => (
              <FixtureCard
                key={fixture.id}
                fixture={fixture}
                getDisplayValue={getDisplayValue}
                updateDraft={updateDraft}
                disabled={false}
              />
            ))}
          </div>
        </section>
      )}

      {/* Finished */}
      {finished.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
            Finished ({finished.length})
          </h2>
          <div className="space-y-3">
            {finished.map((fixture) => (
              <FixtureCard
                key={fixture.id}
                fixture={fixture}
                getDisplayValue={getDisplayValue}
                updateDraft={updateDraft}
                disabled
              />
            ))}
          </div>
        </section>
      )}

      {!fixtures || fixtures.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No games in this group yet
        </div>
      ) : null}
    </div>
  );
}

function FixtureCard({
  fixture,
  getDisplayValue,
  updateDraft,
  disabled,
}: {
  fixture: Fixture;
  getDisplayValue: (fixture: Fixture, side: "home" | "away") => string;
  updateDraft: (fixtureId: number, side: "home" | "away", value: string) => void;
  disabled: boolean;
}) {
  const live = isLive(fixture.state);
  const finished = isFinished(fixture.state);

  return (
    <Card
      className={
        live
          ? "border-red-200 dark:border-red-800"
          : finished
            ? "opacity-75"
            : ""
      }
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Home team */}
          <div className="flex flex-1 items-center justify-end gap-2">
            <span className="truncate text-sm font-medium">
              {fixture.homeTeam.shortCode ?? fixture.homeTeam.name}
            </span>
            {(live || finished) && (
              <span className="text-lg font-bold">
                {fixture.homeScore90 ?? 0}
              </span>
            )}
          </div>

          {/* Score inputs or result */}
          <div className="flex items-center gap-1">
            {!finished && !live ? (
              <>
                <Input
                  className="h-10 w-10 text-center text-lg font-bold"
                  value={getDisplayValue(fixture, "home")}
                  onChange={(e) =>
                    updateDraft(fixture.id, "home", e.target.value)
                  }
                  disabled={disabled}
                  maxLength={1}
                  inputMode="numeric"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  className="h-10 w-10 text-center text-lg font-bold"
                  value={getDisplayValue(fixture, "away")}
                  onChange={(e) =>
                    updateDraft(fixture.id, "away", e.target.value)
                  }
                  disabled={disabled}
                  maxLength={1}
                  inputMode="numeric"
                />
              </>
            ) : (
              <span className="px-2 text-lg font-bold text-muted-foreground">
                -
              </span>
            )}
          </div>

          {/* Away team */}
          <div className="flex flex-1 items-center gap-2">
            {(live || finished) && (
              <span className="text-lg font-bold">
                {fixture.awayScore90 ?? 0}
              </span>
            )}
            <span className="truncate text-sm font-medium">
              {fixture.awayTeam.shortCode ?? fixture.awayTeam.name}
            </span>
          </div>

          {/* Status */}
          <div className="shrink-0">
            {live && (
              <Badge variant="destructive" className="text-xs">
                {fixture.liveMinute}&apos;
              </Badge>
            )}
            {finished && (
              <Badge variant="outline" className="text-xs">
                FT
              </Badge>
            )}
            {isUpcoming(fixture.state) && (
              <span className="text-xs text-muted-foreground">
                {formatDate(fixture.startTs)}
              </span>
            )}
          </div>
        </div>

        {/* Show existing prediction for finished/live games */}
        {(finished || live) && fixture.prediction && (
          <div className="mt-2 text-center text-xs text-muted-foreground">
            Your prediction: {fixture.prediction.home} - {fixture.prediction.away}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
