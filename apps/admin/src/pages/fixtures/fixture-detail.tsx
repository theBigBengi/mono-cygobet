import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
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
import type { AdminFixtureSettlementGroup } from "@repo/types";
import {
  ScoreOverrideDialog,
  type FixtureForOverride,
} from "./score-override-dialog";
import { toast } from "sonner";

export default function FixtureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const fixtureId = id ? parseInt(id, 10) : NaN;
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [resettling, setResettling] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["fixture", fixtureId],
    queryFn: () => fixturesService.getById(fixtureId),
    enabled: Number.isFinite(fixtureId),
  });

  const { data: settlementData } = useQuery({
    queryKey: ["fixture", fixtureId, "settlement"],
    queryFn: () => fixturesService.getSettlementSummary(fixtureId),
    enabled: Number.isFinite(fixtureId) && !!data?.data,
  });

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["fixture", fixtureId] });
    queryClient.invalidateQueries({ queryKey: ["fixture", fixtureId, "settlement"] });
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
      queryClient.invalidateQueries({ queryKey: ["fixture", fixtureId, "settlement"] });
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
        <Button variant="link" asChild>
          <Link to="/fixtures">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Fixtures
          </Link>
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
        <Button variant="link" asChild>
          <Link to="/fixtures">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Fixtures
          </Link>
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
    homeScore: f.homeScore,
    awayScore: f.awayScore,
    state: f.state,
  };
  const settlementGroups = settlementData?.groups ?? [];

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-6">
      <div className="flex-shrink-0 mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/fixtures">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Fixtures
          </Link>
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto space-y-4">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{f.name}</CardTitle>
            <CardDescription>
              Fixture ID: {f.id} | External ID: {f.externalId}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">State:</span>
              <StatusBadge status={f.state} />
            </div>
            {f.scoreOverriddenAt && (
              <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
                Manually overridden
              </Badge>
            )}
            {f.league && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">League:</span>
                <span className="text-sm">{f.league.name}</span>
              </div>
            )}
            {(f.round || f.stage) && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Round:</span>
                <span className="text-sm">{f.round ?? f.stage ?? "—"}</span>
              </div>
            )}
            {f.scoreOverriddenAt && (
              <p className="text-xs text-muted-foreground w-full mt-1">
                Last overridden
                {f.scoreOverriddenBy?.name || f.scoreOverriddenBy?.email
                  ? ` by ${f.scoreOverriddenBy.name ?? f.scoreOverriddenBy.email}`
                  : ""}
                {" "}
                at {format(new Date(f.scoreOverriddenAt), "PPpp")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Score</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOverrideDialogOpen(true)}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {f.homeScore != null && f.awayScore != null
                ? `${f.homeScore} - ${f.awayScore}`
                : "—"}
            </p>
            {f.result && (
              <p className="text-sm text-muted-foreground mt-1">
                Result: {f.result}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
            <CardDescription>
              State history from job runs will appear here when recorded.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Current state: <StatusBadge status={f.state} />
            </p>
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

      <ScoreOverrideDialog
        fixture={fixtureForOverride}
        open={overrideDialogOpen}
        onOpenChange={setOverrideDialogOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
