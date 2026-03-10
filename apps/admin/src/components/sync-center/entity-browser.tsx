import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CountriesTab } from "./countries-tab";
import { LeaguesTab } from "./leagues-tab";
import { SeasonsTab } from "./seasons-tab";
import { ReferenceDataTab } from "./reference-data-tab";

export function EntityBrowser() {
  return (
    <Card>
      <Tabs defaultValue="seasons">
        <CardHeader className="pb-0 p-3 sm:p-6 sm:pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-sm sm:text-base">Entity Browser</CardTitle>
          </div>
          <TabsList className="w-full sm:w-auto mt-2">
            <TabsTrigger value="countries" className="flex-1 sm:flex-none text-xs sm:text-sm">
              Countries
            </TabsTrigger>
            <TabsTrigger value="leagues" className="flex-1 sm:flex-none text-xs sm:text-sm">
              Leagues
            </TabsTrigger>
            <TabsTrigger value="seasons" className="flex-1 sm:flex-none text-xs sm:text-sm">
              Seasons
            </TabsTrigger>
            <TabsTrigger value="reference" className="flex-1 sm:flex-none text-xs sm:text-sm">
              Reference Data
            </TabsTrigger>
          </TabsList>
        </CardHeader>

        <CardContent className="p-3 sm:p-6">
          <TabsContent value="countries" className="mt-0">
            <CountriesTab />
          </TabsContent>
          <TabsContent value="leagues" className="mt-0">
            <LeaguesTab />
          </TabsContent>
          <TabsContent value="seasons" className="mt-0">
            <SeasonsTab />
          </TabsContent>
          <TabsContent value="reference" className="mt-0">
            <ReferenceDataTab />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
