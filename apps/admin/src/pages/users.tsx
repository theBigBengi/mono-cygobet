/**
 * Users Management Page
 *
 * This page allows admin users to manage system users:
 * - List all users with pagination and filters
 * - Create new users
 * - Update existing users
 */

import * as React from "react";
import { HeaderActions } from "@/contexts/header-actions";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { usersService } from "@/services/users.service";
import type { AdminUsersListResponse } from "@repo/types";
import { Plus, Pencil, CheckCircle2 } from "lucide-react";

type User = AdminUsersListResponse["data"]["users"][number];

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<"admin" | "user" | "all">(
    "all"
  );
  const [page, setPage] = React.useState(0);
  const limit = 50;

  const [isCreateSheetOpen, setIsCreateSheetOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);

  // Form state for create
  const [createForm, setCreateForm] = React.useState({
    email: "",
    password: "",
    name: "",
    username: "",
    role: "user" as "admin" | "user",
  });

  // Form state for update
  const [updateForm, setUpdateForm] = React.useState({
    email: "",
    name: "",
    username: "",
    role: "user" as "admin" | "user",
    password: "",
  });

  // Fetch users
  const {
    data: usersData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: [
      "users",
      page,
      limit,
      roleFilter === "all" ? undefined : roleFilter,
      search,
    ],
    queryFn: () =>
      usersService.list({
        limit,
        offset: page * limit,
        role: roleFilter === "all" ? undefined : roleFilter,
        search: search || undefined,
      }),
  });

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: usersService.create,
    onSuccess: () => {
      toast.success("User created successfully");
      setIsCreateSheetOpen(false);
      setCreateForm({
        email: "",
        password: "",
        name: "",
        username: "",
        role: "user",
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to create user", {
        description: error.message,
      });
    },
  });

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: number;
      data: {
        email?: string;
        password?: string;
        name?: string | null;
        username?: string | null;
        role?: "admin" | "user";
      };
    }) => usersService.update(userId, data),
    onSuccess: () => {
      toast.success("User updated successfully");
      setEditingUser(null);
      setUpdateForm({
        email: "",
        name: "",
        username: "",
        role: "user",
        password: "",
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to update user", {
        description: error.message,
      });
    },
  });

  // Handle create form submit
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (createForm.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    createMutation.mutate({
      email: createForm.email,
      password: createForm.password,
      name: createForm.name || null,
      username: createForm.username || null,
      role: createForm.role,
    });
  };

  // Handle update form submit
  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const data: {
      email?: string;
      password?: string;
      name?: string | null;
      username?: string | null;
      role?: "admin" | "user";
    } = {};

    if (updateForm.email !== editingUser.email) {
      data.email = updateForm.email;
    }
    if (updateForm.name !== editingUser.name) {
      data.name = updateForm.name || null;
    }
    if (updateForm.username !== editingUser.username) {
      data.username = updateForm.username || null;
    }
    if (updateForm.role !== editingUser.role) {
      data.role = updateForm.role;
    }
    if (updateForm.password) {
      if (updateForm.password.length < 8) {
        toast.error("Password must be at least 8 characters");
        return;
      }
      data.password = updateForm.password;
    }

    if (Object.keys(data).length === 0) {
      toast.info("No changes to save");
      return;
    }

    updateMutation.mutate({ userId: editingUser.id, data });
  };

  // Open edit sheet
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setUpdateForm({
      email: user.email,
      name: user.name || "",
      username: user.username || "",
      role: user.role,
      password: "",
    });
  };

  const users = usersData?.data.users ?? [];
  const total = usersData?.data.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="h-full w-full p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <HeaderActions>
          <Button size="sm" onClick={() => setIsCreateSheetOpen(true)}>
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Create User</span>
          </Button>
        </HeaderActions>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search by email, name, or username..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                />
              </div>
              <div className="w-full sm:w-48">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={roleFilter}
                  onValueChange={(value) => {
                    setRoleFilter(value as typeof roleFilter);
                    setPage(0);
                  }}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({total})</CardTitle>
            <CardDescription>
              Showing {users.length} of {total} users
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="hidden lg:table-cell">ID</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="hidden md:table-cell">Name</TableHead>
                      <TableHead className="hidden lg:table-cell">Username</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden md:table-cell">Created</TableHead>
                      <TableHead className="hidden lg:table-cell">Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="w-10">
                          {user.image ? (
                            <img
                              src={user.image}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                              {(user.name?.[0] ?? user.email[0]).toUpperCase()}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell font-mono text-xs">
                          {user.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 max-w-[150px] sm:max-w-none">
                            <span className="truncate text-xs sm:text-sm">{user.email}</span>
                            {user.emailVerifiedAt && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{user.name || "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell">{user.username || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.role === "admin" ? "default" : "secondary"
                            }
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {formatDateTime(user.createdAt)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {formatDateTime(user.lastLoginAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(user)}
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 gap-2">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {page + 1}/{totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0 || isFetching}
                    className="h-8 sm:h-9"
                  >
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1 || isFetching}
                    className="h-8 sm:h-9"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create User Sheet */}
        <Sheet open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen}>
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Create User</SheetTitle>
              <SheetDescription>
                Create a new user account. The user will be able to log in with
                the provided credentials.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="create-email">Email *</Label>
                <Input
                  id="create-email"
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password">Password *</Label>
                <Input
                  id="create-password"
                  type="password"
                  required
                  minLength={8}
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, password: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-username">Username</Label>
                <Input
                  id="create-username"
                  maxLength={50}
                  value={createForm.username}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, username: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-role">Role</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(value) =>
                    setCreateForm((f) => ({
                      ...f,
                      role: value as "admin" | "user",
                    }))
                  }
                >
                  <SelectTrigger id="create-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsCreateSheetOpen(false)}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>

        {/* Edit User Sheet */}
        <Sheet
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
        >
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Edit User</SheetTitle>
              <SheetDescription>
                Update user information. Leave password empty to keep the
                current password.
              </SheetDescription>
            </SheetHeader>
            {editingUser && (
              <form onSubmit={handleUpdateSubmit} className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="update-email">Email *</Label>
                  <Input
                    id="update-email"
                    type="email"
                    required
                    value={updateForm.email}
                    onChange={(e) =>
                      setUpdateForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="update-password">New Password</Label>
                  <Input
                    id="update-password"
                    type="password"
                    minLength={8}
                    value={updateForm.password}
                    onChange={(e) =>
                      setUpdateForm((f) => ({ ...f, password: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to keep current password. Must be at least 8
                    characters if provided.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="update-name">Name</Label>
                  <Input
                    id="update-name"
                    value={updateForm.name}
                    onChange={(e) =>
                      setUpdateForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="update-username">Username</Label>
                  <Input
                    id="update-username"
                    maxLength={50}
                    value={updateForm.username}
                    onChange={(e) =>
                      setUpdateForm((f) => ({ ...f, username: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="update-role">Role</Label>
                  <Select
                    value={updateForm.role}
                    onValueChange={(value) =>
                      setUpdateForm((f) => ({
                        ...f,
                        role: value as "admin" | "user",
                      }))
                    }
                  >
                    <SelectTrigger id="update-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditingUser(null)}
                    disabled={updateMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? "Updating..." : "Update User"}
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
