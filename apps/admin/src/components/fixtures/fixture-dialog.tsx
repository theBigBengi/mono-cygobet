import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CloudSync, Pencil, Save, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { fixturesService } from "@/services/fixtures.service";
import type { UnifiedFixture } from "@/types";

interface FixtureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fixture: UnifiedFixture | null;
  mode: "db" | "provider";
  onSyncFixture?: (externalId: string) => Promise<void>;
  syncingIds?: Set<string>;
  onUpdate?: () => void;
}

export function FixtureDialog({
  open,
  onOpenChange,
  fixture,
  mode,
  onSyncFixture,
  syncingIds = new Set(),
  onUpdate,
}: FixtureDialogProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedState, setEditedState] = useState<string>("");
  const [editedName, setEditedName] = useState<string>("");
  const [editedHomeScore, setEditedHomeScore] = useState<string>("");
  const [editedAwayScore, setEditedAwayScore] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  // Default to the mode where the dialog was opened from, but allow switching
  const [activeTab, setActiveTab] = useState<"provider" | "db">(mode);

  // Parse result string (e.g., "2-1" or "2:1") into home and away scores
  const parseResult = (
    result: string | null | undefined
  ): {
    home: string;
    away: string;
  } => {
    if (!result) return { home: "", away: "" };
    const match = result.match(/^(\d+)[-:](\d+)$/);
    if (match) {
      return { home: match[1] || "", away: match[2] || "" };
    }
    return { home: "", away: "" };
  };

  // Normalize string for comparison
  const normalizeString = (str: string | null | undefined): string => {
    if (!str) return "";
    return str.trim();
  };

  // Normalize result string - convert ":" to "-" for consistent comparison
  const normalizeResult = (result: string | null | undefined): string => {
    if (!result) return "";
    return result.trim().replace(/:/g, "-");
  };

  // Check if a field has a mismatch between provider and DB
  const hasMismatch = (field: "name" | "state" | "result"): boolean => {
    if (!fixture?.providerData || !fixture?.dbData) return false;
    const provider = fixture.providerData;
    const db = fixture.dbData;

    switch (field) {
      case "name":
        return normalizeString(provider.name) !== normalizeString(db.name);
      case "state":
        return normalizeString(provider.state) !== normalizeString(db.state);
      case "result":
        return normalizeResult(provider.result) !== normalizeResult(db.result);
      default:
        return false;
    }
  };

  // Reset active tab when fixture changes
  useEffect(() => {
    if (fixture) {
      setActiveTab(mode);
      setIsEditMode(false);
      if (fixture.dbData) {
        setEditedName(fixture.dbData.name || "");
        setEditedState(fixture.dbData.state || "");
        const { home, away } = parseResult(fixture.dbData.result);
        setEditedHomeScore(home);
        setEditedAwayScore(away);
      } else {
        setEditedName("");
        setEditedState("");
        setEditedHomeScore("");
        setEditedAwayScore("");
      }
    }
  }, [fixture, mode]);

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      setIsEditMode(false);
      setEditedState("");
      setEditedName("");
      setEditedHomeScore("");
      setEditedAwayScore("");
      setActiveTab(mode); // Reset to original mode when closing
    }
  };

  const handleEditToggle = () => {
    setIsEditMode(!isEditMode);
    if (!isEditMode && fixture?.dbData) {
      setEditedState(fixture.dbData.state || "");
      setEditedName(fixture.dbData.name || "");
      const { home, away } = parseResult(fixture.dbData.result);
      setEditedHomeScore(home);
      setEditedAwayScore(away);
    }
  };

  const handleSync = () => {
    if (fixture && onSyncFixture) {
      onSyncFixture(fixture.externalId);
      handleOpenChange(false);
    }
  };

  const handleSave = async () => {
    if (!fixture?.dbData) return;

    setIsSaving(true);
    try {
      // Get original values for comparison
      const originalHome = parseResult(fixture.dbData.result).home;
      const originalAway = parseResult(fixture.dbData.result).away;
      const originalHomeScore =
        originalHome !== "" && !isNaN(parseInt(originalHome, 10))
          ? parseInt(originalHome, 10)
          : null;
      const originalAwayScore =
        originalAway !== "" && !isNaN(parseInt(originalAway, 10))
          ? parseInt(originalAway, 10)
          : null;

      // Parse edited scores - treat empty strings as null
      const homeScoreValue = editedHomeScore.trim();
      const awayScoreValue = editedAwayScore.trim();

      // Parse to number or null - empty string = null
      const homeScore =
        homeScoreValue === ""
          ? null
          : !isNaN(parseInt(homeScoreValue, 10))
            ? parseInt(homeScoreValue, 10)
            : null;

      const awayScore =
        awayScoreValue === ""
          ? null
          : !isNaN(parseInt(awayScoreValue, 10))
            ? parseInt(awayScoreValue, 10)
            : null;

      // Build update payload - only include fields that changed
      const updatePayload: {
        name?: string;
        state?: string;
        homeScore?: number | null;
        awayScore?: number | null;
        result?: string | null;
      } = {};

      // Only update name if changed
      if (editedName !== fixture.dbData.name) {
        updatePayload.name = editedName;
      }

      // Only update state if changed
      if (editedState !== fixture.dbData.state) {
        updatePayload.state = editedState;
      }

      // Only update scores if they changed
      const homeScoreChanged = homeScore !== originalHomeScore;
      const awayScoreChanged = awayScore !== originalAwayScore;

      if (homeScoreChanged || awayScoreChanged) {
        // Always send the scores (null if empty)
        updatePayload.homeScore = homeScore;
        updatePayload.awayScore = awayScore;

        // Build result string from scores if both are non-null
        // If either is null, set result to null
        if (homeScore !== null && awayScore !== null) {
          updatePayload.result = `${homeScore}-${awayScore}`;
        } else {
          // If one or both scores are null, set result to null
          updatePayload.result = null;
        }
      }

      // Only call update if there are changes
      if (Object.keys(updatePayload).length > 0) {
        await fixturesService.update(fixture.dbData.id, updatePayload);
      }

      // Reset edit mode and refresh data
      setIsEditMode(false);
      if (onUpdate) {
        onUpdate();
      }

      // Wait a bit for data to refresh, then reset fields
      setTimeout(() => {
        if (fixture?.dbData) {
          setEditedState(fixture.dbData.state || "");
          setEditedName(fixture.dbData.name || "");
          const { home, away } = parseResult(fixture.dbData.result);
          setEditedHomeScore(home);
          setEditedAwayScore(away);
        }
      }, 500);
    } catch (error) {
      console.error("Failed to update fixture:", error);
      alert("Failed to update fixture. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditMode(false);
    // Reset edited values to original
    if (fixture?.dbData) {
      setEditedState(fixture.dbData.state || "");
      setEditedName(fixture.dbData.name || "");
      const { home, away } = parseResult(fixture.dbData.result);
      setEditedHomeScore(home);
      setEditedAwayScore(away);
    }
  };

  const handleUpdateFields = () => {
    if (!fixture?.providerData || !fixture?.dbData) return;

    // Update only mismatched fields from provider data
    if (hasMismatch("name") && fixture.providerData.name) {
      setEditedName(fixture.providerData.name);
    }

    if (hasMismatch("state") && fixture.providerData.state) {
      setEditedState(fixture.providerData.state);
    }

    if (hasMismatch("result") && fixture.providerData.result) {
      const { home, away } = parseResult(fixture.providerData.result);
      setEditedHomeScore(home);
      setEditedAwayScore(away);
    }
  };

  // Check if there are any mismatches
  const hasAnyMismatch = () => {
    return (
      fixture?.providerData &&
      fixture?.dbData &&
      (hasMismatch("name") || hasMismatch("state") || hasMismatch("result"))
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="w-[95vw] max-w-[95vw] sm:w-full sm:max-w-2xl max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden"
        showCloseButton={false}
      >
        <DialogHeader className="text-left flex-shrink-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <DialogTitle className="text-base sm:text-lg">
              {fixture?.name || "Fixture"}
            </DialogTitle>
            {activeTab === "db" && fixture?.dbData && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 border"
                onClick={handleEditToggle}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        {fixture && (
          <div className="space-y-2 sm:space-y-4 flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Tabs to switch between Provider and DB data */}
            {(fixture.providerData || fixture.dbData) && (
              <Tabs
                value={activeTab}
                onValueChange={(value) =>
                  setActiveTab(value as "provider" | "db")
                }
                className="flex-shrink-0"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger
                    value="provider"
                    disabled={!fixture.providerData}
                  >
                    Provider
                  </TabsTrigger>
                  <TabsTrigger value="db" disabled={!fixture.dbData}>
                    Database
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            <Tabs
              value={activeTab}
              className="flex-1 min-h-0 flex flex-col overflow-hidden"
            >
              {/* Provider Data Tab */}
              <TabsContent
                value="provider"
                className="flex-1 min-h-0 flex flex-col overflow-auto mt-2"
              >
                {fixture.providerData ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        External ID
                      </label>
                      <Input
                        readOnly
                        value={String(fixture.providerData.externalId)}
                        className="text-xs h-8 bg-muted font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          Fixture Name
                        </label>
                        {hasMismatch("name") && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] px-1.5 py-0"
                          >
                            Mismatch
                          </Badge>
                        )}
                      </div>
                      <Input
                        readOnly
                        value={fixture.providerData.name || "—"}
                        className="text-xs h-8 bg-muted"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Start Date
                      </label>
                      <Input
                        readOnly
                        value={
                          fixture.providerData.startIso
                            ? format(
                                new Date(fixture.providerData.startIso),
                                "PPpp"
                              )
                            : "—"
                        }
                        className="text-xs h-8 bg-muted"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          State
                        </label>
                        {hasMismatch("state") && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] px-1.5 py-0"
                          >
                            Mismatch
                          </Badge>
                        )}
                      </div>
                      <Input
                        readOnly
                        value={fixture.providerData.state || "—"}
                        className="text-xs h-8 bg-muted"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          Result
                        </label>
                        {hasMismatch("result") && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] px-1.5 py-0"
                          >
                            Mismatch
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex flex-col gap-1">
                          <label className="text-[10px] text-muted-foreground">
                            Home
                          </label>
                          <Input
                            readOnly
                            value={
                              parseResult(fixture.providerData.result).home ||
                              "—"
                            }
                            className="text-xs h-8 bg-muted"
                          />
                        </div>
                        <span className="text-muted-foreground mt-5">-</span>
                        <div className="flex-1 flex flex-col gap-1">
                          <label className="text-[10px] text-muted-foreground">
                            Away
                          </label>
                          <Input
                            readOnly
                            value={
                              parseResult(fixture.providerData.result).away ||
                              "—"
                            }
                            className="text-xs h-8 bg-muted"
                          />
                        </div>
                      </div>
                    </div>
                    {fixture.providerData.stageRoundName && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          Stage/Round
                        </label>
                        <Input
                          readOnly
                          value={fixture.providerData.stageRoundName}
                          className="text-xs h-8 bg-muted"
                        />
                      </div>
                    )}
                    {fixture.providerData.leagueName && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          League
                        </label>
                        <Input
                          readOnly
                          value={fixture.providerData.leagueName}
                          className="text-xs h-8 bg-muted"
                        />
                      </div>
                    )}
                    {fixture.providerData.countryName && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          Country
                        </label>
                        <Input
                          readOnly
                          value={fixture.providerData.countryName}
                          className="text-xs h-8 bg-muted"
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Has Odds
                      </label>
                      <Input
                        readOnly
                        value={fixture.providerData.hasOdds ? "Yes" : "No"}
                        className="text-xs h-8 bg-muted"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No provider data available
                  </div>
                )}
              </TabsContent>

              {/* Database Data Tab */}
              <TabsContent
                value="db"
                className="flex-1 min-h-0 flex flex-col overflow-auto mt-2"
              >
                {fixture.dbData ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        External ID
                      </label>
                      <Input
                        readOnly
                        value={String(fixture.dbData.externalId)}
                        className="text-xs h-8 bg-muted font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          Fixture Name
                        </label>
                        {hasMismatch("name") && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] px-1.5 py-0"
                          >
                            Mismatch
                          </Badge>
                        )}
                      </div>
                      {isEditMode ? (
                        <Input
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="text-xs h-8"
                          placeholder="Fixture name"
                        />
                      ) : (
                        <Input
                          readOnly
                          value={fixture.dbData.name || "—"}
                          className="text-xs h-8 bg-muted"
                        />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Start Date
                      </label>
                      <Input
                        readOnly
                        value={
                          fixture.dbData.startIso
                            ? format(new Date(fixture.dbData.startIso), "PPpp")
                            : "—"
                        }
                        className="text-xs h-8 bg-muted"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          State
                        </label>
                        {hasMismatch("state") && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] px-1.5 py-0"
                          >
                            Mismatch
                          </Badge>
                        )}
                      </div>
                      {isEditMode ? (
                        <Select
                          value={editedState || fixture.dbData.state || ""}
                          onValueChange={setEditedState}
                        >
                          <SelectTrigger className="text-xs h-8">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NS">Not Started (NS)</SelectItem>
                            <SelectItem value="LIVE">Live (LIVE)</SelectItem>
                            <SelectItem value="FT">Full Time (FT)</SelectItem>
                            <SelectItem value="CAN">Cancelled (CAN)</SelectItem>
                            <SelectItem value="INT">
                              Interrupted (INT)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          readOnly
                          value={fixture.dbData.state || "—"}
                          className="text-xs h-8 bg-muted"
                        />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          Result
                        </label>
                        {hasMismatch("result") && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] px-1.5 py-0"
                          >
                            Mismatch
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex flex-col gap-1">
                          <label className="text-[10px] text-muted-foreground">
                            Home
                          </label>
                          <Input
                            type={isEditMode ? "number" : "text"}
                            min={isEditMode ? "0" : undefined}
                            value={
                              isEditMode
                                ? editedHomeScore
                                : parseResult(fixture.dbData.result).home || "—"
                            }
                            onChange={
                              isEditMode
                                ? (e) => setEditedHomeScore(e.target.value)
                                : undefined
                            }
                            placeholder={isEditMode ? "Home" : undefined}
                            readOnly={!isEditMode}
                            className={`text-xs h-8 ${!isEditMode ? "bg-muted" : ""}`}
                          />
                        </div>
                        <span className="text-muted-foreground mt-5">-</span>
                        <div className="flex-1 flex flex-col gap-1">
                          <label className="text-[10px] text-muted-foreground">
                            Away
                          </label>
                          <Input
                            type={isEditMode ? "number" : "text"}
                            min={isEditMode ? "0" : undefined}
                            value={
                              isEditMode
                                ? editedAwayScore
                                : parseResult(fixture.dbData.result).away || "—"
                            }
                            onChange={
                              isEditMode
                                ? (e) => setEditedAwayScore(e.target.value)
                                : undefined
                            }
                            placeholder={isEditMode ? "Away" : undefined}
                            readOnly={!isEditMode}
                            className={`text-xs h-8 ${!isEditMode ? "bg-muted" : ""}`}
                          />
                        </div>
                      </div>
                    </div>
                    {fixture.dbData.stageRoundName && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          Stage/Round
                        </label>
                        <Input
                          readOnly
                          value={fixture.dbData.stageRoundName}
                          className="text-xs h-8 bg-muted"
                        />
                      </div>
                    )}
                    {fixture.league && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          League
                        </label>
                        <Input
                          readOnly
                          value={fixture.league.name}
                          className="text-xs h-8 bg-muted"
                        />
                      </div>
                    )}
                    {fixture.season && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          Season
                        </label>
                        <Input
                          readOnly
                          value={fixture.season.name}
                          className="text-xs h-8 bg-muted"
                        />
                      </div>
                    )}
                    {fixture.homeTeam && fixture.awayTeam && (
                      <div className="sm:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          Teams
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs sm:text-sm break-words">
                            {fixture.homeTeam.name}
                          </span>
                          <span className="text-muted-foreground">vs</span>
                          <span className="text-xs sm:text-sm break-words">
                            {fixture.awayTeam.name}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No database data available
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter className="flex-shrink-0">
          {isEditMode && activeTab === "db" && fixture?.dbData ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              {hasAnyMismatch() && (
                <Button
                  variant="outline"
                  onClick={handleUpdateFields}
                  disabled={isSaving}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Update Fields
                </Button>
              )}
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Save className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {mode === "provider" &&
                fixture &&
                fixture.status === "missing-in-db" &&
                onSyncFixture && (
                  <Button
                    onClick={handleSync}
                    disabled={syncingIds.has(fixture.externalId)}
                  >
                    {syncingIds.has(fixture.externalId) ? (
                      <>
                        <CloudSync className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <CloudSync className="mr-2 h-4 w-4" />
                        Sync Fixture
                      </>
                    )}
                  </Button>
                )}
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
