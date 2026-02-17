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
import { useSeedSeason } from "@/hooks/use-seed-season";
import { useSeedSeasonPreview } from "@/hooks/use-seed-season-preview";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Circle,
} from "lucide-react";
import type { AvailableSeason } from "@repo/types";

interface SeedSeasonDialogProps {
  season: AvailableSeason | null;
  onClose: () => void;
}

interface PreviewItemProps {
  label: string;
  name: string;
  exists: boolean;
  isLoading?: boolean;
}

function PreviewItem({ label, name, exists, isLoading }: PreviewItemProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">{label}: Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {exists ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-amber-500" />
      )}
      <span>
        {label}: <span className="font-medium">{name}</span>
      </span>
      {!exists && (
        <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
          will be created
        </span>
      )}
    </div>
  );
}

export function SeedSeasonDialog({ season, onClose }: SeedSeasonDialogProps) {
  const [futureOnly, setFutureOnly] = useState(true);
  const { seedSeason, isLoading, jobStatus, jobResult, errorMessage, reset } =
    useSeedSeason();

  const {
    data: previewData,
    isLoading: isPreviewLoading,
    error: previewError,
  } = useSeedSeasonPreview(season?.externalId ?? null);

  const preview = previewData?.data;

  const handleClose = () => {
    reset();
    setFutureOnly(true);
    onClose();
  };

  const handleSeed = () => {
    if (!season) return;
    seedSeason(season.externalId, { futureOnly });
  };

  const isOpen = season !== null;
  const isComplete = jobStatus === "completed";
  const isFailed = jobStatus === "failed";
  const isTimeout = jobStatus === "timeout";
  const isIdle = !isLoading && !isComplete && !isFailed && !isTimeout;

  // Check if there are missing dependencies
  const hasMissingDeps =
    preview &&
    (!preview.country.exists || !preview.league.exists || !preview.season.exists);

  // Display fixture count based on selection
  const fixturesCount = preview
    ? futureOnly
      ? preview.counts.fixturesFuture
      : preview.counts.fixtures
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Seed Season: {season?.league.name} {season?.name}
          </DialogTitle>
          <DialogDescription>
            Review what will be created and start seeding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isIdle && (
            <>
              {/* Preview Section */}
              <div className="space-y-3">
                <p className="text-sm font-medium">What will be created:</p>

                {previewError ? (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <XCircle className="h-4 w-4" />
                    <span>Failed to load preview</span>
                  </div>
                ) : (
                  <div className="space-y-2 pl-1">
                    <PreviewItem
                      label="Country"
                      name={preview?.country.name ?? "..."}
                      exists={preview?.country.exists ?? false}
                      isLoading={isPreviewLoading}
                    />
                    <PreviewItem
                      label="League"
                      name={preview?.league.name ?? "..."}
                      exists={preview?.league.exists ?? false}
                      isLoading={isPreviewLoading}
                    />
                    <PreviewItem
                      label="Season"
                      name={preview?.season.name ?? "..."}
                      exists={preview?.season.exists ?? false}
                      isLoading={isPreviewLoading}
                    />

                    {/* Teams & Fixtures counts */}
                    {!isPreviewLoading && preview && (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <Circle className="h-4 w-4 text-blue-500 fill-blue-500" />
                          <span>
                            Teams:{" "}
                            <span className="font-medium">
                              {preview.counts.teams}
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Circle className="h-4 w-4 text-blue-500 fill-blue-500" />
                          <span>
                            Fixtures:{" "}
                            <span className="font-medium">{fixturesCount}</span>
                            {futureOnly && (
                              <span className="text-muted-foreground ml-1">
                                (future only)
                              </span>
                            )}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Future only toggle */}
              {!isPreviewLoading && preview && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="future-only" className="text-sm font-medium">
                      Future fixtures only
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {futureOnly
                        ? `Seed only upcoming matches (${preview.counts.fixturesFuture} fixtures)`
                        : `Seed all matches including past (${preview.counts.fixtures} fixtures)`}
                    </p>
                  </div>
                  <Switch
                    id="future-only"
                    checked={futureOnly}
                    onCheckedChange={setFutureOnly}
                  />
                </div>
              )}

              {/* Info for missing dependencies */}
              {hasMissingDeps && (
                <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm p-3 rounded-lg">
                  <p className="font-medium mb-1">Missing dependencies</p>
                  <p className="text-xs">
                    Items marked with "will be created" don't exist in your
                    database yet. They will be automatically created during
                    seeding.
                  </p>
                </div>
              )}
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

          {isComplete && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Seeding completed!</span>
              </div>

              {jobResult ? (
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
              ) : (
                <p className="text-sm text-muted-foreground">
                  Check Sync History for details.
                </p>
              )}
            </div>
          )}

          {isFailed && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">Seeding failed</span>
              </div>
              {errorMessage && (
                <p className="text-sm text-muted-foreground">{errorMessage}</p>
              )}
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
              <Button
                onClick={handleSeed}
                disabled={isLoading || isPreviewLoading}
              >
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
