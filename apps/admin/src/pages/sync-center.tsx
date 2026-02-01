import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { BatchesTable } from "@/components/table/batches-table";
import { EntityOverviewCard } from "@/components/sync-center/entity-overview-card";
import { syncService } from "@/services/sync.service";
import { batchesService } from "@/services/batches.service";
import { countriesService } from "@/services/countries.service";
import { leaguesService } from "@/services/leagues.service";
import { seasonsService } from "@/services/seasons.service";
import { teamsService } from "@/services/teams.service";
import { bookmakersService } from "@/services/bookmakers.service";
import { fixturesService } from "@/services/fixtures.service";
import { useSyncOverview } from "@/hooks/use-sync-overview";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  ChevronDown,
  Globe,
  Trophy,
  Calendar,
  Users,
  CalendarDays,
  Bookmark,
} from "lucide-react";
import type { SyncAllResult } from "@/services/sync.service";

const SYNC_STEPS = [
  "Countries",
  "Leagues",
  "Seasons",
  "Teams",
  "Fixtures",
  "Bookmakers",
] as const;

const ENTITY_BATCH_NAMES = [
  { value: "all", label: "All" },
  { value: "seed-countries", label: "Countries" },
  { value: "seed-leagues", label: "Leagues" },
  { value: "seed-seasons", label: "Seasons" },
  { value: "seed-teams", label: "Teams" },
  { value: "seed-fixtures", label: "Fixtures" },
  { value: "seed-bookmakers", label: "Bookmakers" },
] as const;

const ENTITY_ICONS = {
  countries: Globe,
  leagues: Trophy,
  seasons: Calendar,
  teams: Users,
  fixtures: CalendarDays,
  bookmakers: Bookmark,
} as const;

const ENTITY_TITLES: Record<string, string> = {
  countries: "Countries",
  leagues: "Leagues",
  seasons: "Seasons",
  teams: "Teams",
  fixtures: "Fixtures",
  bookmakers: "Bookmakers",
};

