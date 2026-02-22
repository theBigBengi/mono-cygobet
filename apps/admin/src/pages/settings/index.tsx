/**
 * Settings Page – tabbed wrapper for General, League Order, Team Order
 */

import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserSettingsContent } from "./user";
import { LeagueOrderContent } from "./league-order";
import { TeamOrderContent } from "./team-order";

const TABS = {
  general: "general",
  leagues: "leagues",
  teams: "teams",
} as const;

type TabValue = (typeof TABS)[keyof typeof TABS];

const DEFAULT_TAB: TabValue = TABS.general;

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get("tab") as TabValue) || DEFAULT_TAB;

  const handleTabChange = (value: string) => {
    if (value === DEFAULT_TAB) {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: value }, { replace: true });
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto p-3 sm:p-6">
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value={TABS.general}>General</TabsTrigger>
          <TabsTrigger value={TABS.leagues}>League Order</TabsTrigger>
          <TabsTrigger value={TABS.teams}>Team Order</TabsTrigger>
        </TabsList>

        <TabsContent value={TABS.general}>
          <UserSettingsContent />
        </TabsContent>

        <TabsContent value={TABS.leagues}>
          <LeagueOrderContent />
        </TabsContent>

        <TabsContent value={TABS.teams}>
          <TeamOrderContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
