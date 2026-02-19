"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Clock, Timer, Hash, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/table/status-badge";
import type { Batch, BatchItem } from "@repo/types";
import { useBatchItems, useBatchFailedItems } from "@/hooks/use-batches";
import { cn } from "@/lib/utils";

// ── Labels ──────────────────────────────────────────────────────────

const BATCH_LABELS: Record<string, string> = {
  "seed-season": "Season seed",
  "seed-fixtures": "Fixtures sync",
  "seed-countries": "Countries sync",
  "seed-leagues": "Leagues sync",
  "seed-seasons": "Seasons sync",
  "seed-teams": "Teams sync",
  "seed-bookmakers": "Bookmakers sync",
  "batch-seed-seasons": "Batch season seed",
  "upsert-live-fixtures": "Live fixtures update",
  "upsert-upcoming-fixtures": "Upcoming fixtures update",
  "finished-fixtures": "Finished fixtures check",
  "recovery-overdue-fixtures": "Overdue fixtures recovery",
};

// ── Helpers ─────────────────────────────────────────────────────────

function formatDuration(batch: Batch): string {
  const ms =
    batch.durationMs ??
    (batch.finishedAt
      ? new Date(batch.finishedAt).getTime() -
        new Date(batch.startedAt).getTime()
      : 0);
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0
    ? `${minutes}m ${remainingSeconds}s`
    : `${minutes}m`;
}

