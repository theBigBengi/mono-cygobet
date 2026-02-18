import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Clock, FileWarning, Scale, RefreshCw, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fixturesService } from "@/services/fixtures.service";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  AdminFixtureAttentionItem,
  FixtureIssueType,
} from "@repo/types";

const ISSUE_CONFIG: Record<
  FixtureIssueType,
  {
    icon: typeof AlertTriangle;
    label: string;
    color: string;
    badgeClass: string;
  }
> = {
  stuck: {
    icon: AlertTriangle,
    label: "Stuck LIVE",
    color: "text-red-600 dark:text-red-400",
    badgeClass:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900",
  },
  unsettled: {
    icon: Scale,
    label: "Unsettled",
    color: "text-amber-600 dark:text-amber-400",
    badgeClass:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900",
  },
  overdue: {
    icon: Clock,
    label: "Overdue NS",
    color: "text-orange-600 dark:text-orange-400",
    badgeClass:
      "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-900",
  },
  noScores: {
    icon: FileWarning,
    label: "No Scores",
    color: "text-yellow-600 dark:text-yellow-400",
    badgeClass:
      "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-400 dark:border-yellow-900",
  },
};

interface AttentionFixturesTableProps {
  data: AdminFixtureAttentionItem[];
  isLoading: boolean;
  onSync?: (externalId: string) => void;
  onResettle?: (fixtureId: number) => void;
  syncingIds?: Set<string>;
  resettlingIds?: Set<number>;
}

type SyncPreviewChange = {
  field: string;
  label: string;
  current: string | number | null;
  incoming: string | number | null;
};

type PendingAction =
  | { type: "sync"; fixture: AdminFixtureAttentionItem; preview: SyncPreviewChange[] }
  | { type: "resettle"; fixture: AdminFixtureAttentionItem };

