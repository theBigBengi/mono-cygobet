/**
 * Settings Page
 * 
 * Provides system and user settings management with tabbed interface.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SystemSettingsTab } from "@/components/settings/SystemSettingsTab";
import { UserSettingsTab } from "@/components/settings/UserSettingsTab";

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage system and user settings
        </p>
      </div>

      <Tabs defaultValue="user" className="space-y-4">
        <TabsList>
          <TabsTrigger value="user">User</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="user" className="space-y-4">
          <UserSettingsTab />
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <SystemSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

