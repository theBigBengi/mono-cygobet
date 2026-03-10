import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Database,
  Cloud,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

export interface PreviewData {
  providerCount: number;
  dbCount: number;
  newCount: number;
  existingCount: number;
}

export interface SyncEntityAction {
  key: string;
  label: string;
  icon: React.ElementType;
  fetchPreview: () => Promise<PreviewData>;
  syncFn: () => Promise<{ data: { ok: number; fail: number; total: number } }>;
}

type DialogState =
  | { step: "closed" }
  | { step: "loading"; action: SyncEntityAction }
  | { step: "preview"; action: SyncEntityAction; preview: PreviewData }
  | { step: "running"; action: SyncEntityAction; preview: PreviewData }
  | {
      step: "done";
      action: SyncEntityAction;
      preview: PreviewData;
      ok: number;
      fail: number;
      total: number;
    }
  | { step: "error"; action: SyncEntityAction; message: string; canRetry?: boolean };

// ── Helpers ──────────────────────────────────────────────────────────

export async function compareExternalIds(
  providerItems: { externalId: string | number | null }[],
  dbItems: { externalId: string | number | null }[]
): Promise<PreviewData> {
  const dbIdSet = new Set(dbItems.map((d) => String(d.externalId)));
  let newCount = 0;
  let existingCount = 0;
  for (const p of providerItems) {
    if (dbIdSet.has(String(p.externalId))) {
      existingCount++;
    } else {
      newCount++;
    }
  }
  return {
    providerCount: providerItems.length,
    dbCount: dbItems.length,
    newCount,
    existingCount,
  };
}

// ── Component ────────────────────────────────────────────────────────

interface SyncEntityDialogProps {
  action: SyncEntityAction | null;
  onClose: () => void;
}

export function SyncEntityDialog({ action, onClose }: SyncEntityDialogProps) {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>({ step: "closed" });
  const lastActionKey = useRef<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["sync-center"] });
    queryClient.invalidateQueries({ queryKey: ["sync-overview"] });
    queryClient.invalidateQueries({ queryKey: ["batches"] });
  };

  // Auto-open and fetch preview when action prop changes
  useEffect(() => {
    if (!action) {
      lastActionKey.current = null;
      return;
    }
    if (action.key === lastActionKey.current) return;
    lastActionKey.current = action.key;

    setDialog({ step: "loading", action });
    action
      .fetchPreview()
      .then((preview) => {
        setDialog({ step: "preview", action, preview });
      })
      .catch((err) => {
        setDialog({
          step: "error",
          action,
          message: err instanceof Error ? err.message : "Failed to load preview",
          canRetry: true,
        });
      });
  }, [action]);

  const isOpen = dialog.step !== "closed";

  const handleConfirm = async () => {
    if (dialog.step !== "preview") return;
    const { action: act, preview } = dialog;
    setDialog({ step: "running", action: act, preview });

    try {
      const result = await act.syncFn();
      setDialog({
        step: "done",
        action: act,
        preview,
        ok: result.data.ok,
        fail: result.data.fail,
        total: result.data.total,
      });
      invalidate();
    } catch (err) {
      setDialog({
        step: "error",
        action: act,
        message: err instanceof Error ? err.message : "Sync failed",
      });
    }
  };

  const handleRetry = () => {
    if (dialog.step !== "error" || !dialog.canRetry) return;
    const act = dialog.action;
    setDialog({ step: "loading", action: act });
    act
      .fetchPreview()
      .then((preview) => setDialog({ step: "preview", action: act, preview }))
      .catch((err) =>
        setDialog({
          step: "error",
          action: act,
          message: err instanceof Error ? err.message : "Failed to load preview",
          canRetry: true,
        })
      );
  };

  const handleClose = () => {
    if (dialog.step === "running") return;
    lastActionKey.current = null;
    setDialog({ step: "closed" });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[90vw] max-w-sm sm:max-w-md p-4 sm:p-6">
        {dialog.step !== "closed" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-sm sm:text-base flex items-center gap-2">
                {(() => {
                  const Icon = dialog.action.icon;
                  return <Icon className="h-4 w-4" />;
                })()}
                Sync {dialog.action.label}
              </DialogTitle>
            </DialogHeader>

            {/* Loading */}
            {dialog.step === "loading" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Comparing provider &amp; database...
                </p>
              </div>
            )}

            {/* Preview */}
            {(dialog.step === "preview" || dialog.step === "running") && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <Cloud className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Provider</span>
                    </div>
                    <span className="text-xs sm:text-sm font-medium">
                      {dialog.preview.providerCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <Database className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">In your DB</span>
                    </div>
                    <span className="text-xs sm:text-sm font-medium">
                      {dialog.preview.dbCount}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                  {dialog.preview.newCount > 0 && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <Plus className="h-3.5 w-3.5 text-green-600" />
                      <span>
                        <span className="font-medium text-green-600">
                          {dialog.preview.newCount}
                        </span>{" "}
                        new will be added
                      </span>
                    </div>
                  )}
                  {dialog.preview.existingCount > 0 && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>
                        <span className="font-medium">
                          {dialog.preview.existingCount}
                        </span>{" "}
                        existing will be checked for updates
                      </span>
                    </div>
                  )}
                  {dialog.preview.newCount === 0 &&
                    dialog.preview.existingCount === 0 && (
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Nothing to sync.
                      </p>
                    )}
                </div>

                <div className="flex justify-end gap-2">
                  {dialog.step === "preview" ? (
                    <>
                      <Button variant="outline" size="sm" onClick={handleClose}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleConfirm}>
                        Sync Now
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" disabled>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Syncing...
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Done */}
            {dialog.step === "done" && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-green-100 p-1.5 dark:bg-green-950">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Sync completed</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {dialog.ok} synced
                      {dialog.fail > 0 && (
                        <span className="text-destructive">
                          {" "}&middot; {dialog.fail} failed
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={handleClose}>
                    Close
                  </Button>
                </div>
              </div>
            )}

            {/* Error */}
            {dialog.step === "error" && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-red-100 p-1.5 dark:bg-red-950">
                    <XCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-destructive">
                      {dialog.canRetry ? "Failed to load preview" : "Sync failed"}
                    </p>
                    <p className="text-xs text-muted-foreground break-all">
                      {dialog.message}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={handleClose}>
                    Close
                  </Button>
                  {dialog.canRetry && (
                    <Button size="sm" onClick={handleRetry}>
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
