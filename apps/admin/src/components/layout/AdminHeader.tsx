import { useLocation } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/auth";
import { getRouteLabel } from "@/utils/breadcrumbs";

/**
 * Admin header component with breadcrumb, sidebar trigger, and user info
 */
export function AdminHeader() {
  const location = useLocation();
  const { me, logout } = useAdminAuth();

  return (
    <header className="bg-background flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{getRouteLabel(location.pathname)}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="hidden sm:block text-sm text-muted-foreground truncate max-w-[150px] lg:max-w-none">
          Hello {me?.name ?? me?.email ?? "Admin"}
        </div>
        <Button variant="outline" size="sm" onClick={() => void logout()}>
          Logout
        </Button>
      </div>
    </header>
  );
}

