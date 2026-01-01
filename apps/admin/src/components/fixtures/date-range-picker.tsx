import * as React from "react";
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

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [tempDateRange, setTempDateRange] = React.useState<DateRange | undefined>(dateRange);

  // Update temp date range when prop changes (e.g., from external reset)
  React.useEffect(() => {
    setTempDateRange(dateRange);
  }, [dateRange]);

  const handleConfirm = () => {
    onDateRangeChange(tempDateRange);
    setOpen(false);
  };

  const handleCancel = () => {
    setTempDateRange(dateRange); // Reset to original
    setOpen(false);
  };

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
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
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={tempDateRange?.from || dateRange?.from}
              selected={tempDateRange}
              onSelect={(range) => {
                setTempDateRange(range as DateRange | undefined);
              }}
              numberOfMonths={1}
            />
            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleConfirm}
                disabled={!tempDateRange?.from || !tempDateRange?.to}
              >
                OK
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

