import { useMemo, useState, useDeferredValue, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MultiSelectCombobox,
  type MultiSelectOption,
} from "@/components/filters/multi-select-combobox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/table/status-badge";
import { CheckCircle2, XCircle } from "lucide-react";

import { useJobsFromDb, useJobRunsFromDb } from "@/hooks/use-jobs";
import { jobsService } from "@/services/jobs.service";
import { batchesService } from "@/services/batches.service";
import { useBookmakersFromProvider } from "@/hooks/use-bookmakers";
import { useMarketsFromProvider } from "@/hooks/use-markets";
import type { AdminJobRunsListResponse } from "@repo/types";
import type { AdminJobsListResponse } from "@repo/types";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import type {
  FinishedFixturesJobMeta,
  UpdatePrematchOddsJobMeta,
  UpcomingFixturesJobMeta,
} from "@repo/types";

const UPDATE_PREMATCH_ODDS_JOB_KEY = "update-prematch-odds" as const;
const UPCOMING_FIXTURES_JOB_KEY = "upsert-upcoming-fixtures" as const;
const FINISHED_FIXTURES_JOB_KEY = "finished-fixtures" as const;

type JobsTab = "runs" | "jobs";
type RunRow = AdminJobRunsListResponse["data"][0];
type JobRow = AdminJobsListResponse["data"][0];

type ScheduleState =
  | { mode: "disabled" }
  | { mode: "every_minutes"; intervalMinutes: number }
  | { mode: "every_hours"; intervalHours: number; minute: number }
  | { mode: "hourly"; minute: number }
  | { mode: "daily"; hour: number; minute: number }
  | { mode: "weekly"; dayOfWeek: number; hour: number; minute: number }
  | { mode: "custom"; raw: string };

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
}

function formatDurationMs(ms: number | null) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

function truncate(s: string, max = 120) {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function jobNameFromKey(key: string): string {
  // user-requested: show job name derived from key without "-" chars
  return key.replace(/-/g, " ");
}

function titleCaseWords(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => {
      const v = w.trim();
      if (!v) return "";
      return v[0]!.toUpperCase() + v.slice(1);
    })
    .filter(Boolean)
    .join(" ");
}

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) =>
      typeof x === "string" || typeof x === "number" ? String(x) : ""
    )
    .filter(Boolean);
}

function parseScheduleCron(cronExpr: string | null): ScheduleState {
  const raw = (cronExpr ?? "").trim();
  if (!raw) return { mode: "disabled" };

  // Only support 5-field patterns for "friendly" parsing.
  const parts = raw.split(/\s+/);
  if (parts.length !== 5) return { mode: "custom", raw };

  // M */N * * *  (every N hours at minute M)
  {
    const m = raw.match(/^(\d+)\s+\*\/(\d+)\s+\*\s+\*\s+\*$/);
    if (m) {
      const minute = clampInt(Number(m[1]), 0, 59);
      const intervalHours = clampInt(Number(m[2]), 1, 23);
      if (intervalHours === 1) {
        return { mode: "hourly", minute };
      }
      return { mode: "every_hours", minute, intervalHours };
    }
  }

  // */N * * * *
  {
    const m = raw.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/);
    if (m) {
      return {
        mode: "every_minutes",
        intervalMinutes: clampInt(Number(m[1]), 1, 59),
      };
    }
  }

  // M * * * *
  {
    const m = raw.match(/^(\d+)\s+\*\s+\*\s+\*\s+\*$/);
    if (m) {
      return { mode: "hourly", minute: clampInt(Number(m[1]), 0, 59) };
    }
  }

  // M H * * *
  {
    const m = raw.match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+\*$/);
    if (m) {
      return {
        mode: "daily",
        minute: clampInt(Number(m[1]), 0, 59),
        hour: clampInt(Number(m[2]), 0, 23),
      };
    }
  }

  // M H * * DOW
  {
    const m = raw.match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+(\d+)$/);
    if (m) {
      return {
        mode: "weekly",
        minute: clampInt(Number(m[1]), 0, 59),
        hour: clampInt(Number(m[2]), 0, 23),
        dayOfWeek: clampInt(Number(m[3]), 0, 6),
      };
    }
  }

  return { mode: "custom", raw };
}

function buildCronFromSchedule(schedule: ScheduleState): string | null {
  switch (schedule.mode) {
    case "disabled":
      return null;
    case "every_minutes":
      return `*/${clampInt(schedule.intervalMinutes, 1, 59)} * * * *`;
    case "every_hours":
      return `${clampInt(schedule.minute, 0, 59)} */${clampInt(
        schedule.intervalHours,
        1,
        23
      )} * * *`;
    case "hourly":
      return `${clampInt(schedule.minute, 0, 59)} * * * *`;
    case "daily":
      return `${clampInt(schedule.minute, 0, 59)} ${clampInt(schedule.hour, 0, 23)} * * *`;
    case "weekly":
      return `${clampInt(schedule.minute, 0, 59)} ${clampInt(schedule.hour, 0, 23)} * * ${clampInt(schedule.dayOfWeek, 0, 6)}`;
    case "custom": {
      const raw = schedule.raw.trim();
      return raw ? raw : null;
    }
    default: {
      const _exhaustive: never = schedule;
      return _exhaustive;
    }
  }
}

