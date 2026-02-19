import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Trophy,
  Calendar,
  Users,
  CalendarDays,
  Bookmark,
  Layers,
  Database,
} from "lucide-react";
import type { Batch } from "@repo/types";
import { cn } from "@/lib/utils";
import { BatchDetailContent } from "@/components/sync-center/batch-detail-content";

// ── Operation config ─────────────────────────────────────────────────

type OpConfig = {
  label: string;
  icon: React.ElementType;
  auto?: boolean;
  detail?: (meta: Record<string, unknown>) => string | null;
};

function seedDetail(meta: Record<string, unknown>): string | null {
  const ok = typeof meta.ok === "number" ? meta.ok : undefined;
  const fail = typeof meta.fail === "number" ? meta.fail : undefined;
  if (ok != null && fail != null && fail > 0) return `${ok} ok · ${fail} failed`;
  if (ok != null) return `${ok} synced`;
  const totalInput = typeof meta.totalInput === "number" ? meta.totalInput : undefined;
  if (totalInput != null) return `${totalInput} items`;
  return null;
}

const OPERATION_CONFIG: Record<string, OpConfig> = {
  "upsert-live-fixtures": {
    label: "Live fixtures update",
    icon: CalendarDays,
    auto: true,
  },
  "upsert-upcoming-fixtures": {
    label: "Upcoming fixtures update",
    icon: CalendarDays,
    auto: true,
    detail: (meta) => {
      const w = meta.window as { from?: string; to?: string } | undefined;
      if (w?.from && w?.to) return `${fmtDate(w.from)} → ${fmtDate(w.to)}`;
      return null;
    },
  },
  "finished-fixtures": {
    label: "Finished fixtures check",
    icon: CalendarDays,
    auto: true,
  },
  "recovery-overdue-fixtures": {
    label: "Overdue fixtures recovery",
    icon: CalendarDays,
    auto: true,
  },
  "seed-season": {
    label: "Season seed",
    icon: Layers,
    detail: (meta) => {
      const s = meta.season as { name?: string; league?: string } | undefined;
      if (s?.league && s?.name) return `${s.league} · ${s.name}`;
      if (s?.name) return s.name;
      if (meta.seasonExternalId) return `Season #${meta.seasonExternalId}`;
      return null;
    },
  },
  "batch-seed-seasons": {
    label: "Batch season seed",
    icon: Layers,
    detail: (meta) => {
      const seasons = meta.seasons as Array<{
        result?: { season?: { league?: string; name?: string } };
      }> | undefined;
      if (Array.isArray(seasons) && seasons.length > 0) {
        // 1-2 seasons: show full names
        if (seasons.length <= 2) {
          const names = seasons
            .map((s) => {
              const r = s.result?.season;
              return r?.league && r?.name ? `${r.league} · ${r.name}` : null;
            })
            .filter(Boolean);
          if (names.length > 0) return names.join(", ");
        }
        // 3+: show count + unique league names
        const leagues = [...new Set(
          seasons.map((s) => s.result?.season?.league).filter(Boolean) as string[]
        )];
        if (leagues.length > 0) {
          const leagueText = leagues.length <= 3
            ? leagues.join(", ")
            : `${leagues.slice(0, 2).join(", ")} +${leagues.length - 2}`;
          return `${seasons.length} seasons · ${leagueText}`;
        }
      }
      const total = typeof meta.totalSeasons === "number" ? meta.totalSeasons : 0;
      if (total > 0) return `${total} seasons`;
      return null;
    },
  },
  "seed-countries": { label: "Countries sync", icon: Globe, detail: seedDetail },
  "seed-leagues": { label: "Leagues sync", icon: Trophy, detail: seedDetail },
  "seed-seasons": { label: "Seasons sync", icon: Calendar, detail: seedDetail },
  "seed-teams": { label: "Teams sync", icon: Users, detail: seedDetail },
  "seed-fixtures": { label: "Fixtures sync", icon: CalendarDays, detail: seedDetail },
  "seed-bookmakers": { label: "Bookmakers sync", icon: Bookmark, detail: seedDetail },
};

