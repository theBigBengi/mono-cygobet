import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAvailability } from "@/hooks/use-availability";
import { useProvider } from "@/contexts/provider-context";
import { fixturesService } from "@/services/fixtures.service";
import { SectionTooltip } from "./section-tooltip";
import { toast } from "sonner";
import { Zap, Loader2 } from "lucide-react";

export function FixturesSyncCard() {
  const queryClient = useQueryClient();
  const { data: availability } = useAvailability();
  const { name: provider } = useProvider();
  const [seasonId, setSeasonId] = useState<string>("all");
  const [fetchAllStates, setFetchAllStates] = useState(true);
  const [dryRun, setDryRun] = useState(false);

  const dbSeasons =
    availability?.data?.seasons?.filter((s) => s.status === "in_db") ?? [];

  const syncMutation = useMutation({
    mutationFn: () =>
      fixturesService.syncFiltered({
        seasonId: seasonId !== "all" ? Number(seasonId) : undefined,
        fetchAllFixtureStates: fetchAllStates,
        dryRun,
      }),
    onSuccess: (result) => {
      toast.success("Fixtures synced!", {
        description: `OK: ${result.data.ok} | Fail: ${result.data.fail}`,
      });
      queryClient.invalidateQueries({ queryKey: ["sync-center"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
    },
    onError: (error: Error) => {
      toast.error("Sync failed", { description: error.message });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Sync Fixtures</CardTitle>
              <SectionTooltip
                text={`Update match data for seasons already in your database.

Use this to:
- Get latest scores and results
- Update match states (scheduled → live → finished)
- Fetch newly published matches

Select a season or sync all at once.
This is your most common daily operation.

Source: ${provider} /schedules/seasons/{id} endpoint`}
                contentClassName="max-w-sm"
              />
            </div>
            <CardDescription>
              Update fixtures for existing seasons
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Season</Label>
          <Select value={seasonId} onValueChange={setSeasonId}>
            <SelectTrigger>
              <SelectValue placeholder="Select season" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All seasons in DB</SelectItem>
              {dbSeasons.map((s) => (
                <SelectItem key={s.dbId ?? s.externalId} value={String(s.dbId)}>
                  {s.league.name} - {s.name} ({s.fixturesCount ?? 0} fixtures)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="all-states"
              checked={fetchAllStates}
              onCheckedChange={(c) => setFetchAllStates(c === true)}
            />
            <Label htmlFor="all-states" className="text-sm">
              All states (NS, LIVE, FT...)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="fixtures-dry-run"
              checked={dryRun}
              onCheckedChange={(c) => setDryRun(c === true)}
            />
            <Label htmlFor="fixtures-dry-run" className="text-sm">
              Dry Run
            </Label>
          </div>
        </div>

        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            "Sync Fixtures"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
