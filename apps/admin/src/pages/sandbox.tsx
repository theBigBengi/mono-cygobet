import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Play, Flag, RotateCcw, Trash2, Plus } from "lucide-react";
import { useSandboxList } from "@/hooks/use-sandbox";
import { sandboxService } from "@/services/sandbox.service";

const LIVE_STATES = [
  "INPLAY_1ST_HALF",
  "INPLAY_2ND_HALF",
  "HT",
  "INPLAY_ET",
  "INPLAY_PENALTIES",
  "BREAK",
  "EXTRA_TIME_BREAK",
  "PEN_BREAK",
] as const;

const FINISHED_STATES = ["FT", "AET", "FT_PEN"] as const;

function getFixtureAction(
  state: string
): "kickoff" | "full-time" | "reset" | null {
  if (state === "NS") return "kickoff";
  if (LIVE_STATES.includes(state as (typeof LIVE_STATES)[number]))
    return "full-time";
  if (FINISHED_STATES.includes(state as (typeof FINISHED_STATES)[number]))
    return "reset";
  return null;
}

function getStateBadgeVariant(
  state: string
): "secondary" | "default" | "outline" {
  if (state === "NS") return "secondary";
  if (LIVE_STATES.includes(state as (typeof LIVE_STATES)[number]))
    return "default";
  return "outline";
}

