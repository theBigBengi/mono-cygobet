import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

        {hasNew && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <span className="text-sm">
              <strong>{summary?.new}</strong> new seasons available
            </span>
          </div>
        )}

        {(summary?.seasonsWithFixturesAvailable ?? 0) > 0 && (
          <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg mt-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <span className="text-sm">
              <strong>{summary.seasonsWithFixturesAvailable}</strong> seasons
              have fixtures available for sync
            </span>
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
