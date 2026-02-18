import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { countriesService } from "@/services/countries.service";
import { leaguesService } from "@/services/leagues.service";
import { bookmakersService } from "@/services/bookmakers.service";
import { toast } from "sonner";
import { useState } from "react";
import { useProvider } from "@/contexts/provider-context";
import { SectionTooltip } from "./section-tooltip";
import {
  ChevronDown,
  Settings2,
  Loader2,
  Globe,
  Trophy,
  Bookmark,
} from "lucide-react";

export function StaticDataSection() {
  const { name: provider } = useProvider();
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const createSyncMutation = (
    name: string,
    syncFn: (dryRun: boolean) => Promise<{ data: { ok: number; fail: number } }>
  ) =>
    useMutation({
      mutationFn: () => syncFn(false),
      onSuccess: (result) => {
        toast.success(`${name} synced!`, {
          description: `OK: ${result.data.ok} | Fail: ${result.data.fail}`,
        });
        queryClient.invalidateQueries({ queryKey: ["sync-center"] });
        queryClient.invalidateQueries({ queryKey: ["batches"] });
      },
      onError: (error: Error) => {
        toast.error(`${name} sync failed`, { description: error.message });
      },
    });

  const countriesMutation = createSyncMutation(
    "Countries",
    (dryRun) =>
      countriesService.sync(dryRun) as Promise<{
        data: { ok: number; fail: number };
      }>
  );
  const leaguesMutation = createSyncMutation(
    "Leagues",
    (dryRun) =>
      leaguesService.sync(dryRun) as Promise<{
        data: { ok: number; fail: number };
      }>
  );
  const bookmakersMutation = createSyncMutation(
    "Bookmakers",
    (dryRun) =>
      bookmakersService.sync(dryRun) as Promise<{
        data: { ok: number; fail: number };
      }>
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-gray-500" />
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle>Static Data</CardTitle>
                    <SectionTooltip
                      text={`Reference data from ${provider} that rarely changes.

Countries:
- List of all countries from ${provider}
- ~200+ countries
- Sync once during initial setup
- Only resync if ${provider} adds new countries

Leagues:
- Football leagues and competitions
- Depends on your ${provider} subscription
- Sync when expanding to new leagues
- Each league belongs to a country

Bookmakers:
- Betting companies for odds data
- Only needed if you use odds features
- Independent from other data`}
                      contentClassName="max-w-sm"
                    />
                  </div>
                  <CardDescription>
                    Rarely needed: Countries, Leagues, Bookmakers
                  </CardDescription>
                </div>
              </div>
              <ChevronDown
                className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              These entities rarely change. Use only for initial setup or when
              expanding to new leagues.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-dashed">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-4 w-4" />
                    <span className="font-medium">Countries</span>
                    <SectionTooltip
                      text={`Sync Countries

Downloads all countries from ${provider} into your database.

What: ~200+ countries (England, Spain, Germany, etc.)
From: ${provider} /countries endpoint
When: Once during initial setup, rarely after
Why: Countries are parent of Leagues. You need countries first.`}
                      contentClassName="max-w-sm"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => countriesMutation.mutate()}
                    disabled={countriesMutation.isPending}
                  >
                    {countriesMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Sync"
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-dashed">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="h-4 w-4" />
                    <span className="font-medium">Leagues</span>
                    <SectionTooltip
                      text={`Sync Leagues

Downloads all leagues from ${provider} into your database.

What: All leagues in your ${provider} subscription (Premier League, La Liga, etc.)
From: ${provider} /leagues endpoint
When: Initial setup, or when adding new leagues to your subscription
Why: Leagues are parent of Seasons. You need leagues before seasons.

Requires: Countries must be synced first`}
                      contentClassName="max-w-sm"
                    />
                  </div>
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
                </CardContent>
              </Card>

              <Card className="border-dashed">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bookmark className="h-4 w-4" />
                    <span className="font-medium">Bookmakers</span>
                    <SectionTooltip
                      text={`Sync Bookmakers

Downloads betting companies from ${provider}.

What: List of bookmakers (Bet365, William Hill, etc.)
From: ${provider} /bookmakers endpoint
When: Only if you use betting odds features
Why: Links odds data to specific bookmakers

Independent: No dependencies on other data`}
                      contentClassName="max-w-sm"
                    />
                  </div>
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
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
