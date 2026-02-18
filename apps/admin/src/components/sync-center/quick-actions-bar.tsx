import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { countriesService } from "@/services/countries.service";
import { leaguesService } from "@/services/leagues.service";
import { bookmakersService } from "@/services/bookmakers.service";
import {
  Loader2,
  Globe,
  Trophy,
  Bookmark,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Database,
  Cloud,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

interface PreviewData {
  providerCount: number;
  dbCount: number;
  newCount: number;
  existingCount: number;
}

interface SyncAction {
  key: string;
  label: string;
  icon: React.ElementType;
  fetchPreview: () => Promise<PreviewData>;
  syncFn: () => Promise<{ data: { ok: number; fail: number; total: number } }>;
}

type DialogState =
  | { step: "closed" }
  | { step: "loading"; action: SyncAction }
  | { step: "preview"; action: SyncAction; preview: PreviewData }
  | { step: "running"; action: SyncAction; preview: PreviewData }
  | {
      step: "done";
      action: SyncAction;
      preview: PreviewData;
      ok: number;
      fail: number;
      total: number;
    }
  | { step: "error"; action: SyncAction; message: string; canRetry?: boolean };

// ── Helpers ──────────────────────────────────────────────────────────

async function compareExternalIds(
  providerItems: { externalId: string | number }[],
  dbItems: { externalId: string | number }[]
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

export function QuickActionsBar() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>({ step: "closed" });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["sync-center"] });
    queryClient.invalidateQueries({ queryKey: ["batches"] });
  };

  const actions: SyncAction[] = [
    {
      key: "countries",
      label: "Countries",
      icon: Globe,
      fetchPreview: async () => {
        const [provider, db] = await Promise.all([
          countriesService.getFromProvider(),
          countriesService.getFromDb({ perPage: 10000 }),
        ]);
        return compareExternalIds(provider.data, db.data);
      },
      syncFn: () =>
        countriesService.sync(false) as Promise<{
          data: { ok: number; fail: number; total: number };
        }>,
    },
    {
      key: "leagues",
      label: "Leagues",
      icon: Trophy,
      fetchPreview: async () => {
        const [provider, db] = await Promise.all([
          leaguesService.getFromProvider(),
          leaguesService.getFromDb({ perPage: 10000 }),
        ]);
        return compareExternalIds(provider.data, db.data);
      },
      syncFn: () =>
        leaguesService.sync(false) as Promise<{
          data: { ok: number; fail: number; total: number };
        }>,
    },
    {
      key: "bookmakers",
      label: "Bookmakers",
      icon: Bookmark,
      fetchPreview: async () => {
        const [provider, db] = await Promise.all([
          bookmakersService.getFromProvider(),
          bookmakersService.getFromDb({ perPage: 10000 }),
        ]);
        return compareExternalIds(provider.data, db.data);
      },
      syncFn: () =>
        bookmakersService.sync(false) as Promise<{
          data: { ok: number; fail: number; total: number };
        }>,
    },
  ];

  const handleOpen = async (action: SyncAction) => {
    setDialog({ step: "loading", action });
    try {
      const preview = await action.fetchPreview();
      setDialog({ step: "preview", action, preview });
    } catch (err) {
      setDialog({
        step: "error",
        action,
        message: err instanceof Error ? err.message : "Failed to load preview",
        canRetry: true,
      });
    }
  };

  const handleConfirm = async () => {
    if (dialog.step !== "preview") return;
    const { action, preview } = dialog;
    setDialog({ step: "running", action, preview });

    try {
      const result = await action.syncFn();
      setDialog({
        step: "done",
        action,
        preview,
        ok: result.data.ok,
        fail: result.data.fail,
        total: result.data.total,
      });
      invalidate();
    } catch (err) {
      setDialog({
        step: "error",
        action,
        message: err instanceof Error ? err.message : "Sync failed",
      });
    }
  };

  const handleClose = () => {
    if (dialog.step === "running") return;
    setDialog({ step: "closed" });
  };

  const isOpen = dialog.step !== "closed";

  return (
    <>
      <Card>
        <CardHeader className="pb-3 p-3 sm:p-6 sm:pb-3">
          <CardTitle className="text-sm sm:text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <div key={action.key} className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium">
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {action.label}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-7 sm:h-8 text-xs"
                    onClick={() => handleOpen(action)}
                  >
                    Sync
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
                  {/* Stats */}
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

                  {/* Diff */}
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

                  {/* Actions */}
                  <div className="flex justify-end gap-2">
                    {dialog.step === "preview" ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClose}
                        >
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
                      <Button
                        size="sm"
                        onClick={() => handleOpen(dialog.action)}
                      >
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
    </>
  );
}