export function AttentionFixturesTable({
  data,
  isLoading,
  onSync,
  onResettle,
  syncingIds,
  resettlingIds,
}: AttentionFixturesTableProps) {
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // ─── Background prefetch of provider previews for current page ───
  const previewCache = useRef<Map<string, SyncPreviewChange[]>>(new Map());
  const lastFetchedIds = useRef<string>("");

  useEffect(() => {
    if (!data.length) return;
    const externalIds = data.map((f) => Number(f.externalId));
    const cacheKey = externalIds.join(",");
    // Don't refetch if same set of IDs
    if (cacheKey === lastFetchedIds.current) return;
    lastFetchedIds.current = cacheKey;

    fixturesService
      .syncPreviewBatch(externalIds)
      .then((res) => {
        for (const [extId, changes] of Object.entries(res.data)) {
          previewCache.current.set(extId, changes);
        }
      })
      .catch(() => {
        // Silently fail — will fall back to single fetch on click
      });
  }, [data]);

  const handleSyncClick = useCallback((fixture: AdminFixtureAttentionItem) => {
    const cached = previewCache.current.get(fixture.externalId);
    // Use cached diff if available, otherwise open dialog without diff (no extra provider call)
    setPendingAction({ type: "sync", fixture, preview: cached ?? [] });
  }, []);

  const confirmAction = () => {
    if (!pendingAction) return;
    if (pendingAction.type === "sync" && onSync) {
      onSync(pendingAction.fixture.externalId);
    } else if (pendingAction.type === "resettle" && onResettle) {
      onResettle(pendingAction.fixture.id);
    }
    // Clear preview cache so it re-fetches after mutation invalidates the query
    previewCache.current.clear();
    lastFetchedIds.current = "";
    setPendingAction(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-green-100 p-3 dark:bg-green-950/30">
          <svg
            className="h-6 w-6 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <p className="mt-3 text-sm font-medium">All clear</p>
        <p className="text-xs text-muted-foreground">
          No fixtures need attention right now.
        </p>
      </div>
    );
  }

  const formatValue = (val: string | number | null) =>
    val == null ? "—" : String(val);

  return (
    <div>
      {/* Mobile: Card layout */}
      <div className="space-y-2 sm:hidden">
        {data.map((fixture) => {
          const config = ISSUE_CONFIG[fixture.issueType];
          const Icon = config.icon;
          const isSyncing = syncingIds?.has(fixture.externalId);
          const isResettling = resettlingIds?.has(fixture.id);

          return (
            <div key={fixture.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <Link
                  to={`/fixtures/${fixture.id}`}
                  className="text-sm font-medium hover:underline leading-tight flex-1 min-w-0"
                >
                  {fixture.name}
                </Link>
                <Badge variant="outline" className={`text-[10px] shrink-0 ${config.badgeClass}`}>
                  <Icon className="mr-1 h-3 w-3" />
                  {config.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <Badge variant="outline" className="text-[10px]">{fixture.state}</Badge>
                <span>{formatDistanceToNow(new Date(fixture.issueSince), { addSuffix: true })}</span>
                {fixture.league && <span>{fixture.league.name}</span>}
              </div>
              {fixture.groupCount > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {fixture.groupCount} group{fixture.groupCount !== 1 ? "s" : ""}, {fixture.predictionCount} pred.
                </p>
              )}
              <div className="flex items-center gap-1.5 pt-1">
                {onSync && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => handleSyncClick(fixture)}
                    disabled={isSyncing}
                  >
                    {isSyncing ? "Syncing..." : "Sync"}
                  </Button>
                )}
                {onResettle && fixture.issueType === "unsettled" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setPendingAction({ type: "resettle", fixture })}
                    disabled={isResettling}
                  >
                    {isResettling ? "Settling..." : "Re-settle"}
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs ml-auto" asChild>
                  <Link to={`/fixtures/${fixture.id}`}>View</Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: Table layout */}
      <div className="hidden sm:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Issue</TableHead>
              <TableHead>Fixture</TableHead>
              <TableHead className="hidden md:table-cell">State</TableHead>
              <TableHead className="hidden md:table-cell">Since</TableHead>
              <TableHead className="hidden lg:table-cell">Impact</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((fixture) => {
              const config = ISSUE_CONFIG[fixture.issueType];
              const Icon = config.icon;
              const isSyncing = syncingIds?.has(fixture.externalId);
              const isResettling = resettlingIds?.has(fixture.id);
    
              return (
                <TableRow key={fixture.id}>
                  <TableCell>
                    <Badge variant="outline" className={config.badgeClass}>
                      <Icon className="mr-1 h-3 w-3" />
                      {config.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/fixtures/${fixture.id}`}
                      className="font-medium hover:underline"
                    >
                      {fixture.name}
                    </Link>
                    {fixture.league && (
                      <p className="text-xs text-muted-foreground">
                        {fixture.league.name}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="text-xs">
                      {fixture.state}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(fixture.issueSince), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {fixture.groupCount > 0
                      ? `${fixture.groupCount} group${fixture.groupCount !== 1 ? "s" : ""}, ${fixture.predictionCount} pred.`
                      : "No groups"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onSync && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleSyncClick(fixture)}
                          disabled={isSyncing}
                        >
                          {isSyncing ? "Syncing..." : "Sync"}
                          </Button>
                      )}
                      {onResettle &&
                        fixture.issueType === "unsettled" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setPendingAction({ type: "resettle", fixture })}
                            disabled={isResettling}
                          >
                            {isResettling ? "Settling..." : "Re-settle"}
                          </Button>
                        )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        asChild
                      >
                        <Link to={`/fixtures/${fixture.id}`}>View</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation Dialog — opens only after data is ready */}
      {pendingAction && (() => {
        const f = pendingAction.fixture;
        const cfg = ISSUE_CONFIG[f.issueType];
        const IssueIcon = cfg.icon;
        const isSync = pendingAction.type === "sync";

        return (
          <Dialog open onOpenChange={(open) => !open && setPendingAction(null)}>
            <DialogContent className="max-w-[95vw] sm:max-w-lg p-0 gap-0 overflow-hidden">
              {/* Header */}
              <div className="px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
                <DialogHeader className="space-y-2">
                  <DialogTitle className="text-base">
                    {isSync ? "Sync Fixture" : "Re-settle Predictions"}
                  </DialogTitle>
                  <DialogDescription asChild>
                    <div className="space-y-1.5">
                      <p className="text-sm text-foreground font-medium leading-snug">{f.name}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{f.state}</Badge>
                        <Badge variant="outline" className={`text-[10px] ${cfg.badgeClass}`}>
                          <IssueIcon className="mr-1 h-3 w-3" />
                          {cfg.label}
                        </Badge>
                        {f.league && (
                          <span className="text-[11px] text-muted-foreground">{f.league.name}</span>
                        )}
                      </div>
                    </div>
                  </DialogDescription>
                </DialogHeader>
              </div>

              {/* Body */}
              <div className="border-t">
                {isSync ? (
                  <>
                    {pendingAction.preview.length === 0 && (
                      <div className="px-4 py-6 sm:px-5 text-center text-sm text-muted-foreground">
                        No changes — provider data matches the database.
                      </div>
                    )}
                    {pendingAction.preview.length > 0 && (
                      <div className="divide-y">
                        {/* Column headers — desktop only */}
                        <div className="hidden sm:grid grid-cols-[140px_1fr_20px_1fr] gap-1 px-5 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/40">
                          <span>Field</span>
                          <span>Current</span>
                          <span></span>
                          <span>After Sync</span>
                        </div>
                        {pendingAction.preview.map((change) => (
                          <div key={change.field} className="px-4 py-2.5 sm:px-5">
                            {/* Mobile: stacked */}
                            <div className="sm:hidden space-y-1">
                              <p className="text-[11px] font-medium text-muted-foreground">{change.label}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-red-600 dark:text-red-400 line-through">
                                  {formatValue(change.current)}
                                </span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-sm text-green-600 dark:text-green-400 font-semibold">
                                  {formatValue(change.incoming)}
                                </span>
                              </div>
                            </div>
                            {/* Desktop: row */}
                            <div className="hidden sm:grid grid-cols-[140px_1fr_20px_1fr] gap-1 items-center">
                              <span className="text-xs font-medium">{change.label}</span>
                              <span className="text-xs text-red-600 dark:text-red-400 truncate">
                                {formatValue(change.current)}
                              </span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-green-600 dark:text-green-400 font-semibold truncate">
                                {formatValue(change.incoming)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="px-4 py-3 sm:px-5 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg border bg-muted/30 p-2.5">
                        <p className="text-lg font-bold">{f.homeScore90 ?? "?"} - {f.awayScore90 ?? "?"}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Score</p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-2.5">
                        <p className="text-lg font-bold">{f.groupCount}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Groups</p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-2.5">
                        <p className="text-lg font-bold">{f.predictionCount}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Predictions</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      All {f.predictionCount} prediction{f.predictionCount !== 1 ? "s" : ""} will be
                      recalculated and settled based on the current score.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t px-4 py-3 sm:px-5 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPendingAction(null)}
                  className="flex-1 sm:flex-initial"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmAction}
                  className="flex-1 sm:flex-initial sm:ml-auto"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isSync
                    ? pendingAction.preview.length === 0
                      ? "Sync Anyway"
                      : "Sync Now"
                    : "Re-settle Now"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
