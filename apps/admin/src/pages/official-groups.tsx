import * as React from "react";
import {
  useState,
  useReducer,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { officialGroupsService } from "@/services/official-groups.service";
import { fixturesService } from "@/services/fixtures.service";
import { leaguesService } from "@/services/leagues.service";
import { teamsService } from "@/services/teams.service";
import { MultiSelectCombobox } from "@/components/filters/multi-select-combobox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
import { Calendar } from "@/components/ui/calendar";
import {
  CalendarIcon,
  Check,
  ChevronsUpDown,
  Filter,
  Loader2,
  RotateCcw,
  Search,
  X,
  Trophy,
  Gamepad2,
  Users,
  ArrowLeft,
  Trash2,
  Award,
} from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import type {
  AdminCreateOfficialGroupBody,
  AdminUpdateOfficialGroupBody,
  AdminOfficialGroupItem,
  AdminOfficialGroupDetailsResponse,
} from "@repo/types";

// ─── Media query helpers (for responsive calendar) ───────────────────────────

const mdQuery =
  typeof window !== "undefined"
    ? window.matchMedia("(min-width: 768px)")
    : null;
function subscribeMdQuery(cb: () => void) {
  mdQuery?.addEventListener("change", cb);
  return () => mdQuery?.removeEventListener("change", cb);
}
function getMdSnapshot() {
  return mdQuery?.matches ?? false;
}
function getMdServerSnapshot() {
  return false;
}

// ─── Wizard State & Reducer ──────────────────────────────────────────────────

type GamesSearchFilters = {
  query: string;
  leagueId: number | undefined;
  leagueName: string;
  state: string;
  fromDate: Date | undefined;
  toDate: Date | undefined;
};

const defaultGamesFilters: GamesSearchFilters = {
  query: "",
  leagueId: undefined,
  leagueName: "",
  state: "",
  fromDate: undefined,
  toDate: undefined,
};

type WizardState = {
  step: 1 | 2 | 3 | 4;
  selectionMode: "games" | "teams" | "leagues" | null;

  // Games
  gamesFilters: GamesSearchFilters;
  gamesApplied: GamesSearchFilters;
  gamesPage: number;
  selectedFixtureIds: Set<number>;

  // Leagues
  selectedLeagueIds: number[];
  leagueScope: "all" | "byRound" | "byDateRange";
  leagueSelectedRounds: Set<string>;
  leagueDateFrom?: Date;
  leagueDateTo?: Date;
  leagueResolvedFixtureIds: number[];

  // Teams
  selectedTeamIds: number[];
  teamScope: "all" | "byDateRange";
  teamDateFrom?: Date;
  teamDateTo?: Date;
  teamResolvedFixtureIds: number[];

  // Details
  name: string;
  description: string;
  onTheNosePoints: string;
  correctDifferencePoints: string;
  outcomePoints: string;

  // Badges
  badges: Array<{
    name: string;
    description: string;
    icon: string;
    criteriaType: string;
    criteriaValue: string;
  }>;
};

const initialWizardState: WizardState = {
  step: 1,
  selectionMode: null,
  gamesFilters: defaultGamesFilters,
  gamesApplied: defaultGamesFilters,
  gamesPage: 1,
  selectedFixtureIds: new Set(),
  selectedLeagueIds: [],
  leagueScope: "all",
  leagueSelectedRounds: new Set(),
  leagueDateFrom: undefined,
  leagueDateTo: undefined,
  leagueResolvedFixtureIds: [],
  selectedTeamIds: [],
  teamScope: "all",
  teamDateFrom: undefined,
  teamDateTo: undefined,
  teamResolvedFixtureIds: [],
  name: "",
  description: "",
  onTheNosePoints: "3",
  correctDifferencePoints: "2",
  outcomePoints: "1",
  badges: [],
};

type WizardAction =
  | { type: "SET_STEP"; step: WizardState["step"] }
  | { type: "SET_SELECTION_MODE"; mode: WizardState["selectionMode"] }
  // Games
  | { type: "SET_GAMES_FILTERS"; filters: Partial<GamesSearchFilters> }
  | { type: "APPLY_GAMES_FILTERS" }
  | { type: "RESET_GAMES_FILTERS" }
  | { type: "SET_GAMES_PAGE"; page: number }
  | { type: "TOGGLE_FIXTURE"; id: number }
  | { type: "TOGGLE_ALL_FIXTURES"; ids: number[]; checked: boolean }
  // Leagues
  | { type: "SET_LEAGUE_IDS"; ids: number[] }
  | { type: "SET_LEAGUE_SCOPE"; scope: WizardState["leagueScope"] }
  | { type: "TOGGLE_LEAGUE_ROUND"; round: string }
  | { type: "SET_LEAGUE_DATE_FROM"; date: Date | undefined }
  | { type: "SET_LEAGUE_DATE_TO"; date: Date | undefined }
  | { type: "SET_LEAGUE_RESOLVED_FIXTURES"; ids: number[] }
  // Teams
  | { type: "SET_TEAM_IDS"; ids: number[] }
  | { type: "SET_TEAM_SCOPE"; scope: WizardState["teamScope"] }
  | { type: "SET_TEAM_DATE_FROM"; date: Date | undefined }
  | { type: "SET_TEAM_DATE_TO"; date: Date | undefined }
  | { type: "SET_TEAM_RESOLVED_FIXTURES"; ids: number[] }
  // Details
  | { type: "SET_NAME"; value: string }
  | { type: "SET_DESCRIPTION"; value: string }
  | { type: "SET_ON_THE_NOSE_POINTS"; value: string }
  | { type: "SET_CORRECT_DIFFERENCE_POINTS"; value: string }
  | { type: "SET_OUTCOME_POINTS"; value: string }
  // Badges
  | { type: "ADD_BADGE" }
  | { type: "REMOVE_BADGE"; index: number }
  | { type: "UPDATE_BADGE"; index: number; field: string; value: string };

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step };
    case "SET_SELECTION_MODE":
      return { ...state, selectionMode: action.mode };

    // Games
    case "SET_GAMES_FILTERS":
      return {
        ...state,
        gamesFilters: { ...state.gamesFilters, ...action.filters },
      };
    case "APPLY_GAMES_FILTERS":
      return { ...state, gamesApplied: state.gamesFilters, gamesPage: 1 };
    case "RESET_GAMES_FILTERS":
      return {
        ...state,
        gamesFilters: defaultGamesFilters,
        gamesApplied: defaultGamesFilters,
        gamesPage: 1,
      };
    case "SET_GAMES_PAGE":
      return { ...state, gamesPage: action.page };
    case "TOGGLE_FIXTURE": {
      const next = new Set(state.selectedFixtureIds);
      if (next.has(action.id)) next.delete(action.id);
      else next.add(action.id);
      return { ...state, selectedFixtureIds: next };
    }
    case "TOGGLE_ALL_FIXTURES": {
      const next = new Set(state.selectedFixtureIds);
      if (action.checked) {
        for (const id of action.ids) next.add(id);
      } else {
        for (const id of action.ids) next.delete(id);
      }
      return { ...state, selectedFixtureIds: next };
    }

    // Leagues
    case "SET_LEAGUE_IDS":
      return {
        ...state,
        selectedLeagueIds: action.ids,
        leagueScope:
          action.ids.length > 1 && state.leagueScope === "byRound"
            ? "all"
            : state.leagueScope,
        leagueSelectedRounds: new Set(),
        leagueResolvedFixtureIds: [],
      };
    case "SET_LEAGUE_SCOPE":
      return {
        ...state,
        leagueScope: action.scope,
        leagueSelectedRounds: new Set(),
        leagueResolvedFixtureIds: [],
      };
    case "TOGGLE_LEAGUE_ROUND": {
      const next = new Set(state.leagueSelectedRounds);
      if (next.has(action.round)) next.delete(action.round);
      else next.add(action.round);
      return { ...state, leagueSelectedRounds: next };
    }
    case "SET_LEAGUE_DATE_FROM":
      return { ...state, leagueDateFrom: action.date };
    case "SET_LEAGUE_DATE_TO":
      return { ...state, leagueDateTo: action.date };
    case "SET_LEAGUE_RESOLVED_FIXTURES":
      return { ...state, leagueResolvedFixtureIds: action.ids };

    // Teams
    case "SET_TEAM_IDS":
      return {
        ...state,
        selectedTeamIds: action.ids,
        teamResolvedFixtureIds: [],
      };
    case "SET_TEAM_SCOPE":
      return { ...state, teamScope: action.scope, teamResolvedFixtureIds: [] };
    case "SET_TEAM_DATE_FROM":
      return { ...state, teamDateFrom: action.date };
    case "SET_TEAM_DATE_TO":
      return { ...state, teamDateTo: action.date };
    case "SET_TEAM_RESOLVED_FIXTURES":
      return { ...state, teamResolvedFixtureIds: action.ids };

    // Details
    case "SET_NAME":
      return { ...state, name: action.value };
    case "SET_DESCRIPTION":
      return { ...state, description: action.value };
    case "SET_ON_THE_NOSE_POINTS":
      return { ...state, onTheNosePoints: action.value };
    case "SET_CORRECT_DIFFERENCE_POINTS":
      return { ...state, correctDifferencePoints: action.value };
    case "SET_OUTCOME_POINTS":
      return { ...state, outcomePoints: action.value };

    // Badges
    case "ADD_BADGE":
      return {
        ...state,
        badges: [
          ...state.badges,
          {
            name: "",
            description: "",
            icon: "🏆",
            criteriaType: "participation",
            criteriaValue: "1",
          },
        ],
      };
    case "REMOVE_BADGE":
      return {
        ...state,
        badges: state.badges.filter((_, i) => i !== action.index),
      };
    case "UPDATE_BADGE": {
      const badges = state.badges.map((b, i) =>
        i === action.index ? { ...b, [action.field]: action.value } : b
      );
      return { ...state, badges };
    }

    default:
      return state;
  }
}

