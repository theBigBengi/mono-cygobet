import { useState, useCallback } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { HeaderPortalProvider } from "@/contexts/header-actions";
import { HeaderTitleProvider, type HeaderTitleConfig } from "@/contexts/header-title";
import { AdminHeader } from "./AdminHeader";
import { useAdminSocket } from "@/hooks/use-admin-socket";

/**
 * Main admin layout with sidebar, header, and content area
 */
export function AdminLayout() {
  // Connect to Socket.IO for real-time alert updates
  useAdminSocket();

  const [headerPortal, setHeaderPortal] = useState<HTMLDivElement | null>(null);
  const [titleConfig, setTitleConfig] = useState<HeaderTitleConfig>(null);
  const stableSetTitleConfig = useCallback(
    (config: HeaderTitleConfig) => setTitleConfig(config),
    []
  );

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-svh flex flex-col overflow-hidden">
        <AdminHeader portalRef={setHeaderPortal} titleConfig={titleConfig} />
        <HeaderTitleProvider value={stableSetTitleConfig}>
          <HeaderPortalProvider value={headerPortal}>
            <div className="flex-1 overflow-y-auto min-h-0">
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </div>
          </HeaderPortalProvider>
        </HeaderTitleProvider>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}