// ── Helpers ──────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
}

function getTimeAgoText(date: string): string {
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);
  if (diffMins < 60) return rtf.format(-diffMins, "minute");
  if (diffHours < 24) return rtf.format(-diffHours, "hour");
  return rtf.format(-diffDays, "day");
}

function getDurationText(batch: Batch): string {
  if (!batch.finishedAt) return "—";
  const diffMs =
    new Date(batch.finishedAt).getTime() - new Date(batch.startedAt).getTime();
  const s = Math.round(diffMs / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r > 0 ? `${m}m ${r}s` : `${m}m`;
}

function getSeedSeasonSummary(
  meta: Record<string, unknown>
): { text: string; hasFailures: boolean } | null {
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
  } else {
    // seed-season: flat meta.teams / meta.fixtures
    const teams = meta.teams as { ok?: number; fail?: number } | undefined;
    const fixtures = meta.fixtures as { ok?: number; fail?: number } | undefined;
    if (!teams && !fixtures) return null;
    teamsOk = teams?.ok ?? 0;
    teamsFail = teams?.fail ?? 0;
    fixturesOk = fixtures?.ok ?? 0;
    fixturesFail = fixtures?.fail ?? 0;
  }

  const parts: string[] = [];
  if (teamsOk > 0 || teamsFail > 0) parts.push(`${teamsOk} teams`);
  if (fixturesOk > 0 || fixturesFail > 0) parts.push(`${fixturesOk} fixtures`);
  const totalFail = teamsFail + fixturesFail;
  if (totalFail > 0) parts.push(`${totalFail} fail`);
  if (parts.length === 0) return null;
  return { text: parts.join(" · "), hasFailures: totalFail > 0 };
}

function getItemsSummary(batch: Batch): { text: string; hasFailures: boolean } {
  const meta = (batch.meta ?? {}) as Record<string, unknown>;

  // seed-season / batch-seed-seasons have nested meta: { teams: {ok,fail}, fixtures: {ok,fail} }
  if (batch.name === "seed-season" || batch.name === "batch-seed-seasons") {
    const summary = getSeedSeasonSummary(meta);
    if (summary) return summary;
  }

  const inserted = typeof meta.inserted === "number" ? meta.inserted : 0;
  const updated = typeof meta.updated === "number" ? meta.updated : 0;
  const failed = typeof meta.failed === "number" ? meta.failed : batch.itemsFailed;
  const hasBreakdown = inserted > 0 || updated > 0 || failed > 0;

  if (hasBreakdown) {
    if (inserted === 0 && updated === 0 && failed === 0)
      return { text: "no changes", hasFailures: false };
    const parts: string[] = [];
    if (inserted > 0) parts.push(`${inserted} new`);
    if (updated > 0) parts.push(`${updated} upd`);
    if (failed > 0) parts.push(`${failed} fail`);
    return { text: parts.join(" · "), hasFailures: failed > 0 };
  }

  const ok = typeof meta.ok === "number" ? meta.ok : batch.itemsSuccess;
  const fail = typeof meta.fail === "number" ? meta.fail : batch.itemsFailed;
  if (ok === 0 && fail === 0 && batch.itemsTotal === 0)
    return { text: "", hasFailures: false };
  if (ok > 0 || fail > 0) {
    const p: string[] = [];
    if (ok > 0) p.push(`${ok} new`);
    if (fail > 0) p.push(`${fail} fail`);
    return { text: p.join(" · "), hasFailures: fail > 0 };
  }
  return { text: `${batch.itemsTotal} items`, hasFailures: false };
}

// ── Mobile card ──────────────────────────────────────────────────────

