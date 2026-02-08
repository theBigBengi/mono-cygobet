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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useSeedSeason } from "@/hooks/use-seed-season";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { AvailableSeason } from "@repo/types";

interface SeedSeasonDialogProps {
  season: AvailableSeason | null;
  onClose: () => void;
}

export function SeedSeasonDialog({ season, onClose }: SeedSeasonDialogProps) {
  const [dryRun, setDryRun] = useState(false);
  const { seedSeason, isLoading, jobStatus, jobResult, reset } =
    useSeedSeason();

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSeed = () => {
    if (!season) return;
    seedSeason(season.externalId, { dryRun });
  };

  const isOpen = season !== null;
  const isComplete = jobStatus === "completed";
  const isFailed = jobStatus === "failed";
  const isTimeout = jobStatus === "timeout";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Seed Season: {season?.league.name} {season?.name}
          </DialogTitle>
          <DialogDescription>
            This will create the season and sync all teams and fixtures.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isLoading && !isComplete && !isFailed && !isTimeout && (
            <>
              <p className="text-sm text-muted-foreground">This will:</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Create season record</li>
                <li>Sync all teams (~20 teams)</li>
                <li>Sync all fixtures (~380 matches)</li>
              </ul>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dry-run"
                  checked={dryRun}
                  onCheckedChange={(c) => setDryRun(c === true)}
                />
                <Label htmlFor="dry-run">Dry Run (simulate only)</Label>
              </div>
            </>
          )}

          {isLoading && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Seeding in progress...
              </p>
            </div>
          )}

          {isComplete && jobResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Seeding completed!</span>
              </div>

              <div className="text-sm space-y-2">
                <p>
                  Season: {jobResult.season?.name}{" "}
                  {jobResult.season?.created ? "(created)" : "(existed)"}
                </p>
                {jobResult.teams && (
                  <p>
                    Teams: {jobResult.teams.ok} synced, {jobResult.teams.fail}{" "}
                    failed
                  </p>
                )}
                {jobResult.fixtures && (
                  <p>
                    Fixtures: {jobResult.fixtures.ok} synced,{" "}
                    {jobResult.fixtures.fail} failed
                  </p>
                )}
              </div>
            </div>
          )}

          {isFailed && (
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">Seeding failed</span>
            </div>
          )}

          {isTimeout && (
            <div className="flex items-center gap-2 text-amber-600">
              <span className="font-medium">
                Polling stopped. Check Sync History for job status.
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          {isComplete || isFailed || isTimeout ? (
            <Button onClick={handleClose}>Close</Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleSeed} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Seeding...
                  </>
                ) : (
                  "Start Seeding"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