export default function SandboxPage() {
  const queryClient = useQueryClient();
  const { data: listData, isLoading } = useSandboxList();
  const fixtures = listData?.data?.fixtures ?? [];
  const groups = listData?.data?.groups ?? [];

  // Setup form
  const [setupForm, setSetupForm] = React.useState({
    fixtureCount: 3,
    memberUserIds: "",
    predictionMode: "CorrectScore" as "CorrectScore" | "MatchWinner",
    autoGeneratePredictions: true,
    groupName: "",
  });

  // Full-time dialog
  const [ftDialog, setFtDialog] = React.useState<{
    open: boolean;
    fixtureId: number | null;
  }>({ open: false, fixtureId: null });
  const [ftScores, setFtScores] = React.useState({ home: 0, away: 0 });

  // Cleanup confirmation dialog
  const [cleanupDialogOpen, setCleanupDialogOpen] = React.useState(false);

  const setupMutation = useMutation({
    mutationFn: (args: {
      fixtureCount: number;
      memberUserIds: number[];
      predictionMode: "CorrectScore" | "MatchWinner";
      autoGeneratePredictions?: boolean;
      groupName?: string;
    }) => sandboxService.setup(args),
    onSuccess: (data) => {
      toast.success(`Sandbox setup complete — group #${data.data.groupId}`);
      queryClient.invalidateQueries({ queryKey: ["sandbox", "list"] });
      setSetupForm({
        fixtureCount: 3,
        memberUserIds: "",
        predictionMode: "CorrectScore",
        autoGeneratePredictions: true,
        groupName: "",
      });
    },
    onError: (error: Error) => {
      toast.error("Setup failed", { description: error.message });
    },
  });

  const kickoffMutation = useMutation({
    mutationFn: (fixtureId: number) =>
      sandboxService.simulateKickoff(fixtureId),
    onSuccess: () => {
      toast.success("Kickoff!");
      queryClient.invalidateQueries({ queryKey: ["sandbox", "list"] });
    },
    onError: (error: Error) => {
      toast.error("Kickoff failed", { description: error.message });
    },
  });

  const fullTimeMutation = useMutation({
    mutationFn: (args: {
      fixtureId: number;
      homeScore: number;
      awayScore: number;
    }) => sandboxService.simulateFullTime(args),
    onSuccess: (data) => {
      const s = data.data.settlement;
      const msg = s
        ? `FT ${data.data.homeScore}-${data.data.awayScore} | Settled: ${s.settled} predictions`
        : `FT ${data.data.homeScore}-${data.data.awayScore}`;
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ["sandbox", "list"] });
      setFtDialog({ open: false, fixtureId: null });
    },
    onError: (error: Error) => {
      toast.error("Full-time failed", { description: error.message });
    },
  });

  const resetMutation = useMutation({
    mutationFn: (fixtureId: number) => sandboxService.resetFixture(fixtureId),
    onSuccess: () => {
      toast.success("Fixture reset");
      queryClient.invalidateQueries({ queryKey: ["sandbox", "list"] });
    },
    onError: (error: Error) => {
      toast.error("Reset failed", { description: error.message });
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: () => sandboxService.cleanup(),
    onSuccess: (data) => {
      toast.success(
        `Cleaned up ${data.data.deletedFixtures} fixtures, ${data.data.deletedGroups} groups`
      );
      queryClient.invalidateQueries({ queryKey: ["sandbox", "list"] });
      setCleanupDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error("Cleanup failed", { description: error.message });
    },
  });

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = setupForm.memberUserIds
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
    if (parsed.length === 0) {
      toast.error("Enter at least one user ID");
      return;
    }
    setupMutation.mutate({
      ...setupForm,
      memberUserIds: parsed,
    });
  };

  return (
    <div className="h-full w-full p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sandbox</h1>
            <p className="text-muted-foreground">
              Create fictive data, simulate match lifecycle, test settlement
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => setCleanupDialogOpen(true)}
            disabled={fixtures.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Cleanup All
          </Button>
        </div>

        {/* Setup Card */}
        <Card>
          <CardHeader>
            <CardTitle>Setup</CardTitle>
            <CardDescription>
              Create sandbox fixtures, group, members and predictions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetup}>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="fixtureCount">Fixtures</Label>
                  <Input
                    id="fixtureCount"
                    type="number"
                    min={1}
                    max={10}
                    value={setupForm.fixtureCount}
                    onChange={(e) =>
                      setSetupForm((prev) => ({
                        ...prev,
                        fixtureCount: Number(e.target.value) || 1,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memberUserIds">User IDs</Label>
                  <Input
                    id="memberUserIds"
                    type="text"
                    placeholder="1, 2, 3"
                    value={setupForm.memberUserIds}
                    onChange={(e) =>
                      setSetupForm((prev) => ({
                        ...prev,
                        memberUserIds: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="predictionMode">Prediction Mode</Label>
                  <Select
                    value={setupForm.predictionMode}
                    onValueChange={(v: "CorrectScore" | "MatchWinner") =>
                      setSetupForm((prev) => ({
                        ...prev,
                        predictionMode: v,
                      }))
                    }
                  >
                    <SelectTrigger id="predictionMode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CorrectScore">
                        CorrectScore
                      </SelectItem>
                      <SelectItem value="MatchWinner">MatchWinner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoGenerate"
                    checked={setupForm.autoGeneratePredictions}
                    onCheckedChange={(checked) =>
                      setSetupForm((prev) => ({
                        ...prev,
                        autoGeneratePredictions: checked === true,
                      }))
                    }
                  />
                  <Label htmlFor="autoGenerate" className="font-normal">
                    Auto-generate predictions
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="groupName" className="whitespace-nowrap">
                    Group name (optional)
                  </Label>
                  <Input
                    id="groupName"
                    className="max-w-[200px]"
                    value={setupForm.groupName}
                    onChange={(e) =>
                      setSetupForm((prev) => ({
                        ...prev,
                        groupName: e.target.value,
                      }))
                    }
                    placeholder="Test Group"
                  />
                </div>
              </div>
              <div className="mt-4">
                <Button
                  type="submit"
                  disabled={setupMutation.isPending}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {setupMutation.isPending ? "Setting up..." : "Create Sandbox"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Groups section */}
        {groups.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Groups ({groups.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
                  >
                    <span className="font-medium">{group.name}</span>
                    <Badge variant="secondary">{group.status}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {group.memberCount} members, {group.fixtureCount} fixtures
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fixtures Table */}
        <Card>
          <CardHeader>
            <CardTitle>Fixtures ({fixtures.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : fixtures.length === 0 ? (
              <p className="text-muted-foreground">
                No sandbox data. Use Setup to create.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fixtures.map((fixture) => {
                    const action = getFixtureAction(fixture.state);
                    const matchName =
                      fixture.homeTeam && fixture.awayTeam
                        ? `${fixture.homeTeam} vs ${fixture.awayTeam}`
                        : fixture.name;
                    const score =
                      fixture.homeScore !== null && fixture.awayScore !== null
                        ? `${fixture.homeScore} - ${fixture.awayScore}`
                        : "—";
                    return (
                      <TableRow key={fixture.id}>
                        <TableCell>{fixture.id}</TableCell>
                        <TableCell>{matchName}</TableCell>
                        <TableCell>
                          <Badge
                            variant={getStateBadgeVariant(fixture.state)}
                          >
                            {fixture.state}
                          </Badge>
                        </TableCell>
                        <TableCell>{score}</TableCell>
                        <TableCell>
                          {action === "kickoff" && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() =>
                                kickoffMutation.mutate(fixture.id)
                              }
                              disabled={kickoffMutation.isPending}
                            >
                              <Play className="mr-1 h-3 w-3" />
                              Kickoff
                            </Button>
                          )}
                          {action === "full-time" && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setFtDialog({
                                  open: true,
                                  fixtureId: fixture.id,
                                });
                                setFtScores({ home: 0, away: 0 });
                              }}
                            >
                              <Flag className="mr-1 h-3 w-3" />
                              Full Time
                            </Button>
                          )}
                          {action === "reset" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resetMutation.mutate(fixture.id)}
                              disabled={resetMutation.isPending}
                            >
                              <RotateCcw className="mr-1 h-3 w-3" />
                              Reset
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full-Time Dialog */}
      <Dialog
        open={ftDialog.open}
        onOpenChange={(open) => {
          if (!open) setFtDialog({ open: false, fixtureId: null });
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Final Score</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 py-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="ftHome">Home</Label>
              <Input
                id="ftHome"
                type="number"
                min={0}
                value={ftScores.home}
                onChange={(e) =>
                  setFtScores((prev) => ({
                    ...prev,
                    home: Math.max(0, Number(e.target.value) || 0),
                  }))
                }
              />
            </div>
            <span className="pt-6">—</span>
            <div className="flex-1 space-y-2">
              <Label htmlFor="ftAway">Away</Label>
              <Input
                id="ftAway"
                type="number"
                min={0}
                value={ftScores.away}
                onChange={(e) =>
                  setFtScores((prev) => ({
                    ...prev,
                    away: Math.max(0, Number(e.target.value) || 0),
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFtDialog({ open: false, fixtureId: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (ftDialog.fixtureId == null) return;
                fullTimeMutation.mutate({
                  fixtureId: ftDialog.fixtureId,
                  homeScore: ftScores.home,
                  awayScore: ftScores.away,
                });
              }}
              disabled={fullTimeMutation.isPending}
            >
              {fullTimeMutation.isPending ? "Settling..." : "Confirm FT"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cleanup Confirmation Dialog */}
      <Dialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete all sandbox data?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will delete {fixtures.length} fixtures and {groups.length}{" "}
            groups. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCleanupDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => cleanupMutation.mutate()}
              disabled={cleanupMutation.isPending}
            >
              {cleanupMutation.isPending ? "Deleting..." : "Delete All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