function BatchCard({
  batch,
  onClick,
}: {
  batch: Batch;
  onClick: () => void;
}) {
  const cfg = OPERATION_CONFIG[batch.name] ?? { label: batch.name, icon: Database };
  const Icon = cfg.icon;
  const meta = (batch.meta ?? {}) as Record<string, unknown>;
  const detail = cfg.detail?.(meta) ?? null;
  const isAuto = cfg.auto;
  const items = getItemsSummary(batch);

  return (
    <div
      className="rounded-md border p-2.5 space-y-1 active:bg-muted/50 cursor-pointer"
      onClick={onClick}
    >
      {/* Row 1: operation + status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium truncate">{cfg.label}</span>
          <span
            className={cn(
              "text-[9px] px-1 py-0.5 rounded-full font-medium leading-none shrink-0",
              isAuto
                ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
            )}
          >
            {isAuto ? "auto" : "manual"}
          </span>
        </div>
        <StatusBadge status={batch.status} className="text-[10px] px-1.5 py-0" />
      </div>

      {/* Row 2: detail (if any) */}
      {detail && (
        <p className="text-xs font-medium truncate pl-5">{detail}</p>
      )}

      {/* Row 3: when · duration · items */}
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pl-5 flex-wrap">
        <span>{getTimeAgoText(batch.startedAt)}</span>
        <span className="opacity-40">·</span>
        <span>{getDurationText(batch)}</span>
        {items.text && (
          <>
            <span className="opacity-40">·</span>
            <span className={items.hasFailures ? "text-destructive" : ""}>
              {items.text}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Desktop table cells ──────────────────────────────────────────────

function OperationCell({ batch }: { batch: Batch }) {
  const cfg = OPERATION_CONFIG[batch.name] ?? { label: batch.name, icon: Database };
  const Icon = cfg.icon;
  const meta = (batch.meta ?? {}) as Record<string, unknown>;
  const detail = cfg.detail?.(meta) ?? null;
  const isAuto = cfg.auto;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium">{cfg.label}</span>
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full font-medium leading-none",
              isAuto
                ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
            )}
          >
            {isAuto ? "auto" : "manual"}
          </span>
        </div>
        {detail && (
          <p className="text-sm truncate">{detail}</p>
        )}
      </div>
    </div>
  );
}

function TimeAgo({ date }: { date: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-sm text-muted-foreground cursor-help">
          {getTimeAgoText(date)}
        </span>
      </TooltipTrigger>
      <TooltipContent>{new Date(date).toLocaleString()}</TooltipContent>
    </Tooltip>
  );
}

function ItemsCell({ batch }: { batch: Batch }) {
  const meta = (batch.meta ?? {}) as Record<string, unknown>;

  // seed-season / batch-seed-seasons: show teams + fixtures breakdown
  if (batch.name === "seed-season" || batch.name === "batch-seed-seasons") {
    const summary = getSeedSeasonSummary(meta);
    if (summary) {
      return (
        <span className="text-sm">
          <span className={summary.hasFailures ? "text-red-600" : ""}>
            {summary.text}
          </span>
        </span>
      );
    }
  }

  const inserted = typeof meta.inserted === "number" ? meta.inserted : 0;
  const updated = typeof meta.updated === "number" ? meta.updated : 0;
  const skipped = typeof meta.skipped === "number" ? meta.skipped : 0;
  const failed = typeof meta.failed === "number" ? meta.failed : batch.itemsFailed;
  const hasBreakdown = inserted > 0 || updated > 0 || skipped > 0 || failed > 0;

  if (!hasBreakdown) {
    const ok = typeof meta.ok === "number" ? meta.ok : batch.itemsSuccess;
    const fail = typeof meta.fail === "number" ? meta.fail : batch.itemsFailed;
    if (ok === 0 && fail === 0 && batch.itemsTotal === 0) {
      return <span className="text-sm text-muted-foreground">—</span>;
    }
    return (
      <span className="text-sm">
        {ok > 0 && <span className="text-green-600">{ok} new</span>}
        {fail > 0 && (
          <span className="text-red-600">
            {ok > 0 ? " · " : ""}
            {fail} failed
          </span>
        )}
        {ok === 0 && fail === 0 && (
          <span className="text-muted-foreground">{batch.itemsTotal}</span>
        )}
      </span>
    );
  }

  if (inserted === 0 && updated === 0 && failed === 0) {
    return <span className="text-sm text-muted-foreground">no changes</span>;
  }

  const parts: React.ReactNode[] = [];
  if (inserted > 0)
    parts.push(
      <span key="i" className="text-green-600">
        {inserted} new
      </span>
    );
  if (updated > 0) parts.push(<span key="u">{updated} updated</span>);
  if (failed > 0)
    parts.push(
      <span key="f" className="text-red-600">
        {failed} failed
      </span>
    );

  return (
    <span className="text-sm">
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 ? " · " : ""}
          {p}
        </span>
      ))}
    </span>
  );
}