function formatScheduleHuman(scheduleCron: string | null): string {
  const s = parseScheduleCron(scheduleCron);
  switch (s.mode) {
    case "disabled":
      return "Disabled";
    case "every_minutes":
      return `Every ${s.intervalMinutes} minute${s.intervalMinutes === 1 ? "" : "s"}`;
    case "every_hours":
      return `Every ${s.intervalHours} hour${s.intervalHours === 1 ? "" : "s"} at :${String(
        clampInt(s.minute, 0, 59)
      ).padStart(2, "0")}`;
    case "hourly":
      return `Hourly at :${String(clampInt(s.minute, 0, 59)).padStart(2, "0")}`;
    case "daily":
      return `Daily ${String(clampInt(s.hour, 0, 23)).padStart(2, "0")}:${String(
        clampInt(s.minute, 0, 59)
      ).padStart(2, "0")}`;
    case "weekly": {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
      const dow = clampInt(s.dayOfWeek, 0, 6);
      return `Weekly ${days[dow]} ${String(clampInt(s.hour, 0, 23)).padStart(
        2,
        "0"
      )}:${String(clampInt(s.minute, 0, 59)).padStart(2, "0")}`;
    }
    case "custom":
      return "Custom";
    default: {
      const _exhaustive: never = s;
      return _exhaustive;
    }
  }
}

