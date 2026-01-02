"use client";

import * as React from "react";
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
}: MultiSelectComboboxProps) {
  const [open, setOpen] = React.useState(false);

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
    // Keep popover open for multi-select
    setOpen(true);
  };

  const selectedOptions = options.filter((option) =>
    selectedValues.some((v) => String(v) === String(option.value))
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
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
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleUnselect(option.value);
                    }}
                  >
                    <span className="max-w-[80px] truncate">
                      {option.label}
                    </span>
                    <button
                      className="ml-0.5 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-secondary/80 transition-colors"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
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
                    </button>
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
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
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
                      // currentValue is the value prop (String(option.value))
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
      </PopoverContent>
    </Popover>
  );
}
