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
} from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import type {
  AdminCreateOfficialGroupBody,
  AdminUpdateOfficialGroupBody,
  AdminOfficialGroupItem,
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

  // Badge
  skipBadge: boolean;
  badgeName: string;
  badgeDescription: string;
  badgeIcon: string;
  badgeCriteriaType: string;
  badgeCriteriaValue: string;
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
  skipBadge: true,
  badgeName: "",
  badgeDescription: "",
  badgeIcon: "🏆",
  badgeCriteriaType: "participation",
  badgeCriteriaValue: "1",
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
  // Badge
  | { type: "SET_SKIP_BADGE"; value: boolean }
  | { type: "SET_BADGE_NAME"; value: string }
  | { type: "SET_BADGE_DESCRIPTION"; value: string }
  | { type: "SET_BADGE_ICON"; value: string }
  | { type: "SET_BADGE_CRITERIA_TYPE"; value: string }
  | { type: "SET_BADGE_CRITERIA_VALUE"; value: string };

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

    // Badge
    case "SET_SKIP_BADGE":
      return { ...state, skipBadge: action.value };
    case "SET_BADGE_NAME":
      return { ...state, badgeName: action.value };
    case "SET_BADGE_DESCRIPTION":
      return { ...state, badgeDescription: action.value };
    case "SET_BADGE_ICON":
      return { ...state, badgeIcon: action.value };
    case "SET_BADGE_CRITERIA_TYPE":
      return { ...state, badgeCriteriaType: action.value };
    case "SET_BADGE_CRITERIA_VALUE":
      return { ...state, badgeCriteriaValue: action.value };

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

function Step4Badge({
  state,
  dispatch,
}: {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Badge (optional)</h2>
        <p className="text-sm text-muted-foreground">
          Optionally configure a badge that can be awarded to participants.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          checked={!state.skipBadge}
          onCheckedChange={(checked) =>
            dispatch({ type: "SET_SKIP_BADGE", value: !checked })
          }
        />
        <Label>{state.skipBadge ? "No badge" : "Configure badge"}</Label>
      </div>

      {!state.skipBadge && (
        <div className="space-y-4 max-w-xl">
          <div className="space-y-1.5">
            <Label className="text-xs">Badge Name</Label>
            <Input
              value={state.badgeName}
              onChange={(e) =>
                dispatch({ type: "SET_BADGE_NAME", value: e.target.value })
              }
              placeholder="e.g. CL Participant"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Input
              value={state.badgeDescription}
              onChange={(e) =>
                dispatch({
                  type: "SET_BADGE_DESCRIPTION",
                  value: e.target.value,
                })
              }
              placeholder="Participated in Champions League group"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Icon (emoji)</Label>
              <Input
                value={state.badgeIcon}
                onChange={(e) =>
                  dispatch({ type: "SET_BADGE_ICON", value: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Criteria Value</Label>
              <Input
                type="number"
                value={state.badgeCriteriaValue}
                onChange={(e) =>
                  dispatch({
                    type: "SET_BADGE_CRITERIA_VALUE",
                    value: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Criteria Type</Label>
            <Select
              value={state.badgeCriteriaType}
              onValueChange={(v) =>
                dispatch({ type: "SET_BADGE_CRITERIA_TYPE", value: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="participation">Participation</SelectItem>
                <SelectItem value="top_n">Top N</SelectItem>
                <SelectItem value="exact_predictions">
                  Exact Predictions
                </SelectItem>
                <SelectItem value="custom">Custom (manual)</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
          state.skipBadge || state.badgeName.trim().length > 0
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

    if (!state.skipBadge && state.badgeName.trim()) {
      body.badge = {
        name: state.badgeName,
        description: state.badgeDescription,
        icon: state.badgeIcon,
        criteriaType: state.badgeCriteriaType,
        criteriaValue: Number(state.badgeCriteriaValue) || 1,
      };
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

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function OfficialGroupsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editGroup, setEditGroup] =
    React.useState<AdminOfficialGroupItem | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editBadgeName, setEditBadgeName] = React.useState("");
  const [editBadgeDescription, setEditBadgeDescription] = React.useState("");
  const [editBadgeIcon, setEditBadgeIcon] = React.useState("");
  const [editBadgeCriteriaType, setEditBadgeCriteriaType] =
    React.useState("");
  const [editBadgeCriteriaValue, setEditBadgeCriteriaValue] =
    React.useState("");

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

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number;
      body: AdminUpdateOfficialGroupBody;
    }) => officialGroupsService.update(id, body),
    onSuccess: () => {
      toast.success("Official group updated");
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["official-groups"] });
    },
    onError: (err: Error) => {
      toast.error("Failed to update group", { description: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => officialGroupsService.delete(id),
    onSuccess: () => {
      toast.success("Official group deleted");
      queryClient.invalidateQueries({ queryKey: ["official-groups"] });
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

  function handleEdit() {
    if (!editGroup) return;
    const body: AdminUpdateOfficialGroupBody = {};
    if (editName !== editGroup.name) body.name = editName;
    if (editDescription !== (editGroup.description ?? ""))
      body.description = editDescription;

    if (editBadgeName.trim()) {
      body.badge = {
        name: editBadgeName,
        description: editBadgeDescription,
        icon: editBadgeIcon,
        criteriaType: editBadgeCriteriaType,
        criteriaValue: Number(editBadgeCriteriaValue) || 1,
      };
    } else if (editGroup.badge && !editBadgeName.trim()) {
      body.badge = null;
    }

    updateMutation.mutate({ id: editGroup.id, body });
  }

  function openEdit(group: AdminOfficialGroupItem) {
    setEditGroup(group);
    setEditName(group.name);
    setEditDescription(group.description ?? "");
    setEditBadgeName(group.badge?.name ?? "");
    setEditBadgeDescription(group.badge?.description ?? "");
    setEditBadgeIcon(group.badge?.icon ?? "🏆");
    setEditBadgeCriteriaType(group.badge?.criteriaType ?? "participation");
    setEditBadgeCriteriaValue(String(group.badge?.criteriaValue ?? 1));
    setIsEditOpen(true);
  }

  // ── Wizard replaces entire page ──
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
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
                      {group.badge ? (
                        <span title={group.badge.description}>
                          {group.badge.icon} {group.badge.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(group.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(group)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => awardMutation.mutate(group.id)}
                        disabled={awardMutation.isPending}
                      >
                        Award Badges
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
                        Delete
                      </Button>
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Official Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Badge</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <Label className="text-xs">
                    Badge Name (clear to remove badge)
                  </Label>
                  <Input
                    value={editBadgeName}
                    onChange={(e) => setEditBadgeName(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={editBadgeDescription}
                    onChange={(e) => setEditBadgeDescription(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Icon</Label>
                    <Input
                      value={editBadgeIcon}
                      onChange={(e) => setEditBadgeIcon(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Criteria Value</Label>
                    <Input
                      type="number"
                      value={editBadgeCriteriaValue}
                      onChange={(e) =>
                        setEditBadgeCriteriaValue(e.target.value)
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Criteria Type</Label>
                  <Select
                    value={editBadgeCriteriaType}
                    onValueChange={setEditBadgeCriteriaType}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="participation">
                        Participation
                      </SelectItem>
                      <SelectItem value="top_n">Top N</SelectItem>
                      <SelectItem value="exact_predictions">
                        Exact Predictions
                      </SelectItem>
                      <SelectItem value="custom">Custom (manual)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full"
              onClick={handleEdit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
