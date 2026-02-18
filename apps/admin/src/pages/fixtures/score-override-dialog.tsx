import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FixtureState } from "@repo/types/sport-data/common";
import { fixturesService } from "@/services/fixtures.service";

const FIXTURE_STATE_VALUES = Object.values(FixtureState);

export type FixtureForOverride = {
  id: number;
  name: string;
  homeScore90: number | null;
  awayScore90: number | null;
  homeScoreET: number | null;
  awayScoreET: number | null;
  penHome: number | null;
  penAway: number | null;
  state: string;
  leg: string | null;
};

interface ScoreOverrideDialogProps {
  fixture: FixtureForOverride | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ScoreOverrideDialog({
  fixture,
  open,
  onOpenChange,
  onSuccess,
}: ScoreOverrideDialogProps) {
  const [homeScore, setHomeScore] = useState<string>("");
  const [awayScore, setAwayScore] = useState<string>("");
  const [homeScoreET, setHomeScoreET] = useState<string>("");
  const [awayScoreET, setAwayScoreET] = useState<string>("");
  const [penHome, setPenHome] = useState<string>("");
  const [penAway, setPenAway] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [leg, setLeg] = useState<string>("");
  const [triggerResettle, setTriggerResettle] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (fixture && open) {
      setHomeScore(fixture.homeScore90 != null ? String(fixture.homeScore90) : "");
      setAwayScore(fixture.awayScore90 != null ? String(fixture.awayScore90) : "");
      setHomeScoreET(fixture.homeScoreET != null ? String(fixture.homeScoreET) : "");
      setAwayScoreET(fixture.awayScoreET != null ? String(fixture.awayScoreET) : "");
      setPenHome(fixture.penHome != null ? String(fixture.penHome) : "");
      setPenAway(fixture.penAway != null ? String(fixture.penAway) : "");
      setState(fixture.state || "");
      setLeg(fixture.leg ?? "");
      setConfirmStep(false);
      setTriggerResettle(false);
    }
  }, [fixture, open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setConfirmStep(false);
    }
    onOpenChange(next);
  };

  const handleSubmit = () => {
    if (!fixture) return;
    const home = homeScore.trim() === "" ? null : parseInt(homeScore, 10);
    const away = awayScore.trim() === "" ? null : parseInt(awayScore, 10);
    if (home !== null && (Number.isNaN(home) || home < 0)) {
      toast.error("Invalid home score");
      return;
    }
    if (away !== null && (Number.isNaN(away) || away < 0)) {
      toast.error("Invalid away score");
      return;
    }
    if (!state) {
      toast.error("Please select a state");
      return;
    }
    setConfirmStep(true);
  };

  const parseOptionalInt = (val: string): number | null | undefined => {
    const trimmed = val.trim();
    if (trimmed === "") return undefined;
    const n = parseInt(trimmed, 10);
    return Number.isNaN(n) ? undefined : n;
  };

  const handleConfirmOverride = async () => {
    if (!fixture) return;
    const home = parseOptionalInt(homeScore);
    const away = parseOptionalInt(awayScore);
    const homeET = parseOptionalInt(homeScoreET);
    const awayET = parseOptionalInt(awayScoreET);
    const penH = parseOptionalInt(penHome);
    const penA = parseOptionalInt(penAway);
    setSaving(true);
    try {
      await fixturesService.update(fixture.id, {
        ...(home !== undefined && { homeScore90: home }),
        ...(away !== undefined && { awayScore90: away }),
        ...(homeET !== undefined && { homeScoreET: homeET }),
        ...(awayET !== undefined && { awayScoreET: awayET }),
        ...(penH !== undefined && { penHome: penH }),
        ...(penA !== undefined && { penAway: penA }),
        ...(state && { state }),
        ...(leg !== (fixture.leg ?? "") && { leg: leg || null }),
      });
      toast.success("Score and state updated");
      if (triggerResettle && state === "FT") {
        const result = await fixturesService.resettle(fixture.id);
        toast.success("Re-settlement completed", {
          description: `${result.predictionsRecalculated} predictions in ${result.groupsAffected} group(s)`,
        });
      } else if (triggerResettle && state !== "FT") {
        toast.info("Re-settlement only runs for FT fixtures; skipped.");
      }
      handleOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (!fixture) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md p-0 gap-0 overflow-hidden" showCloseButton={!confirmStep}>
        {!confirmStep ? (
          <>
            <div className="px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
              <DialogHeader>
                <DialogTitle className="text-base">Override</DialogTitle>
                <DialogDescription asChild>
                  <p className="text-sm text-foreground font-medium leading-snug">{fixture.name}</p>
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="border-t px-4 py-4 sm:px-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Score (90')</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number" min={0} value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                    placeholder="Home" className="h-9"
                  />
                  <Input
                    type="number" min={0} value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                    placeholder="Away" className="h-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Extra Time</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number" min={0} value={homeScoreET}
                    onChange={(e) => setHomeScoreET(e.target.value)}
                    placeholder="Home ET" className="h-9"
                  />
                  <Input
                    type="number" min={0} value={awayScoreET}
                    onChange={(e) => setAwayScoreET(e.target.value)}
                    placeholder="Away ET" className="h-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Penalties</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number" min={0} value={penHome}
                    onChange={(e) => setPenHome(e.target.value)}
                    placeholder="Home PEN" className="h-9"
                  />
                  <Input
                    type="number" min={0} value={penAway}
                    onChange={(e) => setPenAway(e.target.value)}
                    placeholder="Away PEN" className="h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">State</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {FIXTURE_STATE_VALUES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Leg</Label>
                  <Input
                    value={leg}
                    onChange={(e) => setLeg(e.target.value)}
                    placeholder="e.g. 1/2" className="h-9"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="triggerResettle"
                  checked={triggerResettle}
                  onCheckedChange={(checked) =>
                    setTriggerResettle(checked === true)
                  }
                />
                <Label
                  htmlFor="triggerResettle"
                  className="text-xs font-normal cursor-pointer"
                >
                  Trigger re-settlement (only for FT)
                </Label>
              </div>
            </div>

            <div className="border-t px-4 py-3 sm:px-5 flex gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)} className="flex-1 sm:flex-initial">
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="flex-1 sm:flex-initial sm:ml-auto">Save</Button>
            </div>
          </>
        ) : (
          <>
            <div className="px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
              <DialogHeader>
                <DialogTitle className="text-base">Confirm override</DialogTitle>
                <DialogDescription>
                  This will override provider data. Are you sure?
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="border-t px-4 py-3 sm:px-5 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmStep(false)}
                disabled={saving}
                className="flex-1 sm:flex-initial"
              >
                Back
              </Button>
              <Button onClick={handleConfirmOverride} disabled={saving} className="flex-1 sm:flex-initial sm:ml-auto">
                {saving ? "Saving…" : "Yes, override"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
