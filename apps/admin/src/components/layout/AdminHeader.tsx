import { useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getRouteLabel } from "@/utils/breadcrumbs";
import type { HeaderTitleConfig } from "@/contexts/header-title";

/**
 * Admin header component with page title and sidebar trigger.
 * Accepts a portalRef callback so pages can render actions into the header.
 * Accepts an optional titleConfig to override the default route-based title.
 */
export function AdminHeader({
  portalRef,
  titleConfig,
}: {
  portalRef: (el: HTMLDivElement | null) => void;
  titleConfig?: HeaderTitleConfig;
}) {
  const location = useLocation();

  return (
    <header className="bg-background flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      {titleConfig ? (
        <div className="flex items-center gap-1 min-w-0">
          {titleConfig.onBack && (
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={titleConfig.onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-lg font-semibold tracking-tight truncate">
            {titleConfig.title}
          </h1>
        </div>
      ) : (
        <h1 className="text-lg font-semibold tracking-tight">
          {getRouteLabel(location.pathname)}
        </h1>
      )}
      <div ref={portalRef} className="ml-auto flex items-center gap-2" />
    </header>
  );
}

