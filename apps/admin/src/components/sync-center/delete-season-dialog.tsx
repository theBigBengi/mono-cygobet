import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { syncService } from "@/services/sync.service";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { AvailableSeason } from "@repo/types";

interface DeleteSeasonDialogProps {
  season: AvailableSeason | null;
  onClose: (deleted: boolean) => void;
}

export function DeleteSeasonDialog({
  season,
  onClose,
}: DeleteSeasonDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!season?.dbId) return;
    setIsDeleting(true);
    try {
      const result = await syncService.deleteSeason(season.dbId);
      toast.success(
        `Deleted ${season.name} and ${result.data.deletedFixtures} fixtures`
      );
      onClose(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete season"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open={!!season}
      onOpenChange={(open) => {
        if (!open && !isDeleting) onClose(false);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Season
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {season && (
          <div className="space-y-3 py-2">
            <div className="rounded-lg border p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Season</span>
                <span className="font-medium">{season.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">League</span>
                <span className="font-medium">{season.league.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Country</span>
                <span className="font-medium">{season.league.country}</span>
              </div>
              {(season.fixturesCount ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fixtures</span>
                  <span className="font-medium text-destructive">
                    {season.fixturesCount} will be deleted
                  </span>
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              The season and all its fixtures (including odds and predictions)
              will be permanently deleted.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onClose(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              "Delete Season"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
