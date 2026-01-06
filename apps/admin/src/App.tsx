import * as React from "react";
import { Routes, Route, useLocation, Outlet } from "react-router-dom";
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
import JobsPage from "@/pages/jobs";
import LoginPage from "@/pages/login";
import { Button } from "@/components/ui/button";
import { AdminGuard } from "@/auth/AdminGuard";
import { useAdminAuth } from "@/auth/useAdminAuth";

function AdminLayout() {
  const location = useLocation();
  const { me, logout } = useAdminAuth();

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
                    : location.pathname === "/jobs"
                      ? "Jobs"
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

          <div className="ml-auto flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              Hello {me?.name ?? me?.email ?? "Admin"}
            </div>
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              Logout
            </Button>
          </div>
        </header>
        <div className="flex flex-1 flex-col overflow-hidden min-h-0">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}

function App() {
  const { bootstrap } = useAdminAuth();

  React.useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <AdminGuard>
            <AdminLayout />
          </AdminGuard>
        }
      >
        <Route path="/" element={<SyncCenterPage />} />
        <Route path="/sync-center" element={<SyncCenterPage />} />
        <Route path="/countries" element={<CountriesPage />} />
        <Route path="/leagues" element={<LeaguesPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/seasons" element={<SeasonsPage />} />
        <Route path="/bookmakers" element={<BookmakersPage />} />
        <Route path="/odds" element={<OddsPage />} />
        <Route path="/fixtures" element={<FixturesPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route
          path="*"
          element={
            <div className="p-6">
              <h1>Page not found</h1>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
