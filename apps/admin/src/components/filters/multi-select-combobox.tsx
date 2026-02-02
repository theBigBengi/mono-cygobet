"use client";

import * as React from "react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";

export interface MultiSelectOption {
  value: string | number;
  label: string;
}

interface MultiSelectComboboxProps {
  options: MultiSelectOption[];
  selectedValues: (string | number)[];
  onSelectionChange: (values: (string | number)[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  /** When provided, parent drives options from async search; called when user types in the search input */
  onSearchChange?: (query: string) => void;
  /** Controlled search value for async options (use with onSearchChange) */
  searchValue?: string;
}

export function MultiSelectCombobox({
  options,
  selectedValues,
  onSelectionChange,
  placeholder = "Select items...",
  searchPlaceholder = "Search...",
  emptyMessage = "No items found.",
  className,
  disabled = false,
  onSearchChange,
  searchValue,
}: MultiSelectComboboxProps) {
  const isAsyncSearch = onSearchChange != null;
  const [open, setOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  // Detect mobile screen size
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleUnselect = (value: string | number) => {
    onSelectionChange(
      selectedValues.filter((v) => String(v) !== String(value))
    );
  };

  const handleSelect = (value: string | number) => {
    // Convert both to strings for comparison
    const valueStr = String(value);
    const isSelected = selectedValues.some((v) => String(v) === valueStr);

    if (isSelected) {
      handleUnselect(value);
    } else {
      onSelectionChange([...selectedValues, value]);
    }
    // Keep popover open for multi-select - user will click OK to close
  };

  const selectedOptions = options.filter((option) =>
    selectedValues.some((v) => String(v) === String(option.value))
  );

  // Common trigger button
  const triggerButton = (
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className={cn("w-full h-10 justify-between px-3", className)}
      disabled={disabled}
    >
      <div className="flex items-center gap-1.5 flex-1 text-left overflow-hidden">
        {selectedOptions.length === 0 ? (
          <span className="text-muted-foreground text-sm truncate">
            {placeholder}
          </span>
        ) : (
          <div className="flex items-center gap-1.5 flex-1 overflow-hidden">
            <Badge
              variant="secondary"
              className="text-xs py-0.5 px-2 h-6 flex items-center gap-1 shrink-0"
            >
              {selectedOptions.length} selected
            </Badge>
            {selectedOptions.slice(0, 2).map((option) => (
              <Badge
                key={option.value}
                variant="secondary"
                className="text-xs py-0.5 px-2 h-6 flex items-center gap-1 shrink-0"
              >
                <span className="max-w-[80px] truncate">{option.label}</span>
                <span
                  className="ml-0.5 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-secondary/80 transition-colors cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove ${option.label}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      handleUnselect(option.value);
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleUnselect(option.value);
                  }}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </span>
              </Badge>
            ))}
            {selectedOptions.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{selectedOptions.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );

  // Common content (options list)
  const optionsContent = (
    <>
      <Command {...(isAsyncSearch && { shouldFilter: false })}>
        <CommandInput
          placeholder={searchPlaceholder}
          {...(isAsyncSearch && {
            value: searchValue ?? "",
            onValueChange: onSearchChange,
          })}
        />
        <CommandList>
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          <CommandGroup>
            {options.map((option) => {
              const isSelected = selectedValues.some(
                (v) => String(v) === String(option.value)
              );
              return (
                <CommandItem
                  key={option.value}
                  value={String(option.value)}
                  keywords={[option.label]}
                  onSelect={(currentValue) => {
                    const selectedOption = options.find(
                      (opt) => String(opt.value) === currentValue
                    );
                    if (selectedOption) {
                      handleSelect(selectedOption.value);
                    }
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      isSelected ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerTitle asChild>
              <VisuallyHidden.Root>{placeholder}</VisuallyHidden.Root>
            </DrawerTitle>
            <DrawerDescription asChild>
              <VisuallyHidden.Root>
                Select one or more items from the list
              </VisuallyHidden.Root>
            </DrawerDescription>
            <div className="p-4 pb-0">{optionsContent}</div>
            <DrawerFooter className="flex-col gap-2">
              <Button
                variant="default"
                onClick={() => setOpen(false)}
                className="w-full"
              >
                OK
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" className="w-full">
                  Close
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        {optionsContent}
        <div className="border-t p-2 flex justify-end">
          <Button size="sm" onClick={() => setOpen(false)} className="h-8">
            OK
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
