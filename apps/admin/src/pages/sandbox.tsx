import * as React from "react";
import { HeaderActions } from "@/contexts/header-actions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Play,
  Flag,
  RotateCcw,
  Trash2,
  Plus,
  Pencil,
  ChevronDown,
  MessageSquare,
  Clock,
  Users,
  Trophy,
  MoreHorizontal,
  CalendarIcon,
  ArrowUpDown,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSandboxList } from "@/hooks/use-sandbox";
import {
  sandboxService,
  type SandboxFixture,
  type SandboxGroup,
  type SandboxMember,
} from "@/services/sandbox.service";
import { leaguesService } from "@/services/leagues.service";
import { teamsService } from "@/services/teams.service";
import { usersService } from "@/services/users.service";
import { cn } from "@/lib/utils";
import { MultiSelectCombobox } from "@/components/filters/multi-select-combobox";
import { Calendar } from "@/components/ui/calendar";

function tsToDatetimeLocal(ts: number): string {
  const d = new Date(ts * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTimeShort(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ──────────────────── DateTime Picker Popover ──────────────────── */

function DateTimePickerPopover({
  startTs,
  onSave,
  saving,
  className,
}: {
  startTs: number;
  onSave: (isoString: string) => void;
  saving?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date>(() => new Date(startTs * 1000));
  const [time, setTime] = React.useState(() => {
    const d = new Date(startTs * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  // Reset internal state when popover opens
  React.useEffect(() => {
    if (open) {
      const d = new Date(startTs * 1000);
      setDate(d);
      const pad = (n: number) => String(n).padStart(2, "0");
      setTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    }
  }, [open, startTs]);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const combinedDate = React.useMemo(() => {
    const [hours, minutes] = time.split(":").map(Number);
    const d = new Date(date);
    d.setHours(hours ?? 0, minutes ?? 0, 0, 0);
    return d;
  }, [date, time]);

  const isInPast = combinedDate.getTime() <= Date.now();

  const handleSave = () => {
    if (isInPast) return;
    onSave(combinedDate.toISOString());
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-8 justify-start text-xs font-normal",
            className
          )}
        >
          <CalendarIcon className="mr-1.5 h-3 w-3 text-muted-foreground" />
          {formatDateTimeShort(startTs)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && setDate(d)}
          disabled={{ before: today }}
          initialFocus
        />
        <div className="border-t px-3 py-3 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="time"
              className="h-8 w-[100px] text-xs tabular-nums"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
            {isInPast && (
              <span className="text-[10px] text-destructive">In the past</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={handleSave}
              disabled={saving || isInPast}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
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

const CANCELLED_STATES = [
  "CANCELLED",
  "POSTPONED",
  "SUSPENDED",
  "ABANDONED",
  "INTERRUPTED",
  "WO",
  "AWARDED",
] as const;

function getFixtureAction(
  state: string
): "kickoff" | "full-time" | "reset" | null {
  if (state === "NS") return "kickoff";
  if (LIVE_STATES.includes(state as (typeof LIVE_STATES)[number]))
    return "full-time";
  if (FINISHED_STATES.includes(state as (typeof FINISHED_STATES)[number]))
    return "reset";
  if (CANCELLED_STATES.includes(state as (typeof CANCELLED_STATES)[number]))
    return "reset";
  return null;
}

function getStateBadgeVariant(
  state: string
): "secondary" | "default" | "outline" | "destructive" {
  if (state === "NS") return "secondary";
  if (LIVE_STATES.includes(state as (typeof LIVE_STATES)[number]))
    return "default";
  if (CANCELLED_STATES.includes(state as (typeof CANCELLED_STATES)[number]))
    return "destructive";
  return "outline";
}

const SAMPLE_MESSAGES_EN = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
  "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
];
const SAMPLE_MESSAGES_HE = [
  "לורם איפסום דולור סיט אמט, קונסקטורר אדיפיסינג אליט. קודס בלבוריס ניסי אונרי אולום קוויס נוסטרוד אקסר ציט.",
  "אוט אינימ אד מינימ ויניאם, קויס נוסטרוד אקסר ציטיישן אולמקו לבוריס ניסי אוט אליקויפ אקס איאה קומודו קונסקוואט.",
  "דואיס אוטה אירורה דולור אין ריפרהינדריט אין וולופטאה ולית אסה צילום דולורה יו פוגיאט נולה פרייטור.",
];

function getRandomSample(lang: "he" | "en"): string {
  const pool = lang === "en" ? SAMPLE_MESSAGES_EN : SAMPLE_MESSAGES_HE;
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0]!;
}

/* ──────────────────── Fixture Mobile Card ──────────────────── */

function FixtureMobileCard({
  fixture,
  onKickoff,
  onEditLive,
  onFullTime,
  onReset,
  onUpdateStartTime,
  onSetState,
  kickoffPending,
  resetPending,
  startTimeSaving,
}: {
  fixture: SandboxFixture;
  onKickoff: (id: number) => void;
  onEditLive: (f: SandboxFixture) => void;
  onFullTime: (id: number) => void;
  onReset: (id: number) => void;
  onUpdateStartTime: (id: number, isoString: string) => void;
  onSetState: (id: number, state: string) => void;
  kickoffPending: boolean;
  resetPending: boolean;
  startTimeSaving: boolean;
}) {
  const action = getFixtureAction(fixture.state);
  const matchName =
    fixture.homeTeam && fixture.awayTeam
      ? `${fixture.homeTeam} vs ${fixture.awayTeam}`
      : fixture.name;
  const score =
    fixture.homeScore90 !== null && fixture.awayScore90 !== null
      ? `${fixture.homeScore90} - ${fixture.awayScore90}`
      : null;
  const isLive = LIVE_STATES.includes(
    fixture.state as (typeof LIVE_STATES)[number]
  );
  const canSetState =
    fixture.state === "NS" || isLive;

  return (
    <div className="rounded-lg border p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{matchName}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={getStateBadgeVariant(fixture.state)} className="text-[10px]">
              {fixture.state}
            </Badge>
            {isLive && fixture.liveMinute != null && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {fixture.liveMinute}'
              </span>
            )}
            {score && (
              <span className="text-sm font-semibold tabular-nums">{score}</span>
            )}
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
          #{fixture.id}
        </span>
      </div>

      {fixture.state === "NS" && (
        <DateTimePickerPopover
          startTs={fixture.startTs}
          onSave={(iso) => onUpdateStartTime(fixture.id, iso)}
          saving={startTimeSaving}
          className="w-full"
        />
      )}
      {fixture.state !== "NS" && (
        <p className="text-[10px] text-muted-foreground">
          {new Date(fixture.startTs * 1000).toLocaleString()}
        </p>
      )}

      {(action || canSetState) && (
        <>
          <Separator />
          <div className="flex items-center gap-2">
            {action === "kickoff" && (
              <Button
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() => onKickoff(fixture.id)}
                disabled={kickoffPending}
              >
                <Play className="mr-1.5 h-3 w-3" />
                Kickoff
              </Button>
            )}
            {action === "full-time" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 text-xs"
                  onClick={() => onEditLive(fixture)}
                >
                  <Pencil className="mr-1.5 h-3 w-3" />
                  Edit Live
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => onFullTime(fixture.id)}
                >
                  <Flag className="mr-1.5 h-3 w-3" />
                  Full Time
                </Button>
              </>
            )}
            {action === "reset" && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-xs"
                onClick={() => onReset(fixture.id)}
                disabled={resetPending}
              >
                <RotateCcw className="mr-1.5 h-3 w-3" />
                Reset
              </Button>
            )}
            {canSetState && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="outline" className="h-8 w-8 shrink-0">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onSetState(fixture.id, "POSTPONED")}>
                    Postpone
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetState(fixture.id, "CANCELLED")}>
                    Cancel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetState(fixture.id, "SUSPENDED")}>
                    Suspend
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetState(fixture.id, "ABANDONED")}>
                    Abandon
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ──────────────────── Member Mobile Card ──────────────────── */

function MemberMobileCard({
  member,
  onSendMessage,
}: {
  member: SandboxMember;
  onSendMessage: (member: SandboxMember) => void;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{member.username}</p>
            <Badge
              variant={member.role === "owner" ? "default" : "secondary"}
              className="text-[10px] shrink-0"
            >
              {member.role}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground">
              ID: {member.userId}
            </span>
            {member.email && (
              <span className="text-[10px] text-muted-foreground truncate">
                {member.email}
              </span>
            )}
          </div>
        </div>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 shrink-0"
          onClick={() => onSendMessage(member)}
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ──────────────────── Main Page ──────────────────── */

export default function SandboxPage() {
  const queryClient = useQueryClient();
  const { data: listData, isLoading } = useSandboxList();
  const fixtures = listData?.data?.fixtures ?? [];
  const groups = listData?.data?.groups ?? [];

  const [selectedGroupTab, setSelectedGroupTab] = React.useState<number | null>(
    null
  );

  React.useEffect(() => {
    if (groups.length > 0 && selectedGroupTab === null) {
      setSelectedGroupTab(groups[0].id);
    }
  }, [groups, selectedGroupTab]);

  const [sortByTime, setSortByTime] = React.useState(false);

  const filteredFixtures = React.useMemo(() => {
    if (selectedGroupTab === null) return [];
    const group = groups.find((g) => g.id === selectedGroupTab);
    if (!group) return [];
    const list = fixtures.filter((f) => group.fixtureIds.includes(f.id));
    if (sortByTime) {
      return [...list].sort((a, b) => a.startTs - b.startTs);
    }
    return list;
  }, [fixtures, groups, selectedGroupTab, sortByTime]);

  const [viewMode, setViewMode] = React.useState<"fixtures" | "members">(
    "fixtures"
  );
  const [sendMessageDialog, setSendMessageDialog] = React.useState<{
    open: boolean;
    memberId: number | null;
    memberName: string;
  }>({ open: false, memberId: null, memberName: "" });
  const [messageLang, setMessageLang] = React.useState<"he" | "en">("en");
  const [messageBody, setMessageBody] = React.useState(() =>
    getRandomSample("en")
  );

  // Setup form
  const [setupForm, setSetupForm] = React.useState({
    selectionMode: "games" as "games" | "leagues" | "teams",
    fixtureCount: 3,
    selectedLeagueIds: [] as number[],
    selectedTeamIds: [] as number[],
    selectedUserIds: [] as number[],
    predictionMode: "CorrectScore" as "CorrectScore" | "MatchWinner",
    autoGeneratePredictions: true,
    groupName: "",
    startInMinutes: 60,
    intervalMinutes: 15,
  });
  const [userSearchQuery, setUserSearchQuery] = React.useState("");
  const [leagueSearchQuery, setLeagueSearchQuery] = React.useState("");
  const [teamSearchQuery, setTeamSearchQuery] = React.useState("");
  const [debouncedUserQuery] = useDebounce(userSearchQuery, 300);
  const [debouncedLeagueQuery] = useDebounce(leagueSearchQuery, 300);
  const [debouncedTeamQuery] = useDebounce(teamSearchQuery, 300);

  const { data: usersSearchData } = useQuery({
    queryKey: ["users", "search", debouncedUserQuery],
    queryFn: () => usersService.list({ search: debouncedUserQuery, limit: 20 }),
    enabled: debouncedUserQuery.length >= 2,
    staleTime: Infinity,
  });

  const userOptions = React.useMemo(() => {
    const data = usersSearchData?.data?.users ?? [];
    return data.map((u) => ({
      value: u.id,
      label: u.username
        ? `${u.username} (${u.email})`
        : u.name
          ? `${u.name} (${u.email})`
          : u.email,
    }));
  }, [usersSearchData]);

  const { data: leaguesSearchData } = useQuery({
    queryKey: ["leagues", "search", debouncedLeagueQuery],
    queryFn: () => leaguesService.search(debouncedLeagueQuery, 20),
    enabled:
      setupForm.selectionMode === "leagues" && debouncedLeagueQuery.length >= 2,
    staleTime: Infinity,
  });
  const { data: teamsSearchData } = useQuery({
    queryKey: ["teams", "search", debouncedTeamQuery],
    queryFn: () => teamsService.search(debouncedTeamQuery, 20),
    enabled:
      setupForm.selectionMode === "teams" && debouncedTeamQuery.length >= 2,
    staleTime: Infinity,
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
    staleTime: Infinity,
  });
  const { data: addAwayTeams } = useQuery({
    queryKey: ["teams", "search", "addAway", debouncedAddAway],
    queryFn: () => teamsService.search(debouncedAddAway, 20),
    enabled: addFixtureDialog.open && debouncedAddAway.length >= 2,
    staleTime: Infinity,
  });
  const { data: addLeagues } = useQuery({
    queryKey: ["leagues", "search", "addLeague", debouncedAddLeague],
    queryFn: () => leaguesService.search(debouncedAddLeague, 20),
    enabled: addFixtureDialog.open && debouncedAddLeague.length >= 2,
    staleTime: Infinity,
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

  // Create group dialog
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = React.useState(false);

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
      intervalMinutes?: number;
    }) => sandboxService.setup(args),
    onSuccess: (data) => {
      toast.success(`Sandbox setup complete — group #${data.data.groupId}`);
      queryClient.invalidateQueries({ queryKey: ["sandbox", "list"] });
      setCreateGroupDialogOpen(false);
      setSetupForm({
        selectionMode: "games",
        fixtureCount: 3,
        selectedLeagueIds: [],
        selectedTeamIds: [],
        selectedUserIds: [],
        predictionMode: "CorrectScore",
        autoGeneratePredictions: true,
        groupName: "",
        startInMinutes: 60,
        intervalMinutes: 15,
      });
      setUserSearchQuery("");
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

  const bulkKickoffMutation = useMutation({
    mutationFn: (fixtureIds: number[]) => sandboxService.bulkKickoff(fixtureIds),
    onSuccess: () => {
      toast.success("All fixtures kicked off!");
      queryClient.invalidateQueries({ queryKey: ["sandbox", "list"] });
    },
    onError: (error: Error) => {
      toast.error("Bulk kickoff failed", { description: error.message });
    },
  });

  const setStateMutation = useMutation({
    mutationFn: (args: { fixtureId: number; state: string }) =>
      sandboxService.setState(args),
    onSuccess: (data) => {
      toast.success(`Fixture set to ${(data.data as { state?: string })?.state ?? "new state"}`);
      queryClient.invalidateQueries({ queryKey: ["sandbox", "list"] });
    },
    onError: (error: Error) => {
      toast.error("Set state failed", { description: error.message });
    },
  });

  const nsFixtureIds = React.useMemo(() => {
    return filteredFixtures
      .filter((f) => f.state === "NS")
      .map((f) => f.id);
  }, [filteredFixtures]);

  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = React.useState(false);

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: number) => sandboxService.deleteGroup(groupId),
    onSuccess: (data) => {
      toast.success(`Group deleted (${data.data.deletedFixtures} fixtures removed)`);
      queryClient.invalidateQueries({ queryKey: ["sandbox", "list"] });
      setDeleteGroupDialogOpen(false);
      if (selectedGroupTab === data.data.groupId) {
        setSelectedGroupTab(null);
      }
    },
    onError: (error: Error) => {
      toast.error("Delete group failed", { description: error.message });
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

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ["sandbox", "members", selectedGroupTab],
    queryFn: () => sandboxService.getGroupMembers(selectedGroupTab!),
    enabled: selectedGroupTab !== null && viewMode === "members",
    staleTime: Infinity,
  });
  const members = membersData?.data ?? [];

  const sendMessageMutation = useMutation({
    mutationFn: (args: { groupId: number; senderId: number; body: string }) =>
      sandboxService.sendMessage(args),
    onSuccess: () => {
      toast.success("Message sent successfully");
      setSendMessageDialog({ open: false, memberId: null, memberName: "" });
    },
    onError: (error: Error) => {
      toast.error("Send message failed", { description: error.message });
    },
  });

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    const memberUserIds = setupForm.selectedUserIds;
    if (memberUserIds.length === 0) {
      toast.error("Select at least one user");
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
        intervalMinutes: setupForm.intervalMinutes,
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
        intervalMinutes: setupForm.intervalMinutes,
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
      intervalMinutes: setupForm.intervalMinutes,
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

  const openSendMessageDialog = (member: SandboxMember) => {
    setMessageLang("en");
    setMessageBody(getRandomSample("en"));
    setSendMessageDialog({
      open: true,
      memberId: member.userId,
      memberName: member.username,
    });
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupTab) ?? null;

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-6">
      <HeaderActions>
        <Button
          size="sm"
          onClick={() => setCreateGroupDialogOpen(true)}
        >
          <Plus className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">New Group</span>
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setCleanupDialogOpen(true)}
                disabled={fixtures.length === 0 && groups.length === 0}
              >
                <Trash2 className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Cleanup</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="sm:hidden">
              <p>Cleanup All</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </HeaderActions>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 min-h-0 overflow-auto">
        {/* ── Fixtures / Members Card ── */}
        <Card>
          <CardHeader className="px-3 sm:px-6 py-3 sm:py-4 space-y-2.5">
            {/* Row 1 desktop: selector + actions + tabs inline */}
            {/* Row 1+2 mobile: selector full width, tabs full width below */}
            <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
              <div className="flex items-center gap-2">
                {groups.length > 0 ? (
                  <Select
                    value={
                      selectedGroupTab === null ? "" : String(selectedGroupTab)
                    }
                    onValueChange={(v) => setSelectedGroupTab(Number(v))}
                  >
                    <SelectTrigger className="h-8 w-full sm:w-[200px] text-xs sm:text-sm">
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((g: SandboxGroup) => (
                        <SelectItem key={g.id} value={String(g.id)}>
                          {g.name.replace(/^\[SANDBOX\]\s*/, "")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <CardTitle className="text-sm sm:text-base">Groups</CardTitle>
                )}
                {selectedGroup && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs shrink-0"
                      onClick={() => {
                        setAddFixtureDialog({
                          open: true,
                          groupId: selectedGroupTab!,
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
                      <Plus className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Add Fixture</span>
                    </Button>
                    {nsFixtureIds.length >= 2 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs shrink-0"
                        onClick={() => bulkKickoffMutation.mutate(nsFixtureIds)}
                        disabled={bulkKickoffMutation.isPending}
                      >
                        <Play className="h-3 w-3 sm:mr-1" />
                        <span className="hidden sm:inline">
                          {bulkKickoffMutation.isPending
                            ? "Kicking off..."
                            : `Kickoff All (${nsFixtureIds.length})`}
                        </span>
                      </Button>
                    )}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant={sortByTime ? "default" : "outline"}
                            className="h-8 w-8 shrink-0"
                            onClick={() => setSortByTime((p) => !p)}
                          >
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{sortByTime ? "Sorted by start time" : "Sort by start time"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteGroupDialogOpen(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>

              {selectedGroupTab !== null && (
                <Tabs
                  value={viewMode}
                  onValueChange={(v) =>
                    setViewMode(v as "fixtures" | "members")
                  }
                  className="w-full sm:w-auto shrink-0"
                >
                  <TabsList className="h-8 w-full sm:w-auto">
                    <TabsTrigger value="fixtures" className="text-xs px-2.5 h-6 flex-1 sm:flex-initial">
                      Fixtures
                    </TabsTrigger>
                    <TabsTrigger value="members" className="text-xs px-2.5 h-6 flex-1 sm:flex-initial">
                      Members
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </div>

            {/* Row 2: Group meta */}
            {selectedGroup && (
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px]">
                  {selectedGroup.status}
                </Badge>
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  {selectedGroup.memberCount} members, {selectedGroup.fixtureCount} fixtures
                </span>
              </div>
            )}
          </CardHeader>

          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6 pt-0">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No groups yet. Create a group using the form above.
                </p>
              </div>
            ) : selectedGroupTab === null ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Select a group to view its fixtures.
              </p>
            ) : viewMode === "fixtures" ? (
              filteredFixtures.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No fixtures in this group.
                </p>
              ) : (
                <>
                  {/* Mobile: Cards */}
                  <div className="space-y-2 sm:hidden">
                    {filteredFixtures.map((fixture) => (
                      <FixtureMobileCard
                        key={fixture.id}
                        fixture={fixture}
                        onKickoff={(id) => kickoffMutation.mutate(id)}
                        onEditLive={openEditLiveDialog}
                        onFullTime={openFtDialog}
                        onReset={(id) => resetMutation.mutate(id)}
                        onUpdateStartTime={(id, iso) =>
                          updateStartTimeMutation.mutate({
                            fixtureId: id,
                            startTime: iso,
                          })
                        }
                        onSetState={(id, state) =>
                          setStateMutation.mutate({ fixtureId: id, state })
                        }
                        kickoffPending={kickoffMutation.isPending}
                        resetPending={resetMutation.isPending}
                        startTimeSaving={updateStartTimeMutation.isPending}
                      />
                    ))}
                  </div>

                  {/* Desktop: Table */}
                  <div className="hidden sm:block min-w-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">ID</TableHead>
                          <TableHead>Match</TableHead>
                          <TableHead className="w-[100px]">State</TableHead>
                          <TableHead className="w-[50px]">Min</TableHead>
                          <TableHead className="w-[70px]">Score</TableHead>
                          <TableHead className="w-[180px]">Start</TableHead>
                          <TableHead className="w-[180px]">Action</TableHead>
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
                              <TableCell className="text-xs text-muted-foreground tabular-nums">
                                {fixture.id}
                              </TableCell>
                              <TableCell className="text-sm font-medium">
                                {matchName}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={getStateBadgeVariant(fixture.state)}
                                  className="text-[10px]"
                                >
                                  {fixture.state}
                                </Badge>
                              </TableCell>
                              <TableCell className="tabular-nums text-sm">
                                {minDisplay}
                              </TableCell>
                              <TableCell className="tabular-nums font-medium text-sm">
                                {score}
                              </TableCell>
                              <TableCell>
                                {fixture.state === "NS" ? (
                                  <DateTimePickerPopover
                                    startTs={fixture.startTs}
                                    onSave={(iso) =>
                                      updateStartTimeMutation.mutate({
                                        fixtureId: fixture.id,
                                        startTime: iso,
                                      })
                                    }
                                    saving={updateStartTimeMutation.isPending}
                                    className="w-[170px]"
                                  />
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(
                                      fixture.startTs * 1000
                                    ).toLocaleString()}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  {action === "kickoff" && (
                                    <Button
                                      size="sm"
                                      className="h-7 text-xs"
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
                                        className="h-7 text-xs"
                                        onClick={() =>
                                          openEditLiveDialog(fixture)
                                        }
                                      >
                                        <Pencil className="mr-1 h-3 w-3" />
                                        Edit
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() =>
                                          openFtDialog(fixture.id)
                                        }
                                      >
                                        <Flag className="mr-1 h-3 w-3" />
                                        FT
                                      </Button>
                                    </>
                                  )}
                                  {action === "reset" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs"
                                      onClick={() =>
                                        resetMutation.mutate(fixture.id)
                                      }
                                      disabled={resetMutation.isPending}
                                    >
                                      <RotateCcw className="mr-1 h-3 w-3" />
                                      Reset
                                    </Button>
                                  )}
                                  {(fixture.state === "NS" ||
                                    LIVE_STATES.includes(
                                      fixture.state as (typeof LIVE_STATES)[number]
                                    )) && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-7 w-7"
                                        >
                                          <MoreHorizontal className="h-3.5 w-3.5" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() =>
                                            setStateMutation.mutate({
                                              fixtureId: fixture.id,
                                              state: "POSTPONED",
                                            })
                                          }
                                        >
                                          Postpone
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() =>
                                            setStateMutation.mutate({
                                              fixtureId: fixture.id,
                                              state: "CANCELLED",
                                            })
                                          }
                                        >
                                          Cancel
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() =>
                                            setStateMutation.mutate({
                                              fixtureId: fixture.id,
                                              state: "SUSPENDED",
                                            })
                                          }
                                        >
                                          Suspend
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() =>
                                            setStateMutation.mutate({
                                              fixtureId: fixture.id,
                                              state: "ABANDONED",
                                            })
                                          }
                                        >
                                          Abandon
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )
            ) : membersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No members in this group.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile: Cards */}
                <div className="space-y-2 sm:hidden">
                  {members.map((member: SandboxMember) => (
                    <MemberMobileCard
                      key={member.userId}
                      member={member}
                      onSendMessage={openSendMessageDialog}
                    />
                  ))}
                </div>

                {/* Desktop: Table */}
                <div className="hidden sm:block min-w-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">User ID</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="w-[80px]">Role</TableHead>
                        <TableHead className="w-[130px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member: SandboxMember) => (
                        <TableRow key={member.userId}>
                          <TableCell className="text-xs text-muted-foreground tabular-nums">
                            {member.userId}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {member.username}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {member.email ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                member.role === "owner"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-[10px]"
                            >
                              {member.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => openSendMessageDialog(member)}
                            >
                              <MessageSquare className="mr-1 h-3 w-3" />
                              Send Message
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Full-Time Dialog ── */}
      <Dialog
        open={ftDialog.open}
        onOpenChange={(open) => {
          if (!open) setFtDialog({ open: false, fixtureId: null });
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Set Final Score</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="ftHome" className="text-xs">Home</Label>
                <Input
                  id="ftHome"
                  type="number"
                  className="h-9 text-center text-lg font-semibold tabular-nums"
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
              <span className="pb-2 text-muted-foreground font-medium">—</span>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="ftAway" className="text-xs">Away</Label>
                <Input
                  id="ftAway"
                  type="number"
                  className="h-9 text-center text-lg font-semibold tabular-nums"
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
            <div className="space-y-1.5">
              <Label className="text-xs">Finished State</Label>
              <Select
                value={ftScores.state}
                onValueChange={(v: "FT" | "AET" | "FT_PEN") =>
                  setFtScores((prev) => ({ ...prev, state: v }))
                }
              >
                <SelectTrigger className="h-9">
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
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">ET Home</Label>
                  <Input
                    type="number"
                    className="h-9 text-center tabular-nums"
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
                <span className="pb-2 text-muted-foreground font-medium">—</span>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">ET Away</Label>
                  <Input
                    type="number"
                    className="h-9 text-center tabular-nums"
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
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Pen Home</Label>
                  <Input
                    type="number"
                    className="h-9 text-center tabular-nums"
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
                <span className="pb-2 text-muted-foreground font-medium">—</span>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Pen Away</Label>
                  <Input
                    type="number"
                    className="h-9 text-center tabular-nums"
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
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFtDialog({ open: false, fixtureId: null })}
            >
              Cancel
            </Button>
            <Button
              size="sm"
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

      {/* ── Edit Live Dialog ── */}
      <Dialog
        open={editLiveDialog.open}
        onOpenChange={(open) => {
          if (!open) setEditLiveDialog({ open: false, fixtureId: null });
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Edit Live Fixture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="editHomeScore" className="text-xs">Home Score</Label>
                <Input
                  id="editHomeScore"
                  type="number"
                  className="h-9 text-center tabular-nums"
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
              <div className="space-y-1.5">
                <Label htmlFor="editAwayScore" className="text-xs">Away Score</Label>
                <Input
                  id="editAwayScore"
                  type="number"
                  className="h-9 text-center tabular-nums"
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
            <div className="space-y-1.5">
              <Label htmlFor="editLiveMinute" className="text-xs">Minute</Label>
              <Input
                id="editLiveMinute"
                type="number"
                className="h-9 tabular-nums"
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
            <div className="space-y-1.5">
              <Label htmlFor="editState" className="text-xs">State</Label>
              <Select
                value={editLiveForm.state}
                onValueChange={(v) =>
                  setEditLiveForm((prev) => ({ ...prev, state: v }))
                }
              >
                <SelectTrigger id="editState" className="h-9">
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
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setEditLiveDialog({ open: false, fixtureId: null })
              }
            >
              Cancel
            </Button>
            <Button
              size="sm"
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

      {/* ── Create Group Dialog ── */}
      <Dialog open={createGroupDialogOpen} onOpenChange={setCreateGroupDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Create New Group</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Set up a sandbox group with fictive fixtures and members.
            </DialogDescription>
          </DialogHeader>
          <form
            id="create-group-form"
            onSubmit={handleSetup}
            className="space-y-4"
          >
            <div className="grid min-w-0 gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="selectionMode" className="text-xs">Selection Mode</Label>
                <Select
                  value={setupForm.selectionMode}
                  onValueChange={(v: "games" | "leagues" | "teams") =>
                    setSetupForm((prev) => ({
                      ...prev,
                      selectionMode: v,
                    }))
                  }
                >
                  <SelectTrigger id="selectionMode" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="games">Games (fictive)</SelectItem>
                    <SelectItem value="leagues">Leagues</SelectItem>
                    <SelectItem value="teams">Teams</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="predictionMode" className="text-xs">Prediction Mode</Label>
                <Select
                  value={setupForm.predictionMode}
                  onValueChange={(v: "CorrectScore" | "MatchWinner") =>
                    setSetupForm((prev) => ({
                      ...prev,
                      predictionMode: v,
                    }))
                  }
                >
                  <SelectTrigger id="predictionMode" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CorrectScore">CorrectScore</SelectItem>
                    <SelectItem value="MatchWinner">MatchWinner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs">Users</Label>
              <MultiSelectCombobox
                options={userOptions}
                selectedValues={setupForm.selectedUserIds}
                onSelectionChange={(vals) =>
                  setSetupForm((prev) => ({
                    ...prev,
                    selectedUserIds: vals.map(Number),
                  }))
                }
                placeholder="Search users..."
                searchPlaceholder="Type name or email..."
                emptyMessage="Type at least 2 characters."
                onSearchChange={setUserSearchQuery}
                searchValue={userSearchQuery}
              />
            </div>
            {setupForm.selectionMode === "games" && (
              <div className="space-y-1.5">
                <Label htmlFor="fixtureCount" className="text-xs">Fixture count (1-10)</Label>
                <Input
                  id="fixtureCount"
                  type="number"
                  inputMode="numeric"
                  className="h-9 w-20 tabular-nums"
                  min={1}
                  max={10}
                  value={setupForm.fixtureCount}
                  onChange={(e) => {
                    const val = Math.min(10, Math.max(1, Number(e.target.value) || 1));
                    setSetupForm((prev) => ({ ...prev, fixtureCount: val }));
                  }}
                />
              </div>
            )}
            {setupForm.selectionMode === "leagues" && (
              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs">Leagues</Label>
                <MultiSelectCombobox
                  options={leagueOptions}
                  selectedValues={setupForm.selectedLeagueIds}
                  onSelectionChange={(vals) =>
                    setSetupForm((prev) => ({
                      ...prev,
                      selectedLeagueIds: vals.map(Number),
                    }))
                  }
                  placeholder="Search leagues..."
                  searchPlaceholder="Type to search..."
                  emptyMessage="Type at least 2 characters."
                  onSearchChange={setLeagueSearchQuery}
                  searchValue={leagueSearchQuery}
                />
              </div>
            )}
            {setupForm.selectionMode === "teams" && (
              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs">Teams</Label>
                <MultiSelectCombobox
                  options={teamOptions}
                  selectedValues={setupForm.selectedTeamIds}
                  onSelectionChange={(vals) =>
                    setSetupForm((prev) => ({
                      ...prev,
                      selectedTeamIds: vals.map(Number),
                    }))
                  }
                  placeholder="Search teams..."
                  searchPlaceholder="Type to search..."
                  emptyMessage="Type at least 2 characters."
                  onSearchChange={setTeamSearchQuery}
                  searchValue={teamSearchQuery}
                />
              </div>
            )}
            <div className="grid min-w-0 gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="groupName" className="text-xs">Group name (optional)</Label>
                <Input
                  id="groupName"
                  className="h-9 min-w-0"
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
              <div className="space-y-1.5">
                <Label htmlFor="startInMinutes" className="text-xs">Start in (minutes)</Label>
                <Input
                  id="startInMinutes"
                  type="number"
                  className="h-9 min-w-0"
                  min={1}
                  placeholder="60"
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
            <div className="space-y-1.5">
              <Label htmlFor="intervalMinutes" className="text-xs">Interval between fixtures (minutes)</Label>
              <Input
                id="intervalMinutes"
                type="number"
                className="h-9 w-20 tabular-nums"
                min={0}
                max={120}
                value={setupForm.intervalMinutes}
                onChange={(e) =>
                  setSetupForm((prev) => ({
                    ...prev,
                    intervalMinutes: Math.min(120, Math.max(0, Number(e.target.value) || 0)),
                  }))
                }
              />
            </div>
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
              <Label htmlFor="autoGenerate" className="text-xs font-normal">
                Auto-generate predictions
              </Label>
            </div>
          </form>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateGroupDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-group-form"
              size="sm"
              disabled={setupMutation.isPending}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {setupMutation.isPending ? "Setting up..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Group Dialog ── */}
      <Dialog open={deleteGroupDialogOpen} onOpenChange={setDeleteGroupDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Delete this group?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will delete the group
            {selectedGroup && (
              <> <span className="font-medium text-foreground">{selectedGroup.name.replace(/^\[SANDBOX\]\s*/, "")}</span></>
            )}
            {" "}and its sandbox fixtures. This action cannot be undone.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteGroupDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (selectedGroupTab == null) return;
                deleteGroupMutation.mutate(selectedGroupTab);
              }}
              disabled={deleteGroupMutation.isPending}
            >
              {deleteGroupMutation.isPending ? "Deleting..." : "Delete Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cleanup Confirmation Dialog ── */}
      <Dialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Delete all sandbox data?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will delete {fixtures.length} fixtures and {groups.length}{" "}
            groups. This action cannot be undone.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCleanupDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => cleanupMutation.mutate()}
              disabled={cleanupMutation.isPending}
            >
              {cleanupMutation.isPending ? "Deleting..." : "Delete All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Fixture Dialog ── */}
      <Dialog
        open={addFixtureDialog.open}
        onOpenChange={(open) => {
          if (!open) setAddFixtureDialog({ open: false, groupId: null });
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Add Fixture to Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs">Home Team</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full h-9 justify-between font-normal text-xs"
                    >
                      <span className="truncate">
                        {addFixtureForm.homeTeamId != null
                          ? (addFixtureForm.homeTeamLabel ??
                            addFixtureHomeOptions.find(
                              (o) => o.value === addFixtureForm.homeTeamId
                            )?.label ??
                            `Team #${addFixtureForm.homeTeamId}`)
                          : "Search team..."}
                      </span>
                      <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Type to search..."
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
              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs">Away Team</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full h-9 justify-between font-normal text-xs"
                    >
                      <span className="truncate">
                        {addFixtureForm.awayTeamId != null
                          ? (addFixtureForm.awayTeamLabel ??
                            addFixtureAwayOptions.find(
                              (o) => o.value === addFixtureForm.awayTeamId
                            )?.label ??
                            `Team #${addFixtureForm.awayTeamId}`)
                          : "Search team..."}
                      </span>
                      <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Type to search..."
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
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs">League (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full h-9 justify-between font-normal text-xs"
                  >
                    <span className="truncate">
                      {addFixtureForm.leagueId != null
                        ? (addFixtureForm.leagueLabel ??
                          addFixtureLeagueOptions.find(
                            (o) => o.value === addFixtureForm.leagueId
                          )?.label ??
                          `League #${addFixtureForm.leagueId}`)
                        : "Search league (optional)..."}
                    </span>
                    <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Type to search..."
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="addRound" className="text-xs">Round (optional)</Label>
                <Input
                  id="addRound"
                  type="text"
                  className="h-9"
                  value={addFixtureForm.round}
                  onChange={(e) =>
                    setAddFixtureForm((prev) => ({
                      ...prev,
                      round: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addStartInMinutes" className="text-xs">Start in (min)</Label>
                <Input
                  id="addStartInMinutes"
                  type="number"
                  className="h-9"
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
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setAddFixtureDialog({ open: false, groupId: null })
              }
            >
              Cancel
            </Button>
            <Button
              size="sm"
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

      {/* ── Send Message Dialog ── */}
      <Dialog
        open={sendMessageDialog.open}
        onOpenChange={(open) => {
          if (!open)
            setSendMessageDialog({
              open: false,
              memberId: null,
              memberName: "",
            });
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Send Message as {sendMessageDialog.memberName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Label className="text-xs shrink-0">Language</Label>
              <Tabs
                value={messageLang}
                onValueChange={(v) => {
                  const lang = v as "he" | "en";
                  setMessageLang(lang);
                  setMessageBody(getRandomSample(lang));
                }}
              >
                <TabsList className="h-8">
                  <TabsTrigger value="en" className="text-xs px-2.5 h-6">
                    English
                  </TabsTrigger>
                  <TabsTrigger value="he" className="text-xs px-2.5 h-6">
                    עברית
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="messageBody" className="text-xs">Message</Label>
              <Textarea
                id="messageBody"
                rows={4}
                className="text-sm"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder={
                  messageLang === "he" ? "הזן הודעה..." : "Enter message..."
                }
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                This message will appear in the group chat as if sent by{" "}
                {sendMessageDialog.memberName}.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSendMessageDialog({
                  open: false,
                  memberId: null,
                  memberName: "",
                })
              }
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (
                  selectedGroupTab == null ||
                  sendMessageDialog.memberId == null
                )
                  return;
                sendMessageMutation.mutate({
                  groupId: selectedGroupTab,
                  senderId: sendMessageDialog.memberId,
                  body: messageBody,
                });
              }}
              disabled={sendMessageMutation.isPending || !messageBody.trim()}
            >
              {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