// ─── Helper Components (copied from fixtures.tsx) ────────────────────────────

function DateRangePickerButton({
  from,
  to,
  onChange,
  className,
}: {
  from: Date | undefined;
  to: Date | undefined;
  onChange: (from: Date | undefined, to: Date | undefined) => void;
  className?: string;
}) {
  const hasRange = from && to;
  const [open, setOpen] = useState(false);
  const isWide = useSyncExternalStore(
    subscribeMdQuery,
    getMdSnapshot,
    getMdServerSnapshot,
  );
  const [pendingRange, setPendingRange] = useState<{
    from?: Date;
    to?: Date;
  }>({ from, to });

  const pendingComplete = !!pendingRange.from && !!pendingRange.to;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setPendingRange({ from, to });
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start font-normal",
            !hasRange && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {hasRange
              ? `${format(from, "dd/MM/yyyy")} – ${format(to, "dd/MM/yyyy")}`
              : "Date range"}
          </span>
          {hasRange && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined, undefined);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onChange(undefined, undefined);
                }
              }}
              className="ml-auto shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <Calendar
          mode="range"
          defaultMonth={from}
          selected={
            pendingRange.from
              ? { from: pendingRange.from, to: pendingRange.to }
              : undefined
          }
          onSelect={(range) => setPendingRange(range ?? {})}
          numberOfMonths={isWide ? 2 : 1}
        />
        <div className="flex items-center justify-end gap-2 border-t px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            disabled={!pendingComplete}
            onClick={() => {
              if (pendingRange.from && pendingRange.to) {
                onChange(pendingRange.from, pendingRange.to);
              }
              setOpen(false);
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function LeagueSearchCombobox({
  value,
  displayName,
  onChange,
  className,
}: {
  value: number | undefined;
  displayName: string;
  onChange: (id: number | undefined, name: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isFetching } = useQuery({
    queryKey: ["leagues", "search", debouncedSearch],
    queryFn: () => leaguesService.search(debouncedSearch, 20),
    enabled: open && debouncedSearch.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const leagues = data?.data ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between font-normal", className)}
        >
          <span className="truncate">{displayName || "All Leagues"}</span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[250px] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search league..."
            className="h-8 text-xs"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isFetching && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isFetching && search.length >= 2 && leagues.length === 0 && (
              <CommandEmpty>No league found.</CommandEmpty>
            )}
            {!isFetching && search.length < 2 && !value && (
              <div className="py-3 text-center text-xs text-muted-foreground">
                Type at least 2 characters
              </div>
            )}
            <CommandGroup>
              {value !== undefined && (
                <CommandItem
                  onSelect={() => {
                    onChange(undefined, "");
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  <Check className="mr-2 h-3.5 w-3.5 opacity-0" />
                  All Leagues
                </CommandItem>
              )}
              {leagues.map((league) => (
                <CommandItem
                  key={league.id}
                  value={String(league.id)}
                  onSelect={() => {
                    onChange(league.id, league.name);
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-3.5 w-3.5",
                      value === league.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{league.name}</span>
                  {league.country && (
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {league.country.name}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function SimplePagination({
  page,
  totalPages,
  totalItems,
  perPage,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  perPage: number;
  onPageChange: (page: number) => void;
}) {
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, totalItems);

  return (
    <div className="flex items-center justify-between gap-2 pt-3 border-t mt-3 text-xs">
      <span className="text-muted-foreground">
        {start}-{end} of {totalItems}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </Button>
        <span className="font-medium">
          {page}/{totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

// ─── Fixture Preview Table (reused by leagues & teams steps) ─────────────────

type PreviewFixture = {
  id: number;
  homeTeam: { name: string } | null;
  awayTeam: { name: string } | null;
  startIso: string;
  round: string | null;
  state: string;
};

function FixturePreviewTable({ fixtures }: { fixtures: PreviewFixture[] }) {
  if (fixtures.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        No fixtures to preview
      </div>
    );
  }
  return (
    <div className="rounded-md border max-h-[300px] overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Match</TableHead>
            <TableHead className="text-xs">Date</TableHead>
            <TableHead className="text-xs">Round</TableHead>
            <TableHead className="text-xs">State</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fixtures.map((f) => (
            <TableRow key={f.id}>
              <TableCell className="text-xs">
                {f.homeTeam?.name ?? "?"} vs {f.awayTeam?.name ?? "?"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(f.startIso).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-xs">{f.round ?? "—"}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {f.state}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Step 1: Selection Mode ──────────────────────────────────────────────────

function Step1SelectionMode({
  selected,
  onSelect,
}: {
  selected: WizardState["selectionMode"];
  onSelect: (mode: "games" | "teams" | "leagues") => void;
}) {
  const modes = [
    {
      key: "games" as const,
      label: "Games",
      desc: "Search and pick individual fixtures",
      icon: Gamepad2,
    },
    {
      key: "leagues" as const,
      label: "Leagues",
      desc: "Select leagues, then scope by round or date",
      icon: Trophy,
    },
    {
      key: "teams" as const,
      label: "Teams",
      desc: "Select teams to include all their matches",
      icon: Users,
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="max-w-3xl w-full space-y-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold">How do you want to select fixtures?</h2>
          <p className="text-sm text-muted-foreground">
            Choose how you want to define which games are included in this group.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {modes.map((m) => (
            <Card
              key={m.key}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                selected === m.key && "ring-2 ring-primary",
              )}
              onClick={() => onSelect(m.key)}
            >
              <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                <m.icon className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="font-semibold">{m.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{m.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Games Selection ─────────────────────────────────────────────────

function Step2GamesSelection({
  state,
  dispatch,
}: {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}) {
  const { gamesFilters, gamesApplied, gamesPage, selectedFixtureIds } = state;

  const filtersAreDirty =
    gamesFilters.query !== gamesApplied.query ||
    gamesFilters.leagueId !== gamesApplied.leagueId ||
    gamesFilters.state !== gamesApplied.state ||
    gamesFilters.fromDate?.getTime() !== gamesApplied.fromDate?.getTime() ||
    gamesFilters.toDate?.getTime() !== gamesApplied.toDate?.getTime();

  const hasActiveFilters =
    gamesApplied.query !== "" ||
    gamesApplied.leagueId !== undefined ||
    gamesApplied.state !== "" ||
    (gamesApplied.fromDate !== undefined && gamesApplied.toDate !== undefined);

  const pendingFiltersAreValid =
    gamesFilters.query.length >= 2 ||
    gamesFilters.leagueId !== undefined ||
    gamesFilters.state !== "" ||
    (gamesFilters.fromDate !== undefined && gamesFilters.toDate !== undefined);

  const { data: searchData, isFetching } = useQuery({
    queryKey: [
      "wizard",
      "games-search",
      gamesApplied.query,
      gamesApplied.leagueId,
      gamesApplied.state,
      gamesApplied.fromDate?.getTime(),
      gamesApplied.toDate?.getTime(),
      gamesPage,
    ],
    queryFn: () =>
      fixturesService.search({
        q: gamesApplied.query || undefined,
        leagueId: gamesApplied.leagueId,
        state: gamesApplied.state || undefined,
        fromTs: gamesApplied.fromDate
          ? Math.floor(startOfDay(gamesApplied.fromDate).getTime() / 1000)
          : undefined,
        toTs: gamesApplied.toDate
          ? Math.floor(endOfDay(gamesApplied.toDate).getTime() / 1000)
          : undefined,
        page: gamesPage,
        perPage: 25,
      }),
    enabled: hasActiveFilters,
  });

  const fixtures = searchData?.data ?? [];
  const pagination = searchData?.pagination;
  const pageIds = fixtures.map((f) => f.id);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedFixtureIds.has(id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Select Games</h2>
        {selectedFixtureIds.size > 0 && (
          <Badge variant="secondary">
            {selectedFixtureIds.size} fixture{selectedFixtureIds.size !== 1 ? "s" : ""} selected
          </Badge>
        )}
      </div>

      {/* Filter Bar */}
      <div className="space-y-2">
        {/* Row 1: Full-width search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={gamesFilters.query}
            onChange={(e) =>
              dispatch({
                type: "SET_GAMES_FILTERS",
                filters: { query: e.target.value },
              })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && pendingFiltersAreValid)
                dispatch({ type: "APPLY_GAMES_FILTERS" });
            }}
            placeholder="Search teams or fixtures..."
            className="h-9 pl-7 pr-7 text-xs"
          />
          {gamesFilters.query && (
            <button
              type="button"
              onClick={() =>
                dispatch({
                  type: "SET_GAMES_FILTERS",
                  filters: { query: "" },
                })
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {/* Row 2: Filters */}
        <div className="flex items-center gap-2">
          <DateRangePickerButton
            from={gamesFilters.fromDate}
            to={gamesFilters.toDate}
            onChange={(from, to) =>
              dispatch({
                type: "SET_GAMES_FILTERS",
                filters: { fromDate: from, toDate: to },
              })
            }
            className="h-9 flex-1 text-xs"
          />
          <Select
            value={gamesFilters.state || "__all__"}
            onValueChange={(v) =>
              dispatch({
                type: "SET_GAMES_FILTERS",
                filters: { state: v === "__all__" ? "" : v },
              })
            }
          >
            <SelectTrigger className="h-9 w-[150px] text-xs">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All States</SelectItem>
              <SelectItem value="NS">Not Started</SelectItem>
              <SelectItem value="LIVE">Live</SelectItem>
              <SelectItem value="FT">Finished</SelectItem>
              <SelectItem value="FT_PEN">Finished (Pens)</SelectItem>
              <SelectItem value="AET">After Extra Time</SelectItem>
              <SelectItem value="POSTP">Postponed</SelectItem>
              <SelectItem value="CANC">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <LeagueSearchCombobox
            value={gamesFilters.leagueId}
            displayName={gamesFilters.leagueName}
            onChange={(id, name) =>
              dispatch({
                type: "SET_GAMES_FILTERS",
                filters: { leagueId: id, leagueName: name },
              })
            }
            className="h-9 w-[180px] text-xs"
          />
          <Button
            size="sm"
            className="h-9 px-2.5 text-xs shrink-0"
            onClick={() => dispatch({ type: "APPLY_GAMES_FILTERS" })}
            disabled={!filtersAreDirty || isFetching || !pendingFiltersAreValid}
          >
            <Filter className="mr-1 h-3 w-3" />
            Apply
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 px-2 text-xs shrink-0",
              !hasActiveFilters && "invisible",
            )}
            onClick={() => dispatch({ type: "RESET_GAMES_FILTERS" })}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Results */}
      {!hasActiveFilters && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Use the filters above and click Apply to search for fixtures.
        </div>
      )}
      {hasActiveFilters && isFetching && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {hasActiveFilters && !isFetching && fixtures.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No fixtures found. Try adjusting your filters.
        </div>
      )}
      {hasActiveFilters && !isFetching && fixtures.length > 0 && (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allOnPageSelected}
                      onCheckedChange={(checked) =>
                        dispatch({
                          type: "TOGGLE_ALL_FIXTURES",
                          ids: pageIds,
                          checked: !!checked,
                        })
                      }
                    />
                  </TableHead>
                  <TableHead className="text-xs">Fixture</TableHead>
                  <TableHead className="text-xs">State</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">
                    Date
                  </TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">
                    League
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fixtures.map((f) => (
                  <TableRow
                    key={f.id}
                    className="cursor-pointer"
                    onClick={() =>
                      dispatch({ type: "TOGGLE_FIXTURE", id: f.id })
                    }
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedFixtureIds.has(f.id)}
                        onCheckedChange={() =>
                          dispatch({ type: "TOGGLE_FIXTURE", id: f.id })
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {f.homeTeam?.name ?? "?"} vs {f.awayTeam?.name ?? "?"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {f.state}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                      {new Date(f.startIso).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
                      {f.league?.name ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {pagination && pagination.totalPages > 1 && (
            <SimplePagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              perPage={pagination.perPage}
              onPageChange={(p) =>
                dispatch({ type: "SET_GAMES_PAGE", page: p })
              }
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── Step 2: Leagues Selection ───────────────────────────────────────────────

function Step2LeaguesSelection({
  state,
  dispatch,
}: {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}) {
  const {
    selectedLeagueIds,
    leagueScope,
    leagueSelectedRounds,
    leagueDateFrom,
    leagueDateTo,
  } = state;

  // Search state for multi-select
  const [leagueSearch, setLeagueSearch] = useState("");
  const [debouncedLeagueSearch] = useDebounce(leagueSearch, 300);

  // Default leagues (loaded on mount)
  const { data: defaultLeaguesData } = useQuery({
    queryKey: ["leagues", "defaults"],
    queryFn: () => leaguesService.getFromDb({ perPage: 20, include: "country" }),
    staleTime: Infinity,
  });

  const { data: leaguesData } = useQuery({
    queryKey: ["leagues", "search", debouncedLeagueSearch],
    queryFn: () => leaguesService.search(debouncedLeagueSearch, 20),
    enabled: debouncedLeagueSearch.length >= 2,
    staleTime: Infinity,
  });

  const leagueOptions = useMemo(() => {
    const searchResults = (leaguesData?.data ?? []).map((l) => ({
      value: l.id,
      label: l.country?.name ? `${l.name} (${l.country.name})` : l.name,
    }));
    if (searchResults.length > 0) return searchResults;
    return (defaultLeaguesData?.data ?? []).map((l) => ({
      value: l.id,
      label: l.country?.name ? `${l.name} (${l.country.name})` : l.name,
    }));
  }, [leaguesData, defaultLeaguesData]);

  const isSingleLeague = selectedLeagueIds.length === 1;
  const singleLeagueId = isSingleLeague ? selectedLeagueIds[0] : undefined;

  // Fetch fixtures for single league (for round extraction)
  const { data: leagueFixturesData } = useQuery({
    queryKey: ["wizard", "league-fixtures", singleLeagueId],
    queryFn: () =>
      fixturesService.getFromDb({
        leagueId: singleLeagueId,
        perPage: 100,
        include: "homeTeam,awayTeam",
      }),
    enabled: !!singleLeagueId && leagueScope === "byRound",
  });

  // Fetch fixtures for date range (any number of leagues)
  const hasDateRange = leagueDateFrom && leagueDateTo;
  const { data: leagueDateFixturesData } = useQuery({
    queryKey: [
      "wizard",
      "league-date-fixtures",
      selectedLeagueIds.join(","),
      leagueDateFrom?.getTime(),
      leagueDateTo?.getTime(),
    ],
    queryFn: () =>
      fixturesService.getFromDb({
        leagueId: isSingleLeague ? singleLeagueId : undefined,
        fromTs: leagueDateFrom
          ? Math.floor(startOfDay(leagueDateFrom).getTime() / 1000)
          : undefined,
        toTs: leagueDateTo
          ? Math.floor(endOfDay(leagueDateTo).getTime() / 1000)
          : undefined,
        perPage: 100,
        include: "homeTeam,awayTeam",
      }),
    enabled:
      selectedLeagueIds.length > 0 &&
      leagueScope === "byDateRange" &&
      !!hasDateRange,
  });

  // Extract unique rounds
  const uniqueRounds = useMemo(() => {
    const rounds = new Set<string>();
    for (const f of leagueFixturesData?.data ?? [])
      if (f.round) rounds.add(f.round);
    return [...rounds].sort((a, b) => {
      const na = parseInt(a),
        nb = parseInt(b);
      return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b);
    });
  }, [leagueFixturesData]);

  // Resolve fixture IDs for byRound
  const roundFilteredFixtures = useMemo(() => {
    if (leagueScope !== "byRound" || leagueSelectedRounds.size === 0)
      return [];
    return (leagueFixturesData?.data ?? []).filter(
      (f) => f.round && leagueSelectedRounds.has(f.round),
    );
  }, [leagueFixturesData, leagueScope, leagueSelectedRounds]);

  // Resolve fixture IDs for byDateRange
  const dateFilteredFixtures = useMemo(() => {
    if (leagueScope !== "byDateRange" || !hasDateRange) return [];
    const fixtures = leagueDateFixturesData?.data ?? [];
    // If multiple leagues, filter client-side by leagueId
    if (!isSingleLeague) {
      const leagueIdSet = new Set(selectedLeagueIds);
      return fixtures.filter(
        (f) => f.leagueId !== null && leagueIdSet.has(f.leagueId),
      );
    }
    return fixtures;
  }, [
    leagueDateFixturesData,
    leagueScope,
    hasDateRange,
    isSingleLeague,
    selectedLeagueIds,
  ]);

  // Dispatch resolved fixture IDs
  useEffect(() => {
    if (leagueScope === "byRound") {
      dispatch({
        type: "SET_LEAGUE_RESOLVED_FIXTURES",
        ids: roundFilteredFixtures.map((f) => f.id),
      });
    } else if (leagueScope === "byDateRange") {
      dispatch({
        type: "SET_LEAGUE_RESOLVED_FIXTURES",
        ids: dateFilteredFixtures.map((f) => f.id),
      });
    } else {
      dispatch({ type: "SET_LEAGUE_RESOLVED_FIXTURES", ids: [] });
    }
  }, [leagueScope, roundFilteredFixtures, dateFilteredFixtures, dispatch]);

  const previewFixtures =
    leagueScope === "byRound" ? roundFilteredFixtures : dateFilteredFixtures;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Select Leagues</h2>
        <p className="text-sm text-muted-foreground">
          Choose one or more leagues, then decide which fixtures to include.
        </p>
      </div>

      <div>
        <Label className="text-sm">Leagues</Label>
        <MultiSelectCombobox
          className="mt-1.5"
          options={leagueOptions}
          selectedValues={selectedLeagueIds}
          onSelectionChange={(ids) =>
            dispatch({ type: "SET_LEAGUE_IDS", ids: ids as number[] })
          }
          onSearchChange={setLeagueSearch}
          searchValue={leagueSearch}
          placeholder="Search leagues..."
          searchPlaceholder="Type league name..."
          emptyMessage="No leagues found"
        />
      </div>

      {selectedLeagueIds.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm">Scope</Label>
          <div className="flex gap-3">
            <Button
              variant={leagueScope === "all" ? "default" : "outline"}
              size="sm"
              onClick={() =>
                dispatch({ type: "SET_LEAGUE_SCOPE", scope: "all" })
              }
            >
              All
            </Button>
            {isSingleLeague && (
              <Button
                variant={leagueScope === "byRound" ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  dispatch({ type: "SET_LEAGUE_SCOPE", scope: "byRound" })
                }
              >
                By Round
              </Button>
            )}
            <Button
              variant={leagueScope === "byDateRange" ? "default" : "outline"}
              size="sm"
              onClick={() =>
                dispatch({ type: "SET_LEAGUE_SCOPE", scope: "byDateRange" })
              }
            >
              By Date Range
            </Button>
          </div>

          {/* Round chips */}
          {leagueScope === "byRound" && isSingleLeague && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Select rounds
              </Label>
              {uniqueRounds.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No rounds found for this league.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {uniqueRounds.map((round) => (
                    <Button
                      key={round}
                      variant={
                        leagueSelectedRounds.has(round) ? "default" : "outline"
                      }
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        dispatch({ type: "TOGGLE_LEAGUE_ROUND", round })
                      }
                    >
                      {round}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Date range */}
          {leagueScope === "byDateRange" && (
            <div>
              <Label className="text-xs text-muted-foreground">
                Date range
              </Label>
              <DateRangePickerButton
                from={leagueDateFrom}
                to={leagueDateTo}
                onChange={(from, to) => {
                  dispatch({ type: "SET_LEAGUE_DATE_FROM", date: from });
                  dispatch({ type: "SET_LEAGUE_DATE_TO", date: to });
                }}
                className="h-8 text-xs w-[280px]"
              />
            </div>
          )}

          {/* Preview */}
          {leagueScope !== "all" && previewFixtures.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {previewFixtures.length} fixture
                {previewFixtures.length !== 1 ? "s" : ""} matched
              </Label>
              <FixturePreviewTable
                fixtures={previewFixtures.map((f) => ({
                  id: f.id,
                  homeTeam: f.homeTeam,
                  awayTeam: f.awayTeam,
                  startIso: f.startIso,
                  round: f.round,
                  state: f.state,
                }))}
              />
            </div>
          )}

          {leagueScope === "all" && (
            <p className="text-xs text-muted-foreground">
              All fixtures from the selected league{selectedLeagueIds.length > 1 ? "s" : ""} will
              be included dynamically.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Teams Selection ─────────────────────────────────────────────────

function Step2TeamsSelection({
  state,
  dispatch,
}: {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}) {
  const { selectedTeamIds, teamScope, teamDateFrom, teamDateTo } = state;

  const [teamSearch, setTeamSearch] = useState("");
  const [debouncedTeamSearch] = useDebounce(teamSearch, 300);

  // Default teams (loaded on mount)
  const { data: defaultTeamsData } = useQuery({
    queryKey: ["teams", "defaults"],
    queryFn: () => teamsService.getFromDb({ perPage: 20, include: "country" }),
    staleTime: Infinity,
  });

  const { data: teamsData } = useQuery({
    queryKey: ["teams", "search", debouncedTeamSearch],
    queryFn: () => teamsService.search(debouncedTeamSearch, 20),
    enabled: debouncedTeamSearch.length >= 2,
    staleTime: Infinity,
  });

  const teamOptions = useMemo(() => {
    const searchResults = (teamsData?.data ?? []).map((t) => ({
      value: t.id,
      label: t.country?.name ? `${t.name} (${t.country.name})` : t.name,
    }));
    if (searchResults.length > 0) return searchResults;
    return (defaultTeamsData?.data ?? []).map((t) => ({
      value: t.id,
      label: t.country?.name ? `${t.name} (${t.country.name})` : t.name,
    }));
  }, [teamsData, defaultTeamsData]);

  const hasDateRange = teamDateFrom && teamDateTo;

  const { data: teamFixturesData } = useQuery({
    queryKey: [
      "wizard",
      "team-date-fixtures",
      teamDateFrom?.getTime(),
      teamDateTo?.getTime(),
    ],
    queryFn: () =>
      fixturesService.getFromDb({
        fromTs: teamDateFrom
          ? Math.floor(startOfDay(teamDateFrom).getTime() / 1000)
          : undefined,
        toTs: teamDateTo
          ? Math.floor(endOfDay(teamDateTo).getTime() / 1000)
          : undefined,
        perPage: 100,
        include: "homeTeam,awayTeam",
      }),
    enabled:
      selectedTeamIds.length > 0 && teamScope === "byDateRange" && !!hasDateRange,
  });

  const filteredFixtures = useMemo(() => {
    if (teamScope !== "byDateRange" || !hasDateRange) return [];
    const teamIdSet = new Set(selectedTeamIds);
    return (teamFixturesData?.data ?? []).filter(
      (f) => teamIdSet.has(f.homeTeamId) || teamIdSet.has(f.awayTeamId),
    );
  }, [teamFixturesData, teamScope, hasDateRange, selectedTeamIds]);

  useEffect(() => {
    if (teamScope === "byDateRange") {
      dispatch({
        type: "SET_TEAM_RESOLVED_FIXTURES",
        ids: filteredFixtures.map((f) => f.id),
      });
    } else {
      dispatch({ type: "SET_TEAM_RESOLVED_FIXTURES", ids: [] });
    }
  }, [teamScope, filteredFixtures, dispatch]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Select Teams</h2>
        <p className="text-sm text-muted-foreground">
          Choose teams to include all their matches.
        </p>
      </div>

      <div>
        <Label className="text-sm">Teams</Label>
        <MultiSelectCombobox
          className="mt-1.5"
          options={teamOptions}
          selectedValues={selectedTeamIds}
          onSelectionChange={(ids) =>
            dispatch({ type: "SET_TEAM_IDS", ids: ids as number[] })
          }
          onSearchChange={setTeamSearch}
          searchValue={teamSearch}
          placeholder="Search teams..."
          searchPlaceholder="Type team name..."
          emptyMessage="No teams found"
        />
      </div>

      {selectedTeamIds.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm">Scope</Label>
          <div className="flex gap-3">
            <Button
              variant={teamScope === "all" ? "default" : "outline"}
              size="sm"
              onClick={() =>
                dispatch({ type: "SET_TEAM_SCOPE", scope: "all" })
              }
            >
              All
            </Button>
            <Button
              variant={teamScope === "byDateRange" ? "default" : "outline"}
              size="sm"
              onClick={() =>
                dispatch({ type: "SET_TEAM_SCOPE", scope: "byDateRange" })
              }
            >
              By Date Range
            </Button>
          </div>

          {teamScope === "byDateRange" && (
            <div>
              <Label className="text-xs text-muted-foreground">
                Date range
              </Label>
              <DateRangePickerButton
                from={teamDateFrom}
                to={teamDateTo}
                onChange={(from, to) => {
                  dispatch({ type: "SET_TEAM_DATE_FROM", date: from });
                  dispatch({ type: "SET_TEAM_DATE_TO", date: to });
                }}
                className="h-8 text-xs w-[280px]"
              />
            </div>
          )}

          {teamScope === "byDateRange" && filteredFixtures.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {filteredFixtures.length} fixture
                {filteredFixtures.length !== 1 ? "s" : ""} matched
              </Label>
              <FixturePreviewTable
                fixtures={filteredFixtures.map((f) => ({
                  id: f.id,
                  homeTeam: f.homeTeam,
                  awayTeam: f.awayTeam,
                  startIso: f.startIso,
                  round: f.round,
                  state: f.state,
                }))}
              />
            </div>
          )}

          {teamScope === "all" && (
            <p className="text-xs text-muted-foreground">
              All fixtures for the selected team{selectedTeamIds.length > 1 ? "s" : ""} will be
              included dynamically.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Details ─────────────────────────────────────────────────────────

function Step3Details({
  state,
  dispatch,
}: {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Group Details</h2>
        <p className="text-sm text-muted-foreground">
          Set a name and scoring rules for this official group.
        </p>
      </div>

      <div className="space-y-4 max-w-xl">
        <div className="space-y-1.5">
          <Label>Name *</Label>
          <Input
            value={state.name}
            onChange={(e) =>
              dispatch({ type: "SET_NAME", value: e.target.value })
            }
            placeholder="e.g. Champions League 24/25"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea
            value={state.description}
            onChange={(e) =>
              dispatch({ type: "SET_DESCRIPTION", value: e.target.value })
            }
            placeholder="Optional description"
          />
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Scoring</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Exact</Label>
              <Input
                type="number"
                value={state.onTheNosePoints}
                onChange={(e) =>
                  dispatch({
                    type: "SET_ON_THE_NOSE_POINTS",
                    value: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Difference</Label>
              <Input
                type="number"
                value={state.correctDifferencePoints}
                onChange={(e) =>
                  dispatch({
                    type: "SET_CORRECT_DIFFERENCE_POINTS",
                    value: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Outcome</Label>
              <Input
                type="number"
                value={state.outcomePoints}
                onChange={(e) =>
                  dispatch({
                    type: "SET_OUTCOME_POINTS",
                    value: e.target.value,
                  })
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Step 4: Badge ───────────────────────────────────────────────────────────

function BadgeCard({
  badge,
  index,
  onUpdate,
  onRemove,
}: {
  badge: WizardState["badges"][0];
  index: number;
  onUpdate: (index: number, field: string, value: string) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Badge {index + 1}</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onRemove(index)}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input
              value={badge.name}
              onChange={(e) => onUpdate(index, "name", e.target.value)}
              placeholder="e.g. Gold Badge"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Icon</Label>
            <Input
              value={badge.icon}
              onChange={(e) => onUpdate(index, "icon", e.target.value)}
              className="w-20"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Description</Label>
          <Input
            value={badge.description}
            onChange={(e) => onUpdate(index, "description", e.target.value)}
            placeholder="Badge description"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Award Rule</Label>
          <Select
            value={badge.criteriaType}
            onValueChange={(v) => onUpdate(index, "criteriaType", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="participation">All participants</SelectItem>
              <SelectItem value="top_n">Top N in leaderboard</SelectItem>
              <SelectItem value="exact_predictions">
                Minimum exact predictions
              </SelectItem>
              <SelectItem value="custom">Manual (admin awards)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {badge.criteriaType === "participation" &&
              "Every member who joined the group will receive this badge when it ends."}
            {badge.criteriaType === "top_n" &&
              "Only the top N players on the final leaderboard will receive this badge."}
            {badge.criteriaType === "exact_predictions" &&
              "Members who reach at least N exact score predictions will receive this badge."}
            {badge.criteriaType === "custom" &&
              "No automatic evaluation — you decide who gets the badge via the Award button."}
          </p>
        </div>
        {(badge.criteriaType === "top_n" ||
          badge.criteriaType === "exact_predictions") && (
          <div className="space-y-1.5">
            <Label className="text-xs">
              {badge.criteriaType === "top_n"
                ? "How many top players?"
                : "Minimum exact predictions"}
            </Label>
            <Input
              type="number"
              min="1"
              value={badge.criteriaValue}
              onChange={(e) =>
                onUpdate(index, "criteriaValue", e.target.value)
              }
              className="w-32"
              placeholder={badge.criteriaType === "top_n" ? "e.g. 3" : "e.g. 5"}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Step4Badge({
  state,
  dispatch,
}: {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}) {
  const hasBadges = state.badges.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Badges (optional)</h2>
        <p className="text-sm text-muted-foreground">
          Configure one or more badge tiers that can be awarded to participants.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          checked={hasBadges}
          onCheckedChange={(checked) => {
            if (checked && state.badges.length === 0) {
              dispatch({ type: "ADD_BADGE" });
            } else if (!checked) {
              // Remove all badges
              for (let i = state.badges.length - 1; i >= 0; i--) {
                dispatch({ type: "REMOVE_BADGE", index: i });
              }
            }
          }}
        />
        <Label>{hasBadges ? "Configure badges" : "No badges"}</Label>
      </div>

      {hasBadges && (
        <div className="space-y-4 max-w-xl">
          {state.badges.map((badge, i) => (
            <BadgeCard
              key={i}
              badge={badge}
              index={i}
              onUpdate={(idx, field, value) =>
                dispatch({ type: "UPDATE_BADGE", index: idx, field, value })
              }
              onRemove={(idx) => dispatch({ type: "REMOVE_BADGE", index: idx })}
            />
          ))}
          <Button
            variant="outline"
            onClick={() => dispatch({ type: "ADD_BADGE" })}
          >
            Add Badge
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Wizard Bottom Bar ───────────────────────────────────────────────────────

function WizardBottomBar({
  step,
  canNext,
  isSubmitting,
  onBack,
  onNext,
  onSubmit,
}: {
  step: number;
  canNext: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="sticky bottom-0 bg-background border-t px-6 py-4 flex items-center justify-between z-10 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back
      </Button>
      <span className="text-sm text-muted-foreground">
        Step {step} of 4
      </span>
      {step < 4 ? (
        <Button onClick={onNext} disabled={!canNext}>
          Next
        </Button>
      ) : (
        <Button onClick={onSubmit} disabled={!canNext || isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Group"}
        </Button>
      )}
    </div>
  );
}

// ─── Create Wizard (orchestrator) ────────────────────────────────────────────

function CreateWizard({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (body: AdminCreateOfficialGroupBody) => void;
}) {
  const [state, dispatch] = useReducer(wizardReducer, initialWizardState);

  // Can proceed to next step?
  const canNext = useMemo(() => {
    switch (state.step) {
      case 1:
        return state.selectionMode !== null;
      case 2:
        if (state.selectionMode === "games")
          return state.selectedFixtureIds.size > 0;
        if (state.selectionMode === "leagues")
          return state.selectedLeagueIds.length > 0;
        if (state.selectionMode === "teams")
          return state.selectedTeamIds.length > 0;
        return false;
      case 3:
        return state.name.trim().length > 0;
      case 4:
        return (
          state.badges.length === 0 ||
          state.badges.every((b) => b.name.trim().length > 0)
        );
      default:
        return false;
    }
  }, [state]);

  function handleBack() {
    if (state.step === 1) {
      onClose();
    } else {
      dispatch({ type: "SET_STEP", step: (state.step - 1) as 1 | 2 | 3 | 4 });
    }
  }

  function handleNext() {
    if (!canNext) return;
    dispatch({ type: "SET_STEP", step: (state.step + 1) as 2 | 3 | 4 });
  }

  function handleSubmit() {
    if (!canNext) return;

    const body: AdminCreateOfficialGroupBody = {
      name: state.name,
      description: state.description || undefined,
      selectionMode: "games",
      onTheNosePoints: Number(state.onTheNosePoints) || undefined,
      correctDifferencePoints:
        Number(state.correctDifferencePoints) || undefined,
      outcomePoints: Number(state.outcomePoints) || undefined,
    };

    if (state.selectionMode === "games") {
      body.selectionMode = "games";
      body.fixtureIds = [...state.selectedFixtureIds];
    } else if (state.selectionMode === "leagues") {
      if (state.leagueScope === "all") {
        body.selectionMode = "leagues";
        body.leagueIds = state.selectedLeagueIds;
      } else {
        // byRound or byDateRange → static fixtureIds
        body.selectionMode = "games";
        body.fixtureIds = state.leagueResolvedFixtureIds;
      }
    } else if (state.selectionMode === "teams") {
      if (state.teamScope === "all") {
        body.selectionMode = "teams";
        body.teamIds = state.selectedTeamIds;
      } else {
        body.selectionMode = "games";
        body.fixtureIds = state.teamResolvedFixtureIds;
      }
    }

    const validBadges = state.badges.filter((b) => b.name.trim());
    if (validBadges.length > 0) {
      body.badges = validBadges.map((b) => ({
        name: b.name,
        description: b.description,
        icon: b.icon,
        criteriaType: b.criteriaType,
        criteriaValue: Number(b.criteriaValue) || 1,
      }));
    }

    onCreated(body);
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 px-6 py-8 pb-24 max-w-5xl mx-auto w-full">
        {state.step === 1 && (
          <Step1SelectionMode
            selected={state.selectionMode}
            onSelect={(mode) =>
              dispatch({ type: "SET_SELECTION_MODE", mode })
            }
          />
        )}
        {state.step === 2 && state.selectionMode === "games" && (
          <Step2GamesSelection state={state} dispatch={dispatch} />
        )}
        {state.step === 2 && state.selectionMode === "leagues" && (
          <Step2LeaguesSelection state={state} dispatch={dispatch} />
        )}
        {state.step === 2 && state.selectionMode === "teams" && (
          <Step2TeamsSelection state={state} dispatch={dispatch} />
        )}
        {state.step === 3 && <Step3Details state={state} dispatch={dispatch} />}
        {state.step === 4 && <Step4Badge state={state} dispatch={dispatch} />}
      </div>
      <WizardBottomBar
        step={state.step}
        canNext={canNext}
        isSubmitting={false}
        onBack={handleBack}
        onNext={handleNext}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

// ─── Group Settings Dialog ───────────────────────────────────────────────────

function GroupSettingsDialog({
  group,
  open,
  onOpenChange,
  onGroupUpdated,
}: {
  group: AdminOfficialGroupItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupUpdated?: (updated: AdminOfficialGroupItem) => void;
}) {
  const queryClient = useQueryClient();

  const { data: detailsData } = useQuery({
    queryKey: ["official-groups", group.id, "details"],
    queryFn: () => officialGroupsService.getDetails(group.id),
    enabled: open,
  });

  const details = detailsData?.data;
  const rules = details?.rules;

  const [name, setName] = React.useState(group.name);
  const [description, setDescription] = React.useState(group.description ?? "");
  const [badges, setBadges] = React.useState<
    Array<{ name: string; description: string; icon: string; criteriaType: string; criteriaValue: string }>
  >([]);
  const [form, setForm] = React.useState({
    onTheNosePoints: "",
    correctDifferencePoints: "",
    outcomePoints: "",
    predictionMode: "",
    koRoundMode: "",
    maxMembers: "",
    inviteAccess: "",
    nudgeEnabled: false,
    nudgeWindowMinutes: "",
  });

  // Sync form when details/rules load
  React.useEffect(() => {
    if (!rules) return;
    setForm({
      onTheNosePoints: String(rules.onTheNosePoints),
      correctDifferencePoints: String(rules.correctDifferencePoints),
      outcomePoints: String(rules.outcomePoints),
      predictionMode: rules.predictionMode,
      koRoundMode: rules.koRoundMode,
      maxMembers: String(rules.maxMembers),
      inviteAccess: rules.inviteAccess,
      nudgeEnabled: rules.nudgeEnabled,
      nudgeWindowMinutes: String(rules.nudgeWindowMinutes),
    });
  }, [rules]);

  // Sync group metadata when dialog opens
  React.useEffect(() => {
    if (!open) return;
    setName(group.name);
    setDescription(group.description ?? "");
    setBadges(
      group.badges.map((b) => ({
        name: b.name,
        description: b.description,
        icon: b.icon,
        criteriaType: b.criteriaType,
        criteriaValue: String(b.criteriaValue),
      }))
    );
  }, [open, group]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Save group metadata (name, description, badges)
      const metaBody: AdminUpdateOfficialGroupBody = {};
      if (name !== group.name) metaBody.name = name;
      if (description !== (group.description ?? "")) metaBody.description = description;
      const validBadges = badges.filter((b) => b.name.trim());
      if (validBadges.length > 0) {
        metaBody.badges = validBadges.map((b) => ({
          name: b.name, description: b.description, icon: b.icon,
          criteriaType: b.criteriaType, criteriaValue: Number(b.criteriaValue) || 1,
        }));
      } else if (group.badges.length > 0) {
        metaBody.badges = null;
      }

      // Save rules + metadata in parallel
      const [metaResult] = await Promise.all([
        officialGroupsService.update(group.id, metaBody),
        officialGroupsService.updateRules(group.id, {
          onTheNosePoints: Number(form.onTheNosePoints),
          correctDifferencePoints: Number(form.correctDifferencePoints),
          outcomePoints: Number(form.outcomePoints),
          predictionMode: form.predictionMode,
          koRoundMode: form.koRoundMode,
          maxMembers: Number(form.maxMembers),
          inviteAccess: form.inviteAccess,
          nudgeEnabled: form.nudgeEnabled,
          nudgeWindowMinutes: Number(form.nudgeWindowMinutes),
        }),
      ]);
      return metaResult;
    },
    onSuccess: (metaResult) => {
      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: ["official-groups"] });
      onOpenChange(false);
      if (onGroupUpdated && metaResult?.data) {
        onGroupUpdated(metaResult.data);
      }
    },
    onError: (err: Error) => {
      toast.error("Failed to save settings", { description: err.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings — {group.name}</DialogTitle>
        </DialogHeader>

        {!details ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !rules ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No rules configured for this group
          </div>
        ) : (
          <div className="space-y-6">
            {/* Name & Description */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            {/* Read-only info */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm border rounded-md p-3">
              <div>
                <p className="text-xs text-muted-foreground">Selection Mode</p>
                <p className="font-medium">{rules.selectionMode}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Privacy</p>
                <p className="font-medium">{details.privacy}</p>
              </div>
              {details.inviteCode && (
                <div>
                  <p className="text-xs text-muted-foreground">Invite Code</p>
                  <p className="font-medium font-mono">{details.inviteCode}</p>
                </div>
              )}
              {details.creator && (
                <div>
                  <p className="text-xs text-muted-foreground">Created By</p>
                  <p className="font-medium">{details.creator.name || details.creator.email}</p>
                </div>
              )}
            </div>

            {/* Scoring */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Scoring</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Exact Score</Label>
                  <Input
                    type="number"
                    value={form.onTheNosePoints}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, onTheNosePoints: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Correct Difference</Label>
                  <Input
                    type="number"
                    value={form.correctDifferencePoints}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, correctDifferencePoints: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Outcome</Label>
                  <Input
                    type="number"
                    value={form.outcomePoints}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, outcomePoints: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Game Rules */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Game Rules</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Prediction Mode</Label>
                  <Select
                    value={form.predictionMode}
                    onValueChange={(v) => setForm((f) => ({ ...f, predictionMode: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CorrectScore">Correct Score</SelectItem>
                      <SelectItem value="MatchWinner">Match Winner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">KO Round Mode</Label>
                  <Select
                    value={form.koRoundMode}
                    onValueChange={(v) => setForm((f) => ({ ...f, koRoundMode: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FullTime">Full Time</SelectItem>
                      <SelectItem value="ExtraTime">Extra Time</SelectItem>
                      <SelectItem value="Penalties">Penalties</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Members</Label>
                  <Input
                    type="number"
                    value={form.maxMembers}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, maxMembers: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Invite Access</Label>
                  <Select
                    value={form.inviteAccess}
                    onValueChange={(v) => setForm((f) => ({ ...f, inviteAccess: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="admin_only">Admin Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Nudge */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Nudge</Label>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.nudgeEnabled}
                  onCheckedChange={(checked) =>
                    setForm((f) => ({ ...f, nudgeEnabled: checked }))
                  }
                />
                <span className="text-sm">
                  {form.nudgeEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              {form.nudgeEnabled && (
                <div className="space-y-1.5 max-w-[200px]">
                  <Label className="text-xs">Window (minutes)</Label>
                  <Input
                    type="number"
                    value={form.nudgeWindowMinutes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nudgeWindowMinutes: e.target.value }))
                    }
                  />
                </div>
              )}
            </div>

            {/* Badges */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Badges</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    setBadges((prev) => [
                      ...prev,
                      { name: "", description: "", icon: "🏆", criteriaType: "participation", criteriaValue: "1" },
                    ])
                  }
                >
                  Add Badge
                </Button>
              </div>
              {badges.length === 0 && (
                <p className="text-xs text-muted-foreground">No badges configured.</p>
              )}
              {badges.map((badge, i) => (
                <div key={i} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Badge {i + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setBadges((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={badge.name}
                        onChange={(e) =>
                          setBadges((prev) => prev.map((b, idx) => idx === i ? { ...b, name: e.target.value } : b))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Icon</Label>
                      <Input
                        value={badge.icon}
                        onChange={(e) =>
                          setBadges((prev) => prev.map((b, idx) => idx === i ? { ...b, icon: e.target.value } : b))
                        }
                        className="w-16"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={badge.description}
                      onChange={(e) =>
                        setBadges((prev) => prev.map((b, idx) => idx === i ? { ...b, description: e.target.value } : b))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Award Rule</Label>
                      <Select
                        value={badge.criteriaType}
                        onValueChange={(v) =>
                          setBadges((prev) => prev.map((b, idx) => idx === i ? { ...b, criteriaType: v } : b))
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="participation">All participants</SelectItem>
                          <SelectItem value="top_n">Top N</SelectItem>
                          <SelectItem value="exact_predictions">Min exact</SelectItem>
                          <SelectItem value="custom">Manual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(badge.criteriaType === "top_n" || badge.criteriaType === "exact_predictions") && (
                      <div className="space-y-1">
                        <Label className="text-xs">
                          {badge.criteriaType === "top_n" ? "Top N" : "Min exact"}
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          value={badge.criteriaValue}
                          onChange={(e) =>
                            setBadges((prev) => prev.map((b, idx) => idx === i ? { ...b, criteriaValue: e.target.value } : b))
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="w-full"
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Group Detail Full-Screen View ───────────────────────────────────────────

function GroupDetailView({
  group,
  onBack,
  onGroupUpdated,
}: {
  group: AdminOfficialGroupItem;
  onBack: () => void;
  onGroupUpdated: (updated: AdminOfficialGroupItem) => void;
}) {
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState<"leaderboard" | "fixtures">("leaderboard");
  const [fixturesPage, setFixturesPage] = React.useState(1);
  const [leaderboardPage, setLeaderboardPage] = React.useState(1);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => officialGroupsService.delete(id),
    onSuccess: () => {
      toast.success("Official group deleted");
      queryClient.invalidateQueries({ queryKey: ["official-groups"] });
      onBack();
    },
    onError: (err: Error) => {
      toast.error("Failed to delete group", { description: err.message });
    },
  });

  const awardMutation = useMutation({
    mutationFn: (id: number) => officialGroupsService.awardBadges(id),
    onSuccess: (data) => {
      toast.success(`${data.data.awarded} badges awarded`);
    },
    onError: (err: Error) => {
      toast.error("Failed to award badges", { description: err.message });
    },
  });

  const { data: fixturesData, isLoading: fixturesLoading } = useQuery({
    queryKey: ["official-groups", group.id, "fixtures", fixturesPage],
    queryFn: () => officialGroupsService.getFixtures(group.id, fixturesPage, 20),
    enabled: tab === "fixtures",
  });

  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery({
    queryKey: ["official-groups", group.id, "leaderboard", leaderboardPage],
    queryFn: () =>
      officialGroupsService.getLeaderboard(group.id, leaderboardPage, 20),
  });

  const stats = leaderboardData?.stats;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => awardMutation.mutate(group.id)}
            disabled={
              awardMutation.isPending ||
              group.badges.length === 0 ||
              group.status !== "ended"
            }
            title={
              group.badges.length === 0
                ? "No badges configured for this group"
                : group.status !== "ended"
                  ? `Group must be ended to award badges (currently ${group.status})`
                  : undefined
            }
          >
            <Award className="mr-1 h-4 w-4" />
            Award Badges
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            Settings
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (
                confirm(
                  `Delete official group "${group.name}"? This cannot be undone.`,
                )
              ) {
                deleteMutation.mutate(group.id);
              }
            }}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Group Info */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{group.name}</h1>
          {group.description && (
            <p className="text-sm text-muted-foreground">{group.description}</p>
          )}
        </div>
        <Badge
          variant={
            group.status === "active"
              ? "default"
              : group.status === "ended"
                ? "secondary"
                : "outline"
          }
          className="text-sm h-7 px-3"
        >
          {group.status}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Members</p>
            <p className="text-2xl font-bold">
              {stats?.totalMembers ?? group.memberCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Fixtures</p>
            <p className="text-2xl font-bold">{group.fixtureCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Predictions</p>
            <p className="text-2xl font-bold">{stats?.totalPredictions ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Settled</p>
            <p className="text-2xl font-bold">{stats?.settledPredictions ?? "—"}</p>
            {stats && stats.pendingPredictions > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {stats.pendingPredictions} pending
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Badges</p>
            <p className="text-2xl font-bold">{group.badges.length}</p>
            {group.badges.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {group.badges.map((b) => `${b.icon} ${b.name}`).join(", ")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2 border-b pb-0">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "rounded-b-none border-b-2 px-4",
            tab === "leaderboard"
              ? "border-primary font-semibold"
              : "border-transparent text-muted-foreground"
          )}
          onClick={() => setTab("leaderboard")}
        >
          Leaderboard
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "rounded-b-none border-b-2 px-4",
            tab === "fixtures"
              ? "border-primary font-semibold"
              : "border-transparent text-muted-foreground"
          )}
          onClick={() => setTab("fixtures")}
        >
          Fixtures
        </Button>
      </div>

      {/* Leaderboard Tab */}
      {tab === "leaderboard" && (
        <Card>
          <CardContent className="p-0">
            {leaderboardLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !leaderboardData || leaderboardData.data.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No members yet
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-12">#</TableHead>
                      <TableHead className="text-xs">User</TableHead>
                      <TableHead className="text-xs text-right">Points</TableHead>
                      <TableHead className="text-xs text-right">Predictions</TableHead>
                      <TableHead className="text-xs text-right">Exact</TableHead>
                      <TableHead className="text-xs text-right">Diff</TableHead>
                      <TableHead className="text-xs text-right">Outcome</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboardData.data.map((m) => (
                      <TableRow key={m.userId}>
                        <TableCell className="text-sm font-bold text-muted-foreground">
                          {m.rank}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {m.image ? (
                              <img
                                src={m.image}
                                alt=""
                                className="h-6 w-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                                {(m.name || m.username || "?").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium leading-none">
                                {m.name || m.username || `User #${m.userId}`}
                              </p>
                              {m.username && m.name && (
                                <p className="text-xs text-muted-foreground">
                                  @{m.username}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-bold text-right tabular-nums">
                          {m.totalPoints}
                        </TableCell>
                        <TableCell className="text-xs text-right text-muted-foreground tabular-nums">
                          {m.predictionsCount}
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          {m.exactCount}
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          {m.differenceCount}
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          {m.outcomeCount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {leaderboardData.pagination.totalPages > 1 && (
                  <div className="px-4 pb-3">
                    <SimplePagination
                      page={leaderboardData.pagination.page}
                      totalPages={leaderboardData.pagination.totalPages}
                      totalItems={leaderboardData.pagination.totalItems}
                      perPage={leaderboardData.pagination.perPage}
                      onPageChange={setLeaderboardPage}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fixtures Tab */}
      {tab === "fixtures" && (
        <Card>
          <CardContent className="p-0">
            {fixturesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !fixturesData || fixturesData.data.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No fixtures in this group
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Match</TableHead>
                      <TableHead className="text-xs">League</TableHead>
                      <TableHead className="text-xs">Score</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Round</TableHead>
                      <TableHead className="text-xs">State</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fixturesData.data.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="text-sm font-medium">
                          {f.homeTeam?.name ?? "?"} vs {f.awayTeam?.name ?? "?"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {f.league?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {f.homeScore90 !== null && f.awayScore90 !== null
                            ? `${f.homeScore90} - ${f.awayScore90}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(f.startIso).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs">{f.round ?? "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              f.state === "FT" || f.state === "AET" || f.state === "FT_PEN"
                                ? "secondary"
                                : f.state === "LIVE"
                                  ? "default"
                                  : "outline"
                            }
                            className="text-xs"
                          >
                            {f.state}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {fixturesData.pagination.totalPages > 1 && (
                  <div className="px-4 pb-3">
                    <SimplePagination
                      page={fixturesData.pagination.page}
                      totalPages={fixturesData.pagination.totalPages}
                      totalItems={fixturesData.pagination.totalItems}
                      perPage={fixturesData.pagination.perPage}
                      onPageChange={setFixturesPage}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Settings Dialog */}
      <GroupSettingsDialog
        group={group}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onGroupUpdated={onGroupUpdated}
      />
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function OfficialGroupsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [fixturesGroup, setFixturesGroup] =
    React.useState<AdminOfficialGroupItem | null>(null);

  const { data: groupsData, isLoading } = useQuery({
    queryKey: ["official-groups", page],
    queryFn: () => officialGroupsService.list(page, 20),
  });

  const createMutation = useMutation({
    mutationFn: (body: AdminCreateOfficialGroupBody) =>
      officialGroupsService.create(body),
    onSuccess: () => {
      toast.success("Official group created");
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["official-groups"] });
    },
    onError: (err: Error) => {
      toast.error("Failed to create group", { description: err.message });
    },
  });


  // ── Full-screen views replace entire page ──
  if (fixturesGroup) {
    return (
      <GroupDetailView
        group={fixturesGroup}
        onBack={() => setFixturesGroup(null)}
        onGroupUpdated={setFixturesGroup}
      />
    );
  }

  if (isCreateOpen) {
    return (
      <CreateWizard
        onClose={() => setIsCreateOpen(false)}
        onCreated={(body) => createMutation.mutate(body)}
      />
    );
  }

  const groups = groupsData?.data ?? [];
  const pagination = groupsData?.pagination;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Official Groups</h1>
        <Button onClick={() => setIsCreateOpen(true)}>
          Create Official Group
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">
              Loading...
            </div>
          ) : groups.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No official groups yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Fixtures</TableHead>
                  <TableHead>Badge</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow
                    key={group.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setFixturesGroup(group)}
                  >
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          group.status === "active"
                            ? "default"
                            : group.status === "ended"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {group.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{group.memberCount}</TableCell>
                    <TableCell>{group.fixtureCount}</TableCell>
                    <TableCell>
                      {group.badges.length > 0 ? (
                        <span
                          title={group.badges
                            .map((b) => `${b.icon} ${b.name}`)
                            .join(", ")}
                        >
                          {group.badges.length === 1
                            ? `${group.badges[0].icon} ${group.badges[0].name}`
                            : `${group.badges.length} badges`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(group.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

    </div>
  );
}
