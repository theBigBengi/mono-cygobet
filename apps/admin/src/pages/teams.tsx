import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { teamsService } from "@/services/teams.service";
import { leaguesService } from "@/services/leagues.service";
import type { AdminTeamsListResponse } from "@repo/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertCircle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Pencil,
  Search,
  Trophy,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Team = AdminTeamsListResponse["data"][number];

const PER_PAGE = 50;
const MIN_SEARCH_LENGTH = 3;
const DEBOUNCE_MS = 350;

// ── Color swatches (shared between table and cards) ──────────────────

function ColorSwatches({ team, size = "sm" }: { team: Team; size?: "sm" | "xs" }) {
  const s = size === "xs" ? "w-4 h-4" : "w-5 h-5 sm:w-6 sm:h-6";
  if (!team.primaryColor && !team.secondaryColor && !team.tertiaryColor) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  return (
    <div className="flex gap-1">
      {team.primaryColor && (
        <div className={`${s} rounded border border-border`} style={{ backgroundColor: team.primaryColor }} />
      )}
      {team.secondaryColor && (
        <div className={`${s} rounded border border-border`} style={{ backgroundColor: team.secondaryColor }} />
      )}
      {team.tertiaryColor && (
        <div className={`${s} rounded border border-border`} style={{ backgroundColor: team.tertiaryColor }} />
      )}
    </div>
  );
}

// ── Mobile team card ─────────────────────────────────────────────────

