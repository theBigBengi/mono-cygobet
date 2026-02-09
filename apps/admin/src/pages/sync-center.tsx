import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataStatusCard } from "@/components/sync-center/data-status-card";
import { SeasonManager } from "@/components/sync-center/season-manager";
import { FixturesSyncCard } from "@/components/sync-center/fixtures-sync-card";
import { StaticDataSection } from "@/components/sync-center/static-data-section";
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
import { batchesService } from "@/services/batches.service";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProviderProvider } from "@/contexts/provider-context";

const ENTITY_BATCH_NAMES = [
  { value: "all", label: "All" },
  { value: "seed-countries", label: "Countries" },
  { value: "seed-leagues", label: "Leagues" },
  { value: "seed-seasons", label: "Seasons" },
  { value: "seed-teams", label: "Teams" },
  { value: "seed-fixtures", label: "Fixtures" },
  { value: "seed-bookmakers", label: "Bookmakers" },
  { value: "seed-season", label: "Seed Season (full)" },
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

  return (
    <TooltipProvider>
      <ProviderProvider>
        <div className="flex flex-1 flex-col min-h-0 overflow-y-auto p-2 sm:p-3 md:p-6">
          <div className="flex-shrink-0 mb-4 sm:mb-6">
            <h1 className="text-2xl font-semibold">Sync Center</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage football data synchronization
            </p>
          </div>

          <div className="flex flex-col gap-6 pb-4">
            <DataStatusCard />
            <SeasonManager />
            <FixturesSyncCard />
            <StaticDataSection />

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
