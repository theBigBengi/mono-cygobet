/**
 * System Settings Tab
 * 
 * Provides system-wide configuration options.
 * This is a placeholder for future system settings.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SystemSettingsTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
          <CardDescription>
            Configure system-wide settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            System settings will be available here in the future.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

