/**
 * Teams Management Page
 *
 * Manage team details: name, short code, and brand colors.
 * - List all teams with pagination and search
 * - Edit team details via slide-out sheet
 * - Color picker for primary/secondary/tertiary colors
 */

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
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { teamsService } from "@/services/teams.service";
import type { AdminTeamsListResponse } from "@repo/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Download,
  FileText,
  Pencil,
  Search,
  Upload,
  X,
} from "lucide-react";

type Team = AdminTeamsListResponse["data"][number];

export default function TeamsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const perPage = 50;

  const [editingTeam, setEditingTeam] = React.useState<Team | null>(null);
  const [updateForm, setUpdateForm] = React.useState({
    name: "",
    shortCode: "",
    primaryColor: "",
    secondaryColor: "",
    tertiaryColor: "",
  });

  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [csvFile, setCsvFile] = React.useState<File | null>(null);
  const [importResults, setImportResults] = React.useState<{
    updated: number;
    notFound: string[];
    errors: { name: string; error: string }[];
  } | null>(null);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch teams
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["teams", page, perPage, debouncedSearch],
    queryFn: () =>
      debouncedSearch
        ? teamsService.search(debouncedSearch, perPage)
        : teamsService.getFromDb({ page, perPage }),
  });

  // Update mutation
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
          secondaryColor:
            secondaryIdx >= 0 ? values[secondaryIdx] || null : null,
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

  // Open edit sheet
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

  // Submit update
  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;

    const changes: Record<string, string | null | undefined> = {};

    if (updateForm.name !== editingTeam.name) {
      changes.name = updateForm.name;
    }
    if (updateForm.shortCode !== (editingTeam.shortCode || "")) {
      changes.shortCode = updateForm.shortCode || null;
    }
    if (updateForm.primaryColor !== (editingTeam.primaryColor || "")) {
      changes.primaryColor = updateForm.primaryColor || null;
    }
    if (updateForm.secondaryColor !== (editingTeam.secondaryColor || "")) {
      changes.secondaryColor = updateForm.secondaryColor || null;
    }
    if (updateForm.tertiaryColor !== (editingTeam.tertiaryColor || "")) {
      changes.tertiaryColor = updateForm.tertiaryColor || null;
    }

    if (Object.keys(changes).length === 0) {
      toast.info("No changes to save");
      return;
    }

    updateMutation.mutate({ id: editingTeam.id, data: changes });
  };

  const teams = data?.data ?? [];
  const pagination = (data as AdminTeamsListResponse)?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const totalItems = pagination?.totalItems ?? teams.length;

  return (
    <div className="h-full w-full p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-3xl font-bold">Teams</h1>
          <p className="text-sm text-muted-foreground">
            Manage team names, short codes, and brand colors
          </p>
        </div>

        {/* CSV Import - Collapsible */}
        <Collapsible open={isImportOpen} onOpenChange={setIsImportOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Bulk Import Colors
                    </CardTitle>
                    <CardDescription>
                      Upload a CSV file to update team colors in bulk
                    </CardDescription>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${isImportOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="flex-1 min-w-0"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleFileUpload}
                      disabled={!csvFile || importMutation.isPending}
                      className="flex-1 sm:flex-none"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {importMutation.isPending ? "Importing..." : "Import"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleExportCSV}
                      disabled={isExporting}
                      className="flex-1 sm:flex-none"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {isExporting ? "Exporting..." : "Export"}
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-md overflow-x-auto">
                  <code className="whitespace-pre">
{`name,primaryColor,secondaryColor,tertiaryColor
Manchester City,#6CABDD,#FFFFFF,#1C2C5B`}
                  </code>
                </div>

                {importResults && (
                  <div className="space-y-2">
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertTitle>Import Complete</AlertTitle>
                      <AlertDescription>
                        Updated {importResults.updated} teams
                      </AlertDescription>
                    </Alert>

                    {importResults.notFound.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>
                          Teams Not Found ({importResults.notFound.length})
                        </AlertTitle>
                        <AlertDescription className="max-h-32 overflow-y-auto">
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

        {/* Teams Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>Teams ({totalItems})</CardTitle>
                <CardDescription>
                  {debouncedSearch
                    ? `Search results for "${debouncedSearch}"`
                    : `Page ${page} of ${totalPages}`}
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-[260px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search teams..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-9 h-9"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : teams.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No teams found
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table className="min-w-[340px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 sm:w-12 pl-4 sm:pl-2">Logo</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell w-24">Code</TableHead>
                      <TableHead className="hidden md:table-cell">Country</TableHead>
                      <TableHead className="w-20 sm:w-32">Colors</TableHead>
                      <TableHead className="w-10 sm:w-20 text-right pr-4 sm:pr-2" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teams.map((team) => (
                      <TableRow key={team.id}>
                        <TableCell className="pl-4 sm:pl-2 py-2 sm:py-3">
                          {team.imagePath ? (
                            <img
                              src={team.imagePath}
                              alt=""
                              className="h-7 w-7 sm:h-8 sm:w-8 object-contain"
                            />
                          ) : (
                            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded bg-muted" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-xs sm:text-sm max-w-[120px] sm:max-w-none truncate py-2 sm:py-3">
                          {team.name}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell font-mono text-sm py-2 sm:py-3">
                          {team.shortCode || "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground py-2 sm:py-3">
                          {team.country?.name || "—"}
                        </TableCell>
                        <TableCell className="py-2 sm:py-3">
                          <div className="flex gap-1">
                            {team.primaryColor && (
                              <div
                                className="w-5 h-5 sm:w-6 sm:h-6 rounded border border-border"
                                style={{ backgroundColor: team.primaryColor }}
                                title={`Primary: ${team.primaryColor}`}
                              />
                            )}
                            {team.secondaryColor && (
                              <div
                                className="w-5 h-5 sm:w-6 sm:h-6 rounded border border-border"
                                style={{
                                  backgroundColor: team.secondaryColor,
                                }}
                                title={`Secondary: ${team.secondaryColor}`}
                              />
                            )}
                            {team.tertiaryColor && (
                              <div
                                className="w-5 h-5 sm:w-6 sm:h-6 rounded border border-border"
                                style={{
                                  backgroundColor: team.tertiaryColor,
                                }}
                                title={`Tertiary: ${team.tertiaryColor}`}
                              />
                            )}
                            {!team.primaryColor &&
                              !team.secondaryColor &&
                              !team.tertiaryColor && (
                                <span className="text-muted-foreground">—</span>
                              )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-4 sm:pr-2 py-2 sm:py-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(team)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination - only show when not searching */}
            {!debouncedSearch && totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 gap-2">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {page}/{totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || isFetching}
                    className="h-8 sm:h-9"
                  >
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || isFetching}
                    className="h-8 sm:h-9"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Team Sheet */}
        <Sheet
          open={!!editingTeam}
          onOpenChange={(open) => !open && setEditingTeam(null)}
        >
          <SheetContent className="w-full sm:max-w-md overflow-y-auto p-4 sm:p-6">
            <SheetHeader>
              <SheetTitle>Edit Team</SheetTitle>
              <SheetDescription>
                Update team details and brand colors
              </SheetDescription>
            </SheetHeader>

            {editingTeam && (
              <form onSubmit={handleUpdateSubmit} className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                {/* Team Logo Preview */}
                {editingTeam.imagePath && (
                  <div className="flex justify-center">
                    <img
                      src={editingTeam.imagePath}
                      alt=""
                      className="h-16 w-16 sm:h-20 sm:w-20 object-contain"
                    />
                  </div>
                )}

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={updateForm.name}
                    onChange={(e) =>
                      setUpdateForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>

                {/* Short Code */}
                <div className="space-y-2">
                  <Label htmlFor="edit-shortCode">Short Code</Label>
                  <Input
                    id="edit-shortCode"
                    value={updateForm.shortCode}
                    maxLength={10}
                    placeholder="e.g. MCI, LIV, ARS"
                    onChange={(e) =>
                      setUpdateForm((f) => ({
                        ...f,
                        shortCode: e.target.value.toUpperCase(),
                      }))
                    }
                  />
                </div>

                {/* Primary Color */}
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-1.5 sm:gap-2">
                    <input
                      type="color"
                      value={updateForm.primaryColor || "#000000"}
                      onChange={(e) =>
                        setUpdateForm((f) => ({
                          ...f,
                          primaryColor: e.target.value,
                        }))
                      }
                      className="w-10 h-9 sm:w-12 sm:h-10 rounded border border-input cursor-pointer shrink-0"
                    />
                    <Input
                      value={updateForm.primaryColor}
                      placeholder="#000000"
                      pattern="^#[0-9A-Fa-f]{6}$"
                      onChange={(e) =>
                        setUpdateForm((f) => ({
                          ...f,
                          primaryColor: e.target.value,
                        }))
                      }
                      className="flex-1 min-w-0 font-mono text-sm"
                    />
                    {updateForm.primaryColor && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-9 w-9 sm:h-10 sm:w-10"
                        onClick={() =>
                          setUpdateForm((f) => ({ ...f, primaryColor: "" }))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Secondary Color */}
                <div className="space-y-2">
                  <Label>Secondary Color</Label>
                  <div className="flex gap-1.5 sm:gap-2">
                    <input
                      type="color"
                      value={updateForm.secondaryColor || "#FFFFFF"}
                      onChange={(e) =>
                        setUpdateForm((f) => ({
                          ...f,
                          secondaryColor: e.target.value,
                        }))
                      }
                      className="w-10 h-9 sm:w-12 sm:h-10 rounded border border-input cursor-pointer shrink-0"
                    />
                    <Input
                      value={updateForm.secondaryColor}
                      placeholder="#FFFFFF"
                      pattern="^#[0-9A-Fa-f]{6}$"
                      onChange={(e) =>
                        setUpdateForm((f) => ({
                          ...f,
                          secondaryColor: e.target.value,
                        }))
                      }
                      className="flex-1 min-w-0 font-mono text-sm"
                    />
                    {updateForm.secondaryColor && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-9 w-9 sm:h-10 sm:w-10"
                        onClick={() =>
                          setUpdateForm((f) => ({ ...f, secondaryColor: "" }))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Tertiary Color */}
                <div className="space-y-2">
                  <Label>Tertiary Color</Label>
                  <div className="flex gap-1.5 sm:gap-2">
                    <input
                      type="color"
                      value={updateForm.tertiaryColor || "#CCCCCC"}
                      onChange={(e) =>
                        setUpdateForm((f) => ({
                          ...f,
                          tertiaryColor: e.target.value,
                        }))
                      }
                      className="w-10 h-9 sm:w-12 sm:h-10 rounded border border-input cursor-pointer shrink-0"
                    />
                    <Input
                      value={updateForm.tertiaryColor}
                      placeholder="#CCCCCC"
                      pattern="^#[0-9A-Fa-f]{6}$"
                      onChange={(e) =>
                        setUpdateForm((f) => ({
                          ...f,
                          tertiaryColor: e.target.value,
                        }))
                      }
                      className="flex-1 min-w-0 font-mono text-sm"
                    />
                    {updateForm.tertiaryColor && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-9 w-9 sm:h-10 sm:w-10"
                        onClick={() =>
                          setUpdateForm((f) => ({ ...f, tertiaryColor: "" }))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Color Preview */}
                {(updateForm.primaryColor ||
                  updateForm.secondaryColor ||
                  updateForm.tertiaryColor) && (
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <div className="flex gap-2 p-3 bg-muted rounded-md justify-center">
                      {updateForm.primaryColor && (
                        <div
                          className="w-12 h-12 rounded-lg border-2 border-border shadow-sm"
                          style={{
                            backgroundColor: updateForm.primaryColor,
                          }}
                        />
                      )}
                      {updateForm.secondaryColor && (
                        <div
                          className="w-12 h-12 rounded-lg border-2 border-border shadow-sm"
                          style={{
                            backgroundColor: updateForm.secondaryColor,
                          }}
                        />
                      )}
                      {updateForm.tertiaryColor && (
                        <div
                          className="w-12 h-12 rounded-lg border-2 border-border shadow-sm"
                          style={{
                            backgroundColor: updateForm.tertiaryColor,
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditingTeam(null)}
                    disabled={updateMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
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
    </div>
  );
}
