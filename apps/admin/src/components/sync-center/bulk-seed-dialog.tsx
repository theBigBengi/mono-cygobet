import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useBulkSeedSeasons } from "@/hooks/use-bulk-seed-seasons";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import type { AvailableSeason } from "@repo/types";

interface BulkSeedDialogProps {
  open: boolean;
  seasons: AvailableSeason[];
  onClose: () => void;
}

export function BulkSeedDialog({ open, seasons, onClose }: BulkSeedDialogProps) {
  const [futureOnly, setFutureOnly] = useState(true);
  const bulk = useBulkSeedSeasons();

  const handleStart = () => {
    bulk.startBatch({
      seasonExternalIds: seasons.map((s) => s.externalId),
      futureOnly,
    });
  };

  const handleClose = () => {
    bulk.reset();
    setFutureOnly(true);
    onClose();
  };

  const isIdle = bulk.status === "idle" || bulk.status === "starting";
  const isProcessing = bulk.status === "processing";
  const isDone = bulk.status === "completed" || bulk.status === "failed";

  const progressPercent =
    bulk.totalSeasons > 0
      ? Math.round(
          ((bulk.completedSeasons + bulk.failedSeasons) / bulk.totalSeasons) *
            100
        )
      : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] sm:max-h-[80vh] flex flex-col w-[calc(100%-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle>
            Seed {seasons.length} Season{seasons.length !== 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription>
            {isIdle
              ? "Review and start batch seeding."
              : isProcessing
                ? "Seeding in progress..."
                : "Batch seeding complete."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2">
          {/* Future only toggle - only before starting */}
          {bulk.status === "idle" && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="bulk-future-only" className="text-sm font-medium">
                  Future fixtures only
                </Label>
                <p className="text-xs text-muted-foreground">
                  {futureOnly
                    ? "Only seed upcoming matches"
                    : "Seed all matches including past"}
                </p>
              </div>
              <Switch
                id="bulk-future-only"
                checked={futureOnly}
                onCheckedChange={setFutureOnly}
              />
            </div>
          )}

          {/* Progress bar */}
          {(isProcessing || isDone) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {bulk.completedSeasons + bulk.failedSeasons} / {bulk.totalSeasons}
                </span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {isDone && (
                <div className="flex gap-3 text-sm">
                  <span className="text-green-600">
                    {bulk.completedSeasons} succeeded
                  </span>
                  {bulk.failedSeasons > 0 && (
                    <span className="text-red-600">
                      {bulk.failedSeasons} failed
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Season list */}
          <div className="space-y-1">
            {bulk.status === "idle"
              ? seasons.map((s) => (
                  <div
                    key={s.externalId}
                    className="flex items-center justify-between py-1.5 px-2 text-sm rounded hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground truncate">
                        {s.league.country}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {s.league.name} {s.name}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="ml-2 shrink-0 text-xs"
                    >
                      New
                    </Badge>
                  </div>
                ))
              : bulk.seasons.map((s) => (
                  <div
                    key={s.seasonExternalId}
                    className="flex items-center justify-between py-1.5 px-2 text-sm rounded hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <SeasonStatusIcon status={s.status} />
                      <span className="truncate">
                        {s.result?.season
                          ? `${s.result.season.league} - ${s.result.season.name}`
                          : `Season #${s.seasonExternalId}`}
                      </span>
                    </div>
                    <div className="ml-2 shrink-0">
                      {s.status === "done" && s.result && (
                        <span className="text-xs text-muted-foreground">
                          {s.result.fixtures?.ok ?? 0} fixtures
                        </span>
                      )}
                      {s.status === "failed" && (
                        <span className="text-xs text-red-600 max-w-[150px] truncate block">
                          {s.error ?? "Failed"}
                        </span>
                      )}
                      {s.status === "processing" && (
                        <span className="text-xs text-muted-foreground">
                          Processing...
                        </span>
                      )}
                    </div>
                  </div>
                ))}
          </div>
        </div>

        <DialogFooter>
          {isDone ? (
            <Button onClick={handleClose}>Close</Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleStart}
                disabled={
                  bulk.isLoading || seasons.length === 0
                }
              >
                {bulk.isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {bulk.status === "starting" ? "Starting..." : "Seeding..."}
                  </>
                ) : (
                  `Seed ${seasons.length} Season${seasons.length !== 1 ? "s" : ""}`
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SeasonStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-600 shrink-0" />;
    case "processing":
      return <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
}
