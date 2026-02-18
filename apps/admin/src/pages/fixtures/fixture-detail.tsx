import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, subDays, addDays } from "date-fns";
import { ArrowLeft, ArrowRight, Pencil, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fixturesService } from "@/services/fixtures.service";
import { normalizeResult } from "@/utils/fixtures";
import type { AdminFixtureAuditLogEntry } from "@repo/types";

/** Parse start time string as UTC for comparison (provider often sends "YYYY-MM-DD HH:mm:ss" without Z). */
function parseStartTimeAsUtc(s: string | null | undefined): number | null {
  if (!s || typeof s !== "string") return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  if (/[Zz]$/.test(trimmed) || /[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const t = new Date(trimmed).getTime();
    return Number.isNaN(t) ? null : t;
  }
  const normalized = trimmed.replace(" ", "T") + "Z";
  const t = new Date(normalized).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Same display text for both columns when times match (UTC). */
function formatStartTimeDisplay(ts: number): string {
  return new Date(ts)
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d{3}Z$/, "");
}
import {
  ScoreOverrideDialog,
  type FixtureForOverride,
} from "./score-override-dialog";
import { toast } from "sonner";

const ISSUE_DESCRIPTIONS: Record<string, string> = {
  "Stuck LIVE":
    "Fixture is in LIVE state but has not been updated for over 3 hours. Run the Finished Fixtures job or check the provider.",
  Unsettled:
    "Fixture is finished (FT) but has predictions that have not been settled yet. Use Re-settle to resolve.",
  "Overdue NS":
    "Fixture is NS but its scheduled start time has passed. Run the Live Fixtures or Finished Fixtures job to update.",
};

function ComparisonBadge({ match }: { match: boolean }) {
  return (
    <Badge
      variant="secondary"
      className={`text-[10px] ${
        match
          ? "bg-green-500/15 text-green-700 dark:text-green-400"
          : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
      }`}
    >
      {match ? "OK" : "Diff"}
    </Badge>
  );
}

function ComparisonRow({ label, db, provider, match }: { label: string; db: string; provider: string | undefined; match: boolean }) {
  const bg = match ? "bg-background" : "bg-amber-50/50 dark:bg-amber-950/10";
  return (
    <>
      <div className={`${bg} px-3 py-2 font-medium`}>{label}</div>
      <div className={`${bg} px-3 py-2 truncate`}>{db}</div>
      <div className={`${bg} px-3 py-2 truncate`}>{provider ?? "—"}</div>
      <div className={`${bg} px-3 py-2 text-center`}><ComparisonBadge match={match} /></div>
    </>
  );
}

export default function FixtureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fixtureId = id ? parseInt(id, 10) : NaN;
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [resettling, setResettling] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["fixture", fixtureId],
    queryFn: () => fixturesService.getById(fixtureId),
    enabled: Number.isFinite(fixtureId),
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const dateRange = useMemo(() => {
    const startIso = data?.data?.startIso;
    if (!startIso) return { from: undefined, to: undefined };
    const d = new Date(startIso);
    return {
      from: format(subDays(d, 1), "yyyy-MM-dd"),
      to: format(addDays(d, 1), "yyyy-MM-dd"),
    };
  }, [data?.data?.startIso]);

  const { data: auditLogData } = useQuery({
    queryKey: ["fixture", fixtureId, "audit-log"],
    queryFn: () => fixturesService.getAuditLog(fixtureId),
    enabled: Number.isFinite(fixtureId),
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const { data: providerData, isLoading: providerLoading } = useQuery({
    queryKey: ["fixture", fixtureId, "provider", dateRange.from, dateRange.to],
    queryFn: () =>
      fixturesService.getFromProvider(dateRange.from, dateRange.to),
    enabled:
      Number.isFinite(fixtureId) && Boolean(dateRange.from && dateRange.to),
    staleTime: 10 * 60 * 1000, // 10 min - provider data rarely changes
  });

  const providerFixture = useMemo(() => {
    const extId = data?.data?.externalId;
    const list = providerData?.data ?? [];
    if (extId == null || list.length === 0) return undefined;
    return list.find((f) => String(f.externalId) === String(extId));
  }, [data?.data?.externalId, providerData?.data]);

  const { data: groupsSummaryData } = useQuery({
    queryKey: ["fixture", fixtureId, "groups-summary"],
    queryFn: () => fixturesService.getGroupsSummary(fixtureId),
    enabled: Number.isFinite(fixtureId) && !!data?.data,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["fixture", fixtureId] });
    queryClient.invalidateQueries({
      queryKey: ["fixture", fixtureId, "groups-summary"],
    });
    queryClient.invalidateQueries({
      queryKey: ["fixture", fixtureId, "audit-log"],
    });
  };

  const handleResettle = async () => {
    if (!Number.isFinite(fixtureId)) return;
    setResettling(true);
    try {
      const result = await fixturesService.resettle(fixtureId);
      toast.success("Re-settlement completed", {
        description: `${result.predictionsRecalculated} predictions in ${result.groupsAffected} group(s)`,
      });
      queryClient.invalidateQueries({ queryKey: ["fixture", fixtureId] });
      queryClient.invalidateQueries({
        queryKey: ["fixture", fixtureId, "groups-summary"],
      });
      queryClient.invalidateQueries({
        queryKey: ["fixture", fixtureId, "audit-log"],
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Re-settlement failed");
    } finally {
      setResettling(false);
    }
  };

  if (!Number.isFinite(fixtureId)) {
    return (
      <div className="p-6">
        <p className="text-destructive">Invalid fixture ID</p>
        <Button variant="link" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <p className="text-destructive">
          Failed to load fixture: {error?.message ?? "Unknown error"}
        </p>
        <Button variant="link" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>
    );
  }

  if (isLoading || !data?.data) {
    return (
      <div className="p-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full mt-4" />
      </div>
    );
  }

  const f = data.data;
  const fixtureForOverride: FixtureForOverride = {
    id: f.id,
    name: f.name,
    homeScore90: f.homeScore90,
    awayScore90: f.awayScore90,
    homeScoreET: f.homeScoreET,
    awayScoreET: f.awayScoreET,
    penHome: f.penHome,
    penAway: f.penAway,
    state: f.state,
    leg: f.leg,
  };
  const startTimeDbTs = parseStartTimeAsUtc(f.startIso);
  const startTimeProviderTs = providerFixture
    ? parseStartTimeAsUtc(providerFixture.startIso)
    : null;
  const startTimeMatch =
    providerFixture && startTimeDbTs != null && startTimeProviderTs != null
      ? startTimeDbTs === startTimeProviderTs
      : !providerFixture;
  const startTimeDisplay =
    providerFixture &&
    startTimeDbTs != null &&
    startTimeProviderTs != null &&
    startTimeDbTs === startTimeProviderTs
      ? formatStartTimeDisplay(startTimeDbTs)
      : null;

  const handleSyncConfirm = async () => {
    if (!f.externalId) return;
    setSyncing(true);
    setSyncDialogOpen(false);
    try {
      await fixturesService.syncById(f.externalId, false);
      toast.success("Fixture synced from provider");
      queryClient.invalidateQueries({ queryKey: ["fixture", fixtureId] });
      queryClient.invalidateQueries({
        queryKey: ["fixture", fixtureId, "audit-log"],
      });
      queryClient.invalidateQueries({
        queryKey: ["fixture", fixtureId, "provider"],
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const dbScore = f.homeScore90 != null && f.awayScore90 != null
    ? `${f.homeScore90} - ${f.awayScore90}`
    : normalizeResult(f.result) || "—";
  const providerScore = providerFixture
    ? (providerFixture.homeScore90 != null && providerFixture.awayScore90 != null
        ? `${providerFixture.homeScore90} - ${providerFixture.awayScore90}`
        : normalizeResult(providerFixture.result) || "—")
    : undefined;
  const scoreMatch = providerFixture ? dbScore === providerScore : true;

  const dbET = f.homeScoreET != null && f.awayScoreET != null ? `${f.homeScoreET} - ${f.awayScoreET}` : "—";
  const providerET = providerFixture?.homeScoreET != null && providerFixture?.awayScoreET != null
    ? `${providerFixture.homeScoreET} - ${providerFixture.awayScoreET}` : undefined;
  const dbPen = f.penHome != null && f.penAway != null ? `${f.penHome} - ${f.penAway}` : "—";
  const providerPen = providerFixture?.penHome != null && providerFixture?.penAway != null
    ? `${providerFixture.penHome} - ${providerFixture.penAway}` : undefined;

  const comparisonRows = [
    { label: "Name", db: f.name, provider: providerFixture?.name, match: providerFixture ? f.name === providerFixture.name : true },
    { label: "State", db: f.state, provider: providerFixture?.state, match: providerFixture ? f.state === providerFixture.state : true },
    { label: "Score (90')", db: dbScore, provider: providerScore, match: scoreMatch },
    { label: "ET Score", db: dbET, provider: providerET, match: providerFixture ? dbET === (providerET ?? "—") : true },
    { label: "Penalties", db: dbPen, provider: providerPen, match: providerFixture ? dbPen === (providerPen ?? "—") : true },
    { label: "Start Time", db: startTimeDisplay ?? f.startIso, provider: startTimeDisplay ?? providerFixture?.startIso ?? "—", match: startTimeMatch },
    { label: "Stage", db: f.stage ?? "—", provider: providerFixture?.stage ?? "—", match: providerFixture ? (f.stage ?? "") === (providerFixture.stage ?? "") : true },
    { label: "Round", db: f.round ?? "—", provider: providerFixture?.round ?? "—", match: providerFixture ? (f.round ?? "") === (providerFixture.round ?? "") : true },
    { label: "Leg", db: f.leg ?? "—", provider: providerFixture?.leg ?? "—", match: providerFixture ? (f.leg ?? "") === (providerFixture?.leg ?? "") : true },
  ];

  const hasMismatch = providerFixture != null && comparisonRows.some((row) => !row.match);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-6">
      {/* Back + title */}
      <div className="flex-shrink-0 mb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-base sm:text-lg font-medium -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {f.name}
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto space-y-3 sm:space-y-4">
        {/* Issue banner (if any) */}
        {f.issue && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 px-3 py-2.5 sm:px-4">
            <div className="flex items-start gap-2">
              <Badge
                variant="secondary"
                className="shrink-0 bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] sm:text-xs"
              >
                {f.issue}
              </Badge>
              {ISSUE_DESCRIPTIONS[f.issue] && (
                <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
                  {ISSUE_DESCRIPTIONS[f.issue]}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Info */}
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {f.homeTeam && (
                <>
                  <span className="text-xs text-muted-foreground">Home</span>
                  <span>{f.homeTeam.name}</span>
                </>
              )}
              {f.awayTeam && (
                <>
                  <span className="text-xs text-muted-foreground">Away</span>
                  <span>{f.awayTeam.name}</span>
                </>
              )}
              {f.league && (
                <>
                  <span className="text-xs text-muted-foreground">League</span>
                  <span>{f.league.name}</span>
                </>
              )}
              {f.season && (
                <>
                  <span className="text-xs text-muted-foreground">Season</span>
                  <span>{f.season.name}</span>
                </>
              )}
              <span className="text-xs text-muted-foreground">Has Odds</span>
              <span>{f.hasOdds ? "Yes" : "No"}</span>
              <span className="text-xs text-muted-foreground">ID</span>
              <span className="text-xs text-muted-foreground">{f.id} (ext: {f.externalId})</span>
              <span className="text-xs text-muted-foreground">Created</span>
              <span className="text-xs text-muted-foreground">{format(new Date(f.createdAt), "PPpp")}</span>
              <span className="text-xs text-muted-foreground">Updated</span>
              <span className="text-xs text-muted-foreground">{format(new Date(f.updatedAt), "PPpp")}</span>
            </div>
          </CardContent>
        </Card>

        {/* Fixture Details & Provider Comparison */}
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base">Fixture Details</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setOverrideDialogOpen(true)}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Override
                </Button>
                {!providerLoading && hasMismatch && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSyncDialogOpen(true)}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Syncing</>
                    ) : (
                      <><RefreshCw className="h-3 w-3 mr-1" />Sync</>
                    )}
                  </Button>
                )}
              </div>
            </div>
            {f.scoreOverriddenAt && (
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="secondary"
                  className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px]"
                >
                  Manually overridden
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {f.scoreOverriddenBy?.name || f.scoreOverriddenBy?.email
                    ? `by ${f.scoreOverriddenBy.name ?? f.scoreOverriddenBy.email} · `
                    : ""}
                  {format(new Date(f.scoreOverriddenAt), "PPpp")}
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {providerLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <>
                {/* Mobile: vertical list */}
                <div className="divide-y sm:hidden">
                  {comparisonRows.map((row) => (
                    <div key={row.label} className={`py-2.5 first:pt-0 last:pb-0 ${!row.match ? "bg-amber-50/50 dark:bg-amber-950/10 -mx-3 px-3" : ""}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium">{row.label}</span>
                        {!row.match && <ComparisonBadge match={false} />}
                      </div>
                      {row.match ? (
                        <p className="text-sm">{row.db}</p>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-[10px] text-muted-foreground w-14 shrink-0">DB</span>
                            <span className="text-sm text-red-600 dark:text-red-400 break-words min-w-0">{row.db}</span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-[10px] text-muted-foreground w-14 shrink-0">Provider</span>
                            <span className="text-sm text-green-600 dark:text-green-400 font-medium break-words min-w-0">{row.provider ?? "—"}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop: table */}
                <div className="hidden sm:block rounded-lg border overflow-hidden">
                  <div className="grid grid-cols-[120px_1fr_1fr_60px] gap-px bg-muted/40 text-xs">
                    <div className="bg-muted/60 px-3 py-2 font-medium text-muted-foreground">Field</div>
                    <div className="bg-muted/60 px-3 py-2 font-medium text-muted-foreground">DB</div>
                    <div className="bg-muted/60 px-3 py-2 font-medium text-muted-foreground">Provider</div>
                    <div className="bg-muted/60 px-3 py-2 font-medium text-muted-foreground text-center">Match</div>
                    {comparisonRows.map((row) => (
                      <ComparisonRow key={row.label} {...row} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Groups Appearance */}
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base">Groups</CardTitle>
              {f.state === "FT" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleResettle}
                  disabled={resettling}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${resettling ? "animate-spin" : ""}`} />
                  Re-settle
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!groupsSummaryData || groupsSummaryData.totalGroups === 0 ? (
              <p className="text-xs sm:text-sm text-muted-foreground">
                No groups contain this fixture.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded border bg-muted/30 px-3 py-2 text-center">
                  <p className="text-lg font-bold">{groupsSummaryData.totalGroups}</p>
                  <p className="text-[10px] text-muted-foreground">Groups</p>
                </div>
                <div className="rounded border bg-muted/30 px-3 py-2 text-center">
                  <p className="text-lg font-bold">{groupsSummaryData.totalPredictions}</p>
                  <p className="text-[10px] text-muted-foreground">Predictions</p>
                </div>
                <div className="rounded border bg-muted/30 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{groupsSummaryData.settledPredictions}</p>
                  <p className="text-[10px] text-muted-foreground">Settled</p>
                </div>
                <div className="rounded border bg-muted/30 px-3 py-2 text-center">
                  <p className={`text-lg font-bold ${groupsSummaryData.unsettledPredictions > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
                    {groupsSummaryData.unsettledPredictions}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Unsettled</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {auditLogData?.data === undefined ? (
              <Skeleton className="h-20 w-full" />
            ) : auditLogData.data.length === 0 ? (
              <p className="text-xs sm:text-sm text-muted-foreground">
                No audit entries yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {auditLogData.data.map((entry: AdminFixtureAuditLogEntry) => (
                  <li
                    key={entry.id}
                    className="border-l-2 border-muted pl-3 py-1"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-muted-foreground font-mono text-[10px] sm:text-xs">
                        {format(new Date(entry.createdAt), "yyyy-MM-dd HH:mm:ss")}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {entry.source === "job" && entry.jobRun
                          ? `job: ${entry.jobRun.jobKey}`
                          : "admin"}
                      </Badge>
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {Object.entries(entry.changes).map(
                        ([field, { old: oldVal, new: newVal }]) => (
                          <li key={field} className="text-xs">
                            <span className="font-medium">{field}</span>{" "}
                            <span className="text-red-600 dark:text-red-400">{oldVal}</span>
                            <span className="mx-1 text-muted-foreground">→</span>
                            <span className="text-green-600 dark:text-green-400 font-medium">{newVal}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ScoreOverrideDialog
        fixture={fixtureForOverride}
        open={overrideDialogOpen}
        onOpenChange={setOverrideDialogOpen}
        onSuccess={handleSuccess}
      />

      {/* Sync Preview Dialog — uses already-loaded comparisonRows, no extra API call */}
      {(() => {
        const diffs = comparisonRows.filter((row) => !row.match);
        return (
          <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
            <DialogContent className="max-w-[95vw] sm:max-w-lg p-0 gap-0 overflow-hidden">
              <div className="px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
                <DialogHeader>
                  <DialogTitle className="text-base">Sync Fixture</DialogTitle>
                  <p className="text-sm text-muted-foreground">{f.name}</p>
                </DialogHeader>
              </div>

              <div className="border-t">
                {diffs.length === 0 ? (
                  <div className="px-4 py-6 sm:px-5 text-center text-sm text-muted-foreground">
                    No changes — provider data matches the database.
                  </div>
                ) : (
                  <div className="divide-y">
                    <div className="hidden sm:grid grid-cols-[140px_1fr_20px_1fr] gap-1 px-5 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/40">
                      <span>Field</span>
                      <span>Current (DB)</span>
                      <span></span>
                      <span>After Sync</span>
                    </div>
                    {diffs.map((row) => (
                      <div key={row.label} className="px-4 py-2.5 sm:px-5">
                        <div className="sm:hidden space-y-1">
                          <p className="text-[11px] font-medium text-muted-foreground">{row.label}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-red-600 dark:text-red-400 line-through">{row.db}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-sm text-green-600 dark:text-green-400 font-semibold">{row.provider ?? "—"}</span>
                          </div>
                        </div>
                        <div className="hidden sm:grid grid-cols-[140px_1fr_20px_1fr] gap-1 items-center">
                          <span className="text-xs font-medium">{row.label}</span>
                          <span className="text-xs text-red-600 dark:text-red-400 truncate">{row.db}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-green-600 dark:text-green-400 font-semibold truncate">{row.provider ?? "—"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t px-4 py-3 sm:px-5 flex gap-2">
                <Button variant="outline" onClick={() => setSyncDialogOpen(false)} className="flex-1 sm:flex-initial">
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleSyncConfirm()}
                  disabled={syncing}
                  className="flex-1 sm:flex-initial sm:ml-auto"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                  {diffs.length === 0 ? "Sync Anyway" : "Sync Now"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
