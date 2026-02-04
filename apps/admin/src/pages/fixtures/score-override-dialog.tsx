import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  state: string;
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
  const [state, setState] = useState<string>("");
  const [triggerResettle, setTriggerResettle] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (fixture && open) {
      setHomeScore(
        fixture.homeScore90 != null ? String(fixture.homeScore90) : ""
      );
      setAwayScore(
        fixture.awayScore90 != null ? String(fixture.awayScore90) : ""
      );
      setState(fixture.state || "");
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

  const handleConfirmOverride = async () => {
    if (!fixture) return;
    const home = homeScore.trim() === "" ? null : parseInt(homeScore, 10);
    const away = awayScore.trim() === "" ? null : parseInt(awayScore, 10);
    setSaving(true);
    try {
      await fixturesService.update(fixture.id, {
        homeScore90: home ?? undefined,
        awayScore90: away ?? undefined,
        state: state || undefined,
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
      <DialogContent className="sm:max-w-md" showCloseButton={!confirmStep}>
        {!confirmStep ? (
          <>
            <DialogHeader>
              <DialogTitle>Override score & state</DialogTitle>
              <DialogDescription>
                {fixture.name}. This will override provider data.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="homeScore">Home score</Label>
                  <Input
                    id="homeScore"
                    type="number"
                    min={0}
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                    placeholder="—"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="awayScore">Away score</Label>
                  <Input
                    id="awayScore"
                    type="number"
                    min={0}
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                    placeholder="—"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {FIXTURE_STATE_VALUES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  className="text-sm font-normal cursor-pointer"
                >
                  Trigger re-settlement for all groups containing this fixture
                  (only for FT)
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>Save</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Confirm override</DialogTitle>
              <DialogDescription>
                This will override provider data. Are you sure?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmStep(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmOverride} disabled={saving}>
                {saving ? "Saving…" : "Yes, override"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
