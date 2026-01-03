import { Routes, Route, useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import CountriesPage from "@/pages/countries";
import LeaguesPage from "@/pages/leagues";
import TeamsPage from "@/pages/teams";
import SeasonsPage from "@/pages/seasons";
import BookmakersPage from "@/pages/bookmakers";
import FixturesPage from "@/pages/fixtures";
import OddsPage from "@/pages/odds";
import SyncCenterPage from "@/pages/sync-center";

function App() {
  const location = useLocation();
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-svh flex flex-col overflow-hidden">
        <header className="bg-background flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {location.pathname === "/sync-center"
                    ? "Sync Center"
                    : location.pathname === "/leagues"
                      ? "Leagues"
                      : location.pathname === "/teams"
                        ? "Teams"
                        : location.pathname === "/seasons"
                          ? "Seasons"
                          : location.pathname === "/bookmakers"
                            ? "Bookmakers"
                            : location.pathname === "/odds"
                              ? "Odds"
                              : location.pathname === "/fixtures"
                                ? "Fixtures"
                                : "Countries"}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col overflow-hidden min-h-0">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<SyncCenterPage />} />
              <Route path="/sync-center" element={<SyncCenterPage />} />
              <Route path="/countries" element={<CountriesPage />} />
              <Route path="/leagues" element={<LeaguesPage />} />
              <Route path="/teams" element={<TeamsPage />} />
              <Route path="/seasons" element={<SeasonsPage />} />
              <Route path="/bookmakers" element={<BookmakersPage />} />
              <Route path="/odds" element={<OddsPage />} />
              <Route path="/fixtures" element={<FixturesPage />} />
              <Route
                path="*"
                element={
                  <div className="p-6">
                    <h1>Page not found</h1>
                  </div>
                }
              />
            </Routes>
          </ErrorBoundary>
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}

export default App;
