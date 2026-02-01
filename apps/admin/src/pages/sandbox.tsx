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
import { Play, Flag, RotateCcw, Trash2, Plus, Pencil } from "lucide-react";
import { useSandboxList } from "@/hooks/use-sandbox";
import {
  sandboxService,
  type SandboxFixture,
} from "@/services/sandbox.service";

function tsToDatetimeLocal(ts: number): string {
  const d = new Date(ts * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
    startInMinutes: 60,
  });

  // Full-time dialog
  const [ftDialog, setFtDialog] = React.useState<{
    open: boolean;
    fixtureId: number | null;
  }>({ open: false, fixtureId: null });
  const [ftScores, setFtScores] = React.useState({
    home: 0,
    away: 0,
    state: "FT" as "FT" | "AET" | "FT_PEN",
    homeScoreET: 0,
    awayScoreET: 0,
    penHome: 0,
    penAway: 0,
  });

  // Edit Live dialog
  const [editLiveDialog, setEditLiveDialog] = React.useState<{
    open: boolean;
    fixtureId: number | null;
  }>({ open: false, fixtureId: null });
  const [editLiveForm, setEditLiveForm] = React.useState({
    homeScore: 0,
    awayScore: 0,
    liveMinute: 1,
    state: "INPLAY_1ST_HALF",
  });

  // Cleanup confirmation dialog
  const [cleanupDialogOpen, setCleanupDialogOpen] = React.useState(false);

  const setupMutation = useMutation({
    mutationFn: (args: {
      fixtureCount: number;
      memberUserIds: number[];
      predictionMode: "CorrectScore" | "MatchWinner";
      autoGeneratePredictions?: boolean;
      groupName?: string;
      startInMinutes?: number;
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
        startInMinutes: 60,
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
      state?: "FT" | "AET" | "FT_PEN";
      homeScoreET?: number;
      awayScoreET?: number;
      penHome?: number;
      penAway?: number;
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

  const updateLiveMutation = useMutation({
    mutationFn: (args: {
      fixtureId: number;
      homeScore?: number;
      awayScore?: number;
      liveMinute?: number;
      state?: string;
    }) => sandboxService.updateLive(args),
    onSuccess: () => {
      toast.success("Live fixture updated");
      queryClient.invalidateQueries({ queryKey: ["sandbox", "list"] });
      setEditLiveDialog({ open: false, fixtureId: null });
    },
    onError: (error: Error) => {
      toast.error("Update failed", { description: error.message });
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

  const updateStartTimeMutation = useMutation({
    mutationFn: (args: { fixtureId: number; startTime: string }) =>
      sandboxService.updateStartTime(args),
    onSuccess: () => {
      toast.success("Start time updated");
      queryClient.invalidateQueries({ queryKey: ["sandbox", "list"] });
    },
    onError: (error: Error) => {
      toast.error("Update failed", { description: error.message });
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

  const openEditLiveDialog = (fixture: SandboxFixture) => {
    setEditLiveForm({
      homeScore: fixture.homeScore ?? 0,
      awayScore: fixture.awayScore ?? 0,
      liveMinute: fixture.liveMinute ?? 1,
      state: fixture.state,
    });
    setEditLiveDialog({ open: true, fixtureId: fixture.id });
  };

  const openFtDialog = (fixtureId: number) => {
    setFtDialog({ open: true, fixtureId });
    setFtScores({
      home: 0,
      away: 0,
      state: "FT",
      homeScoreET: 0,
      awayScoreET: 0,
      penHome: 0,
      penAway: 0,
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
                <div className="flex items-center gap-2">
                  <Label htmlFor="startInMinutes" className="whitespace-nowrap">
                    Start in (minutes)
                  </Label>
                  <Input
                    id="startInMinutes"
                    type="number"
                    min={1}
                    placeholder="60"
                    className="max-w-[100px]"
                    value={setupForm.startInMinutes}
                    onChange={(e) =>
                      setSetupForm((prev) => ({
                        ...prev,
                        startInMinutes: Number(e.target.value) || 60,
                      }))
                    }
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
                    <TableHead>Min</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Start</TableHead>
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
                    const isLive = LIVE_STATES.includes(
                      fixture.state as (typeof LIVE_STATES)[number]
                    );
                    const minDisplay = isLive
                      ? fixture.liveMinute ?? "—"
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
                        <TableCell>{minDisplay}</TableCell>
                        <TableCell>{score}</TableCell>
                        <TableCell>
                          {fixture.state === "NS" ? (
                            <Input
                              type="datetime-local"
                              className="w-[180px]"
                              value={tsToDatetimeLocal(fixture.startTs)}
                              onChange={(e) => {
                                if (!e.target.value) return;
                                updateStartTimeMutation.mutate({
                                  fixtureId: fixture.id,
                                  startTime: new Date(
                                    e.target.value
                                  ).toISOString(),
                                });
                              }}
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {new Date(
                                fixture.startTs * 1000
                              ).toLocaleString()}
                            </span>
                          )}
                        </TableCell>
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
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditLiveDialog(fixture)}
                                className="mr-1"
                              >
                                <Pencil className="mr-1 h-3 w-3" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => openFtDialog(fixture.id)}
                              >
                                <Flag className="mr-1 h-3 w-3" />
                                Full Time
                              </Button>
                            </>
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
          <div className="space-y-2">
            <Label>Finished State</Label>
            <Select
              value={ftScores.state}
              onValueChange={(v: "FT" | "AET" | "FT_PEN") =>
                setFtScores((prev) => ({ ...prev, state: v }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FT">FT (Full Time)</SelectItem>
                <SelectItem value="AET">AET (After Extra Time)</SelectItem>
                <SelectItem value="FT_PEN">FT_PEN (Penalties)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(ftScores.state === "AET" || ftScores.state === "FT_PEN") && (
            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-2">
                <Label>ET Home</Label>
                <Input
                  type="number"
                  min={0}
                  value={ftScores.homeScoreET}
                  onChange={(e) =>
                    setFtScores((prev) => ({
                      ...prev,
                      homeScoreET: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                />
              </div>
              <span className="pt-6">—</span>
              <div className="flex-1 space-y-2">
                <Label>ET Away</Label>
                <Input
                  type="number"
                  min={0}
                  value={ftScores.awayScoreET}
                  onChange={(e) =>
                    setFtScores((prev) => ({
                      ...prev,
                      awayScoreET: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                />
              </div>
            </div>
          )}
          {ftScores.state === "FT_PEN" && (
            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-2">
                <Label>Pen Home</Label>
                <Input
                  type="number"
                  min={0}
                  value={ftScores.penHome}
                  onChange={(e) =>
                    setFtScores((prev) => ({
                      ...prev,
                      penHome: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                />
              </div>
              <span className="pt-6">—</span>
              <div className="flex-1 space-y-2">
                <Label>Pen Away</Label>
                <Input
                  type="number"
                  min={0}
                  value={ftScores.penAway}
                  onChange={(e) =>
                    setFtScores((prev) => ({
                      ...prev,
                      penAway: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                />
              </div>
            </div>
          )}
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
                  state: ftScores.state,
                  ...(ftScores.state === "AET" || ftScores.state === "FT_PEN"
                    ? {
                        homeScoreET: ftScores.homeScoreET,
                        awayScoreET: ftScores.awayScoreET,
                      }
                    : {}),
                  ...(ftScores.state === "FT_PEN"
                    ? {
                        penHome: ftScores.penHome,
                        penAway: ftScores.penAway,
                      }
                    : {}),
                });
              }}
              disabled={fullTimeMutation.isPending}
            >
              {fullTimeMutation.isPending
                ? "Settling..."
                : `Confirm ${ftScores.state}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Live Dialog */}
      <Dialog
        open={editLiveDialog.open}
        onOpenChange={(open) => {
          if (!open) setEditLiveDialog({ open: false, fixtureId: null });
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Live Fixture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editHomeScore">Home Score</Label>
                <Input
                  id="editHomeScore"
                  type="number"
                  min={0}
                  value={editLiveForm.homeScore}
                  onChange={(e) =>
                    setEditLiveForm((prev) => ({
                      ...prev,
                      homeScore: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editAwayScore">Away Score</Label>
                <Input
                  id="editAwayScore"
                  type="number"
                  min={0}
                  value={editLiveForm.awayScore}
                  onChange={(e) =>
                    setEditLiveForm((prev) => ({
                      ...prev,
                      awayScore: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editLiveMinute">Minute</Label>
              <Input
                id="editLiveMinute"
                type="number"
                min={0}
                max={120}
                value={editLiveForm.liveMinute}
                onChange={(e) =>
                  setEditLiveForm((prev) => ({
                    ...prev,
                    liveMinute: Math.min(
                      120,
                      Math.max(0, Number(e.target.value) || 0)
                    ),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editState">State</Label>
              <Select
                value={editLiveForm.state}
                onValueChange={(v) =>
                  setEditLiveForm((prev) => ({ ...prev, state: v }))
                }
              >
                <SelectTrigger id="editState">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INPLAY_1ST_HALF">
                    INPLAY_1ST_HALF
                  </SelectItem>
                  <SelectItem value="HT">HT</SelectItem>
                  <SelectItem value="INPLAY_2ND_HALF">
                    INPLAY_2ND_HALF
                  </SelectItem>
                  <SelectItem value="INPLAY_ET">INPLAY_ET</SelectItem>
                  <SelectItem value="INPLAY_PENALTIES">
                    INPLAY_PENALTIES
                  </SelectItem>
                  <SelectItem value="BREAK">BREAK</SelectItem>
                  <SelectItem value="EXTRA_TIME_BREAK">
                    EXTRA_TIME_BREAK
                  </SelectItem>
                  <SelectItem value="PEN_BREAK">PEN_BREAK</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setEditLiveDialog({ open: false, fixtureId: null })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editLiveDialog.fixtureId == null) return;
                updateLiveMutation.mutate({
                  fixtureId: editLiveDialog.fixtureId,
                  homeScore: editLiveForm.homeScore,
                  awayScore: editLiveForm.awayScore,
                  liveMinute: editLiveForm.liveMinute,
                  state: editLiveForm.state,
                });
              }}
              disabled={updateLiveMutation.isPending}
            >
              {updateLiveMutation.isPending ? "Updating..." : "Update"}
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