function formatTimestamp(date: string): string {
  return new Date(date).toLocaleString("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getBatchContext(batch: Batch): string | null {
  const meta = batch.meta as Record<string, unknown> | null;
  if (!meta) return null;

  // seed-season
  const season = meta.season as { name?: string; league?: string } | undefined;
  if (season?.league && season?.name) return `${season.league} · ${season.name}`;
  if (season?.name) return season.name;

  // seed-season (failed / in progress)
  if (batch.name === "seed-season" && meta.seasonExternalId) {
    return `Season #${meta.seasonExternalId}`;
  }

  // batch-seed-seasons
  if (batch.name === "batch-seed-seasons") {
    const seasons = meta.seasons as Array<{
      result?: { season?: { league?: string; name?: string } };
    }> | undefined;
    if (Array.isArray(seasons) && seasons.length > 0) {
      // 1-2 seasons: full names
      if (seasons.length <= 2) {
        const names = seasons
          .map((s) => {
            const r = s.result?.season;
            return r?.league && r?.name ? `${r.league} · ${r.name}` : null;
          })
          .filter(Boolean);
        if (names.length > 0) return names.join("\n");
      }
      // 3+: group by league with counts
      const leagueMap = new Map<string, number>();
      for (const s of seasons) {
        const league = s.result?.season?.league;
        if (league) leagueMap.set(league, (leagueMap.get(league) ?? 0) + 1);
      }
      if (leagueMap.size > 0) {
        const parts = [...leagueMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => count > 1 ? `${name} (${count})` : name);
        return `${seasons.length} seasons · ${parts.join(", ")}`;
      }
    }
    if (typeof meta.totalSeasons === "number") return `${meta.totalSeasons} seasons`;
  }

  // upcoming fixtures — date window
  const window = meta.window as { from?: string; to?: string } | undefined;
  if (window?.from && window?.to) {
    const fmt = (iso: string) =>
      new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
    return `${fmt(window.from)} → ${fmt(window.to)}`;
  }

  return null;
}

function getActionLabel(item: BatchItem): string {
  // Failed items always show "failed" regardless of meta.action
  if (item.status === "failed") return "failed";
  const m = (item.meta ?? {}) as Record<string, unknown>;
  const action = m["action"];
  if (typeof action === "string") return action;
  if (item.status === "success") return "success";
  if (item.status === "skipped") return "skipped";
  return item.status;
}

// ── Header ──────────────────────────────────────────────────────────

function Header({ batch }: { batch: Batch }) {
  const label = BATCH_LABELS[batch.name] ?? batch.name;
  const isSuccess = batch.status === "success";
  const context = getBatchContext(batch);

  return (
    <div className="flex items-start gap-2 sm:gap-3 pr-8">
      <div
        className={cn(
          "mt-0.5 rounded-full p-1 sm:p-1.5",
          isSuccess ? "bg-green-100 dark:bg-green-950" : "bg-red-100 dark:bg-red-950"
        )}
      >
        {isSuccess ? (
          <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
        ) : (
          <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-sm sm:text-base leading-tight">{label}</h3>
          <StatusBadge status={batch.status} />
        </div>
        {context && (
          <p className="text-sm sm:text-base font-medium mt-0.5 whitespace-pre-line">{context}</p>
        )}
        {batch.status === "failed" && batch.errorMessage && (
          <p className="text-xs sm:text-sm text-destructive mt-1 line-clamp-2">
            {batch.errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Stats row ───────────────────────────────────────────────────────

function getSeedSeasonStats(meta: Record<string, unknown>): {
  teamsOk: number; teamsFail: number;
  fixturesOk: number; fixturesFail: number;
} | null {
  let teamsOk = 0, teamsFail = 0, fixturesOk = 0, fixturesFail = 0;

  // batch-seed-seasons: aggregate across meta.seasons[].result
  const seasons = meta.seasons as Array<{
    result?: { teams?: { ok?: number; fail?: number }; fixtures?: { ok?: number; fail?: number } };
  }> | undefined;
  if (Array.isArray(seasons)) {
    for (const s of seasons) {
      teamsOk += s.result?.teams?.ok ?? 0;
      teamsFail += s.result?.teams?.fail ?? 0;
      fixturesOk += s.result?.fixtures?.ok ?? 0;
      fixturesFail += s.result?.fixtures?.fail ?? 0;
    }
    return { teamsOk, teamsFail, fixturesOk, fixturesFail };
  }

  // seed-season: flat meta.teams / meta.fixtures
  const teams = meta.teams as { ok?: number; fail?: number } | undefined;
  const fixtures = meta.fixtures as { ok?: number; fail?: number } | undefined;
  if (!teams && !fixtures) return null;
  return {
    teamsOk: teams?.ok ?? 0, teamsFail: teams?.fail ?? 0,
    fixturesOk: fixtures?.ok ?? 0, fixturesFail: fixtures?.fail ?? 0,
  };
}

function StatsRow({ batch }: { batch: Batch }) {
  const meta = (batch.meta ?? {}) as Record<string, unknown>;
  const isSeedSeason = batch.name === "seed-season" || batch.name === "batch-seed-seasons";
  const seedStats = isSeedSeason ? getSeedSeasonStats(meta) : null;

  const inserted = typeof meta.inserted === "number" ? meta.inserted : undefined;
  const updated = typeof meta.updated === "number" ? meta.updated : undefined;
  const skipped = typeof meta.skipped === "number" ? meta.skipped : undefined;

  let itemsValue: string;
  let resultValue: string;
  let hasDanger = false;

  if (seedStats) {
    // seed-season / batch-seed-seasons: show teams + fixtures breakdown
    const parts: string[] = [];
    if (seedStats.teamsOk > 0 || seedStats.teamsFail > 0)
      parts.push(`${seedStats.teamsOk} teams`);
    if (seedStats.fixturesOk > 0 || seedStats.fixturesFail > 0)
      parts.push(`${seedStats.fixturesOk} fixtures`);
    itemsValue = parts.join(" · ") || "—";

    const totalFail = seedStats.teamsFail + seedStats.fixturesFail;
    const totalOk = seedStats.teamsOk + seedStats.fixturesOk;
    hasDanger = totalFail > 0;
    resultValue = `${totalOk} ok${totalFail > 0 ? ` · ${totalFail} failed` : ""}`;
  } else {
    itemsValue = String(batch.itemsTotal);
    hasDanger = batch.itemsFailed > 0;
    resultValue =
      inserted != null || updated != null
        ? [
            inserted ? `${inserted} new` : null,
            updated ? `${updated} updated` : null,
            skipped ? `${skipped} skipped` : null,
            batch.itemsFailed > 0 ? `${batch.itemsFailed} failed` : null,
          ]
            .filter(Boolean)
            .join(" · ") || "no changes"
        : `${batch.itemsSuccess} ok${batch.itemsFailed > 0 ? ` · ${batch.itemsFailed} failed` : ""}`;
  }

  const stats = [
    {
      icon: Clock,
      label: "Started",
      value: formatTimestamp(batch.startedAt),
    },
    {
      icon: Timer,
      label: "Duration",
      value: formatDuration(batch),
    },
    {
      icon: Hash,
      label: "Items",
      value: itemsValue,
    },
    {
      icon: TrendingUp,
      label: "Result",
      value: resultValue,
      danger: hasDanger,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:gap-x-4 sm:gap-y-2 rounded-lg border p-2 sm:p-3 text-xs sm:text-sm">
      {stats.map((s) => (
        <div key={s.label} className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <s.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground shrink-0">{s.label}:</span>
          <span
            className={cn(
              "truncate font-medium",
              "danger" in s && s.danger && "text-destructive"
            )}
          >
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Items section ───────────────────────────────────────────────────

type StatusFilterValue = "all" | "success" | "failed" | "skipped";
type ActionFilterValue = "all" | "inserted" | "updated" | "skipped" | "failed";

function ItemsSection({ batch }: { batch: Batch }) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [actionFilter, setActionFilter] = useState<ActionFilterValue>("all");

  const { data, isLoading } = useBatchItems(batch.id, {
    page,
    perPage: 50,
    status: statusFilter === "all" ? undefined : statusFilter,
    action: actionFilter === "all" ? undefined : actionFilter,
  });

  const items = data?.data ?? [];
  const pagination = data?.pagination;

  // Counts for status filter
  const skippedCount = Math.max(
    0,
    batch.itemsTotal - batch.itemsSuccess - batch.itemsFailed
  );
  const statusOptions: { value: StatusFilterValue; label: string; count: number }[] = [
    { value: "all", label: "All", count: batch.itemsTotal },
    { value: "success", label: "success", count: batch.itemsSuccess },
    { value: "failed", label: "failed", count: batch.itemsFailed },
    { value: "skipped", label: "skipped", count: skippedCount },
  ];

  // Counts for action filter from meta
  const meta = (batch.meta ?? {}) as Record<string, unknown>;
  const actionCounts: Record<string, number | undefined> = {
    inserted: typeof meta.inserted === "number" ? meta.inserted : undefined,
    updated: typeof meta.updated === "number" ? meta.updated : undefined,
    skipped: typeof meta.skipped === "number" ? meta.skipped : undefined,
    failed: typeof meta.failed === "number" ? meta.failed : undefined,
  };
  const hasActionCounts = Object.values(actionCounts).some((v) => v != null);
  const actionOptions: { value: ActionFilterValue; label: string; count?: number }[] = [
    { value: "all", label: "All", count: hasActionCounts ? batch.itemsTotal : undefined },
    { value: "inserted", label: "inserted", count: actionCounts.inserted },
    { value: "updated", label: "updated", count: actionCounts.updated },
    { value: "skipped", label: "skipped", count: actionCounts.skipped },
    { value: "failed", label: "failed", count: actionCounts.failed ?? (batch.itemsFailed > 0 ? batch.itemsFailed : undefined) },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h4 className="text-sm font-medium">Items</h4>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as StatusFilterValue);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-7 sm:h-8 w-[110px] sm:w-[130px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} disabled={opt.value !== "all" && opt.count === 0}>
                  {opt.label} ({opt.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={actionFilter}
            onValueChange={(v) => {
              setActionFilter(v as ActionFilterValue);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-7 sm:h-8 w-[110px] sm:w-[130px] text-xs">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              {actionOptions.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  disabled={opt.value !== "all" && (opt.count === 0 || opt.count == null)}
                >
                  {opt.label}{opt.count != null ? ` (${opt.count})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 min-h-[200px] sm:min-h-[280px]">
        {isLoading ? (
          <Skeleton className="h-full w-full rounded-md" />
        ) : !items.length ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No items for this batch.
          </p>
        ) : (
          <ul className="h-full overflow-y-auto space-y-1">
            {items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex-shrink-0 flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>
            Page {pagination.page} of {pagination.totalPages}
            <span className="hidden sm:inline">
              {" "}({pagination.totalItems} items)
            </span>
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const ACTION_STYLES: Record<string, string> = {
  inserted: "text-green-600 dark:text-green-400",
  updated: "text-blue-600 dark:text-blue-400",
  skipped: "text-muted-foreground",
  failed: "text-destructive",
  insert_failed: "text-destructive",
  update_failed: "text-destructive",
  success: "text-green-600 dark:text-green-400",
};

function ItemRow({ item }: { item: BatchItem }) {
  const m = (item.meta ?? {}) as Record<string, unknown>;
  const entityType =
    typeof m["entityType"] === "string"
      ? m["entityType"]
      : item.itemKey?.split(":")[0] ?? null;
  const name = typeof m["name"] === "string" ? m["name"] : null;
  const entityId = item.itemKey?.split(":")[1] ?? item.itemKey;
  const action = getActionLabel(item);
  const errorMsg = item.errorMessage;

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 sm:px-3 sm:py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          {entityType && (
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide shrink-0">
              {entityType}
            </span>
          )}
          <span className="text-xs sm:text-sm font-medium truncate">
            {name ?? entityId ?? "—"}
          </span>
        </div>
        {errorMsg && (
          <p className="text-[10px] sm:text-xs text-destructive mt-0.5 line-clamp-1">
            {errorMsg}
          </p>
        )}
      </div>
      <span
        className={cn(
          "text-[10px] sm:text-xs font-medium shrink-0",
          ACTION_STYLES[action] ?? "text-muted-foreground"
        )}
      >
        {action}
      </span>
    </div>
  );
}

// ── Failed items (collapsible) ──────────────────────────────────────

function FailedItemsList({
  batchId,
  failedCount,
}: {
  batchId: number;
  failedCount: number;
}) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useBatchFailedItems(batchId, { enabled: open });
  const items = data?.data ?? [];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive">
          View {failedCount} failed item{failedCount !== 1 ? "s" : ""}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {isLoading ? (
          <Skeleton className="mt-3 h-20 w-full" />
        ) : (
          <ul className="mt-3 space-y-1 max-h-48 overflow-y-auto">
            {items.map((item: BatchItem) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Error section ───────────────────────────────────────────────────

function ErrorSection({ batch }: { batch: Batch }) {
  // For seed-season, itemsFailed on the batch is often 0 but child items may have failures
  // Check both the batch-level count and the meta for nested failures
  let failedCount = batch.itemsFailed;
  if (failedCount === 0 && (batch.name === "seed-season" || batch.name === "batch-seed-seasons")) {
    const meta = (batch.meta ?? {}) as Record<string, unknown>;
    const seedStats = getSeedSeasonStats(meta);
    if (seedStats) {
      failedCount = seedStats.teamsFail + seedStats.fixturesFail;
    }
  }
  if (failedCount === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-destructive">Errors</h4>
      <FailedItemsList batchId={batch.id} failedCount={failedCount} />
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────

export interface BatchDetailContentProps {
  batch: Batch;
}

export function BatchDetailContent({ batch }: BatchDetailContentProps) {
  return (
    <div className="flex flex-col gap-4 min-h-0 flex-1">
      <Header batch={batch} />
      <StatsRow batch={batch} />
      <ItemsSection batch={batch} />
      <ErrorSection batch={batch} />
    </div>
  );
}