export default function SyncCenterPage() {
  const [dryRun, setDryRun] = useState(false);
  const [seasonId, setSeasonId] = useState<string>("");
  const [fetchAllFixtureStates, setFetchAllFixtureStates] = useState(true);
  const [liveResults, setLiveResults] = useState<SyncAllResult[]>([]);
  const [historyEntityFilter, setHistoryEntityFilter] = useState<string>("all");
  const [syncAllOpen, setSyncAllOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: overviewData, isLoading: overviewLoading } = useSyncOverview();

  const batchesQueryKey =
    historyEntityFilter === "all"
      ? ["batches", "all", 50]
      : ["batches", historyEntityFilter, 50];
  const {
    data: batchesData,
    isLoading: batchesLoading,
    refetch: refetchBatches,
  } = useQuery({
    queryKey: batchesQueryKey,
    queryFn: () =>
      historyEntityFilter === "all"
        ? batchesService.getAllBatches(50)
        : batchesService.getBatchesByName(historyEntityFilter, 50),
    staleTime: 10000,
  });

  const syncEntityMutation = useMutation({
    mutationFn: async ({
      entity,
      dryRun: dr,
    }: {
      entity: string;
      dryRun: boolean;
    }) => {
      switch (entity) {
        case "countries":
          return countriesService.sync(dr);
        case "leagues":
          return leaguesService.sync(dr);
        case "seasons":
          return seasonsService.sync(dr);
        case "teams":
          return teamsService.sync(dr);
        case "fixtures":
          return fixturesService.sync(dr);
        case "bookmakers":
          return bookmakersService.sync(dr);
        default:
          throw new Error(`Unknown entity: ${entity}`);
      }
    },
    onSuccess: (_, variables) => {
      const title = ENTITY_TITLES[variables.entity] ?? variables.entity;
      toast.success(`${title} sync completed`);
      queryClient.invalidateQueries({ queryKey: ["sync-overview"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      refetchBatches();
    },
    onError: (error: Error, variables) => {
      const title = ENTITY_TITLES[variables.entity] ?? variables.entity;
      toast.error(`${title} sync failed`, { description: error.message });
    },
  });

  const syncAllMutation = useMutation({
    mutationFn: async () => {
      setLiveResults([]);
      const params: {
        dryRun: boolean;
        seasonId?: number;
        fetchAllFixtureStates?: boolean;
      } = {
        dryRun,
        fetchAllFixtureStates,
      };

      if (seasonId) {
        params.seasonId = Number(seasonId);
      }

      return syncService.syncAll(params, (stepResult) => {
        setLiveResults((prev) => [...prev, stepResult]);
      });
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

      refetchBatches();
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["sync-overview"] });
    },
    onError: (error: Error) => {
      toast.error("Sync All failed", {
        description: error.message || "An error occurred during sync",
      });
    },
  });

  const handleSyncAll = () => {
    syncAllMutation.mutate();
  };

  const isSyncing = syncAllMutation.isPending;
  const syncResults = syncAllMutation.data || [];
  const displayResults = isSyncing ? liveResults : syncResults;

  const entities = overviewData?.data?.entities ?? [];

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-6">
      <div className="flex-shrink-0 mb-4 sm:mb-6">
        <h1 className="text-2xl font-semibold">Sync Center</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Data hub: overview by entity, per-entity sync, and sync history
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:gap-6 flex-1 min-h-0 overflow-auto">
        {/* Section 1 — Data Overview */}
        <div>
          <h2 className="text-lg font-medium mb-3">Data Overview</h2>
          {overviewLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {entities.map((entity) => {
                const Icon = ENTITY_ICONS[entity.name as keyof typeof ENTITY_ICONS];
                const title = ENTITY_TITLES[entity.name] ?? entity.name;
                const syncing =
                  syncEntityMutation.isPending &&
                  syncEntityMutation.variables?.entity === entity.name;
                return (
                  <EntityOverviewCard
                    key={entity.name}
                    title={title}
                    icon={Icon ?? Globe}
                    dbCount={entity.dbCount}
                    lastSyncedAt={entity.lastSyncedAt}
                    lastSyncStatus={entity.lastSyncStatus}
                    breakdown={entity.breakdown}
                    currentCount={entity.currentCount}
                    onSync={() =>
                      syncEntityMutation.mutate({
                        entity: entity.name,
                        dryRun: false,
                      })
                    }
                    syncLoading={syncing}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2 — Sync All (collapsed by default) */}
        <Collapsible open={syncAllOpen} onOpenChange={setSyncAllOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 rounded-t-xl transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Sync All (Recommended Order)</CardTitle>
                    <CardDescription>
                      Syncs data in the correct dependency order: Countries →
                      Leagues → Seasons → Teams → Fixtures → Bookmakers
                    </CardDescription>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground transition-transform ${syncAllOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
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

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="fetch-all-states"
                      checked={fetchAllFixtureStates}
                      onCheckedChange={(checked) =>
                        setFetchAllFixtureStates(checked === true)
                      }
                    />
                    <Label htmlFor="fetch-all-states" className="cursor-pointer">
                      Fetch all fixture states (NS, LIVE, FT, etc.)
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    If unchecked, only fetches fixtures with state "NS" (Not
                    Started)
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="season-id">
                      Season ID (optional, for specific season)
                    </Label>
                    <Input
                      id="season-id"
                      type="number"
                      placeholder="Optional - leave empty to sync all seasons in database"
                      value={seasonId}
                      onChange={(e) => setSeasonId(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      If not provided, fixtures will be synced for all seasons in
                      database
                    </p>
                  </div>
                </div>

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

                {displayResults.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <Label className="text-sm font-semibold">Sync Results:</Label>
                    <div className="space-y-2">
                      {SYNC_STEPS.map((step, index) => {
                        const result = displayResults.find(
                          (r) => r.step === step
                        );
                        const isCompleted = result !== undefined;
                        const isSuccess = result?.status === "success";
                        const isError = result?.status === "error";
                        const isPending =
                          isSyncing &&
                          !isCompleted &&
                          index <= displayResults.length;

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
                              <span className="text-sm font-medium">
                                {step}
                              </span>
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
                                  <span className="font-mono">
                                    #{result.batchId}
                                  </span>
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
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 3 — Sync History */}
        <Card className="flex-1 min-h-0 flex flex-col">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle>Sync History</CardTitle>
                <CardDescription>
                  Recent sync runs and batches. Filter by entity.
                </CardDescription>
              </div>
              <Select
                value={historyEntityFilter}
                onValueChange={setHistoryEntityFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by entity" />
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
