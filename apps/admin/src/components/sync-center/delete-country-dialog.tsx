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
import { countriesService } from "@/services/countries.service";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteCountryInfo {
  externalId: string;
  dbId: number;
  name: string;
  leaguesCount: number | null;
}

interface DeleteCountryDialogProps {
  country: DeleteCountryInfo | null;
  onClose: (deleted: boolean) => void;
}

export type { DeleteCountryInfo };

export function DeleteCountryDialog({
  country,
  onClose,
}: DeleteCountryDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!country?.dbId) return;
    setIsDeleting(true);
    try {
      await countriesService.deleteById(country.dbId);
      toast.success(`Deleted ${country.name}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete country"
      );
    } finally {
      setIsDeleting(false);
      onClose(true);
    }
  };

  const hasLeagues = (country?.leaguesCount ?? 0) > 0;

  return (
    <Dialog
      open={!!country}
      onOpenChange={(open) => {
        if (!open && !isDeleting) onClose(false);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Country
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {country && (
          <div className="space-y-3 py-2">
            <div className="rounded-lg border p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Country</span>
                <span className="font-medium">{country.name}</span>
              </div>
              {country.leaguesCount != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Leagues in DB</span>
                  <span className="font-medium">{country.leaguesCount}</span>
                </div>
              )}
            </div>

            {hasLeagues ? (
              <p className="text-sm text-destructive">
                Cannot delete this country because it has {country.leaguesCount}{" "}
                league(s). Delete the leagues first.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                The country will be permanently deleted from the database.
              </p>
            )}
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
            disabled={isDeleting || hasLeagues}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              "Delete Country"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