function TeamCard({ team, onClick }: { team: Team; onClick: () => void }) {
  return (
    <div
      className="rounded-md border p-2.5 flex items-center gap-2.5 active:bg-muted/50 cursor-pointer"
      onClick={onClick}
    >
      {team.imagePath ? (
        <img src={team.imagePath} alt="" className="h-8 w-8 object-contain shrink-0" />
      ) : (
        <div className="h-8 w-8 rounded bg-muted shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium truncate">{team.name}</span>
          <ColorSwatches team={team} size="xs" />
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
          {team.shortCode && <span className="font-mono">{team.shortCode}</span>}
          {team.shortCode && team.country?.name && <span className="opacity-40">·</span>}
          {team.country?.name && <span className="truncate">{team.country.name}</span>}
        </div>
      </div>
      <Pencil className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    </div>
  );
}

// ── League combobox ──────────────────────────────────────────────────

function LeagueFilter({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (leagueId: number | null) => void;
}) {
  const [open, setOpen] = React.useState(false);

  const { data: leaguesData } = useQuery({
    queryKey: ["leagues", "all-for-filter"],
    queryFn: () => leaguesService.getFromDb({ perPage: 2000 }),
    staleTime: 5 * 60 * 1000,
  });

  const leagues = leaguesData?.data ?? [];

  // Group by country
  const grouped = React.useMemo(() => {
    const map = new Map<string, typeof leagues>();
    for (const l of leagues) {
      const country = l.country?.name ?? "Unknown";
      if (!map.has(country)) map.set(country, []);
      map.get(country)!.push(l);
    }
    // Sort countries alphabetically, leagues within country alphabetically
    const sorted = [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
    for (const [, ls] of sorted) {
      ls.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [leagues]);

  const selectedLeague = leagues.find((l) => l.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 sm:h-9 text-xs sm:text-sm justify-between w-full sm:w-[200px] font-normal"
        >
          <div className="flex items-center gap-1.5 truncate">
            <Trophy className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="truncate">
              {selectedLeague ? selectedLeague.name : "All leagues"}
            </span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search leagues..." className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty className="text-xs py-4 text-center">No league found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="text-xs"
              >
                <Check className={cn("mr-2 h-3 w-3", value === null ? "opacity-100" : "opacity-0")} />
                All leagues
              </CommandItem>
            </CommandGroup>
            {grouped.map(([country, countryLeagues]) => (
              <CommandGroup key={country} heading={country}>
                {countryLeagues.map((league) => (
                  <CommandItem
                    key={league.id}
                    value={`${country} ${league.name}`}
                    onSelect={() => {
                      onChange(league.id === value ? null : league.id);
                      setOpen(false);
                    }}
                    className="text-xs"
                  >
                    <Check className={cn("mr-2 h-3 w-3", value === league.id ? "opacity-100" : "opacity-0")} />
                    {league.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── Main page ────────────────────────────────────────────────────────

export default function TeamsPage() {
  const queryClient = useQueryClient();

  // ── Filters ──────────────────────────────────────────────────────
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [leagueId, setLeagueId] = React.useState<number | null>(null);
  const [missingColors, setMissingColors] = React.useState(false);
  const [page, setPage] = React.useState(1);

  // Debounce search — only send to server with 3+ chars
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = search.trim();
      setDebouncedSearch(trimmed.length >= MIN_SEARCH_LENGTH ? trimmed : "");
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, leagueId, missingColors]);

  // ── Edit state ───────────────────────────────────────────────────
  const [editingTeam, setEditingTeam] = React.useState<Team | null>(null);
  const [updateForm, setUpdateForm] = React.useState({
    name: "",
    shortCode: "",
    primaryColor: "",
    secondaryColor: "",
    tertiaryColor: "",
  });

  // ── Import state ─────────────────────────────────────────────────
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [csvFile, setCsvFile] = React.useState<File | null>(null);
  const [importResults, setImportResults] = React.useState<{
    updated: number;
    notFound: string[];
    errors: { name: string; error: string }[];
  } | null>(null);

  // ── Data fetching ────────────────────────────────────────────────

  // Build server params — single source of truth
  const serverParams = React.useMemo(() => ({
    page,
    perPage: PER_PAGE,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(leagueId ? { leagueId } : {}),
  }), [page, debouncedSearch, leagueId]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["teams", serverParams],
    queryFn: () => teamsService.getFromDb(serverParams),
    placeholderData: (prev) => prev, // keep previous data while loading
  });

  const allTeams = data?.data ?? [];
  // Client-side "no colors" filter (lightweight, no need for server round-trip)
  const teams = missingColors
    ? allTeams.filter((t) => !t.primaryColor && !t.secondaryColor && !t.tertiaryColor)
    : allTeams;
  const pagination = (data as AdminTeamsListResponse)?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const totalItems = pagination?.totalItems ?? 0;

  // ── Mutations ────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        name?: string;
        shortCode?: string | null;
        primaryColor?: string | null;
        secondaryColor?: string | null;
        tertiaryColor?: string | null;
      };
    }) => teamsService.update(id, data),
    onSuccess: () => {
      toast.success("Team updated successfully");
      setEditingTeam(null);
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to update team", { description: error.message });
    },
  });

  const importMutation = useMutation({
    mutationFn: (teams: Parameters<typeof teamsService.bulkUpdate>[0]) =>
      teamsService.bulkUpdate(teams),
    onSuccess: (response) => {
      setImportResults(response.data);
      setCsvFile(null);
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success(response.message);
    },
    onError: (error: Error) => {
      toast.error("Import failed", { description: error.message });
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

    const nameIdx = headers.indexOf("name");
    const primaryIdx = headers.indexOf("primarycolor");
    const secondaryIdx = headers.indexOf("secondarycolor");
    const tertiaryIdx = headers.indexOf("tertiarycolor");

    if (nameIdx === -1) {
      throw new Error("CSV must have a 'name' column");
    }

    return lines
      .slice(1)
      .map((line) => {
        const values = line.split(",").map((v) => v.trim());
        return {
          name: values[nameIdx],
          primaryColor: primaryIdx >= 0 ? values[primaryIdx] || null : null,
          secondaryColor: secondaryIdx >= 0 ? values[secondaryIdx] || null : null,
          tertiaryColor: tertiaryIdx >= 0 ? values[tertiaryIdx] || null : null,
        };
      })
      .filter((t) => t.name);
  };

  const [isExporting, setIsExporting] = React.useState(false);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const res = await teamsService.getFromDb({ page: 1, perPage: 10000 });
      const rows = res.data ?? [];
      const header = "name,primaryColor,secondaryColor,tertiaryColor";
      const csvRows = rows.map((t) => {
        const escape = (v: string | null) =>
          v && v.includes(",") ? `"${v}"` : (v ?? "");
        return [escape(t.name), escape(t.primaryColor), escape(t.secondaryColor), escape(t.tertiaryColor)].join(",");
      });
      const csv = [header, ...csvRows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "teams-colors.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} teams`);
    } catch {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileUpload = async () => {
    if (!csvFile) return;
    try {
      const text = await csvFile.text();
      const teams = parseCSV(text);
      importMutation.mutate(teams);
    } catch (error) {
      toast.error("Failed to parse CSV", {
        description: error instanceof Error ? error.message : "Invalid format",
      });
    }
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setUpdateForm({
      name: team.name,
      shortCode: team.shortCode || "",
      primaryColor: team.primaryColor || "",
      secondaryColor: team.secondaryColor || "",
      tertiaryColor: team.tertiaryColor || "",
    });
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;

    const changes: Record<string, string | null | undefined> = {};
    if (updateForm.name !== editingTeam.name) changes.name = updateForm.name;
    if (updateForm.shortCode !== (editingTeam.shortCode || "")) changes.shortCode = updateForm.shortCode || null;
    if (updateForm.primaryColor !== (editingTeam.primaryColor || "")) changes.primaryColor = updateForm.primaryColor || null;
    if (updateForm.secondaryColor !== (editingTeam.secondaryColor || "")) changes.secondaryColor = updateForm.secondaryColor || null;
    if (updateForm.tertiaryColor !== (editingTeam.tertiaryColor || "")) changes.tertiaryColor = updateForm.tertiaryColor || null;

    if (Object.keys(changes).length === 0) {
      toast.info("No changes to save");
      return;
    }

    updateMutation.mutate({ id: editingTeam.id, data: changes });
  };

  // ── Search hint ──────────────────────────────────────────────────
  const showSearchHint = search.trim().length > 0 && search.trim().length < MIN_SEARCH_LENGTH;

  return (
    <div className="h-full flex flex-col p-2 sm:p-3 md:p-6">
      <div className="shrink-0 mb-3 sm:mb-4">
        <h1 className="text-lg sm:text-2xl font-semibold">Teams</h1>
        <p className="hidden sm:block text-sm text-muted-foreground mt-1">
          Manage team names, short codes, and brand colors
        </p>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-3 sm:gap-4">
        {/* CSV Import - Collapsible */}
        <Collapsible open={isImportOpen} onOpenChange={setIsImportOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="p-3 sm:p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    <CardTitle className="text-sm sm:text-base">Bulk Import Colors</CardTitle>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isImportOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0 space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="flex-1 min-w-0 h-8 sm:h-9 text-xs sm:text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleFileUpload}
                      disabled={!csvFile || importMutation.isPending}
                      className="flex-1 sm:flex-none h-8 text-xs"
                    >
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      {importMutation.isPending ? "Importing..." : "Import"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportCSV}
                      disabled={isExporting}
                      className="flex-1 sm:flex-none h-8 text-xs"
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      {isExporting ? "Exporting..." : "Export"}
                    </Button>
                  </div>
                </div>

                <div className="text-[11px] sm:text-xs text-muted-foreground bg-muted px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-md overflow-x-auto">
                  <code className="whitespace-pre">
{`name,primaryColor,secondaryColor,tertiaryColor
Manchester City,#6CABDD,#FFFFFF,#1C2C5B`}
                  </code>
                </div>

                {importResults && (
                  <div className="space-y-2">
                    <Alert>
                      <CheckCircle className="h-3.5 w-3.5" />
                      <AlertTitle className="text-xs sm:text-sm">Import Complete</AlertTitle>
                      <AlertDescription className="text-xs">
                        Updated {importResults.updated} teams
                      </AlertDescription>
                    </Alert>
                    {importResults.notFound.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <AlertTitle className="text-xs sm:text-sm">
                          Teams Not Found ({importResults.notFound.length})
                        </AlertTitle>
                        <AlertDescription className="max-h-24 overflow-y-auto text-xs">
                          {importResults.notFound.join(", ")}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Teams */}
        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <CardHeader className="shrink-0 p-3 sm:p-6">
            <div className="flex flex-col gap-2">
              {/* Title row */}
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm sm:text-base">
                    Teams{" "}
                    <span className="text-muted-foreground font-normal">
                      ({totalItems})
                    </span>
                  </CardTitle>
                  <CardDescription className="hidden sm:block">
                    Page {page} of {totalPages}
                    {debouncedSearch && <> &middot; Searching &ldquo;{debouncedSearch}&rdquo;</>}
                    {isFetching && !isLoading && " — loading..."}
                  </CardDescription>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                  <Checkbox
                    checked={missingColors}
                    onCheckedChange={(c) => setMissingColors(c === true)}
                    className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                  />
                  <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">No colors</span>
                </label>
              </div>

              {/* Filters row */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search teams (min 3 chars)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-8 h-8 sm:h-9 text-xs sm:text-sm"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <LeagueFilter value={leagueId} onChange={setLeagueId} />
              </div>

              {/* Search hint */}
              {showSearchHint && (
                <p className="text-[11px] text-muted-foreground">
                  Type at least {MIN_SEARCH_LENGTH} characters to search
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 flex flex-col p-3 pt-0 sm:p-6 sm:pt-0">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 sm:h-12 w-full" />
                ))}
              </div>
            ) : teams.length === 0 ? (
              <div className="text-center py-6 text-xs sm:text-sm text-muted-foreground">
                {debouncedSearch
                  ? `No teams found for "${debouncedSearch}"`
                  : leagueId
                    ? "No teams found in this league"
                    : "No teams found"}
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto">
                {/* Mobile card list */}
                <div className="sm:hidden space-y-1.5">
                  {teams.map((team) => (
                    <TeamCard key={team.id} team={team} onClick={() => handleEdit(team)} />
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 pl-2">Logo</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-24">Code</TableHead>
                        <TableHead className="hidden md:table-cell">Country</TableHead>
                        <TableHead className="w-32">Colors</TableHead>
                        <TableHead className="w-16 text-right pr-2" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teams.map((team) => (
                        <TableRow key={team.id} className="cursor-pointer" onClick={() => handleEdit(team)}>
                          <TableCell className="pl-2 py-2">
                            {team.imagePath ? (
                              <img src={team.imagePath} alt="" className="h-8 w-8 object-contain" />
                            ) : (
                              <div className="h-8 w-8 rounded bg-muted" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-sm py-2">
                            {team.name}
                          </TableCell>
                          <TableCell className="font-mono text-sm py-2">
                            {team.shortCode || "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-sm py-2">
                            {team.country?.name || "—"}
                          </TableCell>
                          <TableCell className="py-2">
                            <ColorSwatches team={team} />
                          </TableCell>
                          <TableCell className="text-right pr-2 py-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); handleEdit(team); }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="shrink-0 flex items-center justify-between pt-3 border-t">
                <span className="text-[11px] sm:text-sm text-muted-foreground">
                  {(page - 1) * PER_PAGE + 1}-{Math.min(page * PER_PAGE, totalItems)} of {totalItems}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground hidden sm:inline mr-1">
                    Page {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 hidden sm:inline-flex"
                    onClick={() => setPage(1)}
                    disabled={page === 1 || isFetching}
                  >
                    <ChevronsLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || isFetching}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || isFetching}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 hidden sm:inline-flex"
                    onClick={() => setPage(totalPages)}
                    disabled={page >= totalPages || isFetching}
                  >
                    <ChevronsRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Team Sheet */}
      <Sheet
        open={!!editingTeam}
        onOpenChange={(open) => !open && setEditingTeam(null)}
      >
        <SheetContent className="w-full sm:max-w-md overflow-y-auto p-4 sm:p-6">
          <SheetHeader>
            <SheetTitle className="text-sm sm:text-base">Edit Team</SheetTitle>
            <SheetDescription className="text-xs sm:text-sm">
              Update team details and brand colors
            </SheetDescription>
          </SheetHeader>

          {editingTeam && (
            <form onSubmit={handleUpdateSubmit} className="space-y-4 mt-4">
              {editingTeam.imagePath && (
                <div className="flex justify-center">
                  <img
                    src={editingTeam.imagePath}
                    alt=""
                    className="h-14 w-14 sm:h-20 sm:w-20 object-contain"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-xs sm:text-sm">Name</Label>
                <Input
                  id="edit-name"
                  value={updateForm.name}
                  onChange={(e) => setUpdateForm((f) => ({ ...f, name: e.target.value }))}
                  className="h-8 sm:h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-shortCode" className="text-xs sm:text-sm">Short Code</Label>
                <Input
                  id="edit-shortCode"
                  value={updateForm.shortCode}
                  maxLength={10}
                  placeholder="e.g. MCI, LIV, ARS"
                  onChange={(e) =>
                    setUpdateForm((f) => ({ ...f, shortCode: e.target.value.toUpperCase() }))
                  }
                  className="h-8 sm:h-9 text-sm"
                />
              </div>

              {(["primaryColor", "secondaryColor", "tertiaryColor"] as const).map((colorKey) => {
                const labels = { primaryColor: "Primary", secondaryColor: "Secondary", tertiaryColor: "Tertiary" };
                const defaults = { primaryColor: "#000000", secondaryColor: "#FFFFFF", tertiaryColor: "#CCCCCC" };
                return (
                  <div key={colorKey} className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">{labels[colorKey]} Color</Label>
                    <div className="flex gap-1.5">
                      <input
                        type="color"
                        value={updateForm[colorKey] || defaults[colorKey]}
                        onChange={(e) => setUpdateForm((f) => ({ ...f, [colorKey]: e.target.value }))}
                        className="w-9 h-8 sm:w-10 sm:h-9 rounded border border-input cursor-pointer shrink-0"
                      />
                      <Input
                        value={updateForm[colorKey]}
                        placeholder={defaults[colorKey]}
                        pattern="^#[0-9A-Fa-f]{6}$"
                        onChange={(e) => setUpdateForm((f) => ({ ...f, [colorKey]: e.target.value }))}
                        className="flex-1 min-w-0 font-mono text-xs sm:text-sm h-8 sm:h-9"
                      />
                      {updateForm[colorKey] && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 h-8 w-8 sm:h-9 sm:w-9"
                          onClick={() => setUpdateForm((f) => ({ ...f, [colorKey]: "" }))}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {(updateForm.primaryColor || updateForm.secondaryColor || updateForm.tertiaryColor) && (
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm">Preview</Label>
                  <div className="flex gap-2 p-2.5 bg-muted rounded-md justify-center">
                    {updateForm.primaryColor && (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-border shadow-sm" style={{ backgroundColor: updateForm.primaryColor }} />
                    )}
                    {updateForm.secondaryColor && (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-border shadow-sm" style={{ backgroundColor: updateForm.secondaryColor }} />
                    )}
                    {updateForm.tertiaryColor && (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-border shadow-sm" style={{ backgroundColor: updateForm.tertiaryColor }} />
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setEditingTeam(null)}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="flex-1"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
