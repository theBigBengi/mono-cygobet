import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAvailability } from "@/hooks/use-availability";
import { countriesService } from "@/services/countries.service";
import { leaguesService } from "@/services/leagues.service";
import { bookmakersService } from "@/services/bookmakers.service";
import { fixturesService } from "@/services/fixtures.service";
import { toast } from "sonner";
import {
  Loader2,
  Globe,
  Trophy,
  Bookmark,
  Zap,
} from "lucide-react";

export function QuickActionsBar() {
  const queryClient = useQueryClient();
  const { data: availability } = useAvailability();
  const [fixtureSeasonId, setFixtureSeasonId] = useState<string>("all");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["sync-center"] });
    queryClient.invalidateQueries({ queryKey: ["batches"] });
  };

  const countriesMutation = useMutation({
    mutationFn: () =>
      countriesService.sync(false) as Promise<{
        data: { ok: number; fail: number };
      }>,
    onSuccess: (r) => {
      toast.success("Countries synced!", {
        description: `OK: ${r.data.ok} | Fail: ${r.data.fail}`,
      });
      invalidate();
    },
    onError: (e: Error) => toast.error("Countries sync failed", { description: e.message }),
  });

  const leaguesMutation = useMutation({
    mutationFn: () =>
      leaguesService.sync(false) as Promise<{
        data: { ok: number; fail: number };
      }>,
    onSuccess: (r) => {
      toast.success("Leagues synced!", {
        description: `OK: ${r.data.ok} | Fail: ${r.data.fail}`,
      });
      invalidate();
    },
    onError: (e: Error) => toast.error("Leagues sync failed", { description: e.message }),
  });

  const bookmakersMutation = useMutation({
    mutationFn: () =>
      bookmakersService.sync(false) as Promise<{
        data: { ok: number; fail: number };
      }>,
    onSuccess: (r) => {
      toast.success("Bookmakers synced!", {
        description: `OK: ${r.data.ok} | Fail: ${r.data.fail}`,
      });
      invalidate();
    },
    onError: (e: Error) => toast.error("Bookmakers sync failed", { description: e.message }),
  });

  const fixturesMutation = useMutation({
    mutationFn: () =>
      fixturesService.syncFiltered({
        seasonId: fixtureSeasonId !== "all" ? Number(fixtureSeasonId) : undefined,
        fetchAllFixtureStates: true,
      }),
    onSuccess: (r) => {
      toast.success("Fixtures synced!", {
        description: `OK: ${r.data.ok} | Fail: ${r.data.fail}`,
      });
      invalidate();
    },
    onError: (e: Error) => toast.error("Fixtures sync failed", { description: e.message }),
  });

  const dbSeasons =
    availability?.data?.seasons?.filter((s) => s.status === "in_db") ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sync Fixtures */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4 text-yellow-500" />
              Sync Fixtures
            </div>
            <p className="text-xs text-muted-foreground">
              Update match data for existing seasons
            </p>
            <Select value={fixtureSeasonId} onValueChange={setFixtureSeasonId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All seasons</SelectItem>
                {dbSeasons.map((s) => (
                  <SelectItem
                    key={s.dbId ?? s.externalId}
                    value={String(s.dbId)}
                  >
                    {s.league.name} - {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => fixturesMutation.mutate()}
              disabled={fixturesMutation.isPending}
            >
              {fixturesMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Sync"
              )}
            </Button>
          </div>

          {/* Sync Countries */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Globe className="h-4 w-4" />
              Sync Countries
            </div>
            <p className="text-xs text-muted-foreground">
              Download all countries from provider
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-auto"
              onClick={() => countriesMutation.mutate()}
              disabled={countriesMutation.isPending}
            >
              {countriesMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Sync"
              )}
            </Button>
          </div>

          {/* Sync Leagues */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Trophy className="h-4 w-4" />
              Sync Leagues
            </div>
            <p className="text-xs text-muted-foreground">
              Download all leagues from provider
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => leaguesMutation.mutate()}
              disabled={leaguesMutation.isPending}
            >
              {leaguesMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Sync"
              )}
            </Button>
          </div>

          {/* Sync Bookmakers */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bookmark className="h-4 w-4" />
              Sync Bookmakers
            </div>
            <p className="text-xs text-muted-foreground">
              Download betting companies from provider
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => bookmakersMutation.mutate()}
              disabled={bookmakersMutation.isPending}
            >
              {bookmakersMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Sync"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
