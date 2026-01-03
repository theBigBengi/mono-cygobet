import * as React from "react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}

type Preset = {
  label: string;
  getRange: () => DateRange;
};

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [tempDateRange, setTempDateRange] = React.useState<
    DateRange | undefined
  >(dateRange);

  // Detect mobile screen size
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Update temp date range when prop changes (e.g., from external reset)
  React.useEffect(() => {
    setTempDateRange(dateRange);
  }, [dateRange]);

  // Define presets
  const presets: Preset[] = React.useMemo(() => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const in3DaysEnd = new Date(today);
    in3DaysEnd.setDate(in3DaysEnd.getDate() + 3);
    in3DaysEnd.setHours(23, 59, 59, 999);

    const last3DaysStart = new Date(today);
    last3DaysStart.setDate(last3DaysStart.getDate() - 2); // 3 days total: today, yesterday, day before

    return [
      {
        label: "Yesterday",
        getRange: () => ({ from: yesterday, to: yesterdayEnd }),
      },
      {
        label: "Today",
        getRange: () => ({ from: today, to: todayEnd }),
      },
      {
        label: "Tomorrow",
        getRange: () => ({ from: tomorrow, to: tomorrowEnd }),
      },
      {
        label: "In 3 days",
        getRange: () => ({ from: today, to: in3DaysEnd }), // Today to 3 days from now
      },
      {
        label: "Last 3 days",
        getRange: () => ({ from: last3DaysStart, to: todayEnd }),
      },
    ];
  }, []);

  const handlePresetClick = (preset: Preset) => {
    const range = preset.getRange();
    setTempDateRange(range);
    onDateRangeChange(range);
    setOpen(false);
  };

  const handleConfirm = () => {
    onDateRangeChange(tempDateRange);
    setOpen(false);
  };

  const handleCancel = () => {
    setTempDateRange(dateRange); // Reset to original
    setOpen(false);
  };

  // Common trigger button
  const triggerButton = (
    <Button
      id="date"
      variant={"outline"}
      className={cn(
        "w-full h-10 justify-start text-left font-normal text-sm",
        !dateRange && "text-muted-foreground"
      )}
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {dateRange?.from ? (
        dateRange.to ? (
          <>
            {format(dateRange.from, "LLL dd, y")} -{" "}
            {format(dateRange.to, "LLL dd, y")}
          </>
        ) : (
          format(dateRange.from, "LLL dd, y")
        )
      ) : (
        <span>Pick a date range</span>
      )}
    </Button>
  );

  // Calendar content for desktop (popover)
  const renderPopoverContent = () => (
    <div className="p-3 max-w-[280px]">
      <Calendar
        mode="range"
        defaultMonth={tempDateRange?.from || dateRange?.from}
        selected={tempDateRange}
        onSelect={(range) => {
          setTempDateRange(range as DateRange | undefined);
        }}
        numberOfMonths={1}
        className="mx-auto"
      />
      {/* Presets */}
      <div className="flex justify-center gap-2 py-3 flex-wrap border-t">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => handlePresetClick(preset)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-3 border-t">
        <Button variant="outline" size="sm" onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleConfirm}
          disabled={!tempDateRange?.from || !tempDateRange?.to}
        >
          Done
        </Button>
      </div>
    </div>
  );

  // Calendar content for mobile (drawer)
  const renderDrawerContent = () => (
    <>
      <div className="pb-0">
        <Calendar
          mode="range"
          defaultMonth={tempDateRange?.from || dateRange?.from}
          selected={tempDateRange}
          onSelect={(range) => {
            setTempDateRange(range as DateRange | undefined);
          }}
          numberOfMonths={1}
          className="mx-auto"
        />

        {/* Presets */}
        <div className="flex justify-center gap-2 py-3 flex-wrap border-t">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => handlePresetClick(preset)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>
      <DrawerFooter className="flex-col gap-2 px-0 border-t">
        <Button
          variant="default"
          onClick={handleConfirm}
          disabled={!tempDateRange?.from || !tempDateRange?.to}
          className="w-full"
        >
          OK
        </Button>
        <DrawerClose asChild>
          <Button variant="outline" className="w-full" onClick={handleCancel}>
            Cancel
          </Button>
        </DrawerClose>
      </DrawerFooter>
    </>
  );

  if (isMobile) {
    return (
      <div className={cn("w-full", className)}>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
          <DrawerContent className="px-4">
            <DrawerTitle asChild>
              <VisuallyHidden.Root>Select date range</VisuallyHidden.Root>
            </DrawerTitle>
            <DrawerDescription asChild>
              <VisuallyHidden.Root>
                Choose a date range from the calendar or use a preset
              </VisuallyHidden.Root>
            </DrawerDescription>
            {renderDrawerContent()}
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          {renderPopoverContent()}
        </PopoverContent>
      </Popover>
    </div>
  );
}
