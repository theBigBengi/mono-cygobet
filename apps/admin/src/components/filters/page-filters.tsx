"use client";

import * as React from "react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface PageFiltersProps {
  children?: React.ReactNode;
  showSubmit?: boolean;
  onSubmit?: () => void;
  submitDisabled?: boolean;
  submitTitle?: string;
  hideMobileButton?: boolean;
  drawerOpen?: boolean;
  onDrawerOpenChange?: (open: boolean) => void;
}

export function PageFilters({
  children,
  showSubmit = false,
  onSubmit,
  submitDisabled = false,
  submitTitle = "Apply filters",
  hideMobileButton = false,
  drawerOpen: controlledDrawerOpen,
  onDrawerOpenChange,
}: PageFiltersProps) {
  const [internalDrawerOpen, setInternalDrawerOpen] = React.useState(false);

  // Use controlled drawer state if provided, otherwise use internal
  const drawerOpen =
    controlledDrawerOpen !== undefined
      ? controlledDrawerOpen
      : internalDrawerOpen;
  const setDrawerOpen = (open: boolean) => {
    if (onDrawerOpenChange) {
      onDrawerOpenChange(open);
    } else {
      setInternalDrawerOpen(open);
    }
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit();
      setDrawerOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Desktop: Show filters inline */}
      <div className="hidden sm:flex flex-row gap-2 items-end">
        {children && (
          <div className="flex flex-row gap-2 flex-1">{children}</div>
        )}
        {showSubmit && onSubmit && (
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={submitDisabled}
            className="h-10 shrink-0"
          >
            Fetch
          </Button>
        )}
      </div>

      {/* Mobile: Show filter button and drawer */}
      {!hideMobileButton && children && (
        <div className="flex sm:hidden items-center gap-2">
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                title="Filters"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <div className="mx-auto w-full max-w-sm">
                <DrawerTitle asChild>
                  <VisuallyHidden.Root>Filters</VisuallyHidden.Root>
                </DrawerTitle>
                <DrawerDescription asChild>
                  <VisuallyHidden.Root>
                    Filter and search options
                  </VisuallyHidden.Root>
                </DrawerDescription>
                <div className="p-4 pb-0 space-y-4">
                  {children && (
                    <div className="flex flex-col gap-2">{children}</div>
                  )}
                </div>
                <DrawerFooter className="flex-col gap-2">
                  {showSubmit && onSubmit && (
                    <Button
                      variant="default"
                      onClick={handleSubmit}
                      disabled={submitDisabled}
                      className="w-full"
                    >
                      {submitTitle}
                    </Button>
                  )}
                  <DrawerClose asChild>
                    <Button variant="outline" className="w-full">
                      Close
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      )}
      {/* Mobile drawer without button (when hideMobileButton is true) */}
      {hideMobileButton && (
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent>
            <div className="mx-auto w-full max-w-sm">
              <DrawerTitle asChild>
                <VisuallyHidden.Root>Filters</VisuallyHidden.Root>
              </DrawerTitle>
              <DrawerDescription asChild>
                <VisuallyHidden.Root>
                  Filter and search options
                </VisuallyHidden.Root>
              </DrawerDescription>
              <div className="p-4 pb-0 space-y-4">
                {children && (
                  <div className="flex flex-col gap-2">{children}</div>
                )}
              </div>
              <DrawerFooter className="flex-col gap-2">
                {showSubmit && onSubmit && (
                  <Button
                    variant="default"
                    onClick={handleSubmit}
                    disabled={submitDisabled}
                    className="w-full"
                  >
                    {submitTitle}
                  </Button>
                )}
                <DrawerClose asChild>
                  <Button variant="outline" className="w-full">
                    Close
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
