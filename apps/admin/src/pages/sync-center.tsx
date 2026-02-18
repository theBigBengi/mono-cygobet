import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { GapSummaryBar } from "@/components/sync-center/gap-summary-bar";
import { SeasonExplorer } from "@/components/sync-center/season-explorer";
import { QuickActionsBar } from "@/components/sync-center/quick-actions-bar";
import { BatchesTable } from "@/components/table/batches-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { batchesService } from "@/services/batches.service";
import { syncService } from "@/services/sync.service";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProviderProvider } from "@/contexts/provider-context";
import { useAlerts } from "@/hooks/use-dashboard";

const AUTO_JOBS = [
  { value: "upsert-live-fixtures", label: "Live fixtures update" },
  { value: "upsert-upcoming-fixtures", label: "Upcoming fixtures update" },
  { value: "finished-fixtures", label: "Finished fixtures check" },
  { value: "recovery-overdue-fixtures", label: "Overdue fixtures recovery" },
] as const;

const MANUAL_OPS = [
  { value: "seed-season", label: "Season seed" },
  { value: "batch-seed-seasons", label: "Batch season seed" },
  { value: "seed-countries", label: "Countries sync" },
  { value: "seed-leagues", label: "Leagues sync" },
  { value: "seed-bookmakers", label: "Bookmakers sync" },
] as const;

const AUTO_JOB_NAMES = new Set(AUTO_JOBS.map((j) => j.value));

export default function SyncCenterPage() {
  const [historyFilter, setHistoryFilter] = useState<string>("all");

  const isAggregate =
    historyFilter === "all" ||
    historyFilter === "all-jobs" ||
    historyFilter === "all-manual";

  const { data: batchesRaw, isLoading: batchesLoading } = useQuery({
    queryKey: ["batches", isAggregate ? "all" : historyFilter, 50],
    queryFn: () =>
      isAggregate
        ? batchesService.getAllBatches(50)
        : batchesService.getBatchesByName(historyFilter, 50),
    staleTime: 10000,
  });

  // Client-side filtering for aggregate filters
  const batchesData = batchesRaw
    ? {
        ...batchesRaw,
        data:
          historyFilter === "all-jobs"
            ? batchesRaw.data.filter((b) => AUTO_JOB_NAMES.has(b.name))
            : historyFilter === "all-manual"
              ? batchesRaw.data.filter((b) => !AUTO_JOB_NAMES.has(b.name))
              : batchesRaw.data,
      }
    : undefined;

  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ["sync-center", "health"],
    queryFn: () => syncService.getProviderHealth(),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: alertsData } = useAlerts();
  const syncAlerts = alertsData?.data?.filter(
    (a) => a.category === "sync_needed"
  );

  return (
    <TooltipProvider>
      <ProviderProvider>
        <div className="flex flex-1 flex-col min-h-0 overflow-y-auto p-2 sm:p-3 md:p-6">
          <div className="flex-shrink-0 mb-4 sm:mb-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h1 className="text-lg sm:text-2xl font-semibold">Sync Center</h1>
                <p className="hidden sm:block text-sm text-muted-foreground mt-1">
                  Manage football data synchronization
                </p>
              </div>
              {/* Provider Health Indicator */}
              <div className="flex items-center gap-2">
                {healthLoading ? (
                  <Skeleton className="h-6 w-24 sm:h-7 sm:w-32" />
                ) : healthData?.data ? (
                  <Badge
                    variant="outline"
                    className={
                      healthData.data.reachable
                        ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
                        : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800"
                    }
                  >
                    {healthData.data.reachable ? (
                      <Wifi className="mr-1.5 h-3 w-3" />
                    ) : (
                      <WifiOff className="mr-1.5 h-3 w-3" />
                    )}
                    {healthData.data.provider}:{" "}
                    {healthData.data.reachable
                      ? `${healthData.data.latencyMs}ms`
                      : "Unreachable"}
                  </Badge>
                ) : null}
              </div>
            </div>

            {/* Sync alerts banner */}
            {syncAlerts && syncAlerts.length > 0 && (
              <div className="mt-2 sm:mt-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-2 sm:p-3 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs sm:text-sm">
                  {syncAlerts.map((alert) => (
                    <p key={alert.id}>{alert.title}: {alert.description}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:gap-6 pb-4">
            <GapSummaryBar />
            <SeasonExplorer />
            <QuickActionsBar />

            <Card>
              <CardHeader className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm sm:text-base">Sync History</CardTitle>
                    <CardDescription className="hidden sm:block">Recent sync operations</CardDescription>
                  </div>
                  <Select value={historyFilter} onValueChange={setHistoryFilter}>
                    <SelectTrigger className="w-full sm:w-[220px] h-8 sm:h-9 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel>Automated Jobs</SelectLabel>
                        <SelectItem value="all-jobs">All jobs</SelectItem>
                        {AUTO_JOBS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel>Manual Operations</SelectLabel>
                        <SelectItem value="all-manual">All manual</SelectItem>
                        {MANUAL_OPS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                {batchesLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : (
                  <BatchesTable
                    batches={batchesData?.data ?? []}
                    isLoading={batchesLoading}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </ProviderProvider>
    </TooltipProvider>
  );
}
