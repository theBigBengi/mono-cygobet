import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useBulkSeedSeasons } from "@/hooks/use-bulk-seed-seasons";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Globe,
  Trophy,
  Calendar,
  Users,
  Zap,
} from "lucide-react";
import type { AvailableSeason } from "@repo/types";

interface BulkSeedDialogProps {
  open: boolean;
  seasons: AvailableSeason[];
  allSeasons: AvailableSeason[];
  onClose: () => void;
}

interface PreviewGroup {
  country: string;
  countryExists: boolean;
  leagues: {
    name: string;
    leagueExternalId: number;
    leagueExists: boolean;
    seasons: AvailableSeason[];
  }[];
}

function computePreview(
  selected: AvailableSeason[],
  allSeasons: AvailableSeason[]
): { groups: PreviewGroup[]; newCountries: number; newLeagues: number; totalTeams: number; totalFixtures: number } {
  // A league exists in DB if any season from that league is "in_db"
  const existingLeagues = new Set<number>();
  const existingCountries = new Set<string>();
  for (const s of allSeasons) {
    if (s.status === "in_db") {
      existingLeagues.add(s.league.externalId);
      existingCountries.add(s.league.country);
    }
  }

  // Group selected seasons by country → league
  const countryMap = new Map<
    string,
    Map<string, { externalId: number; seasons: AvailableSeason[] }>
  >();
  for (const s of selected) {
    if (!countryMap.has(s.league.country)) {
      countryMap.set(s.league.country, new Map());
    }
    const leagueMap = countryMap.get(s.league.country)!;
    if (!leagueMap.has(s.league.name)) {
      leagueMap.set(s.league.name, {
        externalId: s.league.externalId,
        seasons: [],
      });
    }
    leagueMap.get(s.league.name)!.seasons.push(s);
  }

  const groups: PreviewGroup[] = [];
  let newCountries = 0;
  let newLeagues = 0;

  for (const [country, leagueMap] of countryMap) {
    const countryExists = existingCountries.has(country);
    if (!countryExists) newCountries++;

    const leagues: PreviewGroup["leagues"] = [];
    for (const [name, data] of leagueMap) {
      const leagueExists = existingLeagues.has(data.externalId);
      if (!leagueExists) newLeagues++;
      leagues.push({
        name,
        leagueExternalId: data.externalId,
        leagueExists,
        seasons: data.seasons,
      });
    }
    leagues.sort((a, b) => a.name.localeCompare(b.name));

    groups.push({ country, countryExists, leagues });
  }

  groups.sort((a, b) => a.country.localeCompare(b.country));

  let totalTeams = 0;
  let totalFixtures = 0;
  for (const s of selected) {
    totalTeams += s.teamsCount ?? 0;
    totalFixtures += s.fixturesCount ?? 0;
  }

  return { groups, newCountries, newLeagues, totalTeams, totalFixtures };
}

