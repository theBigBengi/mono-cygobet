/**
 * User Settings Page
 *
 * Allows users to:
 * - View and edit their name
 * - Change password
 * - View account information (email, role, last login)
 * - Configure notification preferences (Slack webhook, severity threshold)
 */

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AdminMeResponse, AdminNotificationSettings } from "@repo/types/http/admin";
import { useAdminAuth } from "@/auth";
import { apiGet, apiPost } from "@/lib/adminApi";
import { useNotificationSettings } from "@/hooks/use-settings";
import { settingsService } from "@/services/settings.service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Use the shared type from @repo/types
type UserProfile = AdminMeResponse["data"];

interface UpdateProfileBody {
  name?: string | null;
}

interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function UserSettingsPage() {
  const { me } = useAdminAuth();
  const queryClient = useQueryClient();

  // Fetch full user profile (including lastLoginAt)
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
  const { data: notifData, isLoading: notifLoading } = useNotificationSettings();
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
      toast.success("Profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      // Refresh auth context to update user name
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
      queryClient.invalidateQueries({ queryKey: ["admin-settings", "notifications"] });
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
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to change password");
    },
  });

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name === profile?.name) {
      toast.info("No changes to save");
      return;
    }
    updateProfileMutation.mutate({
      name: name.trim() || undefined,
    });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
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

  const handleSaveNotifications = async (e: React.FormEvent) => {
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
      <div className="h-full w-full p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                View your account information and activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input value={profile?.email ?? me?.email ?? ""} disabled />
                <p className="text-sm text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Role</Label>
                <Input value={profile?.role ?? me?.role ?? ""} disabled />
              </div>

              {profile?.lastLoginAt && (
                <div className="grid gap-2">
                  <Label>Last Login</Label>
                  <Input
                    value={
                      profile.lastLoginAt
                        ? new Date(profile.lastLoginAt).toLocaleString()
                        : "Never"
                    }
                    disabled
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Update Name */}
          <Card>
            <CardHeader>
              <CardTitle>Update Name</CardTitle>
              <CardDescription>Change your display name</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateName} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending || name === profile?.name}
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Name"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Separator />

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure Slack notifications for system alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notifLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <form onSubmit={handleSaveNotifications} className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="slack-enabled">Slack Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Send alert notifications to a Slack channel
                      </p>
                    </div>
                    <Switch
                      id="slack-enabled"
                      checked={slackEnabled}
                      onCheckedChange={setSlackEnabled}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="slack-webhook">Webhook URL</Label>
                    <Input
                      id="slack-webhook"
                      type="url"
                      value={slackWebhookUrl}
                      onChange={(e) => setSlackWebhookUrl(e.target.value)}
                      placeholder="https://hooks.slack.com/services/..."
                      disabled={!slackEnabled}
                    />
                    <p className="text-sm text-muted-foreground">
                      Create a Slack Incoming Webhook and paste the URL here
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="severity-threshold">Severity Threshold</Label>
                    <Select
                      value={slackSeverityThreshold}
                      onValueChange={(v) =>
                        setSlackSeverityThreshold(
                          v as "critical" | "warning" | "all"
                        )
                      }
                      disabled={!slackEnabled}
                    >
                      <SelectTrigger id="severity-threshold" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">
                          Critical only
                        </SelectItem>
                        <SelectItem value="warning">
                          Critical + Warning
                        </SelectItem>
                        <SelectItem value="all">
                          All (Critical + Warning + Info)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Choose which alert severity levels trigger Slack notifications
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={updateNotifMutation.isPending || !notifDirty}
                  >
                    {updateNotifMutation.isPending
                      ? "Saving..."
                      : "Save Notifications"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={8}
                  />
                  <p className="text-sm text-muted-foreground">
                    Password must be at least 8 characters
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={8}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  variant="default"
                >
                  {changePasswordMutation.isPending
                    ? "Changing Password..."
                    : "Change Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
