import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAvailability } from "@/hooks/use-availability";
import {
  Sparkles,
  CirclePlay,
  Clock,
  AlertCircle,
} from "lucide-react";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  color: "amber" | "green" | "blue" | "orange";
}

const colorMap = {
  amber:
    "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
  green:
    "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
  blue: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
  orange:
    "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800",
};

const iconColorMap = {
  amber: "text-amber-600 dark:text-amber-400",
  green: "text-green-600 dark:text-green-400",
  blue: "text-blue-600 dark:text-blue-400",
  orange: "text-orange-600 dark:text-orange-400",
};

const valueColorMap = {
  amber: "text-amber-700 dark:text-amber-300",
  green: "text-green-700 dark:text-green-300",
  blue: "text-blue-700 dark:text-blue-300",
  orange: "text-orange-700 dark:text-orange-300",
};

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <Card className={`border ${colorMap[color]}`}>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`h-5 w-5 ${iconColorMap[color]}`} />
        <div>
          <p className={`text-2xl font-bold ${valueColorMap[color]}`}>
            {value}
          </p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function GapSummaryBar() {
  const { data, isLoading } = useAvailability();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  const summary = data?.data?.summary;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        icon={Sparkles}
        label="New Seasons"
        value={summary?.new ?? 0}
        color="amber"
      />
      <StatCard
        icon={CirclePlay}
        label="Active"
        value={summary?.active ?? 0}
        color="green"
      />
      <StatCard
        icon={Clock}
        label="Upcoming"
        value={summary?.upcoming ?? 0}
        color="blue"
      />
      <StatCard
        icon={AlertCircle}
        label="Need Fixtures"
        value={summary?.seasonsWithFixturesAvailable ?? 0}
        color="orange"
      />
    </div>
  );
}
