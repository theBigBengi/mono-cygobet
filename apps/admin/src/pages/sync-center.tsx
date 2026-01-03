import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/fixtures/date-range-picker";
import { Input } from "@/components/ui/input";
import { BatchesTable } from "@/components/table/batches-table";
import { syncService, type SyncAllResult } from "@/services/sync.service";
import { batchesService } from "@/services/batches.service";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

const SYNC_STEPS = [
  "Countries",
  "Leagues",
  "Seasons",
  "Teams",
  "Fixtures",
  "Bookmakers",
] as const;

export default function SyncCenterPage() {
  const [dryRun, setDryRun] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    // Default: 3 days back and 4 days ahead
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 3);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setDate(to.getDate() + 4);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  });
  const [seasonId, setSeasonId] = useState<string>("");

  const queryClient = useQueryClient();

  // Fetch all batches for history
  const {
    data: batchesData,
    isLoading: batchesLoading,
    refetch: refetchBatches,
  } = useQuery({
    queryKey: ["batches", "all"],
    queryFn: () => batchesService.getAllBatches(50),
    staleTime: 10000, // 10 seconds
  });

  // Sync All mutation
  const syncAllMutation = useMutation({
    mutationFn: async () => {
      const params: {
        dryRun: boolean;
        from?: string;
        to?: string;
        seasonId?: number;
      } = {
        dryRun,
      };

      if (seasonId) {
        params.seasonId = Number(seasonId);
      } else if (dateRange?.from && dateRange?.to) {
        // Format dates in local timezone
        const formatLocalDate = (date: Date): string => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        };
        params.from = formatLocalDate(dateRange.from);
        params.to = formatLocalDate(dateRange.to);
      }

      return syncService.syncAll(params);
    },
    onSuccess: (results) => {
      const allSuccess = results.every((r) => r.status === "success");
      const hasErrors = results.some((r) => r.status === "error");

      if (allSuccess) {
        toast.success("Sync All completed successfully", {
          description: `All ${results.length} steps completed.`,
        });
      } else if (hasErrors) {
        const errorSteps = results
          .filter((r) => r.status === "error")
          .map((r) => r.step)
          .join(", ");
        toast.error("Sync All completed with errors", {
          description: `Failed steps: ${errorSteps}`,
        });
      }

      // Refresh batches
      refetchBatches();
      queryClient.invalidateQueries({ queryKey: ["batches"] });
    },
    onError: (error: Error) => {
      toast.error("Sync All failed", {
        description: error.message || "An error occurred during sync",
      });
    },
  });

  const handleSyncAll = () => {
    if (!seasonId && (!dateRange?.from || !dateRange?.to)) {
      toast.error("Date range or Season ID required", {
        description: "Please provide either a date range or season ID for fixtures sync.",
      });
      return;
    }
    syncAllMutation.mutate();
  };

  const isSyncing = syncAllMutation.isPending;
  const syncResults = syncAllMutation.data || [];

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-6">
      <div className="flex-shrink-0 mb-4 sm:mb-6">
        <h1 className="text-2xl font-semibold">Sync Center</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sync all data from provider to database in recommended order
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:gap-6 flex-1 min-h-0 overflow-auto">
        {/* Sync All Section */}
        <Card>
          <CardHeader>
            <CardTitle>Sync All (Recommended Order)</CardTitle>
            <CardDescription>
              Syncs data in the correct dependency order: Countries → Leagues →
              Seasons → Teams → Fixtures → Bookmakers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Controls */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dry-run"
                  checked={dryRun}
                  onCheckedChange={(checked) => setDryRun(checked === true)}
                />
                <Label htmlFor="dry-run" className="cursor-pointer">
                  Dry Run (simulate without saving)
                </Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date Range (for Fixtures)</Label>
                  <DateRangePicker
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="season-id">Season ID (alternative to date range)</Label>
                  <Input
                    id="season-id"
                    type="number"
                    placeholder="Optional"
                    value={seasonId}
                    onChange={(e) => setSeasonId(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Sync Button */}
            <Button
              onClick={handleSyncAll}
              disabled={isSyncing}
              size="lg"
              className="w-full sm:w-auto"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                "Sync All"
              )}
            </Button>

            {/* Sync Progress/Results */}
            {syncResults.length > 0 && (
              <div className="space-y-2 mt-4">
                <Label className="text-sm font-semibold">Sync Results:</Label>
                <div className="space-y-2">
                  {SYNC_STEPS.map((step, index) => {
                    const result = syncResults.find((r) => r.step === step);
                    const isCompleted = result !== undefined;
                    const isSuccess = result?.status === "success";
                    const isError = result?.status === "error";
                    const isPending =
                      isSyncing && !isCompleted && index < syncResults.length + 1;

                    return (
                      <div
                        key={step}
                        className="flex items-center gap-3 p-2 rounded-md border bg-muted/50"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : isSuccess ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : isError ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                          )}
                          <span className="text-sm font-medium">{step}</span>
                          {index < SYNC_STEPS.length - 1 && (
                            <ArrowRight className="h-3 w-3 text-muted-foreground ml-auto" />
                          )}
                        </div>
                        {result && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              OK: {result.ok} | Fail: {result.fail} | Total:{" "}
                              {result.total}
                            </span>
                            {result.batchId && (
                              <span className="font-mono">#{result.batchId}</span>
                            )}
                          </div>
                        )}
                        {isError && result?.error && (
                          <div className="text-xs text-red-600 ml-2">
                            {result.error}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* History Section */}
        <Card className="flex-1 min-h-0 flex flex-col">
          <CardHeader>
            <CardTitle>Sync History</CardTitle>
            <CardDescription>
              Recent sync runs and batches. Click on a batch to view details.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-auto">
            {batchesLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <BatchesTable
                batches={batchesData?.data || []}
                isLoading={batchesLoading}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