export function BulkSeedDialog({
  open,
  seasons,
  allSeasons,
  onClose,
}: BulkSeedDialogProps) {
  const [futureOnly, setFutureOnly] = useState(true);
  const bulk = useBulkSeedSeasons();

  const preview = useMemo(
    () => computePreview(seasons, allSeasons),
    [seasons, allSeasons]
  );

  const handleStart = () => {
    bulk.startBatch({
      seasonExternalIds: seasons.map((s) => s.externalId),
      futureOnly,
    });
  };

  const handleClose = () => {
    bulk.reset();
    setFutureOnly(true);
    onClose();
  };

  const isIdle = bulk.status === "idle" || bulk.status === "starting";
  const isProcessing = bulk.status === "processing";
  const isDone = bulk.status === "completed" || bulk.status === "failed";

  const progressPercent =
    bulk.totalSeasons > 0
      ? Math.round(
          ((bulk.completedSeasons + bulk.failedSeasons) / bulk.totalSeasons) *
            100
        )
      : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] sm:max-h-[80vh] flex flex-col w-[calc(100%-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle>
            Seed {seasons.length} Season{seasons.length !== 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription>
            {isIdle
              ? "Review what will be created and start batch seeding."
              : isProcessing
                ? "Seeding in progress..."
                : "Batch seeding complete."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2">
          {/* Preview summary + grouped list - only before starting */}
          {bulk.status === "idle" && (
            <>
              {/* Summary cards */}
              <div className="space-y-2">
                <p className="text-sm font-medium">What will be created:</p>
                <div className="rounded-lg border p-3 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Countries</span>
                    <span className="ml-auto font-medium">
                      {preview.groups.length}
                    </span>
                    {preview.newCountries > 0 && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400"
                      >
                        {preview.newCountries} new
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Leagues</span>
                    <span className="ml-auto font-medium">
                      {preview.groups.reduce(
                        (acc, g) => acc + g.leagues.length,
                        0
                      )}
                    </span>
                    {preview.newLeagues > 0 && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400"
                      >
                        {preview.newLeagues} new
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Seasons</span>
                    <span className="ml-auto font-medium">
                      {seasons.length}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400"
                    >
                      {seasons.length} new
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Teams</span>
                    <span className="ml-auto font-medium">
                      {preview.totalTeams}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Fixtures</span>
                    <span className="ml-auto font-medium">
                      {preview.totalFixtures}
                    </span>
                  </div>
                </div>

                {(preview.newCountries > 0 || preview.newLeagues > 0) && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-xs p-2.5 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      Missing countries and leagues will be auto-created during
                      seeding.
                    </span>
                  </div>
                )}
              </div>

              {/* Grouped season list */}
              <div className="space-y-1">
                {preview.groups.map((group) => (
                  <div key={group.country} className="space-y-0.5">
                    {/* Country header */}
                    <div className="flex items-center gap-2 px-2 py-1 text-sm">
                      {group.countryExists ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      )}
                      <span className="font-medium">{group.country}</span>
                      {!group.countryExists && (
                        <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                          new
                        </span>
                      )}
                    </div>
                    {/* Leagues */}
                    {group.leagues.map((league) => (
                      <div key={league.leagueExternalId} className="ml-5">
                        {/* League header */}
                        <div className="flex items-center gap-2 px-2 py-0.5 text-sm">
                          {league.leagueExists ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          )}
                          <span>{league.name}</span>
                          {!league.leagueExists && (
                            <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                              new
                            </span>
                          )}
                        </div>
                        {/* Seasons */}
                        {league.seasons.map((s) => (
                          <div
                            key={s.externalId}
                            className="flex items-center gap-2 ml-5 px-2 py-0.5 text-sm text-muted-foreground"
                          >
                            <Calendar className="h-3 w-3 shrink-0" />
                            <span className="truncate">{s.name}</span>
                            <span className="ml-auto text-xs shrink-0">
                              {s.teamsCount != null && `${s.teamsCount} teams`}
                              {s.teamsCount != null && s.fixturesCount != null && ", "}
                              {s.fixturesCount != null && `${s.fixturesCount} fixtures`}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Future only toggle */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="bulk-future-only"
                    className="text-sm font-medium"
                  >
                    Future fixtures only
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {futureOnly
                      ? "Only seed upcoming matches"
                      : "Seed all matches including past"}
                  </p>
                </div>
                <Switch
                  id="bulk-future-only"
                  checked={futureOnly}
                  onCheckedChange={setFutureOnly}
                />
              </div>
            </>
          )}

          {/* Progress bar */}
          {(isProcessing || isDone) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {bulk.completedSeasons + bulk.failedSeasons} /{" "}
                  {bulk.totalSeasons}
                </span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {isDone && (
                <div className="flex gap-3 text-sm">
                  <span className="text-green-600">
                    {bulk.completedSeasons} succeeded
                  </span>
                  {bulk.failedSeasons > 0 && (
                    <span className="text-red-600">
                      {bulk.failedSeasons} failed
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Processing / Done season list */}
          {bulk.status !== "idle" && (
            <div className="space-y-1">
              {bulk.seasons.map((s) => (
                <div
                  key={s.seasonExternalId}
                  className="flex items-center justify-between py-1.5 px-2 text-sm rounded hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <SeasonStatusIcon status={s.status} />
                    <span className="truncate">
                      {s.result?.season
                        ? `${s.result.season.league} - ${s.result.season.name}`
                        : `Season #${s.seasonExternalId}`}
                    </span>
                  </div>
                  <div className="ml-2 shrink-0">
                    {s.status === "done" && s.result && (
                      <span className="text-xs text-muted-foreground">
                        {s.result.teams && `${s.result.teams.ok} teams, `}
                        {s.result.fixtures?.ok ?? 0} fixtures
                      </span>
                    )}
                    {s.status === "failed" && (
                      <span className="text-xs text-red-600 max-w-[150px] truncate block">
                        {s.error ?? "Failed"}
                      </span>
                    )}
                    {s.status === "processing" && (
                      <span className="text-xs text-muted-foreground">
                        Processing...
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          {isDone ? (
            <Button onClick={handleClose}>Close</Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleStart}
                disabled={bulk.isLoading || seasons.length === 0}
              >
                {bulk.isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {bulk.status === "starting" ? "Starting..." : "Seeding..."}
                  </>
                ) : (
                  `Seed ${seasons.length} Season${seasons.length !== 1 ? "s" : ""}`
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SeasonStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-600 shrink-0" />;
    case "processing":
      return (
        <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
      );
    default:
      return <Clock className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
}
