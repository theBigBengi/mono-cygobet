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
import { teamsService } from "@/services/teams.service";
import type { AdminTeamsListResponse } from "@repo/types";
import { Pencil, Search, X } from "lucide-react";

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
          <h1 className="text-3xl font-bold">Teams</h1>
          <p className="text-muted-foreground">
            Manage team names, short codes, and brand colors
          </p>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by team name or short code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearch("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Teams Table */}
        <Card>
          <CardHeader>
            <CardTitle>Teams ({totalItems})</CardTitle>
            <CardDescription>
              {debouncedSearch
                ? `Search results for "${debouncedSearch}"`
                : `Page ${page} of ${totalPages}`}
            </CardDescription>
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Logo</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-24">Code</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead className="w-32">Colors</TableHead>
                      <TableHead className="w-20 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teams.map((team) => (
                      <TableRow key={team.id}>
                        <TableCell>
                          {team.imagePath ? (
                            <img
                              src={team.imagePath}
                              alt=""
                              className="h-8 w-8 object-contain"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded bg-muted" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {team.name}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {team.shortCode || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {team.country?.name || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {team.primaryColor && (
                              <div
                                className="w-6 h-6 rounded border border-border"
                                style={{ backgroundColor: team.primaryColor }}
                                title={`Primary: ${team.primaryColor}`}
                              />
                            )}
                            {team.secondaryColor && (
                              <div
                                className="w-6 h-6 rounded border border-border"
                                style={{
                                  backgroundColor: team.secondaryColor,
                                }}
                                title={`Secondary: ${team.secondaryColor}`}
                              />
                            )}
                            {team.tertiaryColor && (
                              <div
                                className="w-6 h-6 rounded border border-border"
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
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
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
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || isFetching}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || isFetching}
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
          <SheetContent className="sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Edit Team</SheetTitle>
              <SheetDescription>
                Update team details and brand colors
              </SheetDescription>
            </SheetHeader>

            {editingTeam && (
              <form onSubmit={handleUpdateSubmit} className="space-y-6 mt-6">
                {/* Team Logo Preview */}
                {editingTeam.imagePath && (
                  <div className="flex justify-center">
                    <img
                      src={editingTeam.imagePath}
                      alt=""
                      className="h-20 w-20 object-contain"
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
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={updateForm.primaryColor || "#000000"}
                      onChange={(e) =>
                        setUpdateForm((f) => ({
                          ...f,
                          primaryColor: e.target.value,
                        }))
                      }
                      className="w-12 h-10 rounded border border-input cursor-pointer"
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
                      className="flex-1 font-mono"
                    />
                    {updateForm.primaryColor && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
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
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={updateForm.secondaryColor || "#FFFFFF"}
                      onChange={(e) =>
                        setUpdateForm((f) => ({
                          ...f,
                          secondaryColor: e.target.value,
                        }))
                      }
                      className="w-12 h-10 rounded border border-input cursor-pointer"
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
                      className="flex-1 font-mono"
                    />
                    {updateForm.secondaryColor && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
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
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={updateForm.tertiaryColor || "#CCCCCC"}
                      onChange={(e) =>
                        setUpdateForm((f) => ({
                          ...f,
                          tertiaryColor: e.target.value,
                        }))
                      }
                      className="w-12 h-10 rounded border border-input cursor-pointer"
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
                      className="flex-1 font-mono"
                    />
                    {updateForm.tertiaryColor && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
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
