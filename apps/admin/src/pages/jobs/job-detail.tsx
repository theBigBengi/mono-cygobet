import { Fragment, useEffect, useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/table/status-badge";
import { useJobFromDb, useJobRunsForJob, useRun, useRunItems } from "@/hooks/use-jobs";
import { useBookmakersFromProvider } from "@/hooks/use-bookmakers";
import { useMarketsFromProvider } from "@/hooks/use-markets";
import { jobsService } from "@/services/jobs.service";
import type { AdminJobDetailResponse } from "@repo/types";
import type { MultiSelectOption } from "@/components/filters/multi-select-combobox";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import {
  formatDateTime,
  formatRelativeTime,
  formatDurationMs,
  formatRunSummary,
  jobNameFromKey,
  getRunReason,
  titleCaseWords,
  truncate,
  camelToHuman,
} from "./jobs.utils";
import { JobConfigForm } from "./job-config-form";
import { HeaderActions } from "@/contexts/header-actions";
import { useAlerts } from "@/hooks/use-dashboard";

export default function JobDetailPage() {
  const { jobKey } = useParams<{ jobKey: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [cursorStack, setCursorStack] = useState<Array<number | null>>([null]);
  const cursor = cursorStack[cursorStack.length - 1] ?? null;

  // Run detail sheet
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);

  const selectedRunQuery = useRun(selectedRunId);
  const selectedRun = selectedRunQuery.data?.data ?? null;

  const jobQuery = useJobFromDb(jobKey ?? null);
  const job = jobQuery.data?.data ?? null;

  const runsQuery = useJobRunsForJob(jobKey ?? null, {
    limit: 50,
    cursor: cursor ?? undefined,
  });
  const runs = runsQuery.data?.data ?? [];
  const nextCursor = runsQuery.data?.nextCursor ?? null;

  const { data: bookmakersProviderData } = useBookmakersFromProvider();
  const bookmakerOptions: MultiSelectOption[] = useMemo(() => {
    if (!bookmakersProviderData?.data) return [];
    const seen = new Set<string>();
    const out: MultiSelectOption[] = [];
    bookmakersProviderData.data.forEach((b) => {
      const id = String(b.externalId);
      const key = `${id}-${b.name}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ value: id, label: b.name });
    });
    return out.sort((a, b) => a.label.localeCompare(b.label));
  }, [bookmakersProviderData]);

  const { data: marketsProviderData } = useMarketsFromProvider();
  const marketOptions: MultiSelectOption[] = useMemo(() => {
    if (!marketsProviderData?.data) return [];
    return marketsProviderData.data
      .map((m) => ({ value: String(m.externalId), label: m.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [marketsProviderData]);

  const updateJobMutation = useMutation({
    mutationFn: async (vars: {
      jobKey: string;
      patch: {
        description?: string | null;
        enabled?: boolean;
        scheduleCron?: string | null;
        meta?: Record<string, unknown> | null;
      };
    }) => jobsService.updateJob(vars.jobKey, vars.patch),
    onSuccess: () => {
      toast.success("Job updated");
      queryClient.invalidateQueries({ queryKey: ["jobs", "db"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "db", jobKey] });
    },
    onError: (e: Error) => {
      toast.error("Update failed", { description: e.message });
    },
  });

  const runJobMutation = useMutation({
    mutationFn: () => jobsService.runJob(jobKey!, false),
    onSuccess: () => {
      toast.success("Job triggered");
      queryClient.invalidateQueries({ queryKey: ["job-runs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "db"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "db", jobKey] });
    },
    onError: (e: Error) => {
      toast.error("Job trigger failed", { description: e.message });
    },
  });

  // Alert context for this job
  const { data: alertsData } = useAlerts();
  const jobAlerts = useMemo(
    () =>
      alertsData?.data?.filter(
        (a) =>
          a.category === "job_failure" &&
          a.fingerprint === `job_failure:${jobKey}`
      ) ?? [],
    [alertsData, jobKey]
  );

  // Failure pattern: count consecutive failures from most recent runs
  const failurePattern = useMemo(() => {
    const lastRuns = job?.lastRuns ?? [];
    if (!lastRuns.length || lastRuns[0].status !== "failed") return null;
    let consecutive = 0;
    for (const run of lastRuns) {
      if (run.status === "failed") {
        consecutive++;
      } else {
        break;
      }
    }
    return {
      consecutiveFailures: consecutive,
      firstFailedAt: lastRuns[consecutive - 1]?.startedAt ?? null,
      lastFailedAt: lastRuns[0]?.startedAt ?? null,
      lastError: lastRuns[0]?.errorMessage ?? null,
    };
  }, [job]);

  const canGoPrev = cursorStack.length > 1;
  const canGoNext = runs.length === 50 && nextCursor != null;

  if (!jobKey) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Missing job key.</p>
        <Button variant="link" onClick={() => navigate("/jobs")}>
          Back to Jobs
        </Button>
      </div>
    );
  }

  if (jobQuery.isLoading || !job) {
    return (
      <div className="p-6">
        {jobQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading job…</p>
        ) : jobQuery.isError ? (
          <>
            <p className="text-sm text-destructive">Failed to load job.</p>
            <Button variant="link" onClick={() => navigate("/jobs")}>
              Back to Jobs
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Job not found.</p>
        )}
      </div>
    );
  }

  const jobForForm: AdminJobDetailResponse["data"] = job;

  const isAnyFetching = jobQuery.isFetching || runsQuery.isFetching;
  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
    queryClient.invalidateQueries({ queryKey: ["job-runs"] });
    queryClient.invalidateQueries({ queryKey: ["job-run"] });
    queryClient.invalidateQueries({ queryKey: ["run-items"] });
  };

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-6">
      <HeaderActions>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refreshAll} disabled={isAnyFetching}>
          <RefreshCw className={`h-4 w-4 ${isAnyFetching ? "animate-spin" : ""}`} />
        </Button>
      </HeaderActions>
      <div className="flex-shrink-0 pb-3 sm:pb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => navigate("/jobs")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-semibold truncate">
            {titleCaseWords(jobNameFromKey(job.key))}
          </h1>
          <p className="text-xs text-muted-foreground font-mono truncate">{job.key}</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 overflow-hidden">
        {/* Failure Pattern (shown when job is currently failing) */}
        {failurePattern && (
          <Card className="flex-shrink-0 border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
            <CardHeader className="px-3 py-2 sm:px-6 sm:pb-2">
              <CardTitle className="text-sm sm:text-base text-red-700 dark:text-red-400">
                Failure Pattern
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6 space-y-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {failurePattern.consecutiveFailures}
                  </span>{" "}
                  consecutive failure
                  {failurePattern.consecutiveFailures !== 1 ? "s" : ""}
                </span>
                {failurePattern.firstFailedAt && (
                  <span className="text-muted-foreground">
                    Since: {formatRelativeTime(failurePattern.firstFailedAt)}
                  </span>
                )}
              </div>
              {failurePattern.lastError && (
                <p className="text-xs text-muted-foreground font-mono bg-red-100/50 dark:bg-red-950/30 rounded px-2 py-1 truncate">
                  {failurePattern.lastError.slice(0, 200)}
                </p>
              )}
              {/* Alert context */}
              {jobAlerts.length > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  {jobAlerts.map((a) => (
                    <p key={a.id}>
                      Alert: {a.title} — {a.description}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="flex-shrink-0">
          <CardContent className="px-3 py-3 sm:p-6">
            <JobConfigForm
              job={jobForForm}
              bookmakerOptions={bookmakerOptions}
              marketOptions={marketOptions}
              onSave={async (patch) => {
                await updateJobMutation.mutateAsync({ jobKey: job.key, patch });
              }}
              onRunNow={() => runJobMutation.mutate()}
              isSavePending={updateJobMutation.isPending}
              isRunPending={runJobMutation.isPending}
            />
          </CardContent>
        </Card>

        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <CardHeader className="flex-shrink-0 px-3 py-3 sm:p-6">
            <CardTitle className="text-sm sm:text-base">Run History</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Mobile cards */}
            <div className="sm:hidden flex-1 min-h-0 divide-y border-t overflow-auto">
              {runs.map((r) => {
                const reason = getRunReason(r.meta);
                const summary = formatRunSummary(r.meta);
                return (
                  <div
                    key={r.id}
                    className="px-3 py-2 cursor-pointer active:bg-muted/70"
                    onClick={() => setSelectedRunId(r.id)}
                  >
                    {/* Row 1: Status badge + time + id */}
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.status} />
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {formatRelativeTime(r.startedAt)}
                      </span>
                      <span className="text-[11px] text-muted-foreground/50">·</span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {formatDurationMs(r.durationMs)}
                      </span>
                      <span
                        className="ml-auto text-[11px] font-mono text-muted-foreground/60 tabular-nums cursor-copy"
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(String(r.id)); toast.success("Copied ID"); }}
                      >#{r.id}</span>
                    </div>
                    {/* Row 2: Summary + reason (only if exists) */}
                    {(summary || reason) && (
                      <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
                        {summary}
                        {summary && reason && <span className="text-muted-foreground/30"> · </span>}
                        {reason && <span className="text-amber-600 dark:text-amber-400">{reason}</span>}
                      </div>
                    )}
                    {/* Row 3: Error (only if failed) */}
                    {r.errorMessage && (
                      <p className="mt-0.5 text-[11px] text-destructive truncate">
                        {truncate(r.errorMessage, 100)}
                      </p>
                    )}
                  </div>
                );
              })}
              {!runs.length && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No runs yet.
                </div>
              )}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:flex flex-1 min-h-0 flex-col overflow-auto border-t">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="hidden sm:table-cell">Summary</TableHead>
                    <TableHead className="hidden md:table-cell">Reason</TableHead>
                    <TableHead className="hidden sm:table-cell">Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((r) => (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedRunId(r.id);
                      }}
                    >
                      <TableCell
                        className="text-xs text-muted-foreground font-mono whitespace-nowrap hover:text-foreground cursor-copy"
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(String(r.id)); toast.success("Copied ID"); }}
                      >
                        #{r.id}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={r.status} />
                          {r.status === "success" &&
                            getRunReason(r.meta) && (
                              <span className="hidden sm:inline text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                                {getRunReason(r.meta)}
                              </span>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatRelativeTime(r.startedAt)}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDurationMs(r.durationMs)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs max-w-[280px] truncate">
                        {formatRunSummary(r.meta)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground whitespace-nowrap">
                        {r.status === "success" && getRunReason(r.meta)
                          ? getRunReason(r.meta)
                          : "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                        {r.errorMessage
                          ? `${r.errorMessage.slice(0, 80)}${r.errorMessage.length > 80 ? "…" : ""}`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!runs.length && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-sm text-muted-foreground py-8"
                      >
                        No runs yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex-shrink-0 flex items-center justify-between px-3 sm:px-4 py-3 border-t">
              <div className="text-xs text-muted-foreground">
                {runs.length} runs
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setCursorStack((s) => s.slice(0, -1))}
                  disabled={!canGoPrev}
                >
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    nextCursor != null &&
                    setCursorStack((s) => [...s, nextCursor])
                  }
                  disabled={!canGoNext}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Run Detail Sheet */}
      <Sheet
        open={selectedRunId != null}
        onOpenChange={(open) => {
          if (!open) setSelectedRunId(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:w-[540px] sm:max-w-[540px] p-0 overflow-hidden flex flex-col"
        >
          <SheetHeader className="px-4 pt-4 pb-2 flex-shrink-0 border-b">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-sm sm:text-base">
                Run #{selectedRunId}
              </SheetTitle>
              {selectedRun && <StatusBadge status={selectedRun.status} />}
            </div>
            <SheetDescription className="sr-only">Run details</SheetDescription>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col px-3 py-3 sm:p-4 gap-3">
            <RunDetailSheetContent
              key={selectedRunId}
              runId={selectedRunId}
              run={selectedRun}
              isLoading={selectedRunQuery.isLoading}
              isError={selectedRunQuery.isError}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ---------- Run Detail Sheet Content ---------- */

type RunItem = {
  id: number;
  itemKey: string | null;
  status: string;
  meta: Record<string, unknown>;
};

function RunDetailSheetContent({
  runId,
  run,
  isLoading,
  isError,
}: {
  runId: number | null;
  run: {
    id: number;
    jobKey: string;
    status: string;
    startedAt: string;
    finishedAt: string | null;
    durationMs: number | null;
    trigger: string;
    meta: Record<string, unknown>;
    errorMessage?: string | null;
    errorStack?: string | null;
  } | null;
  isLoading: boolean;
  isError: boolean;
}) {
  // All sheet-internal state – changes here do NOT re-render the parent page
  const [itemsPage, setItemsPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [localSearch, setLocalSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);

  // Debounce search: 300ms, min 3 chars
  useEffect(() => {
    const val = localSearch.trim();
    const next = val.length >= 3 ? val : "";
    const timer = setTimeout(() => {
      setDebouncedSearch((prev) => {
        if (prev === next) return prev;
        setItemsPage(1);
        return next;
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch]);

  const runItemsQuery = useRunItems(runId, {
    page: itemsPage,
    perPage: 50,
    status: statusFilter === "all" ? undefined : statusFilter,
    action: actionFilter === "all" ? undefined : actionFilter,
    search: debouncedSearch || undefined,
  });
  const items = runItemsQuery.data?.data ?? [];
  const itemsPagination = runItemsQuery.data?.pagination;
  const itemsLoading = runItemsQuery.isLoading;

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-4">Loading run...</p>;
  }
  if (isError || !run) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        {isError ? "Failed to load run." : "Run not found."}
      </p>
    );
  }

  const meta = (run.meta ?? {}) as Record<string, unknown>;
  const standardKeys = ["inserted", "updated", "skipped", "fail"];
  const hasStandard = standardKeys.some((k) => typeof meta[k] === "number");
  const inserted = typeof meta["inserted"] === "number" ? meta["inserted"] : null;
  const updated = typeof meta["updated"] === "number" ? meta["updated"] : null;
  const skipped = typeof meta["skipped"] === "number" ? meta["skipped"] : null;
  const failed = typeof meta["fail"] === "number" ? meta["fail"] : null;

  const excludeSummaryKeys = new Set(["batchId", "jobRunId", "environment", "reason"]);
  const dynamicSummaryEntries = hasStandard
    ? []
    : Object.entries(meta).filter(([key, value]) => {
        if (excludeSummaryKeys.has(key)) return false;
        return typeof value === "number" || typeof value === "string" || typeof value === "boolean";
      });

  function getActionLabel(item: RunItem): string {
    const m = (item.meta ?? {}) as Record<string, unknown>;
    const action = m["action"];
    if (typeof action === "string") return action;
    if (item.status === "success") return "success";
    if (item.status === "skipped") return "skipped";
    if (item.status === "failed") return "failed";
    return item.status;
  }

  function getChanges(item: RunItem): Record<string, string> | null {
    const m = (item.meta ?? {}) as Record<string, unknown>;
    const changes = m["changes"];
    if (changes && typeof changes === "object" && !Array.isArray(changes)) {
      return changes as Record<string, string>;
    }
    return null;
  }

  return (
    <>
      {/* Run info */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
        <div className="bg-muted/40 rounded-md px-2 py-1.5 sm:px-2.5">
          <div className="text-muted-foreground mb-0.5">Started</div>
          <div className="font-medium truncate">
            <span className="sm:hidden">{formatRelativeTime(run.startedAt)}</span>
            <span className="hidden sm:inline">{formatDateTime(run.startedAt)}</span>
          </div>
        </div>
        <div className="bg-muted/40 rounded-md px-2 py-1.5 sm:px-2.5">
          <div className="text-muted-foreground mb-0.5">Finished</div>
          <div className="font-medium truncate">
            <span className="sm:hidden">{formatRelativeTime(run.finishedAt)}</span>
            <span className="hidden sm:inline">{formatDateTime(run.finishedAt)}</span>
          </div>
        </div>
        <div className="bg-muted/40 rounded-md px-2 py-1.5 sm:px-2.5">
          <div className="text-muted-foreground mb-0.5">Duration</div>
          <div className="font-medium">{formatDurationMs(run.durationMs)}</div>
        </div>
        <div className="bg-muted/40 rounded-md px-2 py-1.5 sm:px-2.5">
          <div className="text-muted-foreground mb-0.5">Trigger</div>
          <div className="font-medium">{run.trigger}</div>
        </div>
      </div>

      {/* Summary */}
      {(hasStandard || dynamicSummaryEntries.length > 0) && (
        <div className="shrink-0 flex flex-wrap gap-2 text-[11px] sm:text-xs">
          {hasStandard ? (
            <>
              {inserted != null && (
                <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-md px-2.5 py-1">
                  <span className="font-semibold">{inserted}</span>
                  <span className="opacity-70">inserted</span>
                </div>
              )}
              {updated != null && (
                <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-md px-2.5 py-1">
                  <span className="font-semibold">{updated}</span>
                  <span className="opacity-70">updated</span>
                </div>
              )}
              {skipped != null && (
                <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 rounded-md px-2.5 py-1">
                  <span className="font-semibold">{skipped}</span>
                  <span className="opacity-70">skipped</span>
                </div>
              )}
              {failed != null && (
                <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-md px-2.5 py-1">
                  <span className="font-semibold">{failed}</span>
                  <span className="opacity-70">failed</span>
                </div>
              )}
            </>
          ) : (
            dynamicSummaryEntries.map(([key, value]) => (
              <div key={key} className="flex items-center gap-1.5 bg-muted/40 rounded-md px-2.5 py-1">
                <span className="font-semibold">
                  {typeof value === "boolean"
                    ? String(value)
                    : value == null
                      ? "—"
                      : typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value)}
                </span>
                <span className="text-muted-foreground">{camelToHuman(key)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Items */}
      <div className="border-t pt-2 sm:pt-3 flex-1 min-h-0 flex flex-col gap-1.5 sm:gap-2">
        <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search (min 3)..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="h-7 sm:h-8 text-xs pl-7"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setItemsPage(() => 1);
            }}
          >
            <SelectTrigger className="h-7 sm:h-8 text-xs w-[90px] sm:w-[110px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="success">success</SelectItem>
              <SelectItem value="failed">failed</SelectItem>
              <SelectItem value="skipped">skipped</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={actionFilter}
            onValueChange={(v) => {
              setActionFilter(v);
              setItemsPage(() => 1);
            }}
          >
            <SelectTrigger className="h-7 sm:h-8 text-xs w-[90px] sm:w-[110px]">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="inserted">inserted</SelectItem>
              <SelectItem value="updated">updated</SelectItem>
              <SelectItem value="skipped">skipped</SelectItem>
              <SelectItem value="failed">failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Mobile: compact list */}
        <div className="sm:hidden overflow-auto border rounded-md flex-1 min-h-0 divide-y">
          {items.map((item) => {
            const m = (item.meta ?? {}) as Record<string, unknown>;
            const name = typeof m["name"] === "string" ? m["name"] : item.itemKey;
            const reason = typeof m["reason"] === "string" ? (m["reason"] as string) : null;
            const changes = getChanges(item);
            const isExpanded = expandedItemId === item.id;
            return (
              <div
                key={item.id}
                className={changes ? "cursor-pointer active:bg-muted/50" : ""}
                onClick={() => {
                  if (changes) setExpandedItemId(isExpanded ? null : item.id);
                }}
              >
                <div className="flex items-center gap-1.5 px-2.5 py-2">
                  {changes && (
                    <ChevronRight className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  )}
                  <span className="flex-1 min-w-0 text-xs font-medium truncate">{name ?? "—"}</span>
                  <StatusBadge status={getActionLabel(item)} />
                </div>
                {reason && (
                  <div className="px-2.5 pb-1.5 -mt-0.5 text-[11px] text-muted-foreground truncate">
                    {reason}
                  </div>
                )}
                {isExpanded && changes && (
                  <div className="bg-muted/30 px-2.5 py-1.5 text-[11px] space-y-0.5">
                    {Object.entries(changes).map(([field, value]) => (
                      <div key={field} className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">{camelToHuman(field)}:</span>
                        <span className="font-mono">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {!items.length && (
            <div className="text-center text-xs text-muted-foreground py-6">
              {itemsLoading ? "Loading..." : localSearch.trim().length >= 3 ? "No matching items." : "No items for this run."}
            </div>
          )}
        </div>
        {/* Desktop: table */}
        <div className="hidden sm:block overflow-auto border rounded-md flex-1 min-h-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Entity</TableHead>
                <TableHead className="text-xs">Action</TableHead>
                <TableHead className="text-xs">Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const m = (item.meta ?? {}) as Record<string, unknown>;
                const name = typeof m["name"] === "string" ? m["name"] : item.itemKey;
                const reason = typeof m["reason"] === "string" ? (m["reason"] as string) : "—";
                const changes = getChanges(item);
                const isExpanded = expandedItemId === item.id;
                return (
                  <Fragment key={item.id}>
                    <TableRow
                      className={changes ? "cursor-pointer hover:bg-muted/50" : ""}
                      onClick={() => {
                        if (changes) setExpandedItemId(isExpanded ? null : item.id);
                      }}
                    >
                      <TableCell className="py-2 font-medium max-w-[200px] truncate text-xs">
                        <span className="flex items-center gap-1">
                          {changes && (
                            <ChevronRight className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          )}
                          {name ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 whitespace-nowrap">
                        <StatusBadge status={getActionLabel(item)} />
                      </TableCell>
                      <TableCell className="py-2 text-muted-foreground text-xs max-w-[180px] truncate">
                        {reason}
                      </TableCell>
                    </TableRow>
                    {isExpanded && changes && (
                      <TableRow key={`${item.id}-changes`}>
                        <TableCell colSpan={3} className="py-0 px-0">
                          <div className="bg-muted/30 px-3 py-2 text-[11px] space-y-0.5">
                            {Object.entries(changes).map(([field, value]) => (
                              <div key={field} className="flex items-center gap-1.5">
                                <span className="text-muted-foreground">{camelToHuman(field)}:</span>
                                <span className="font-mono">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
              {!items.length && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-xs text-muted-foreground py-6"
                  >
                    {itemsLoading ? "Loading..." : localSearch.trim().length >= 3 ? "No matching items." : "No items for this run."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {itemsPagination && itemsPagination.totalPages > 1 && (
          <div className="shrink-0 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {itemsPagination.page}/{itemsPagination.totalPages} ({itemsPagination.totalItems})
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="secondary"
                className="h-6 sm:h-7 px-2 text-[11px]"
                disabled={itemsPage <= 1}
                onClick={() => setItemsPage((p) => p - 1)}
              >
                Prev
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-6 sm:h-7 px-2 text-[11px]"
                disabled={itemsPage >= itemsPagination.totalPages}
                onClick={() => setItemsPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {run.status === "failed" && (
        <div className="shrink-0 border-t pt-2 sm:pt-3 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-destructive">Error</div>
            <Button
              size="sm"
              variant="secondary"
              className="h-6 px-2 text-[11px]"
              onClick={async () => {
                const text = [run.errorMessage ?? "", run.errorStack ?? ""]
                  .filter(Boolean)
                  .join("\n\n");
                try {
                  await navigator.clipboard.writeText(text);
                  toast.success("Copied error");
                } catch {
                  toast.error("Failed to copy");
                }
              }}
            >
              Copy
            </Button>
          </div>
          <pre className="text-xs whitespace-pre-wrap break-words min-w-0 bg-destructive/5 rounded p-2">
            {run.errorMessage ?? "—"}
          </pre>
          {run.errorStack ? (
            <details className="text-xs">
              <summary className="cursor-pointer font-medium">Stack trace</summary>
              <pre className="mt-1.5 whitespace-pre-wrap break-words rounded-md bg-muted p-2 overflow-auto max-h-40">
                {run.errorStack}
              </pre>
            </details>
          ) : null}
        </div>
      )}
    </>
  );
}
