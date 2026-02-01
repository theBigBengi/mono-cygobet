import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
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

export default function FixtureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const fixtureId = id ? parseInt(id, 10) : NaN;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["fixture", fixtureId],
    queryFn: () => fixturesService.getById(fixtureId),
    enabled: Number.isFinite(fixtureId),
  });

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

      <div className="flex-1 min-h-0 overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{f.name}</CardTitle>
            <CardDescription>
              Fixture ID: {f.id} | External ID: {f.externalId}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">State:</span>
              <StatusBadge status={f.state} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Start Time
                </p>
                <p>
                  {format(new Date(f.startIso), "PPpp")} (
                  {new Date(f.startTs * 1000).toLocaleString()})
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Result
                </p>
                <p>{f.result ?? "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Score
                </p>
                <p>
                  {f.homeScore != null && f.awayScore != null
                    ? `${f.homeScore} - ${f.awayScore}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Last Updated
                </p>
                <p>{format(new Date(f.updatedAt), "PPpp")}</p>
              </div>
            </div>

            {f.homeTeam && f.awayTeam && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Teams
                </p>
                <p>
                  {f.homeTeam.name} vs {f.awayTeam.name}
                </p>
              </div>
            )}

            {f.league && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  League
                </p>
                <p>{f.league.name}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
