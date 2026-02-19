import { useLocation } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getRouteLabel } from "@/utils/breadcrumbs";

/**
 * Admin header component with page title and sidebar trigger.
 * Accepts a portalRef callback so pages can render actions into the header.
 */
export function AdminHeader({
  portalRef,
}: {
  portalRef: (el: HTMLDivElement | null) => void;
}) {
  const location = useLocation();

  return (
    <header className="bg-background flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className="text-lg font-semibold tracking-tight">
        {getRouteLabel(location.pathname)}
      </h1>
      <div ref={portalRef} className="ml-auto flex items-center gap-2" />
    </header>
  );
}

