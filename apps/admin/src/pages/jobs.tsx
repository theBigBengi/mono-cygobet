import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MultiSelectOption } from "@/components/filters/multi-select-combobox";

import { useJobsFromDb } from "@/hooks/use-jobs";
import { useBookmakersFromProvider } from "@/hooks/use-bookmakers";
import { useMarketsFromProvider } from "@/hooks/use-markets";
import { jobsService } from "@/services/jobs.service";
import type { AdminJobRunsListResponse, AdminJobsListResponse } from "@repo/types";
import type { JobsTab } from "./jobs/jobs.utils";

import { JobRunsTab } from "./jobs/job-runs-tab";
import { JobsCatalogTab } from "./jobs/jobs-catalog-tab";
import { RunDetailDrawer } from "./jobs/run-detail-drawer";
import { JobEditDrawer } from "./jobs/job-edit-drawer";

type RunRow = AdminJobRunsListResponse["data"][0];
type JobRow = AdminJobsListResponse["data"][0];

export default function JobsPage() {
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<JobsTab>("runs");
  const [runAllResult, setRunAllResult] = useState<{
    timestamp: string;
    triggeredCount: number;
    ok: number;
    fail: number;
  } | null>(null);

  const jobsQuery = useJobsFromDb();
  const jobs = jobsQuery.data?.data ?? [];

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

  const jobOptions = useMemo(() => jobs.map((j) => j.key), [jobs]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["jobs", "db"] }),
      queryClient.invalidateQueries({ queryKey: ["job-runs"] }),
    ]);
  };

  const runAllMutation = useMutation({
    mutationFn: async () => jobsService.runAll(false),
    onSuccess: (res) => {
      const data = res.data ?? {};
      setRunAllResult({
        timestamp: new Date().toLocaleString(),
        triggeredCount: data.triggeredCount ?? 0,
        ok: data.ok ?? 0,
        fail: data.fail ?? 0,
      });
      queryClient.invalidateQueries({ queryKey: ["job-runs"] });
    },
    onError: (e: Error) => {
      toast.error("Run All failed", { description: e.message });
    },
  });

  const runJobMutation = useMutation({
    mutationKey: ["run-job"],
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
  const [selectedJob, setSelectedJob] = useState<JobRow | null>(null);
  const [jobDrawerOpen, setJobDrawerOpen] = useState(false);

  const openRun = (r: RunRow) => {
    setSelectedRun(r);
    setRunDrawerOpen(true);
  };

  const openJob = (j: JobRow) => {
    setSelectedJob(j);
    setJobDrawerOpen(true);
  };

  const isRunPending = (jobKey: string) =>
    runJobMutation.isPending && runJobMutation.variables?.jobKey === jobKey;

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-6">
      <div className="flex-shrink-0 mb-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Jobs</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={refresh}
            disabled={jobsQuery.isFetching}
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

        <JobRunsTab
          jobOptions={jobOptions}
          jobsCount={jobs.length}
          onOpenRun={openRun}
        />

        <JobsCatalogTab
          jobs={jobs}
          isLoading={jobsQuery.isLoading}
          isError={jobsQuery.isError}
          onOpenJob={openJob}
          onRunJob={(jobKey) => runJobMutation.mutate({ jobKey })}
          isRunPending={isRunPending}
          isRunPendingAny={runJobMutation.isPending}
        />
      </Tabs>

      <RunDetailDrawer
        run={selectedRun}
        open={runDrawerOpen}
        onOpenChange={setRunDrawerOpen}
      />

      <JobEditDrawer
        job={selectedJob}
        open={jobDrawerOpen}
        onOpenChange={setJobDrawerOpen}
        bookmakerOptions={bookmakerOptions}
        marketOptions={marketOptions}
      />
    </div>
  );
}
