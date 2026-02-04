import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Play,
  Flag,
  RotateCcw,
  Trash2,
  Plus,
  Pencil,
  ChevronDown,
} from "lucide-react";
import { useSandboxList } from "@/hooks/use-sandbox";
import {
  sandboxService,
  type SandboxFixture,
  type SandboxGroup,
} from "@/services/sandbox.service";
import { leaguesService } from "@/services/leagues.service";
import { teamsService } from "@/services/teams.service";
import { MultiSelectCombobox } from "@/components/filters/multi-select-combobox";

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

  // Group filter tab: "all" or group id (must be before filteredFixtures useMemo)
  const [selectedGroupTab, setSelectedGroupTab] = React.useState<
    number | "all"
  >("all");

  const filteredFixtures = React.useMemo(() => {
    if (selectedGroupTab === "all") return fixtures;
    const group = groups.find((g) => g.id === selectedGroupTab);
    if (!group) return fixtures;
    return fixtures.filter((f) => group.fixtureIds.includes(f.id));
  }, [fixtures, groups, selectedGroupTab]);

  // Setup form
  const [setupForm, setSetupForm] = React.useState({
    selectionMode: "games" as "games" | "leagues" | "teams",
    fixtureCount: 3,
    selectedLeagueIds: [] as number[],
    selectedTeamIds: [] as number[],
    memberUserIds: "",
    predictionMode: "CorrectScore" as "CorrectScore" | "MatchWinner",
    autoGeneratePredictions: true,
    groupName: "",
    startInMinutes: 60,
  });
  const [leagueSearchQuery, setLeagueSearchQuery] = React.useState("");
  const [teamSearchQuery, setTeamSearchQuery] = React.useState("");
  const [debouncedLeagueQuery] = useDebounce(leagueSearchQuery, 300);
  const [debouncedTeamQuery] = useDebounce(teamSearchQuery, 300);

  const { data: leaguesSearchData } = useQuery({
    queryKey: ["leagues", "search", debouncedLeagueQuery],
    queryFn: () => leaguesService.search(debouncedLeagueQuery, 20),
    enabled:
      setupForm.selectionMode === "leagues" && debouncedLeagueQuery.length >= 2,
  });
  const { data: teamsSearchData } = useQuery({
    queryKey: ["teams", "search", debouncedTeamQuery],
    queryFn: () => teamsService.search(debouncedTeamQuery, 20),
    enabled:
      setupForm.selectionMode === "teams" && debouncedTeamQuery.length >= 2,
  });

  const leagueOptions = React.useMemo(() => {
    const data = leaguesSearchData?.data ?? [];
    return data.map((l) => ({
      value: l.id,
      label: l.country?.name ? `${l.name} (${l.country.name})` : l.name,
    }));
  }, [leaguesSearchData]);
  const teamOptions = React.useMemo(() => {
    const data = teamsSearchData?.data ?? [];
    return data.map((t) => ({
      value: t.id,
      label: t.country?.name ? `${t.name} (${t.country.name})` : t.name,
    }));
  }, [teamsSearchData]);

  // Add fixture dialog
  const [addFixtureDialog, setAddFixtureDialog] = React.useState<{
    open: boolean;
    groupId: number | null;
  }>({ open: false, groupId: null });
  const [addFixtureForm, setAddFixtureForm] = React.useState({
    homeTeamId: null as number | null,
    awayTeamId: null as number | null,
    leagueId: null as number | null,
    homeTeamLabel: null as string | null,
    awayTeamLabel: null as string | null,
    leagueLabel: null as string | null,
    round: "",
    startInMinutes: 60,
  });
  const [addFixtureHomeSearch, setAddFixtureHomeSearch] = React.useState("");
  const [addFixtureAwaySearch, setAddFixtureAwaySearch] = React.useState("");
  const [addFixtureLeagueSearch, setAddFixtureLeagueSearch] =
    React.useState("");
  const [debouncedAddHome] = useDebounce(addFixtureHomeSearch, 300);
  const [debouncedAddAway] = useDebounce(addFixtureAwaySearch, 300);
  const [debouncedAddLeague] = useDebounce(addFixtureLeagueSearch, 300);
  const { data: addHomeTeams } = useQuery({
    queryKey: ["teams", "search", "addHome", debouncedAddHome],
    queryFn: () => teamsService.search(debouncedAddHome, 20),
    enabled: addFixtureDialog.open && debouncedAddHome.length >= 2,
  });
  const { data: addAwayTeams } = useQuery({
    queryKey: ["teams", "search", "addAway", debouncedAddAway],
    queryFn: () => teamsService.search(debouncedAddAway, 20),
    enabled: addFixtureDialog.open && debouncedAddAway.length >= 2,
  });
  const { data: addLeagues } = useQuery({
    queryKey: ["leagues", "search", "addLeague", debouncedAddLeague],
    queryFn: () => leaguesService.search(debouncedAddLeague, 20),
    enabled: addFixtureDialog.open && debouncedAddLeague.length >= 2,
  });
  const addFixtureHomeOptions = React.useMemo(() => {
    const data = addHomeTeams?.data ?? [];
    return data.map((t) => ({
      value: t.id,
      label: t.country?.name ? `${t.name} (${t.country.name})` : t.name,
    }));
  }, [addHomeTeams]);
  const addFixtureAwayOptions = React.useMemo(() => {
    const data = addAwayTeams?.data ?? [];
    return data.map((t) => ({
      value: t.id,
      label: t.country?.name ? `${t.name} (${t.country.name})` : t.name,
    }));
  }, [addAwayTeams]);
  const addFixtureLeagueOptions = React.useMemo(() => {
    const data = addLeagues?.data ?? [];
    return data.map((l) => ({
      value: l.id,
      label: l.country?.name ? `${l.name} (${l.country.name})` : l.name,
    }));
  }, [addLeagues]);

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
    homeScore90: 0,
    awayScore90: 0,
    liveMinute: 1,
    state: "INPLAY_1ST_HALF",
  });

  // Cleanup confirmation dialog
  const [cleanupDialogOpen, setCleanupDialogOpen] = React.useState(false);

  const setupMutation = useMutation({
    mutationFn: (args: {
      selectionMode?: "games" | "leagues" | "teams";
      fixtureCount?: number;
      leagueIds?: number[];
      teamIds?: number[];
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
        selectionMode: "games",
        fixtureCount: 3,
        selectedLeagueIds: [],
        selectedTeamIds: [],
        memberUserIds: "",
        predictionMode: "CorrectScore",
        autoGeneratePredictions: true,
        groupName: "",
        startInMinutes: 60,
      });
      setLeagueSearchQuery("");
      setTeamSearchQuery("");
    },
    onError: (error: Error) => {
      toast.error("Setup failed", { description: error.message });
    },
  });

  const addFixtureMutation = useMutation({
    mutationFn: (args: {
      groupId: number;
      homeTeamId?: number;
      awayTeamId?: number;
      leagueId?: number;
      round?: string;
      startInMinutes?: number;
    }) => sandboxService.addFixture(args),
    onSuccess: () => {
      toast.success("Fixture added to group");
      queryClient.invalidateQueries({ queryKey: ["sandbox", "list"] });
      setAddFixtureDialog({ open: false, groupId: null });
      setAddFixtureForm({
        homeTeamId: null,
        awayTeamId: null,
        leagueId: null,
        homeTeamLabel: null,
        awayTeamLabel: null,
        leagueLabel: null,
        round: "",
        startInMinutes: 60,
      });
      setAddFixtureHomeSearch("");
      setAddFixtureAwaySearch("");
      setAddFixtureLeagueSearch("");
    },
    onError: (error: Error) => {
      toast.error("Add fixture failed", { description: error.message });
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
      homeScore90: number;
      awayScore90: number;
      state?: "FT" | "AET" | "FT_PEN";
      homeScoreET?: number;
      awayScoreET?: number;
      penHome?: number;
      penAway?: number;
    }) => sandboxService.simulateFullTime(args),
    onSuccess: (data) => {
      const s = data.data.settlement;
      const msg = s
        ? `FT ${data.data.homeScore90}-${data.data.awayScore90} | Settled: ${s.settled} predictions`
        : `FT ${data.data.homeScore90}-${data.data.awayScore90}`;
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
      homeScore90?: number;
      awayScore90?: number;
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
    const memberUserIds = setupForm.memberUserIds
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
    if (memberUserIds.length === 0) {
      toast.error("Enter at least one user ID");
      return;
    }
    if (setupForm.selectionMode === "games") {
      if (
        setupForm.fixtureCount == null ||
        setupForm.fixtureCount < 1 ||
        setupForm.fixtureCount > 10
      ) {
        toast.error("Games mode requires fixture count (1–10)");
        return;
      }
    }
    if (setupForm.selectionMode === "leagues") {
      if (setupForm.selectedLeagueIds.length === 0) {
        toast.error("Leagues mode requires at least one league");
        return;
      }
      setupMutation.mutate({
        selectionMode: "leagues",
        leagueIds: setupForm.selectedLeagueIds,
        memberUserIds,
        predictionMode: setupForm.predictionMode,
        autoGeneratePredictions: setupForm.autoGeneratePredictions,
        groupName: setupForm.groupName || undefined,
        startInMinutes: setupForm.startInMinutes,
      });
      return;
    }
    if (setupForm.selectionMode === "teams") {
      if (setupForm.selectedTeamIds.length === 0) {
        toast.error("Teams mode requires at least one team");
        return;
      }
      setupMutation.mutate({
        selectionMode: "teams",
        teamIds: setupForm.selectedTeamIds,
        memberUserIds,
        predictionMode: setupForm.predictionMode,
        autoGeneratePredictions: setupForm.autoGeneratePredictions,
        groupName: setupForm.groupName || undefined,
        startInMinutes: setupForm.startInMinutes,
      });
      return;
    }
    setupMutation.mutate({
      selectionMode: "games",
      fixtureCount: setupForm.fixtureCount,
      memberUserIds,
      predictionMode: setupForm.predictionMode,
      autoGeneratePredictions: setupForm.autoGeneratePredictions,
      groupName: setupForm.groupName || undefined,
      startInMinutes: setupForm.startInMinutes,
    });
  };

  const openEditLiveDialog = (fixture: SandboxFixture) => {
    setEditLiveForm({
      homeScore90: fixture.homeScore90 ?? 0,
      awayScore90: fixture.awayScore90 ?? 0,
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
            disabled={fixtures.length === 0 && groups.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Cleanup All
          </Button>
        </div>

        {/* Collapsible Create New Group */}
        <Collapsible
          defaultOpen={groups.length === 0}
          className="rounded-lg border"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="group flex w-full items-center justify-between px-4 py-3"
            >
              <span className="font-medium">Create New Group</span>
              <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t px-4 pb-4 pt-2">
              <form onSubmit={handleSetup}>
                <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="selectionMode">Selection Mode</Label>
                    <Select
                      value={setupForm.selectionMode}
                      onValueChange={(v: "games" | "leagues" | "teams") =>
                        setSetupForm((prev) => ({
                          ...prev,
                          selectionMode: v,
                        }))
                      }
                    >
                      <SelectTrigger id="selectionMode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="games">Games (fictive)</SelectItem>
                        <SelectItem value="leagues">Leagues</SelectItem>
                        <SelectItem value="teams">Teams</SelectItem>
                      </SelectContent>
                    </Select>
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
                  {setupForm.selectionMode === "games" && (
                    <div className="space-y-2">
                      <Label htmlFor="fixtureCount">Fixture count</Label>
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
                  )}
                  {setupForm.selectionMode === "leagues" && (
                    <div className="space-y-2 min-w-0">
                      <Label>Leagues</Label>
                      <MultiSelectCombobox
                        options={leagueOptions}
                        selectedValues={setupForm.selectedLeagueIds}
                        onSelectionChange={(vals) =>
                          setSetupForm((prev) => ({
                            ...prev,
                            selectedLeagueIds: vals.map(Number),
                          }))
                        }
                        placeholder="Search leagues (min 2 chars)..."
                        searchPlaceholder="Type to search..."
                        emptyMessage="Type at least 2 characters to search."
                        onSearchChange={setLeagueSearchQuery}
                        searchValue={leagueSearchQuery}
                      />
                    </div>
                  )}
                  {setupForm.selectionMode === "teams" && (
                    <div className="space-y-2 min-w-0">
                      <Label>Teams</Label>
                      <MultiSelectCombobox
                        options={teamOptions}
                        selectedValues={setupForm.selectedTeamIds}
                        onSelectionChange={(vals) =>
                          setSetupForm((prev) => ({
                            ...prev,
                            selectedTeamIds: vals.map(Number),
                          }))
                        }
                        placeholder="Search teams (min 2 chars)..."
                        searchPlaceholder="Type to search..."
                        emptyMessage="Type at least 2 characters to search."
                        onSearchChange={setTeamSearchQuery}
                        searchValue={teamSearchQuery}
                      />
                    </div>
                  )}
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
                  <div className="space-y-2">
                    <Label htmlFor="groupName">Group name (optional)</Label>
                    <Input
                      id="groupName"
                      className="min-w-0"
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
                  <div className="space-y-2">
                    <Label htmlFor="startInMinutes">Start in (minutes)</Label>
                    <Input
                      id="startInMinutes"
                      type="number"
                      min={1}
                      placeholder="60"
                      className="min-w-0 max-w-[120px]"
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
                  <Button type="submit" disabled={setupMutation.isPending}>
                    <Plus className="mr-2 h-4 w-4" />
                    {setupMutation.isPending ? "Setting up..." : "Create"}
                  </Button>
                </div>
              </form>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Fixtures Card */}
        <Card>
          <CardHeader>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <CardTitle className="shrink-0">
                  Fixtures (
                  {selectedGroupTab === "all"
                    ? fixtures.length
                    : (groups.find((g) => g.id === selectedGroupTab)?.fixtureIds
                        .length ?? 0)}
                  )
                </CardTitle>
                {groups.length > 0 && (
                  <Select
                    value={
                      selectedGroupTab === "all"
                        ? "all"
                        : String(selectedGroupTab)
                    }
                    onValueChange={(v) =>
                      setSelectedGroupTab(v === "all" ? "all" : Number(v))
                    }
                  >
                    <SelectTrigger className="w-full min-w-0 sm:w-[200px]">
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {groups.map((g: SandboxGroup) => (
                        <SelectItem key={g.id} value={String(g.id)}>
                          {g.name.replace(/^\[SANDBOX\]\s*/, "")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {groups.length > 0 && selectedGroupTab !== "all" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAddFixtureDialog({
                        open: true,
                        groupId: selectedGroupTab,
                      });
                      setAddFixtureForm({
                        homeTeamId: null,
                        awayTeamId: null,
                        leagueId: null,
                        homeTeamLabel: null,
                        awayTeamLabel: null,
                        leagueLabel: null,
                        round: "",
                        startInMinutes: 60,
                      });
                      setAddFixtureHomeSearch("");
                      setAddFixtureAwaySearch("");
                      setAddFixtureLeagueSearch("");
                    }}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Fixture
                  </Button>
                )}
              </div>
            </div>
            {selectedGroupTab !== "all" &&
              groups.length > 0 &&
              (() => {
                const group = groups.find((g) => g.id === selectedGroupTab);
                if (!group) return null;
                return (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="secondary">{group.status}</Badge>
                    <span className="text-muted-foreground">
                      {group.memberCount} members, {group.fixtureCount} fixtures
                    </span>
                  </div>
                );
              })()}
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
              <div className="min-w-0 overflow-x-auto">
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
                    {filteredFixtures.map((fixture) => {
                      const action = getFixtureAction(fixture.state);
                      const matchName =
                        fixture.homeTeam && fixture.awayTeam
                          ? `${fixture.homeTeam} vs ${fixture.awayTeam}`
                          : fixture.name;
                      const score =
                        fixture.homeScore90 !== null &&
                        fixture.awayScore90 !== null
                          ? `${fixture.homeScore90} - ${fixture.awayScore90}`
                          : "—";
                      const isLive = LIVE_STATES.includes(
                        fixture.state as (typeof LIVE_STATES)[number]
                      );
                      const minDisplay = isLive
                        ? (fixture.liveMinute ?? "—")
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
              </div>
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
                  homeScore90: ftScores.home,
                  awayScore90: ftScores.away,
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
                  value={editLiveForm.homeScore90}
                  onChange={(e) =>
                    setEditLiveForm((prev) => ({
                      ...prev,
                      homeScore90: Math.max(0, Number(e.target.value) || 0),
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
                  value={editLiveForm.awayScore90}
                  onChange={(e) =>
                    setEditLiveForm((prev) => ({
                      ...prev,
                      awayScore90: Math.max(0, Number(e.target.value) || 0),
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
                  homeScore90: editLiveForm.homeScore90,
                  awayScore90: editLiveForm.awayScore90,
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

      {/* Add Fixture Dialog */}
      <Dialog
        open={addFixtureDialog.open}
        onOpenChange={(open) => {
          if (!open) setAddFixtureDialog({ open: false, groupId: null });
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Fixture to Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 min-w-0">
                <Label>Home Team</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
                    >
                      {addFixtureForm.homeTeamId != null
                        ? (addFixtureForm.homeTeamLabel ??
                          addFixtureHomeOptions.find(
                            (o) => o.value === addFixtureForm.homeTeamId
                          )?.label ??
                          `Team #${addFixtureForm.homeTeamId}`)
                        : "Search team..."}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Type to search (min 2 chars)..."
                        value={addFixtureHomeSearch}
                        onValueChange={setAddFixtureHomeSearch}
                      />
                      <CommandList>
                        <CommandEmpty>Type at least 2 characters.</CommandEmpty>
                        <CommandGroup>
                          {addFixtureHomeOptions.map((opt) => (
                            <CommandItem
                              key={opt.value}
                              value={String(opt.value)}
                              onSelect={() => {
                                setAddFixtureForm((prev) => ({
                                  ...prev,
                                  homeTeamId: Number(opt.value),
                                  homeTeamLabel: opt.label,
                                }));
                              }}
                            >
                              {opt.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Away Team</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
                    >
                      {addFixtureForm.awayTeamId != null
                        ? (addFixtureForm.awayTeamLabel ??
                          addFixtureAwayOptions.find(
                            (o) => o.value === addFixtureForm.awayTeamId
                          )?.label ??
                          `Team #${addFixtureForm.awayTeamId}`)
                        : "Search team..."}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Type to search (min 2 chars)..."
                        value={addFixtureAwaySearch}
                        onValueChange={setAddFixtureAwaySearch}
                      />
                      <CommandList>
                        <CommandEmpty>Type at least 2 characters.</CommandEmpty>
                        <CommandGroup>
                          {addFixtureAwayOptions.map((opt) => (
                            <CommandItem
                              key={opt.value}
                              value={String(opt.value)}
                              onSelect={() => {
                                setAddFixtureForm((prev) => ({
                                  ...prev,
                                  awayTeamId: Number(opt.value),
                                  awayTeamLabel: opt.label,
                                }));
                              }}
                            >
                              {opt.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-2 min-w-0">
              <Label>League (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    {addFixtureForm.leagueId != null
                      ? (addFixtureForm.leagueLabel ??
                        addFixtureLeagueOptions.find(
                          (o) => o.value === addFixtureForm.leagueId
                        )?.label ??
                        `League #${addFixtureForm.leagueId}`)
                      : "Search league (optional)..."}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Type to search (min 2 chars)..."
                      value={addFixtureLeagueSearch}
                      onValueChange={setAddFixtureLeagueSearch}
                    />
                    <CommandList>
                      <CommandEmpty>Type at least 2 characters.</CommandEmpty>
                      <CommandGroup>
                        {addFixtureLeagueOptions.map((opt) => (
                          <CommandItem
                            key={opt.value}
                            value={String(opt.value)}
                            onSelect={() => {
                              setAddFixtureForm((prev) => ({
                                ...prev,
                                leagueId: Number(opt.value),
                                leagueLabel: opt.label,
                              }));
                            }}
                          >
                            {opt.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="addRound">Round (optional)</Label>
              <Input
                id="addRound"
                type="text"
                placeholder=""
                value={addFixtureForm.round}
                onChange={(e) =>
                  setAddFixtureForm((prev) => ({
                    ...prev,
                    round: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addStartInMinutes">Start in (minutes)</Label>
              <Input
                id="addStartInMinutes"
                type="number"
                min={1}
                value={addFixtureForm.startInMinutes}
                onChange={(e) =>
                  setAddFixtureForm((prev) => ({
                    ...prev,
                    startInMinutes: Number(e.target.value) || 60,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setAddFixtureDialog({ open: false, groupId: null })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (addFixtureDialog.groupId == null) return;
                const home = addFixtureForm.homeTeamId;
                const away = addFixtureForm.awayTeamId;
                if (home == null || away == null) {
                  toast.error("Home and away teams are required");
                  return;
                }
                addFixtureMutation.mutate({
                  groupId: addFixtureDialog.groupId,
                  homeTeamId: home,
                  awayTeamId: away,
                  leagueId: addFixtureForm.leagueId ?? undefined,
                  round: addFixtureForm.round || undefined,
                  startInMinutes: addFixtureForm.startInMinutes,
                });
              }}
              disabled={addFixtureMutation.isPending}
            >
              {addFixtureMutation.isPending ? "Adding..." : "Add Fixture"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
