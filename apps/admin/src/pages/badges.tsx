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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { badgesService } from "@/services/badges.service";
import type { AdminBadgeDefinitionItem } from "@repo/types";
import { Pencil, Plus, Trash2, Upload, X, Loader2 } from "lucide-react";

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

type BadgeFormData = {
  name: string;
  description: string;
  icon: string;
  criteriaType: string;
  criteriaValue: number;
};

const emptyForm: BadgeFormData = {
  name: "",
  description: "",
  icon: "🏆",
  criteriaType: "participation",
  criteriaValue: 1,
};

function BadgeForm({
  form,
  setForm,
  onSubmit,
  isSubmitting,
  onCancel,
  submitLabel,
}: {
  form: BadgeFormData;
  setForm: React.Dispatch<React.SetStateAction<BadgeFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  submitLabel: string;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const isUrl = form.icon.startsWith("http");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await badgesService.uploadImage(file);
      setForm((f) => ({ ...f, icon: result.data.url }));
    } catch (err: unknown) {
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 mt-6">
      <div className="space-y-2">
        <Label htmlFor="form-name">Name</Label>
        <Input
          id="form-name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Gold Badge"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="form-description">Description</Label>
        <Input
          id="form-description"
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          placeholder="Badge description"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Icon</Label>
        <div className="flex items-center gap-3">
          <BadgeIcon icon={form.icon} />
          {!isUrl && (
            <Input
              value={form.icon}
              onChange={(e) =>
                setForm((f) => ({ ...f, icon: e.target.value }))
              }
              placeholder="Emoji"
              className="w-20"
            />
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Upload className="mr-1 h-3 w-3" />
            )}
            {uploading ? "Uploading…" : "Upload"}
          </Button>
          {isUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setForm((f) => ({ ...f, icon: "🏆" }))}
              title="Remove image"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="form-criteria-type">Criteria Type</Label>
        <Select
          value={form.criteriaType}
          onValueChange={(value) =>
            setForm((f) => ({ ...f, criteriaType: value }))
          }
        >
          <SelectTrigger id="form-criteria-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="participation">Participation</SelectItem>
            <SelectItem value="top_n">Top N</SelectItem>
            <SelectItem value="exact_predictions">
              Exact Predictions
            </SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {(form.criteriaType === "top_n" ||
        form.criteriaType === "exact_predictions") && (
        <div className="space-y-2">
          <Label htmlFor="form-criteria-value">
            {form.criteriaType === "top_n"
              ? "How many top players?"
              : "Minimum exact predictions"}
          </Label>
          <Input
            id="form-criteria-value"
            type="number"
            min={1}
            value={form.criteriaValue}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                criteriaValue: Number(e.target.value) || 1,
              }))
            }
          />
        </div>
      )}
      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default function BadgesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const perPage = 20;

  const [creating, setCreating] = React.useState(false);
  const [editingDef, setEditingDef] =
    React.useState<AdminBadgeDefinitionItem | null>(null);
  const [deletingDef, setDeletingDef] =
    React.useState<AdminBadgeDefinitionItem | null>(null);

  const [createForm, setCreateForm] = React.useState<BadgeFormData>(emptyForm);
  const [editForm, setEditForm] = React.useState<BadgeFormData>(emptyForm);

  // Fetch badge definitions
  const {
    data: defsData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["badge-definitions", page, perPage, search],
    queryFn: () =>
      badgesService.list({
        page,
        perPage,
        search: search || undefined,
      }),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: () =>
      badgesService.create({
        name: createForm.name,
        description: createForm.description,
        icon: createForm.icon,
        criteriaType: createForm.criteriaType,
        criteriaValue: createForm.criteriaValue,
      }),
    onSuccess: () => {
      toast.success("Badge definition created");
      setCreating(false);
      setCreateForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["badge-definitions"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to create badge definition", {
        description: error.message,
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingDef) throw new Error("No definition selected");
      const body: Record<string, unknown> = {};
      if (editForm.name !== editingDef.name) body.name = editForm.name;
      if (editForm.description !== editingDef.description)
        body.description = editForm.description;
      if (editForm.icon !== editingDef.icon) body.icon = editForm.icon;
      if (editForm.criteriaType !== editingDef.criteriaType)
        body.criteriaType = editForm.criteriaType;
      if (editForm.criteriaValue !== editingDef.criteriaValue)
        body.criteriaValue = editForm.criteriaValue;

      if (Object.keys(body).length === 0) {
        return Promise.resolve(null);
      }
      return badgesService.update(editingDef.id, body);
    },
    onSuccess: (res) => {
      if (res === null) {
        toast.info("No changes to save");
        return;
      }
      toast.success("Badge definition updated");
      setEditingDef(null);
      queryClient.invalidateQueries({ queryKey: ["badge-definitions"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to update badge definition", {
        description: error.message,
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!deletingDef) throw new Error("No definition selected");
      return badgesService.delete(deletingDef.id);
    },
    onSuccess: () => {
      toast.success("Badge definition deleted");
      setDeletingDef(null);
      queryClient.invalidateQueries({ queryKey: ["badge-definitions"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to delete badge definition", {
        description: error.message,
      });
    },
  });

  const handleEdit = (def: AdminBadgeDefinitionItem) => {
    setEditingDef(def);
    setEditForm({
      name: def.name,
      description: def.description,
      icon: def.icon,
      criteriaType: def.criteriaType,
      criteriaValue: def.criteriaValue,
    });
  };

  const definitions = defsData?.data ?? [];
  const total = defsData?.pagination?.totalItems ?? 0;
  const totalPages = defsData?.pagination?.totalPages ?? 1;

  return (
    <div className="h-full w-full p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Badge Catalog</h1>
            <p className="text-sm text-muted-foreground">
              Manage global badge definitions. Groups pick from this catalog.
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Create Badge
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex-1">
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Definitions ({total})</CardTitle>
            <CardDescription>
              Showing {definitions.length} of {total} badge definitions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : definitions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No badge definitions found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Icon</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Criteria
                      </TableHead>
                      <TableHead>Used In</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {definitions.map((def) => (
                      <TableRow key={def.id}>
                        <TableCell>
                          <BadgeIcon icon={def.icon} />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{def.name}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {def.description}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {criteriaLabel(def.criteriaType, def.criteriaValue)}
                        </TableCell>
                        <TableCell>
                          {def.usageCount} group
                          {def.usageCount !== 1 ? "s" : ""}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(def)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingDef(def)}
                              disabled={def.usageCount > 0}
                              title={
                                def.usageCount > 0
                                  ? "Remove from all groups first"
                                  : "Delete"
                              }
                            >
                              <Trash2 className="h-4 w-4" />
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
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
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

        {/* Create Badge Sheet */}
        <Sheet
          open={creating}
          onOpenChange={(open) => {
            if (!open) {
              setCreating(false);
              setCreateForm(emptyForm);
            }
          }}
        >
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Create Badge Definition</SheetTitle>
              <SheetDescription>
                Add a new badge to the global catalog.
              </SheetDescription>
            </SheetHeader>
            <BadgeForm
              form={createForm}
              setForm={setCreateForm}
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              isSubmitting={createMutation.isPending}
              onCancel={() => {
                setCreating(false);
                setCreateForm(emptyForm);
              }}
              submitLabel="Create"
            />
          </SheetContent>
        </Sheet>

        {/* Edit Badge Sheet */}
        <Sheet
          open={!!editingDef}
          onOpenChange={(open) => !open && setEditingDef(null)}
        >
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Edit Badge Definition</SheetTitle>
              <SheetDescription>
                Update badge details. Changes apply to the catalog entry only.
              </SheetDescription>
            </SheetHeader>
            {editingDef && (
              <BadgeForm
                form={editForm}
                setForm={setEditForm}
                onSubmit={(e) => {
                  e.preventDefault();
                  updateMutation.mutate();
                }}
                isSubmitting={updateMutation.isPending}
                onCancel={() => setEditingDef(null)}
                submitLabel="Save Changes"
              />
            )}
          </SheetContent>
        </Sheet>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!deletingDef}
          onOpenChange={(open) => !open && setDeletingDef(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Badge Definition</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &ldquo;{deletingDef?.name}
                &rdquo;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeletingDef(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