export default function JobsPage() {
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<JobsTab>("runs");
  const [runAllResult, setRunAllResult] = useState<{
    timestamp: string;
    triggeredCount: number;
    ok: number;
    fail: number;
  } | null>(null);

  // Runs filters
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const deferredSearch = useDeferredValue(search);

  // Cursor pagination
  const [pageSize, setPageSize] = useState<number>(50);
  const [cursorStack, setCursorStack] = useState<Array<number | null>>([null]); // stack of cursors (null = first page)
  const cursor = cursorStack[cursorStack.length - 1] ?? null;

  const jobsQuery = useJobsFromDb();
  const runsQuery = useJobRunsFromDb({
    limit: pageSize,
    cursor,
    jobId: jobFilter === "all" ? undefined : jobFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    search: deferredSearch.trim() || undefined,
  });

  useEffect(() => {
    setCursorStack([null]);
  }, [deferredSearch]);

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

  const jobs = useMemo(() => jobsQuery.data?.data ?? [], [jobsQuery.data]);
  const runs = useMemo(() => runsQuery.data?.data ?? [], [runsQuery.data]);

  const jobOptions = useMemo(() => {
    const keys = jobs.map((j) => j.key);
    return keys;
  }, [jobs]);

  const summary = useMemo(() => {
    const serverSummary = runsQuery.data?.summary;
    return {
      totalJobs: jobs.length,
      runningCount: serverSummary?.running ?? 0,
      failedCount: serverSummary?.failed ?? 0,
      successCount: serverSummary?.success ?? 0,
    };
  }, [jobs.length, runsQuery.data?.summary]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["jobs", "db"] }),
      queryClient.invalidateQueries({ queryKey: ["job-runs"] }),
    ]);
  };

  const runAllMutation = useMutation({
    mutationFn: async () => jobsService.runAll(false),
    onSuccess: (res) => {
      setRunAllResult({
        timestamp: new Date().toLocaleString(),
        triggeredCount: res.data.triggeredCount,
        ok: res.data.ok,
        fail: res.data.fail,
      });
      toast.success("Run All triggered", {
        description: `Triggered ${res.data.triggeredCount} jobs (ok: ${res.data.ok}, fail: ${res.data.fail})`,
      });
      queryClient.invalidateQueries({ queryKey: ["jobs", "db"] });
      queryClient.invalidateQueries({ queryKey: ["job-runs"] });
    },
    onError: (e: Error) => {
      toast.error("Run All failed", { description: e.message });
    },
  });

  const runJobMutation = useMutation({
    mutationFn: async (vars: { jobKey: string }) =>
      jobsService.runJob(vars.jobKey, false),
    onSuccess: (_res, vars) => {
      toast.success("Job triggered", { description: vars.jobKey });
      queryClient.invalidateQueries({ queryKey: ["job-runs"] });
    },
    onError: (e: Error) => {
      toast.error("Job trigger failed", { description: e.message });
    },
  });

  const [selectedRun, setSelectedRun] = useState<RunRow | null>(null);
  const [runDrawerOpen, setRunDrawerOpen] = useState(false);
  const [inspectBatchOpen, setInspectBatchOpen] = useState(false);
  const [jobDrawerOpen, setJobDrawerOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobRow | null>(null);
  const [jobForm, setJobForm] = useState<{
    description: string;
    enabled: boolean;
    schedule: ScheduleState;
    oddsBookmakerExternalIds: string[];
    oddsMarketExternalIds: string[];
    upcomingDaysAhead: number;
    prematchDaysAhead: number;
    finishedMaxLiveAgeHours: number;
  } | null>(null);

  const selectedRunMeta = useMemo(() => {
    return (selectedRun?.meta ?? {}) as Record<string, unknown>;
  }, [selectedRun]);

  const selectedRunBatchId = useMemo((): number | null => {
    const v = selectedRunMeta["batchId"];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
    return null;
  }, [selectedRunMeta]);

  const batchItemsQuery = useQuery({
    queryKey: ["batch-items", selectedRunBatchId],
    queryFn: () => batchesService.getBatchItems(selectedRunBatchId!, 1, 100),
    enabled: inspectBatchOpen && selectedRunBatchId !== null,
    staleTime: 15000,
  });

  const openRun = (r: RunRow) => {
    setSelectedRun(r);
    setInspectBatchOpen(false);
    setRunDrawerOpen(true);
  };

  const openJob = (j: JobRow) => {
    const oddsMeta = (j.meta ?? {}) as Record<string, unknown>;
    const odds = (oddsMeta["odds"] ?? {}) as Record<string, unknown>;
    const upcomingMeta = (j.meta ?? {}) as Record<string, unknown>;
    const upcomingDaysAhead =
      j.key === UPCOMING_FIXTURES_JOB_KEY &&
      typeof upcomingMeta["daysAhead"] === "number" &&
      Number.isFinite(upcomingMeta["daysAhead"])
        ? Math.max(1, Math.trunc(upcomingMeta["daysAhead"] as number))
        : 3;
    const prematchDaysAhead =
      j.key === UPDATE_PREMATCH_ODDS_JOB_KEY &&
      typeof oddsMeta["daysAhead"] === "number" &&
      Number.isFinite(oddsMeta["daysAhead"])
        ? Math.max(1, Math.trunc(oddsMeta["daysAhead"] as number))
        : 7;
    const finishedMaxLiveAgeHours =
      j.key === FINISHED_FIXTURES_JOB_KEY &&
      typeof oddsMeta["maxLiveAgeHours"] === "number" &&
      Number.isFinite(oddsMeta["maxLiveAgeHours"])
        ? Math.max(1, Math.trunc(oddsMeta["maxLiveAgeHours"] as number))
        : 2;
    const defaultOddsBookmakers =
      j.key === "update-prematch-odds" ? (["2"] as string[]) : [];
    const defaultOddsMarkets =
      j.key === "update-prematch-odds" ? (["1", "57"] as string[]) : [];
    setSelectedJob(j);
    setJobForm({
      description: j.description ?? "",
      enabled: !!j.enabled,
      schedule: parseScheduleCron(j.scheduleCron),
      oddsBookmakerExternalIds: (() => {
        const v = asStringArray(odds["bookmakerExternalIds"]);
        return v.length ? v : defaultOddsBookmakers;
      })(),
      oddsMarketExternalIds: (() => {
        const v = asStringArray(odds["marketExternalIds"]);
        return v.length ? v : defaultOddsMarkets;
      })(),
      upcomingDaysAhead,
      prematchDaysAhead,
      finishedMaxLiveAgeHours,
    });
    setJobDrawerOpen(true);
  };

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
      setJobDrawerOpen(false);
    },
    onError: (e: Error) => {
      toast.error("Update failed", { description: e.message });
    },
  });

  const canGoPrev = cursorStack.length > 1;
  const canGoNext = runs.length === pageSize && !!runsQuery.data?.nextCursor;

  const goPrev = () => {
    if (!canGoPrev) return;
    setCursorStack((s) => s.slice(0, -1));
  };

  const goNext = () => {
    if (!runsQuery.data?.nextCursor) return;
    setCursorStack((s) => [...s, runsQuery.data?.nextCursor ?? null]);
  };

  const onChangePageSize = (v: string) => {
    const next = Number(v);
    setPageSize(next);
    setCursorStack([null]);
  };

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) =>
      (a.description ?? a.key).localeCompare(b.description ?? b.key)
    );
  }, [jobs]);

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-6">
      {/* Header row */}
      <div className="flex-shrink-0 mb-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Jobs</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={refresh}
            disabled={jobsQuery.isFetching || runsQuery.isFetching}
          >
            Refresh
          </Button>
          <Button
            onClick={() => runAllMutation.mutate()}
            disabled={runAllMutation.isPending}
          >
            Run All
          </Button>
        </div>
      </div>

      {/* Tabs + content (fills remaining height) */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as JobsTab)}
        className="flex flex-col flex-1 min-h-0 overflow-hidden"
      >
        <div className="flex-shrink-0 space-y-3">
          <TabsList>
            <TabsTrigger value="runs">Job Runs</TabsTrigger>
            <TabsTrigger value="jobs">Jobs Catalog</TabsTrigger>
          </TabsList>

          {/* Summary strip */}
          <Card>
            <CardContent className="py-3">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                <span className="text-muted-foreground">
                  Total jobs:{" "}
                  <span className="text-foreground">{summary.totalJobs}</span>
                </span>
                <span className="text-muted-foreground">
                  Running:{" "}
                  <span className="text-foreground">
                    {summary.runningCount}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Failed runs:{" "}
                  <span className="text-foreground">{summary.failedCount}</span>
                </span>
                <span className="text-muted-foreground">
                  Success runs:{" "}
                  <span className="text-foreground">
                    {summary.successCount}
                  </span>
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Run-all result panel */}
          {runAllResult && (
            <Card>
              <CardContent className="py-3">
                <div className="text-sm font-medium">Run All result</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {runAllResult.timestamp} — triggered{" "}
                  {runAllResult.triggeredCount} jobs (ok: {runAllResult.ok},
                  fail: {runAllResult.fail})
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <TabsContent
          value="jobs"
          className="flex-1 min-h-0 overflow-hidden mt-4"
        >
          <Card className="flex flex-col h-full min-h-0 overflow-hidden border-0 shadow-none">
            <CardContent className="p-0 flex flex-col flex-1 min-h-0">
              <div className="flex-1 min-h-0 overflow-auto">
                {!sortedJobs.length ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No jobs found.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {sortedJobs.map((j) => {
                      const isRowPending =
                        runJobMutation.isPending &&
                        runJobMutation.variables?.jobKey === j.key;

                      return (
                        <Card
                          key={j.key}
                          className="cursor-default hover:bg-muted/50 transition-colors"
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <CardTitle className="text-sm truncate">
                                  {titleCaseWords(jobNameFromKey(j.key))}
                                </CardTitle>
                                <CardDescription className="mt-1 font-mono text-[11px] truncate">
                                  {j.key}
                                </CardDescription>
                              </div>
                              <div className="flex-shrink-0 pt-0.5">
                                {j.enabled ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              <div>
                                <div className="text-[11px] text-muted-foreground">
                                  Schedule
                                </div>
                                <div className="mt-1 text-xs">
                                  {formatScheduleHuman(j.scheduleCron ?? null)}
                                </div>
                                <div className="mt-0.5 font-mono text-[11px] text-muted-foreground truncate">
                                  {j.scheduleCron ?? "—"}
                                </div>
                              </div>

                              <div>
                                <div className="text-[11px] text-muted-foreground">
                                  Last run
                                </div>
                                <div className="mt-1 flex items-center justify-between gap-2">
                                  <div className="whitespace-nowrap">
                                    {j.lastRun ? (
                                      <StatusBadge status={j.lastRun.status} />
                                    ) : (
                                      "—"
                                    )}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                                    {formatDateTime(
                                      j.lastRun?.startedAt ?? null
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>

                          <CardFooter className="justify-end">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openJob(j);
                                }}
                              >
                                Details
                              </Button>
                              <Button
                                size="sm"
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  runJobMutation.mutate({ jobKey: j.key });
                                }}
                                disabled={!j.runnable || isRowPending}
                              >
                                {isRowPending ? "Running…" : "Run"}
                              </Button>
                            </div>
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="runs"
          className="flex-1 min-h-0 overflow-hidden mt-4"
        >
          <div className="flex flex-col h-full min-h-0 overflow-hidden">
            {/* Filters row */}
            <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2 sm:items-center mb-3">
              <Select
                value={jobFilter}
                onValueChange={(v) => {
                  setJobFilter(v);
                  setCursorStack([null]);
                }}
              >
                <SelectTrigger className="sm:w-[260px]">
                  <SelectValue placeholder="Job" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All jobs</SelectItem>
                  {jobOptions.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setCursorStack([null]);
                }}
              >
                <SelectTrigger className="sm:w-[220px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="success">success</SelectItem>
                  <SelectItem value="failed">failed</SelectItem>
                  <SelectItem value="running">running</SelectItem>
                </SelectContent>
              </Select>

              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search job / run id / batch id"
                className="sm:max-w-[320px]"
              />

              <div className="flex items-center gap-2 sm:ml-auto">
                <Select
                  value={String(pageSize)}
                  onValueChange={onChangePageSize}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <CardContent className="p-0 flex flex-col flex-1 min-h-0">
                <div className="flex-1 min-h-0 overflow-auto border-t">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Run ID</TableHead>
                        <TableHead>Job</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Env</TableHead>
                        <TableHead>StartedAt</TableHead>
                        <TableHead>FinishedAt</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runs.map((r) => (
                        <TableRow
                          key={r.id}
                          className="cursor-pointer"
                          onClick={() => openRun(r)}
                        >
                          <TableCell className="font-mono text-xs whitespace-nowrap">
                            {r.id}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap max-w-[520px]">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="truncate">
                                {jobNameFromKey(r.jobKey)}
                              </span>
                              <span className="font-mono text-xs text-muted-foreground truncate">
                                {r.jobKey}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <StatusBadge status={r.status} />
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {(() => {
                              const meta = (r.meta ?? {}) as Record<string, unknown>;
                              const env = meta["environment"];
                              return env === "PRODUCTION" || env === "DEVELOPMENT"
                                ? env
                                : "—";
                            })()}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {formatDateTime(r.startedAt)}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {formatDateTime(r.finishedAt)}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {formatDurationMs(r.durationMs)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {r.errorMessage
                              ? truncate(r.errorMessage, 120)
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!runs.length && (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center text-sm text-muted-foreground py-8"
                          >
                            No runs found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination (sticks to bottom of the card) */}
                <div className="flex-shrink-0 px-4 py-3 border-t flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Showing {runs.length} runs
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={goPrev}
                      disabled={!canGoPrev}
                    >
                      Prev
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={goNext}
                      disabled={!canGoNext}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Run drawer (right panel) */}
      <Sheet
        open={runDrawerOpen}
        onOpenChange={(open) => {
          setRunDrawerOpen(open);
          if (!open) setInspectBatchOpen(false);
        }}
      >
        <SheetContent
          hideClose
          side="right"
          className="sm:max-w-xl p-0 flex flex-col h-full min-h-0"
        >
          {selectedRun ? (
            <>
              <div className="p-6 pb-4">
                <SheetHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <SheetTitle className="truncate">
                        {jobNameFromKey(selectedRun.jobKey)}
                      </SheetTitle>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Run{" "}
                        <span className="font-mono text-foreground">
                          #{selectedRun.id}
                        </span>{" "}
                        • Job{" "}
                        <span className="font-mono text-foreground">
                          {selectedRun.jobKey}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={selectedRun.status} />
                  </div>

                  {selectedRun.job?.description ? (
                    <SheetDescription className="mt-2">
                      {selectedRun.job.description}
                    </SheetDescription>
                  ) : null}
                </SheetHeader>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="text-muted-foreground">
                    Started
                    <div className="text-foreground">
                      {formatDateTime(selectedRun.startedAt)}
                    </div>
                  </div>
                  <div className="text-muted-foreground">
                    Finished
                    <div className="text-foreground">
                      {formatDateTime(selectedRun.finishedAt)}
                    </div>
                  </div>
                  <div className="text-muted-foreground">
                    Duration
                    <div className="text-foreground">
                      {formatDurationMs(selectedRun.durationMs)}
                    </div>
                  </div>
                  <div className="text-muted-foreground">
                    Trigger
                    <div className="text-foreground font-mono">
                      {selectedRun.trigger}
                      {selectedRun.triggeredBy
                        ? ` • ${selectedRun.triggeredBy}`
                        : ""}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex-1 min-h-0 overflow-y-auto p-6 pt-4 space-y-4">
                {(() => {
                  const ok =
                    typeof selectedRunMeta["ok"] === "number"
                      ? (selectedRunMeta["ok"] as number)
                      : 0;
                  const fail =
                    typeof selectedRunMeta["fail"] === "number"
                      ? (selectedRunMeta["fail"] as number)
                      : 0;
                  const total =
                    typeof selectedRunMeta["total"] === "number"
                      ? (selectedRunMeta["total"] as number)
                      : 0;

                  const inserted =
                    typeof selectedRunMeta["inserted"] === "number"
                      ? (selectedRunMeta["inserted"] as number)
                      : null;
                  const updated =
                    typeof selectedRunMeta["updated"] === "number"
                      ? (selectedRunMeta["updated"] as number)
                      : null;
                  const skipped =
                    typeof selectedRunMeta["skipped"] === "number"
                      ? (selectedRunMeta["skipped"] as number)
                      : null;
                  const duplicates =
                    typeof selectedRunMeta["duplicates"] === "number"
                      ? (selectedRunMeta["duplicates"] as number)
                      : null;

                  const hasWriteStats =
                    inserted !== null ||
                    updated !== null ||
                    skipped !== null ||
                    duplicates !== null;

                  const batchIdLabel =
                    selectedRunBatchId !== null
                      ? String(selectedRunBatchId)
                      : "—";

                  return (
                    <>
                      <div className="rounded-lg border p-4">
                        <div className="text-sm font-medium">Result</div>
                        <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                          <div className="text-muted-foreground">
                            OK
                            <div className="text-foreground font-medium">
                              {ok}
                            </div>
                          </div>
                          <div className="text-muted-foreground">
                            Fail
                            <div className="text-foreground font-medium">
                              {fail}
                            </div>
                          </div>
                          <div className="text-muted-foreground">
                            Total
                            <div className="text-foreground font-medium">
                              {total}
                            </div>
                          </div>
                        </div>

                        {hasWriteStats ? (
                          <div className="mt-3 grid grid-cols-4 gap-3 text-xs">
                            <div className="text-muted-foreground">
                              Inserted
                              <div className="text-foreground font-medium">
                                {inserted ?? "—"}
                              </div>
                            </div>
                            <div className="text-muted-foreground">
                              Updated
                              <div className="text-foreground font-medium">
                                {updated ?? "—"}
                              </div>
                            </div>
                            <div className="text-muted-foreground">
                              Skipped
                              <div className="text-foreground font-medium">
                                {skipped ?? "—"}
                              </div>
                            </div>
                            <div className="text-muted-foreground">
                              Duplicates
                              <div className="text-foreground font-medium">
                                {duplicates ?? "—"}
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <div>
                            batchId:{" "}
                            <span className="font-mono text-foreground">
                              {batchIdLabel}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={selectedRunBatchId === null}
                            onClick={() => setInspectBatchOpen((v) => !v)}
                          >
                            {inspectBatchOpen ? "Hide items" : "Inspect items"}
                          </Button>
                        </div>
                      </div>

                      {inspectBatchOpen && selectedRunBatchId !== null ? (
                        <div className="rounded-lg border p-4">
                          <div className="text-sm font-medium">
                            Batch items (first 100)
                          </div>
                          {batchItemsQuery.isLoading ? (
                            <div className="mt-2 text-xs text-muted-foreground">
                              Loading…
                            </div>
                          ) : batchItemsQuery.isError ? (
                            <div className="mt-2 text-xs text-destructive">
                              Failed to load batch items
                            </div>
                          ) : (
                            (() => {
                              const items = batchItemsQuery.data?.data ?? [];
                              const insertedItems = items.filter((it) => {
                                const m = (it.meta ?? {}) as Record<
                                  string,
                                  unknown
                                >;
                                return m["action"] === "insert";
                              });
                              const updatedItems = items.filter((it) => {
                                const m = (it.meta ?? {}) as Record<
                                  string,
                                  unknown
                                >;
                                return m["action"] === "update";
                              });
                              const successItems = items.filter(
                                (it) => it.status === "success"
                              );
                              const failedItems = items.filter(
                                (it) => it.status === "failed"
                              );
                              const skippedItems = items.filter(
                                (it) => it.status === "skipped"
                              );

                              const hasActionLabels =
                                insertedItems.length > 0 ||
                                updatedItems.length > 0;

                              const renderList = (
                                title: string,
                                list: typeof items
                              ) => (
                                <div className="mt-3">
                                  <div className="text-xs font-medium">
                                    {title} ({list.length})
                                  </div>
                                  {list.length ? (
                                    <div className="mt-2 space-y-1">
                                      {list.slice(0, 20).map((it) => {
                                        const m = (it.meta ?? {}) as Record<
                                          string,
                                          unknown
                                        >;
                                        const name =
                                          typeof m["name"] === "string"
                                            ? m["name"]
                                            : null;
                                        return (
                                          <div
                                            key={it.id}
                                            className="text-xs text-muted-foreground flex items-start justify-between gap-3"
                                          >
                                            <span className="font-mono text-foreground">
                                              {it.itemKey ?? "—"}
                                            </span>
                                            <span className="truncate">
                                              {name ?? ""}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      —
                                    </div>
                                  )}
                                </div>
                              );

                              return (
                                <>
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    {hasActionLabels ? (
                                      <>
                                        Showing items labeled as{" "}
                                        <span className="font-mono text-foreground">
                                          insert/update
                                        </span>
                                        .
                                      </>
                                    ) : (
                                      <>
                                        This batch doesn’t include{" "}
                                        <span className="font-mono text-foreground">
                                          action
                                        </span>{" "}
                                        labels yet — showing status-based items
                                        instead.
                                      </>
                                    )}
                                  </div>
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    total:{" "}
                                    <span className="font-mono text-foreground">
                                      {items.length}
                                    </span>
                                    {" • "}success:{" "}
                                    <span className="font-mono text-foreground">
                                      {successItems.length}
                                    </span>
                                    {" • "}failed:{" "}
                                    <span className="font-mono text-foreground">
                                      {failedItems.length}
                                    </span>
                                    {" • "}skipped:{" "}
                                    <span className="font-mono text-foreground">
                                      {skippedItems.length}
                                    </span>
                                  </div>

                                  {hasActionLabels ? (
                                    <>
                                      {renderList("Inserted", insertedItems)}
                                      {renderList("Updated", updatedItems)}
                                    </>
                                  ) : (
                                    <>
                                      {renderList("Success", successItems)}
                                      {renderList("Failed", failedItems)}
                                      {renderList("Skipped", skippedItems)}
                                    </>
                                  )}
                                </>
                              );
                            })()
                          )}
                        </div>
                      ) : null}
                    </>
                  );
                })()}

                {selectedRun.status === "failed" && (
                  <div className="rounded-lg border border-destructive/30 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-medium">Error</div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          const text = [
                            selectedRun.errorMessage ?? "",
                            selectedRun.errorStack ?? "",
                          ]
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
                    <div className="mt-2 text-xs text-foreground">
                      {selectedRun.errorMessage ?? "—"}
                    </div>
                    {selectedRun.errorStack ? (
                      <details className="mt-3 text-xs text-muted-foreground">
                        <summary className="cursor-pointer">
                          Stack trace
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-3 text-xs text-foreground">
                          {selectedRun.errorStack}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-6">
              <SheetHeader>
                <SheetTitle>Run</SheetTitle>
                <SheetDescription>
                  Select a run to view details.
                </SheetDescription>
              </SheetHeader>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Job drawer (right panel) */}
      <Sheet open={jobDrawerOpen} onOpenChange={setJobDrawerOpen}>
        <SheetContent
          hideClose
          side="right"
          className="sm:max-w-xl p-0 flex flex-col h-full min-h-0"
        >
          {selectedJob && jobForm ? (
            <>
              {/* Header */}
              <div className="p-6 pb-4">
                <SheetHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <SheetTitle className="truncate">
                        {titleCaseWords(jobNameFromKey(selectedJob.key))}
                      </SheetTitle>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Key{" "}
                        <span className="font-mono text-foreground">
                          {selectedJob.key}
                        </span>
                      </div>
                    </div>
                    <div className="mt-0.5 flex-shrink-0">
                      {jobForm.enabled ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  <VisuallyHidden>
                    <SheetDescription className="mt-2">
                      Configure job settings.
                    </SheetDescription>
                  </VisuallyHidden>
                </SheetHeader>

                <div className="mt-2 text-xs text-muted-foreground">
                  Cron preview:{" "}
                  <span className="font-mono text-foreground">
                    {buildCronFromSchedule(jobForm.schedule) ?? "—"}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Body */}
              <div className="flex-1 min-h-0 overflow-y-auto p-6 pt-4">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="job-description">Description</Label>
                    <Textarea
                      id="job-description"
                      value={jobForm.description}
                      onChange={(e) =>
                        setJobForm((prev) =>
                          prev ? { ...prev, description: e.target.value } : prev
                        )
                      }
                      placeholder="What does this job do?"
                      className="min-h-[96px]"
                    />
                  </div>

                  {selectedJob.key === "update-prematch-odds" && (
                    <>
                      <div>
                        <div className="text-sm font-medium">Job metadata</div>
                        <div className="text-xs text-muted-foreground">
                          Controls job-specific parameters. Bookmakers, markets
                          and days ahead.
                        </div>

                        <div className="mt-3 space-y-3 rounded-lg border p-4">
                          <div className="grid gap-2">
                            <Label className="text-xs text-muted-foreground">
                              Days ahead
                            </Label>
                            <Input
                              type="number"
                              min={1}
                              max={30}
                              value={jobForm.prematchDaysAhead}
                              onChange={(e) => {
                                const n = Math.trunc(Number(e.target.value));
                                setJobForm((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        prematchDaysAhead: Number.isFinite(n)
                                          ? Math.max(1, Math.min(30, n))
                                          : 1,
                                      }
                                    : prev
                                );
                              }}
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label className="text-xs text-muted-foreground">
                              Bookmakers (external IDs)
                            </Label>
                            <MultiSelectCombobox
                              options={bookmakerOptions}
                              selectedValues={jobForm.oddsBookmakerExternalIds}
                              onSelectionChange={(values) =>
                                setJobForm((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        oddsBookmakerExternalIds: values.map(
                                          (v) => String(v)
                                        ),
                                      }
                                    : prev
                                )
                              }
                              placeholder="Select bookmakers..."
                              searchPlaceholder="Search bookmakers..."
                              emptyMessage="No bookmakers found."
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label className="text-xs text-muted-foreground">
                              Markets (external IDs)
                            </Label>
                            <MultiSelectCombobox
                              options={marketOptions}
                              selectedValues={jobForm.oddsMarketExternalIds}
                              onSelectionChange={(values) =>
                                setJobForm((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        oddsMarketExternalIds: values.map((v) =>
                                          String(v)
                                        ),
                                      }
                                    : prev
                                )
                              }
                              placeholder="Select markets..."
                              searchPlaceholder="Search markets..."
                              emptyMessage="No markets found."
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {selectedJob.key === UPCOMING_FIXTURES_JOB_KEY && (
                    <div className="space-y-3 rounded-lg border p-4">
                      <div>
                        <div className="text-sm font-medium">
                          Upcoming fixtures parameters
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Controls how many days ahead we fetch NS fixtures.
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-xs text-muted-foreground">
                          Days ahead
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          value={jobForm.upcomingDaysAhead}
                          onChange={(e) => {
                            const n = Math.trunc(Number(e.target.value));
                            setJobForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    upcomingDaysAhead: Number.isFinite(n)
                                      ? Math.max(1, Math.min(30, n))
                                      : 1,
                                  }
                                : prev
                            );
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {selectedJob.key === FINISHED_FIXTURES_JOB_KEY && (
                    <div className="space-y-3 rounded-lg border p-4">
                      <div>
                        <div className="text-sm font-medium">
                          Finished fixtures parameters
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Re-check LIVE fixtures older than this threshold.
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-xs text-muted-foreground">
                          Max live age (hours)
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={168}
                          value={jobForm.finishedMaxLiveAgeHours}
                          onChange={(e) => {
                            const n = Math.trunc(Number(e.target.value));
                            setJobForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    finishedMaxLiveAgeHours: Number.isFinite(n)
                                      ? Math.max(1, Math.min(168, n))
                                      : 1,
                                  }
                                : prev
                            );
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Schedule</Label>

                    <Select
                      value={jobForm.schedule.mode}
                      onValueChange={(v) =>
                        setJobForm((prev) =>
                          prev
                            ? {
                                ...prev,
                                schedule:
                                  v === "disabled"
                                    ? { mode: "disabled" }
                                    : v === "every_minutes"
                                      ? {
                                          mode: "every_minutes",
                                          intervalMinutes: 5,
                                        }
                                      : v === "every_hours"
                                        ? {
                                            mode: "every_hours",
                                            intervalHours: 6,
                                            minute: 0,
                                          }
                                        : v === "hourly"
                                          ? { mode: "hourly", minute: 0 }
                                          : v === "daily"
                                            ? {
                                                mode: "daily",
                                                hour: 3,
                                                minute: 0,
                                              }
                                            : v === "weekly"
                                              ? {
                                                  mode: "weekly",
                                                  dayOfWeek: 1,
                                                  hour: 3,
                                                  minute: 0,
                                                }
                                              : { mode: "custom", raw: "" },
                              }
                            : prev
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disabled">
                          Disabled (manual only)
                        </SelectItem>
                        <SelectItem value="every_minutes">
                          Every N minutes
                        </SelectItem>
                        <SelectItem value="every_hours">
                          Every N hours
                        </SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="custom">Custom cron</SelectItem>
                      </SelectContent>
                    </Select>

                    {jobForm.schedule.mode === "every_minutes" && (
                      <div className="grid gap-2">
                        <Label
                          htmlFor="every-minutes"
                          className="text-xs text-muted-foreground"
                        >
                          Interval (minutes)
                        </Label>
                        <Select
                          value={String(jobForm.schedule.intervalMinutes)}
                          onValueChange={(v) =>
                            setJobForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    schedule: {
                                      mode: "every_minutes",
                                      intervalMinutes: clampInt(
                                        Number(v),
                                        1,
                                        59
                                      ),
                                    },
                                  }
                                : prev
                            )
                          }
                        >
                          <SelectTrigger id="every-minutes" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 5, 10, 15, 20, 30, 45, 60]
                              .filter((n) => n >= 1 && n <= 59)
                              .map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                  {n} minutes
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {jobForm.schedule.mode === "every_hours" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                          <Label
                            htmlFor="every-hours"
                            className="text-xs text-muted-foreground"
                          >
                            Interval (hours)
                          </Label>
                          <Select
                            value={String(jobForm.schedule.intervalHours)}
                            onValueChange={(v) =>
                              setJobForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      schedule: {
                                        mode: "every_hours",
                                        intervalHours: clampInt(
                                          Number(v),
                                          1,
                                          23
                                        ),
                                        minute:
                                          prev.schedule.mode === "every_hours"
                                            ? prev.schedule.minute
                                            : 0,
                                      },
                                    }
                                  : prev
                              )
                            }
                          >
                            <SelectTrigger id="every-hours" className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[2, 3, 4, 6, 8, 12].map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                  {n} hours
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <Label
                            htmlFor="every-hours-minute"
                            className="text-xs text-muted-foreground"
                          >
                            Minute within hour
                          </Label>
                          <Select
                            value={String(jobForm.schedule.minute)}
                            onValueChange={(v) =>
                              setJobForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      schedule: {
                                        mode: "every_hours",
                                        intervalHours:
                                          prev.schedule.mode === "every_hours"
                                            ? prev.schedule.intervalHours
                                            : 6,
                                        minute: clampInt(Number(v), 0, 59),
                                      },
                                    }
                                  : prev
                              )
                            }
                          >
                            <SelectTrigger
                              id="every-hours-minute"
                              className="w-full"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[0, 5, 10, 15, 20, 30, 45].map((m) => (
                                <SelectItem key={m} value={String(m)}>
                                  minute {m.toString().padStart(2, "0")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {jobForm.schedule.mode === "hourly" && (
                      <div className="grid gap-2">
                        <Label
                          htmlFor="hourly-minute"
                          className="text-xs text-muted-foreground"
                        >
                          Minute of hour
                        </Label>
                        <Select
                          value={String(jobForm.schedule.minute)}
                          onValueChange={(v) =>
                            setJobForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    schedule: {
                                      mode: "hourly",
                                      minute: clampInt(Number(v), 0, 59),
                                    },
                                  }
                                : prev
                            )
                          }
                        >
                          <SelectTrigger id="hourly-minute" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0, 5, 10, 15, 20, 30, 45].map((m) => (
                              <SelectItem key={m} value={String(m)}>
                                minute {m.toString().padStart(2, "0")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {jobForm.schedule.mode === "daily" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                          <Label className="text-xs text-muted-foreground">
                            Hour
                          </Label>
                          <Select
                            value={String(jobForm.schedule.hour)}
                            onValueChange={(v) =>
                              setJobForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      schedule: {
                                        mode: "daily",
                                        hour: clampInt(Number(v), 0, 23),
                                        minute:
                                          prev.schedule.mode === "daily"
                                            ? prev.schedule.minute
                                            : 0,
                                      },
                                    }
                                  : prev
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }).map((_, i) => (
                                <SelectItem key={i} value={String(i)}>
                                  {i.toString().padStart(2, "0")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-xs text-muted-foreground">
                            Minute
                          </Label>
                          <Select
                            value={String(jobForm.schedule.minute)}
                            onValueChange={(v) =>
                              setJobForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      schedule: {
                                        mode: "daily",
                                        hour:
                                          prev.schedule.mode === "daily"
                                            ? prev.schedule.hour
                                            : 0,
                                        minute: clampInt(Number(v), 0, 59),
                                      },
                                    }
                                  : prev
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[0, 5, 10, 15, 20, 30, 45].map((m) => (
                                <SelectItem key={m} value={String(m)}>
                                  {m.toString().padStart(2, "0")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {jobForm.schedule.mode === "weekly" && (
                      <div className="grid gap-3">
                        <div className="grid gap-2">
                          <Label className="text-xs text-muted-foreground">
                            Day of week
                          </Label>
                          <Select
                            value={String(jobForm.schedule.dayOfWeek)}
                            onValueChange={(v) =>
                              setJobForm((prev) =>
                                prev
                                  ? (() => {
                                      const base =
                                        prev.schedule.mode === "weekly"
                                          ? prev.schedule
                                          : {
                                              mode: "weekly" as const,
                                              dayOfWeek: 1,
                                              hour: 3,
                                              minute: 0,
                                            };
                                      return {
                                        ...prev,
                                        schedule: {
                                          ...base,
                                          dayOfWeek: clampInt(Number(v), 0, 6),
                                        },
                                      };
                                    })()
                                  : prev
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[
                                { v: 0, label: "Sunday" },
                                { v: 1, label: "Monday" },
                                { v: 2, label: "Tuesday" },
                                { v: 3, label: "Wednesday" },
                                { v: 4, label: "Thursday" },
                                { v: 5, label: "Friday" },
                                { v: 6, label: "Saturday" },
                              ].map((d) => (
                                <SelectItem key={d.v} value={String(d.v)}>
                                  {d.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="grid gap-2">
                            <Label className="text-xs text-muted-foreground">
                              Hour
                            </Label>
                            <Select
                              value={String(jobForm.schedule.hour)}
                              onValueChange={(v) =>
                                setJobForm((prev) =>
                                  prev
                                    ? (() => {
                                        const base =
                                          prev.schedule.mode === "weekly"
                                            ? prev.schedule
                                            : {
                                                mode: "weekly" as const,
                                                dayOfWeek: 1,
                                                hour: 3,
                                                minute: 0,
                                              };
                                        return {
                                          ...prev,
                                          schedule: {
                                            ...base,
                                            hour: clampInt(Number(v), 0, 23),
                                          },
                                        };
                                      })()
                                    : prev
                                )
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }).map((_, i) => (
                                  <SelectItem key={i} value={String(i)}>
                                    {i.toString().padStart(2, "0")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label className="text-xs text-muted-foreground">
                              Minute
                            </Label>
                            <Select
                              value={String(jobForm.schedule.minute)}
                              onValueChange={(v) =>
                                setJobForm((prev) =>
                                  prev
                                    ? (() => {
                                        const base =
                                          prev.schedule.mode === "weekly"
                                            ? prev.schedule
                                            : {
                                                mode: "weekly" as const,
                                                dayOfWeek: 1,
                                                hour: 3,
                                                minute: 0,
                                              };
                                        return {
                                          ...prev,
                                          schedule: {
                                            ...base,
                                            minute: clampInt(Number(v), 0, 59),
                                          },
                                        };
                                      })()
                                    : prev
                                )
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[0, 5, 10, 15, 20, 30, 45].map((m) => (
                                  <SelectItem key={m} value={String(m)}>
                                    {m.toString().padStart(2, "0")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}

                    {jobForm.schedule.mode === "custom" && (
                      <div className="grid gap-2">
                        <Label
                          htmlFor="cron-custom"
                          className="text-xs text-muted-foreground"
                        >
                          Cron expression (5 fields)
                        </Label>
                        <Input
                          id="cron-custom"
                          value={jobForm.schedule.raw}
                          onChange={(e) =>
                            setJobForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    schedule: {
                                      mode: "custom",
                                      raw: e.target.value,
                                    },
                                  }
                                : prev
                            )
                          }
                          placeholder="*/5 * * * *"
                          className="font-mono"
                        />
                      </div>
                    )}

                    {/* Cron preview is shown in the header; keep the form clean. */}
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <div className="text-sm font-medium">Enabled</div>
                      <div className="text-xs text-muted-foreground">
                        When disabled, it won’t run on schedule.
                      </div>
                    </div>
                    <Checkbox
                      id="job-enabled"
                      checked={jobForm.enabled}
                      onCheckedChange={(v) =>
                        setJobForm((prev) =>
                          prev ? { ...prev, enabled: v === true } : prev
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Sticky footer */}
              <div className="p-4 border-t bg-background flex items-center justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setJobDrawerOpen(false)}
                  disabled={updateJobMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const patch = {
                      description: jobForm.description.trim() || null,
                      enabled: jobForm.enabled,
                      scheduleCron: buildCronFromSchedule(jobForm.schedule),
                      ...(selectedJob.key === UPDATE_PREMATCH_ODDS_JOB_KEY
                        ? {
                            meta: {
                              daysAhead: jobForm.prematchDaysAhead,
                              odds: {
                                bookmakerExternalIds:
                                  jobForm.oddsBookmakerExternalIds
                                    .map((v) => Math.trunc(Number(v)))
                                    .filter((n) => Number.isFinite(n)),
                                marketExternalIds: jobForm.oddsMarketExternalIds
                                  .map((v) => Math.trunc(Number(v)))
                                  .filter((n) => Number.isFinite(n)),
                              },
                            } satisfies UpdatePrematchOddsJobMeta,
                          }
                        : {}),
                      ...(selectedJob.key === UPCOMING_FIXTURES_JOB_KEY
                        ? ({
                            meta: {
                              daysAhead: jobForm.upcomingDaysAhead,
                            } satisfies UpcomingFixturesJobMeta,
                          } as const)
                        : {}),
                      ...(selectedJob.key === FINISHED_FIXTURES_JOB_KEY
                        ? ({
                            meta: {
                              maxLiveAgeHours: jobForm.finishedMaxLiveAgeHours,
                            } satisfies FinishedFixturesJobMeta,
                          } as const)
                        : {}),
                    };
                    updateJobMutation.mutate({
                      jobKey: selectedJob.key,
                      patch,
                    });
                  }}
                  disabled={updateJobMutation.isPending}
                >
                  Save
                </Button>
              </div>
            </>
          ) : (
            <div className="p-6">
              <SheetHeader>
                <SheetTitle>Job</SheetTitle>
                <SheetDescription>
                  Select a job to edit settings.
                </SheetDescription>
              </SheetHeader>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
