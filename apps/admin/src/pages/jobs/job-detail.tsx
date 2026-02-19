import { useState, useMemo } from "react";
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
import { ArrowLeft } from "lucide-react";
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
import { useAlerts } from "@/hooks/use-dashboard";

export default function JobDetailPage() {
  const { jobKey } = useParams<{ jobKey: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [cursorStack, setCursorStack] = useState<Array<number | null>>([null]);
  const cursor = cursorStack[cursorStack.length - 1] ?? null;

  // Run detail sheet
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [itemsPage, setItemsPage] = useState(1);
  const [itemsStatusFilter, setItemsStatusFilter] = useState<string>("all");
  const [itemsActionFilter, setItemsActionFilter] = useState<string>("all");

  const selectedRunQuery = useRun(selectedRunId);
  const selectedRun = selectedRunQuery.data?.data ?? null;

  const runItemsQuery = useRunItems(selectedRunId, {
    page: itemsPage,
    perPage: 50,
    status: itemsStatusFilter === "all" ? undefined : itemsStatusFilter,
    action: itemsActionFilter === "all" ? undefined : itemsActionFilter,
  });
  const runItems = runItemsQuery.data?.data ?? [];
  const runItemsPagination = runItemsQuery.data?.pagination;

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

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-6">
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
                    className="px-3 py-3 space-y-1.5 cursor-pointer hover:bg-muted/50 active:bg-muted/70"
                    onClick={() => {
                      setSelectedRunId(r.id);
                      setItemsPage(1);
                      setItemsStatusFilter("all");
                      setItemsActionFilter("all");
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={r.status} />
                        {r.status === "success" && reason && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                            {reason}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(r.startedAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{formatDurationMs(r.durationMs)}</span>
                      <span className="truncate text-right max-w-[60%]">{summary}</span>
                    </div>
                    {r.errorMessage && (
                      <p className="text-xs text-destructive truncate">
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
                        setItemsPage(1);
                        setItemsStatusFilter("all");
                        setItemsActionFilter("all");
                      }}
                    >
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
                        colSpan={6}
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
          <div className="flex-1 min-h-0 overflow-auto p-4 space-y-3">
            <RunDetailSheetContent
              run={selectedRun}
              isLoading={selectedRunQuery.isLoading}
              isError={selectedRunQuery.isError}
              items={runItems}
              itemsLoading={runItemsQuery.isLoading}
              itemsPagination={runItemsPagination}
              itemsPage={itemsPage}
              setItemsPage={setItemsPage}
              itemsStatusFilter={itemsStatusFilter}
              setItemsStatusFilter={setItemsStatusFilter}
              itemsActionFilter={itemsActionFilter}
              setItemsActionFilter={setItemsActionFilter}
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
  itemKey: string;
  status: string;
  meta: Record<string, unknown>;
};

function RunDetailSheetContent({
  run,
  isLoading,
  isError,
  items,
  itemsLoading,
  itemsPagination,
  itemsPage,
  setItemsPage,
  itemsStatusFilter,
  setItemsStatusFilter,
  itemsActionFilter,
  setItemsActionFilter,
}: {
  run: {
    id: number;
    jobKey: string;
    status: string;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    trigger: string;
    meta: Record<string, unknown>;
    errorMessage?: string | null;
    errorStack?: string | null;
  } | null;
  isLoading: boolean;
  isError: boolean;
  items: RunItem[];
  itemsLoading: boolean;
  itemsPagination?: { page: number; totalPages: number; totalItems: number };
  itemsPage: number;
  setItemsPage: (fn: (p: number) => number) => void;
  itemsStatusFilter: string;
  setItemsStatusFilter: (v: string) => void;
  itemsActionFilter: string;
  setItemsActionFilter: (v: string) => void;
}) {
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

  function formatChanges(ch: unknown): string {
    if (ch == null || typeof ch !== "object") return "—";
    const obj = ch as Record<string, unknown>;
    const parts = Object.entries(obj).map(([k, v]) => `${k}: ${String(v ?? "—")}`);
    return parts.length ? parts.join(", ") : "—";
  }

  function getActionLabel(item: RunItem): string {
    const m = (item.meta ?? {}) as Record<string, unknown>;
    const action = m["action"];
    if (typeof action === "string") return action;
    if (item.status === "success") return "success";
    if (item.status === "skipped") return "skipped";
    if (item.status === "failed") return "failed";
    return item.status;
  }

  return (
    <>
      {/* Run info */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] sm:text-xs">
        <div>
          <div className="text-muted-foreground">Started</div>
          <div className="font-medium">
            <span className="sm:hidden">{formatRelativeTime(run.startedAt)}</span>
            <span className="hidden sm:inline">{formatDateTime(run.startedAt)}</span>
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Finished</div>
          <div className="font-medium">
            <span className="sm:hidden">{formatRelativeTime(run.finishedAt)}</span>
            <span className="hidden sm:inline">{formatDateTime(run.finishedAt)}</span>
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Duration</div>
          <div className="font-medium">{formatDurationMs(run.durationMs)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Trigger</div>
          <div className="font-medium">{run.trigger}</div>
        </div>
      </div>

      {/* Summary */}
      <div className="border-t pt-3">
        <div className="text-xs font-semibold mb-2">Summary</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5">
          {hasStandard ? (
            <>
              <div className="min-w-0 overflow-hidden">
                <div className="text-[11px] text-muted-foreground">Inserted</div>
                <div className="font-semibold text-xs">{inserted ?? "—"}</div>
              </div>
              <div className="min-w-0 overflow-hidden">
                <div className="text-[11px] text-muted-foreground">Updated</div>
                <div className="font-semibold text-xs">{updated ?? "—"}</div>
              </div>
              <div className="min-w-0 overflow-hidden">
                <div className="text-[11px] text-muted-foreground">Skipped</div>
                <div className="font-semibold text-xs">{skipped ?? "—"}</div>
              </div>
              <div className="min-w-0 overflow-hidden">
                <div className="text-[11px] text-muted-foreground">Failed</div>
                <div className="font-semibold text-xs">{failed ?? "—"}</div>
              </div>
            </>
          ) : (
            dynamicSummaryEntries.map(([key, value]) => (
              <div key={key} className="min-w-0 overflow-hidden">
                <div className="text-[11px] text-muted-foreground truncate">
                  {titleCaseWords(camelToHuman(key))}
                </div>
                <div className="font-semibold text-xs truncate">
                  {typeof value === "boolean"
                    ? String(value)
                    : value == null
                      ? "—"
                      : typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Items */}
      <div className="border-t pt-3 space-y-2">
        <div className="text-xs font-semibold">Items</div>
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={itemsStatusFilter}
            onValueChange={(v) => {
              setItemsStatusFilter(v);
              setItemsPage(() => 1);
            }}
          >
            <SelectTrigger className="h-8 text-xs">
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
            value={itemsActionFilter}
            onValueChange={(v) => {
              setItemsActionFilter(v);
              setItemsPage(() => 1);
            }}
          >
            <SelectTrigger className="h-8 text-xs">
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
        <div className="overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Entity</TableHead>
                <TableHead className="text-xs">Action</TableHead>
                <TableHead className="hidden sm:table-cell text-xs">Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const m = (item.meta ?? {}) as Record<string, unknown>;
                const name = typeof m["name"] === "string" ? m["name"] : item.itemKey;
                const reason = typeof m["reason"] === "string" ? (m["reason"] as string) : "—";
                return (
                  <TableRow key={item.id}>
                    <TableCell className="py-2 font-medium max-w-[140px] truncate text-xs">
                      {name ?? "—"}
                    </TableCell>
                    <TableCell className="py-2 whitespace-nowrap">
                      <StatusBadge status={getActionLabel(item)} />
                    </TableCell>
                    <TableCell className="py-2 hidden sm:table-cell text-muted-foreground text-xs max-w-[160px] truncate">
                      {reason}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!items.length && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-xs text-muted-foreground py-6"
                  >
                    {itemsLoading ? "Loading..." : "No items for this run."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {itemsPagination && itemsPagination.totalPages > 1 && (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {itemsPagination.page}/{itemsPagination.totalPages} ({itemsPagination.totalItems})
            </span>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                className="h-7 px-2 text-xs"
                disabled={itemsPage <= 1}
                onClick={() => setItemsPage((p) => p - 1)}
              >
                Prev
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 px-2 text-xs"
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
        <div className="border-t pt-3 space-y-2">
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
