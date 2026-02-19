import { useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  ArrowRight,
  ChevronDown,
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
  description: string;
  dependsOn?: string;
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

export function QuickActionsBar() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>({ step: "closed" });
  const [mobileOpen, setMobileOpen] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["sync-center"] });
    queryClient.invalidateQueries({ queryKey: ["batches"] });
  };

  // Fetch DB counts for display on cards
  const { data: countriesDb } = useQuery({
    queryKey: ["quick-actions", "countries-count"],
    queryFn: () => countriesService.getFromDb({ perPage: 1 }),
    staleTime: Infinity,
  });
  const { data: leaguesDb } = useQuery({
    queryKey: ["quick-actions", "leagues-count"],
    queryFn: () => leaguesService.getFromDb({ perPage: 1 }),
    staleTime: Infinity,
  });
  const { data: bookmakersDb } = useQuery({
    queryKey: ["quick-actions", "bookmakers-count"],
    queryFn: () => bookmakersService.getFromDb({ perPage: 1 }),
    staleTime: Infinity,
  });

  const dbCounts: Record<string, number | undefined> = {
    countries: countriesDb?.pagination?.totalItems,
    leagues: leaguesDb?.pagination?.totalItems,
    bookmakers: bookmakersDb?.pagination?.totalItems,
  };

  const actions: SyncAction[] = [
    {
      key: "countries",
      label: "Countries",
      description: "Fetch all countries from the provider and upsert into DB.",
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
      description: "Fetch all leagues from the provider and upsert into DB.",
      dependsOn: "Countries",
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
      description: "Fetch all bookmakers from the provider and upsert into DB.",
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
      <Collapsible open={mobileOpen} onOpenChange={setMobileOpen} className="sm:hidden">
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 p-3 cursor-pointer select-none">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Quick Actions</CardTitle>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${mobileOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-3 pt-0">
              <div className="grid grid-cols-1 gap-2">
                {actions.map((action) => {
                  const Icon = action.icon;
                  const count = dbCounts[action.key];
                  return (
                    <div
                      key={action.key}
                      className="rounded-lg border p-3 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-medium text-sm">
                          <Icon className="h-4 w-4" />
                          {action.label}
                        </div>
                        {count != null && (
                          <Badge variant="secondary" className="text-xs">
                            <Database className="h-3 w-3 mr-1" />
                            {count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {action.description}
                      </p>
                      {action.dependsOn && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ArrowRight className="h-3 w-3" />
                          Depends on: <span className="font-medium">{action.dependsOn}</span>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs mt-auto"
                        onClick={() => handleOpen(action)}
                      >
                        Sync
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Desktop: always visible */}
      <Card className="hidden sm:block">
        <CardHeader className="pb-3 p-6 sm:pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="grid grid-cols-3 gap-3">
            {actions.map((action) => {
              const Icon = action.icon;
              const count = dbCounts[action.key];
              return (
                <div
                  key={action.key}
                  className="rounded-lg border p-3 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <Icon className="h-4 w-4" />
                      {action.label}
                    </div>
                    {count != null && (
                      <Badge variant="secondary" className="text-xs">
                        <Database className="h-3 w-3 mr-1" />
                        {count}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                  {action.dependsOn && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ArrowRight className="h-3 w-3" />
                      Depends on: <span className="font-medium">{action.dependsOn}</span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs mt-auto"
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
