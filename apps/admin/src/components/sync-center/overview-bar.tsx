import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSyncOverview } from "@/hooks/use-sync-overview";
import {
  Globe,
  Trophy,
  CalendarDays,
  Swords,
  Users,
  Bookmark,
} from "lucide-react";

const ENTITY_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string; order: number }
> = {
  countries: { icon: Globe, label: "Countries", order: 0 },
  leagues: { icon: Trophy, label: "Leagues", order: 1 },
  seasons: { icon: CalendarDays, label: "Seasons", order: 2 },
  fixtures: { icon: Swords, label: "Fixtures", order: 3 },
  teams: { icon: Users, label: "Teams", order: 4 },
  bookmakers: { icon: Bookmark, label: "Bookmakers", order: 5 },
};

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return n.toString();
}

export function OverviewBar() {
  const { data, isLoading } = useSyncOverview();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-16 sm:h-20" />
        ))}
      </div>
    );
  }

  const entities = data?.data?.entities ?? [];

  // Sort by predefined order
  const sorted = [...entities].sort((a, b) => {
    const oa = ENTITY_CONFIG[a.name]?.order ?? 99;
    const ob = ENTITY_CONFIG[b.name]?.order ?? 99;
    return oa - ob;
  });

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
      {sorted.map((entity) => {
        const config = ENTITY_CONFIG[entity.name];
        if (!config) return null;
        const Icon = config.icon;
        return (
          <Card key={entity.name} className="border">
            <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold leading-none">
                  {formatCount(entity.dbCount)}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  {config.label}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
