import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, subDays, addDays } from "date-fns";
import { ArrowLeft, Pencil, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fixturesService } from "@/services/fixtures.service";
import { StatusBadge } from "@/components/table/status-badge";
import { normalizeResult } from "@/utils/fixtures";
import type {
  AdminFixtureSettlementGroup,
  AdminFixtureAuditLogEntry,
} from "@repo/types";

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
      className={
        match
          ? "bg-green-500/15 text-green-700 dark:text-green-400"
          : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
      }
    >
      {match ? "OK" : "Diff"}
    </Badge>
  );
}

export default function FixtureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fixtureId = id ? parseInt(id, 10) : NaN;
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [resettling, setResettling] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["fixture", fixtureId],
    queryFn: () => fixturesService.getById(fixtureId),
    enabled: Number.isFinite(fixtureId),
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
  });

  const { data: providerData } = useQuery({
    queryKey: ["fixture", fixtureId, "provider", dateRange.from, dateRange.to],
    queryFn: () =>
      fixturesService.getFromProvider(dateRange.from, dateRange.to),
    enabled:
      Number.isFinite(fixtureId) && Boolean(dateRange.from && dateRange.to),
  });

  const providerFixture = useMemo(() => {
    const extId = data?.data?.externalId;
    const list = providerData?.data ?? [];
    if (extId == null || list.length === 0) return undefined;
    return list.find((f) => String(f.externalId) === String(extId));
  }, [data?.data?.externalId, providerData?.data]);

  const { data: settlementData } = useQuery({
    queryKey: ["fixture", fixtureId, "settlement"],
    queryFn: () => fixturesService.getSettlementSummary(fixtureId),
    enabled: Number.isFinite(fixtureId) && !!data?.data,
  });

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["fixture", fixtureId] });
    queryClient.invalidateQueries({
      queryKey: ["fixture", fixtureId, "settlement"],
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
        queryKey: ["fixture", fixtureId, "settlement"],
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
    state: f.state,
  };
  const settlementGroups = settlementData?.groups ?? [];

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

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-6">
      <div className="flex-shrink-0 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto space-y-4">
        {/* Header + Actions row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{f.name}</CardTitle>
              <CardDescription>
                Fixture ID: {f.id} | External ID: {f.externalId}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              {f.issue && (
                <div className="w-full flex flex-col gap-1">
                  <Badge
                    variant="secondary"
                    className="w-fit bg-amber-500/15 text-amber-700 dark:text-amber-400"
                  >
                    {f.issue}
                  </Badge>
                  {ISSUE_DESCRIPTIONS[f.issue] && (
                    <p className="text-sm text-muted-foreground">
                      {ISSUE_DESCRIPTIONS[f.issue]}
                    </p>
                  )}
                </div>
              )}
              {f.scoreOverriddenAt && (
                <Badge
                  variant="secondary"
                  className="bg-amber-500/15 text-amber-700 dark:text-amber-400"
                >
                  Manually overridden
                </Badge>
              )}
              {f.league && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">League:</span>
                  <span className="text-sm">{f.league.name}</span>
                </div>
              )}
              {f.scoreOverriddenAt && (
                <p className="text-xs text-muted-foreground w-full mt-1">
                  Last overridden
                  {f.scoreOverriddenBy?.name || f.scoreOverriddenBy?.email
                    ? ` by ${f.scoreOverriddenBy.name ?? f.scoreOverriddenBy.email}`
                    : ""}{" "}
                  at {format(new Date(f.scoreOverriddenAt), "PPpp")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
              <CardDescription>
                Override score and state, or trigger re-settlement for this
                fixture.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setOverrideDialogOpen(true)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Override score & state
              </Button>
              {f.state === "FT" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResettle}
                  disabled={resettling}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-1 ${resettling ? "animate-spin" : ""}`}
                  />
                  Trigger re-settlement
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Provider Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provider Comparison</CardTitle>
            <CardDescription>
              Side-by-side comparison of database vs provider data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 text-sm">
              <div className="font-medium text-muted-foreground">Field</div>
              <div className="font-medium text-muted-foreground">Database</div>
              <div className="font-medium text-muted-foreground">Provider</div>
              <div className="font-medium text-muted-foreground">Match</div>
              <div className="py-1">Name</div>
              <div className="py-1 truncate">{f.name}</div>
              <div className="py-1 truncate">
                {providerFixture?.name ?? "—"}
              </div>
              <div className="py-1">
                <ComparisonBadge
                  match={
                    providerFixture ? f.name === providerFixture.name : true
                  }
                />
              </div>
              <div className="py-1">State</div>
              <div className="py-1">{f.state}</div>
              <div className="py-1">{providerFixture?.state ?? "—"}</div>
              <div className="py-1">
                <ComparisonBadge
                  match={
                    providerFixture ? f.state === providerFixture.state : true
                  }
                />
              </div>
              <div className="py-1">Round</div>
              <div className="py-1">{f.round ?? f.stage ?? "—"}</div>
              <div className="py-1">
                {providerFixture?.round ?? providerFixture?.stage ?? "—"}
              </div>
              <div className="py-1">
                <ComparisonBadge
                  match={
                    providerFixture
                      ? (f.round ?? f.stage ?? "") ===
                        (providerFixture.round ?? providerFixture.stage ?? "")
                      : true
                  }
                />
              </div>
              <div className="py-1">Result</div>
              <div className="py-1">{normalizeResult(f.result) || "—"}</div>
              <div className="py-1">
                {normalizeResult(providerFixture?.result) || "—"}
              </div>
              <div className="py-1">
                <ComparisonBadge
                  match={
                    providerFixture
                      ? normalizeResult(f.result) ===
                        normalizeResult(providerFixture.result)
                      : true
                  }
                />
              </div>
              <div className="py-1">Start Time</div>
              <div className="py-1">{startTimeDisplay ?? f.startIso}</div>
              <div className="py-1">
                {startTimeDisplay ?? providerFixture?.startIso ?? "—"}
              </div>
              <div className="py-1">
                <ComparisonBadge match={startTimeMatch} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
            <CardDescription>
              Change history from job runs and admin overrides.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Current state: <StatusBadge status={f.state} />
            </p>
            {auditLogData?.data === undefined ? (
              <Skeleton className="h-20 w-full" />
            ) : auditLogData.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No audit entries yet.
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {auditLogData.data.map((entry: AdminFixtureAuditLogEntry) => (
                  <li
                    key={entry.id}
                    className="border-l-2 border-muted pl-3 py-1"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-muted-foreground font-mono text-xs">
                        {format(
                          new Date(entry.createdAt),
                          "yyyy-MM-dd HH:mm:ss"
                        )}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {entry.source === "job" && entry.jobRun
                          ? `job: ${entry.jobRun.jobKey}`
                          : "admin"}
                      </Badge>
                    </div>
                    <ul className="mt-1 space-y-0.5 text-muted-foreground">
                      {Object.entries(entry.changes).map(
                        ([field, { old: oldVal, new: newVal }]) => (
                          <li key={field}>
                            <span className="font-medium text-foreground">
                              {field}
                            </span>{" "}
                            <span>{oldVal}</span>
                            <span className="mx-1">→</span>
                            <span>{newVal}</span>
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

        {/* Settlement */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Settlement</CardTitle>
            {f.state === "FT" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResettle}
                disabled={resettling}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-1 ${resettling ? "animate-spin" : ""}`}
                />
                Re-settle
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {settlementGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No groups contain this fixture.
              </p>
            ) : (
              <ul className="text-sm space-y-1">
                {settlementGroups.map((g: AdminFixtureSettlementGroup) => (
                  <li key={g.groupId}>
                    <span className="font-medium">{g.groupName}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      — {g.predictionsSettled} prediction(s) settled
                    </span>
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
    </div>
  );
}
