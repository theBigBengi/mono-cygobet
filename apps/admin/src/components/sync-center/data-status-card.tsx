import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAvailability } from "@/hooks/use-availability";
import { useProvider } from "@/contexts/provider-context";
import { SectionTooltip } from "./section-tooltip";
import {
  Database,
  Calendar,
  AlertCircle,
  CalendarDays,
  Clock,
  Sparkles,
  Download,
} from "lucide-react";

function StatItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function DataStatusCard() {
  const { data, isLoading } = useAvailability();
  const { name: provider } = useProvider();

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  const summary = data?.data?.summary;
  const hasNew = (summary?.new ?? 0) > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Status
          <SectionTooltip
            text={`Shows your current database state:
- Active: Seasons currently running (not finished, not upcoming)
- Upcoming: Seasons that haven't started yet
- New: Seasons available from ${provider} that you haven't synced yet
- Fixtures: Total matches in your active seasons

Data source: Your database + ${provider} API
Last checked: When this page loaded`}
            contentClassName="max-w-sm"
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <StatItem
            icon={Calendar}
            label="Active"
            value={summary?.active ?? 0}
          />
          <StatItem
            icon={Clock}
            label="Upcoming"
            value={summary?.upcoming ?? 0}
          />
          <StatItem icon={AlertCircle} label="New" value={summary?.new ?? 0} />
          <StatItem
            icon={CalendarDays}
            label="Fixtures"
            value={summary?.fixtures ?? 0}
          />
        </div>

        {(hasNew || (summary?.seasonsWithFixturesAvailable ?? 0) > 0) && (
          <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <span className="font-semibold text-amber-900 dark:text-amber-100">
                New Data Available from {provider}
              </span>
            </div>
            <div className="space-y-2">
              {hasNew && (
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-700">
                    <Download className="h-3 w-3 mr-1" />
                    {summary?.new} new season{summary?.new !== 1 ? "s" : ""}
                  </Badge>
                  <span className="text-sm text-amber-700 dark:text-amber-300">
                    ready to seed
                  </span>
                </div>
              )}
              {(summary?.seasonsWithFixturesAvailable ?? 0) > 0 && (
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 border-orange-200 dark:border-orange-700">
                    <CalendarDays className="h-3 w-3 mr-1" />
                    {summary?.seasonsWithFixturesAvailable} season
                    {summary?.seasonsWithFixturesAvailable !== 1 ? "s" : ""}
                  </Badge>
                  <span className="text-sm text-orange-700 dark:text-orange-300">
                    with fixtures available for sync
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
              Scroll down to the Seasons table to seed or sync
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-2">
          Last checked:{" "}
          {data?.data?.lastChecked
            ? new Date(data.data.lastChecked).toLocaleString()
            : "Never"}
        </p>
      </CardContent>
    </Card>
  );
}
