import { formatDistanceToNow } from "date-fns";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export interface EntityOverviewCardProps {
  title: string;
  icon: LucideIcon;
  dbCount: number;
  lastSyncedAt: string | null;
  lastSyncStatus: string | null;
  breakdown?: Record<string, number>;
  currentCount?: number;
  onSync: () => void;
  syncLoading: boolean;
}

export function EntityOverviewCard({
  title,
  icon: Icon,
  dbCount,
  lastSyncedAt,
  lastSyncStatus,
  breakdown,
  currentCount,
  onSync,
  syncLoading,
}: EntityOverviewCardProps) {
  const lastSyncedLabel = lastSyncedAt
    ? formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })
    : "Never";
  const statusLabel =
    lastSyncStatus === "success"
      ? "Success"
      : lastSyncStatus === "failed"
        ? "Failed"
        : null;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold">{dbCount.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">in DB</span>
        </div>
        {currentCount !== undefined && (
          <p className="text-xs text-muted-foreground">
            {currentCount} current
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Last synced: {lastSyncedLabel}
          {statusLabel && (
            <span
              className={
                lastSyncStatus === "failed"
                  ? " ml-1 text-destructive"
                  : " ml-1 text-green-600"
              }
            >
              ({statusLabel})
            </span>
          )}
        </p>
        {breakdown && Object.keys(breakdown).length > 0 && (
          <div className="flex flex-wrap gap-x-2 gap-y-0 text-xs text-muted-foreground">
            {Object.entries(breakdown).map(([state, count]) => (
              <span key={state}>
                {state}: {count.toLocaleString()}
              </span>
            ))}
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full"
          onClick={onSync}
          disabled={syncLoading}
        >
          {syncLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            "Sync"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
