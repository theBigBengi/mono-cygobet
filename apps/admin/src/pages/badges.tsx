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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { badgesService } from "@/services/badges.service";
import type { AdminBadgeItem } from "@repo/types";
import { Pencil, Users, Award } from "lucide-react";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

const CRITERIA_OPTIONS = [
  { value: "all", label: "All Criteria" },
  { value: "participation", label: "Participation" },
  { value: "top_n", label: "Top N" },
  { value: "exact_predictions", label: "Exact Predictions" },
  { value: "custom", label: "Custom" },
];

function criteriaLabel(type: string, value: number): string {
  switch (type) {
    case "participation":
      return "Participation";
    case "top_n":
      return `Top ${value}`;
    case "exact_predictions":
      return `${value}+ Exact`;
    case "custom":
      return "Custom";
    default:
      return type;
  }
}

function BadgeIcon({ icon }: { icon: string }) {
  if (icon.startsWith("http") || icon.startsWith("/")) {
    return (
      <img
        src={icon}
        alt=""
        className="h-8 w-8 rounded object-cover"
      />
    );
  }
  return <span className="text-2xl">{icon}</span>;
}

export default function BadgesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [criteriaFilter, setCriteriaFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const perPage = 20;

  const [editingBadge, setEditingBadge] = React.useState<AdminBadgeItem | null>(null);
  const [earnedBadge, setEarnedBadge] = React.useState<AdminBadgeItem | null>(null);
  const [earnedPage, setEarnedPage] = React.useState(1);

  // Edit form state
  const [editForm, setEditForm] = React.useState({
    name: "",
    description: "",
    icon: "",
    criteriaType: "",
    criteriaValue: 1,
  });

  // Fetch badges list
  const {
    data: badgesData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: [
      "badges",
      page,
      perPage,
      search,
      criteriaFilter === "all" ? undefined : criteriaFilter,
    ],
    queryFn: () =>
      badgesService.list({
        page,
        perPage,
        search: search || undefined,
        criteriaType: criteriaFilter === "all" ? undefined : criteriaFilter,
      }),
  });

  // Fetch earned users
  const { data: earnedData, isLoading: earnedLoading } = useQuery({
    queryKey: ["badges", earnedBadge?.id, "earned", earnedPage],
    queryFn: () => badgesService.listEarned(earnedBadge!.id, earnedPage, 20),
    enabled: !!earnedBadge,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({
      badgeId,
      body,
    }: {
      badgeId: number;
      body: {
        name?: string;
        description?: string;
        icon?: string;
        criteriaType?: string;
        criteriaValue?: number;
      };
    }) => badgesService.update(badgeId, body),
    onSuccess: () => {
      toast.success("Badge updated successfully");
      setEditingBadge(null);
      queryClient.invalidateQueries({ queryKey: ["badges"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to update badge", { description: error.message });
    },
  });

  // Award mutation
  const awardMutation = useMutation({
    mutationFn: (badgeId: number) => badgesService.award(badgeId),
    onSuccess: (res) => {
      toast.success(`${res.data.awarded} badges awarded`);
      queryClient.invalidateQueries({ queryKey: ["badges"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to award badge", { description: error.message });
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => badgesService.uploadImage(file),
    onSuccess: (res) => {
      setEditForm((f) => ({ ...f, icon: res.data.url }));
      toast.success("Image uploaded");
    },
    onError: (error: Error) => {
      toast.error("Upload failed", { description: error.message });
    },
  });

  const handleEdit = (badge: AdminBadgeItem) => {
    setEditingBadge(badge);
    setEditForm({
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      criteriaType: badge.criteriaType,
      criteriaValue: badge.criteriaValue,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBadge) return;

    const body: Record<string, unknown> = {};
    if (editForm.name !== editingBadge.name) body.name = editForm.name;
    if (editForm.description !== editingBadge.description)
      body.description = editForm.description;
    if (editForm.icon !== editingBadge.icon) body.icon = editForm.icon;
    if (editForm.criteriaType !== editingBadge.criteriaType)
      body.criteriaType = editForm.criteriaType;
    if (editForm.criteriaValue !== editingBadge.criteriaValue)
      body.criteriaValue = editForm.criteriaValue;

    if (Object.keys(body).length === 0) {
      toast.info("No changes to save");
      return;
    }

    updateMutation.mutate({ badgeId: editingBadge.id, body });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const badges = badgesData?.data ?? [];
  const total = badgesData?.pagination?.totalItems ?? 0;
  const totalPages = badgesData?.pagination?.totalPages ?? 1;

  const earnedEntries = earnedData?.data ?? [];
  const earnedTotal = earnedData?.pagination?.totalItems ?? 0;
  const earnedTotalPages = earnedData?.pagination?.totalPages ?? 1;

  return (
    <div className="h-full w-full p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <Label htmlFor="badge-search">Search</Label>
                <Input
                  id="badge-search"
                  placeholder="Search by badge name..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="w-full sm:w-48">
                <Label htmlFor="criteria">Criteria Type</Label>
                <Select
                  value={criteriaFilter}
                  onValueChange={(value) => {
                    setCriteriaFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger id="criteria">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRITERIA_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badges Table */}
        <Card>
          <CardHeader>
            <CardTitle>Badges ({total})</CardTitle>
            <CardDescription>
              Showing {badges.length} of {total} badges across all groups
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : badges.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No badges found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Icon</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Group
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Criteria
                      </TableHead>
                      <TableHead>Earned</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {badges.map((badge) => (
                      <TableRow key={badge.id}>
                        <TableCell>
                          <BadgeIcon icon={badge.icon} />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{badge.name}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {badge.description}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[150px]">
                              {badge.groupName}
                            </span>
                            <Badge
                              variant={
                                badge.groupStatus === "active"
                                  ? "default"
                                  : badge.groupStatus === "ended"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {badge.groupStatus}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {criteriaLabel(
                            badge.criteriaType,
                            badge.criteriaValue
                          )}
                        </TableCell>
                        <TableCell>{badge.earnedCount}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(badge)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEarnedBadge(badge);
                                setEarnedPage(1);
                              }}
                              title="View Earned"
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => awardMutation.mutate(badge.id)}
                              disabled={
                                badge.groupStatus !== "ended" ||
                                awardMutation.isPending
                              }
                              title={
                                badge.groupStatus !== "ended"
                                  ? "Group must be ended to award"
                                  : "Award badge"
                              }
                            >
                              <Award className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
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

        {/* Edit Badge Sheet */}
        <Sheet
          open={!!editingBadge}
          onOpenChange={(open) => !open && setEditingBadge(null)}
        >
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Edit Badge</SheetTitle>
              <SheetDescription>
                Update badge details. Changes apply immediately.
              </SheetDescription>
            </SheetHeader>
            {editingBadge && (
              <form onSubmit={handleEditSubmit} className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <div className="flex items-center gap-3">
                    <BadgeIcon icon={editForm.icon} />
                    <Input
                      value={editForm.icon}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, icon: e.target.value }))
                      }
                      placeholder="Emoji or URL"
                      className="flex-1"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="icon-upload"
                      className="text-xs text-muted-foreground cursor-pointer hover:underline"
                    >
                      Or upload an image
                    </Label>
                    <Input
                      id="icon-upload"
                      type="file"
                      accept="image/*"
                      className="mt-1"
                      onChange={handleFileChange}
                      disabled={uploadMutation.isPending}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-criteria-type">Criteria Type</Label>
                  <Select
                    value={editForm.criteriaType}
                    onValueChange={(value) =>
                      setEditForm((f) => ({ ...f, criteriaType: value }))
                    }
                  >
                    <SelectTrigger id="edit-criteria-type">
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
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-criteria-value">Criteria Value</Label>
                  <Input
                    id="edit-criteria-value"
                    type="number"
                    min={1}
                    value={editForm.criteriaValue}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        criteriaValue: Number(e.target.value) || 1,
                      }))
                    }
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditingBadge(null)}
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

        {/* Earned Users Dialog */}
        <Dialog
          open={!!earnedBadge}
          onOpenChange={(open) => !open && setEarnedBadge(null)}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Earned: {earnedBadge?.name}
              </DialogTitle>
              <DialogDescription>
                {earnedTotal} user{earnedTotal !== 1 ? "s" : ""} earned this
                badge
              </DialogDescription>
            </DialogHeader>
            {earnedLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : earnedEntries.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No users have earned this badge yet
              </div>
            ) : (
              <>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Earned At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {earnedEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{entry.userName || "—"}</TableCell>
                          <TableCell className="text-sm">
                            {entry.userEmail}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateTime(entry.earnedAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {earnedTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <div className="text-xs text-muted-foreground">
                      {earnedPage}/{earnedTotalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEarnedPage((p) => Math.max(1, p - 1))
                        }
                        disabled={earnedPage === 1}
                      >
                        Prev
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEarnedPage((p) =>
                            Math.min(earnedTotalPages, p + 1)
                          )
                        }
                        disabled={earnedPage >= earnedTotalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