function DurationCell({
  started,
  finished,
}: {
  started: Date;
  finished: Date | null;
}) {
  if (!finished) {
    return <span className="text-muted-foreground">—</span>;
  }

  const diffMs = finished.getTime() - started.getTime();
  const seconds = Math.round(diffMs / 1000);

  if (seconds < 60) {
    return <span className="text-sm text-muted-foreground">{seconds}s</span>;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return (
    <span className="text-sm text-muted-foreground">
      {minutes}m {remainingSeconds}s
    </span>
  );
}

// ── Table ────────────────────────────────────────────────────────────

interface BatchesTableProps {
  batches: Batch[];
  isLoading?: boolean;
}

export function BatchesTable({ batches, isLoading }: BatchesTableProps) {
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sorting, setSorting] = useState([{ id: "startedAt", desc: true }]);

  const columns: ColumnDef<Batch>[] = [
    {
      accessorKey: "name",
      header: "Operation",
      cell: ({ row }) => <OperationCell batch={row.original} />,
    },
    {
      accessorKey: "startedAt",
      header: "When",
      cell: ({ row }) => (
        <TimeAgo date={row.getValue("startedAt") as string} />
      ),
    },
    {
      accessorKey: "status",
      header: "Result",
      cell: ({ row }) => (
        <StatusBadge status={row.getValue("status") as string} />
      ),
    },
    {
      id: "items",
      header: "Items",
      cell: ({ row }) => <ItemsCell batch={row.original} />,
    },
    {
      id: "duration",
      header: "Duration",
      cell: ({ row }) => (
        <DurationCell
          started={new Date(row.original.startedAt)}
          finished={
            row.original.finishedAt
              ? new Date(row.original.finishedAt)
              : null
          }
        />
      ),
    },
  ];

  const table = useReactTable({
    data: batches,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const openDetail = (batch: Batch) => {
    setSelectedBatch(batch);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 sm:h-64 w-full" />
      </div>
    );
  }

  const rows = table.getRowModel().rows;

  return (
    <>
      <div className="space-y-3 sm:space-y-4">
        {/* Mobile: card list */}
        <div className="sm:hidden space-y-1.5">
          {rows.length ? (
            rows.map((row) => (
              <BatchCard
                key={row.id}
                batch={row.original}
                onClick={() => openDetail(row.original)}
              />
            ))
          ) : (
            <p className="text-center text-xs text-muted-foreground py-8">
              No batches found.
            </p>
          )}
        </div>

        {/* Desktop: table */}
        <div
          className="hidden sm:block rounded-md border overflow-auto"
          style={{ maxHeight: "600px" }}
        >
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="h-10">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openDetail(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No batches found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-xs sm:text-sm text-muted-foreground">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </p>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="hidden sm:flex h-8 w-[70px]">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 50, 100].map((pageSize) => (
                  <SelectItem key={pageSize} value={String(pageSize)}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Batch Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-full h-full max-w-full sm:w-[95vw] sm:max-w-4xl sm:h-[75vh] overflow-hidden flex flex-col p-3 sm:p-6">
          {selectedBatch && <BatchDetailContent batch={selectedBatch} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
