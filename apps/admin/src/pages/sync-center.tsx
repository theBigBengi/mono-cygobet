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
  SelectItem,
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

const ENTITY_BATCH_NAMES = [
  { value: "all", label: "All" },
  { value: "seed-countries", label: "Countries" },
  { value: "seed-leagues", label: "Leagues" },
  { value: "seed-seasons", label: "Seasons" },
  { value: "seed-teams", label: "Teams" },
  { value: "seed-fixtures", label: "Fixtures" },
  { value: "seed-bookmakers", label: "Bookmakers" },
  { value: "seed-season", label: "Seed Season (full)" },
  { value: "batch-seed-seasons", label: "Batch Seed" },
] as const;

export default function SyncCenterPage() {
  const [historyFilter, setHistoryFilter] = useState<string>("all");

  const { data: batchesData, isLoading: batchesLoading } = useQuery({
    queryKey: ["batches", historyFilter, 50],
    queryFn: () =>
      historyFilter === "all"
        ? batchesService.getAllBatches(50)
        : batchesService.getBatchesByName(historyFilter, 50),
    staleTime: 10000,
  });

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
                <h1 className="text-2xl font-semibold">Sync Center</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage football data synchronization
                </p>
              </div>
              {/* Provider Health Indicator */}
              <div className="flex items-center gap-2">
                {healthLoading ? (
                  <Skeleton className="h-7 w-32" />
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
              <div className="mt-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  {syncAlerts.map((alert) => (
                    <p key={alert.id}>{alert.title}: {alert.description}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6 pb-4">
            <GapSummaryBar />
            <SeasonExplorer />
            <QuickActionsBar />

            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle>Sync History</CardTitle>
                    <CardDescription>Recent sync operations</CardDescription>
                  </div>
                  <Select value={historyFilter} onValueChange={setHistoryFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTITY_BATCH_NAMES.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
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
