/**
 * User Settings Page
 */

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  AdminMeResponse,
  AdminNotificationSettings,
} from "@repo/types/http/admin";
import { useAdminAuth } from "@/auth";
import { apiGet, apiPost } from "@/lib/adminApi";
import { useNotificationSettings } from "@/hooks/use-settings";
import { settingsService } from "@/services/settings.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Bell, Lock } from "lucide-react";

type UserProfile = AdminMeResponse["data"];

interface UpdateProfileBody {
  name?: string | null;
}

interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function UserSettingsContent() {
  const { me } = useAdminAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await apiGet<AdminMeResponse>("/admin/auth/me");
      return res.data;
    },
    enabled: !!me,
  });

  const [name, setName] = React.useState(me?.name ?? "");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  React.useEffect(() => {
    if (profile?.name !== undefined) {
      setName(profile.name ?? "");
    }
  }, [profile]);

  // Notification settings
  const { data: notifData, isLoading: notifLoading } =
    useNotificationSettings();
  const notifSettings = notifData?.data ?? null;

  const [slackWebhookUrl, setSlackWebhookUrl] = React.useState("");
  const [slackEnabled, setSlackEnabled] = React.useState(false);
  const [slackSeverityThreshold, setSlackSeverityThreshold] = React.useState<
    "critical" | "warning" | "all"
  >("warning");

  React.useEffect(() => {
    if (notifSettings) {
      setSlackWebhookUrl(notifSettings.slackWebhookUrl ?? "");
      setSlackEnabled(notifSettings.slackEnabled);
      setSlackSeverityThreshold(notifSettings.slackSeverityThreshold);
    }
  }, [notifSettings]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileBody) => {
      return apiPost<{ status: string; data: UserProfile; message: string }>(
        "/admin/auth/profile",
        data
      );
    },
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["admin-auth"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  const updateNotifMutation = useMutation({
    mutationFn: (data: Partial<AdminNotificationSettings>) =>
      settingsService.updateNotificationSettings(data),
    onSuccess: () => {
      toast.success("Notification settings updated");
      queryClient.invalidateQueries({
        queryKey: ["admin-settings", "notifications"],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update notification settings");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordBody) => {
      return apiPost<{ status: string; message: string }>(
        "/admin/auth/change-password",
        {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }
      );
    },
    onSuccess: () => {
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to change password");
    },
  });

  const handleUpdateName = (e: React.FormEvent) => {
    e.preventDefault();
    if (name === profile?.name) {
      toast.info("No changes to save");
      return;
    }
    updateProfileMutation.mutate({ name: name.trim() || undefined });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
      confirmPassword,
    });
  };

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    updateNotifMutation.mutate({
      slackWebhookUrl: slackWebhookUrl.trim() || null,
      slackEnabled,
      slackSeverityThreshold,
    });
  };

  const notifDirty =
    notifSettings &&
    (slackWebhookUrl !== (notifSettings.slackWebhookUrl ?? "") ||
      slackEnabled !== notifSettings.slackEnabled ||
      slackSeverityThreshold !== notifSettings.slackSeverityThreshold);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
        {/* ── Profile ── */}
        <section className="rounded-lg border">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Profile</h2>
          </div>
          <div className="p-4 space-y-4">
            {/* Read-only info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Email</span>
                <p className="font-medium truncate">
                  {profile?.email ?? me?.email ?? "—"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Role</span>
                <p className="font-medium capitalize">
                  {profile?.role ?? me?.role ?? "—"}
                </p>
              </div>
              {profile?.lastLoginAt && (
                <div>
                  <span className="text-muted-foreground text-xs">
                    Last login
                  </span>
                  <p className="font-medium">
                    {new Date(profile.lastLoginAt).toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Editable name */}
            <form onSubmit={handleUpdateName} className="flex items-end gap-2">
              <div className="flex-1 grid gap-1.5">
                <Label htmlFor="name" className="text-xs">
                  Display name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="h-9"
                />
              </div>
              <Button
                type="submit"
                size="sm"
                className="h-9"
                disabled={
                  updateProfileMutation.isPending || name === profile?.name
                }
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </form>
          </div>
        </section>

        {/* ── Notifications ── */}
        <section className="rounded-lg border">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Notifications</h2>
          </div>
          <div className="p-4">
            {notifLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : (
              <form
                onSubmit={handleSaveNotifications}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="slack-enabled" className="text-sm">
                      Slack alerts
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Send notifications to a Slack channel
                    </p>
                  </div>
                  <Switch
                    id="slack-enabled"
                    checked={slackEnabled}
                    onCheckedChange={setSlackEnabled}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="slack-webhook" className="text-xs">
                      Webhook URL
                    </Label>
                    <Input
                      id="slack-webhook"
                      type="url"
                      value={slackWebhookUrl}
                      onChange={(e) => setSlackWebhookUrl(e.target.value)}
                      placeholder="https://hooks.slack.com/services/..."
                      disabled={!slackEnabled}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="severity-threshold" className="text-xs">
                      Severity
                    </Label>
                    <Select
                      value={slackSeverityThreshold}
                      onValueChange={(v) =>
                        setSlackSeverityThreshold(
                          v as "critical" | "warning" | "all"
                        )
                      }
                      disabled={!slackEnabled}
                    >
                      <SelectTrigger
                        id="severity-threshold"
                        className="h-9 w-full sm:w-[160px] text-sm"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">Critical only</SelectItem>
                        <SelectItem value="warning">
                          Critical + Warning
                        </SelectItem>
                        <SelectItem value="all">All levels</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    className="h-9"
                    disabled={updateNotifMutation.isPending || !notifDirty}
                  >
                    {updateNotifMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* ── Security ── */}
        <section className="rounded-lg border">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Security</h2>
          </div>
          <div className="p-4">
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="current-password" className="text-xs">
                    Current password
                  </Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-9"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="new-password" className="text-xs">
                    New password
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={8}
                    className="h-9"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="confirm-password" className="text-xs">
                    Confirm password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={8}
                    className="h-9"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum 8 characters
              </p>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  className="h-9"
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending
                    ? "Changing..."
                    : "Change Password"}
                </Button>
              </div>
            </form>
          </div>
        </section>
      </div>
  );
}
