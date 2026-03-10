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
import { leaguesService } from "@/services/leagues.service";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteLeagueInfo {
  externalId: string;
  dbId: number;
  name: string;
  countryName: string;
  seasonsCount: number | null;
  fixturesCount: number | null;
}

interface DeleteLeagueDialogProps {
  league: DeleteLeagueInfo | null;
  onClose: (deleted: boolean) => void;
}

export type { DeleteLeagueInfo };

export function DeleteLeagueDialog({
  league,
  onClose,
}: DeleteLeagueDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!league?.dbId) return;
    setIsDeleting(true);
    try {
      const result = await leaguesService.deleteById(league.dbId);
      toast.success(
        `Deleted ${league.name} (${result.data.deletedSeasons} seasons, ${result.data.deletedFixtures} fixtures)`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete league"
      );
    } finally {
      setIsDeleting(false);
      onClose(true);
    }
  };

  return (
    <Dialog
      open={!!league}
      onOpenChange={(open) => {
        if (!open && !isDeleting) onClose(false);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete League
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {league && (
          <div className="space-y-3 py-2">
            <div className="rounded-lg border p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">League</span>
                <span className="font-medium">{league.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Country</span>
                <span className="font-medium">{league.countryName}</span>
              </div>
              {(league.seasonsCount ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seasons</span>
                  <span className="font-medium text-destructive">
                    {league.seasonsCount} will be deleted
                  </span>
                </div>
              )}
              {(league.fixturesCount ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fixtures</span>
                  <span className="font-medium text-destructive">
                    {league.fixturesCount} will be deleted
                  </span>
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              The league and all its seasons, fixtures (including odds and
              predictions) will be permanently deleted.
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
              "Delete League"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
