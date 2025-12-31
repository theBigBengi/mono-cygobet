import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DiffFilter = "all" | "missing" | "mismatch" | "extra" | "ok";

interface TableControlsProps {
  searchPlaceholder?: string;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  showDiffFilter?: boolean;
  diffFilter?: DiffFilter;
  onDiffFilterChange?: (filter: DiffFilter) => void;
}

export function TableControls({
  searchPlaceholder = "Search...",
  globalFilter,
  onGlobalFilterChange,
  showDiffFilter = false,
  diffFilter = "all",
  onDiffFilterChange,
}: TableControlsProps) {
  return (
    <div className="flex-shrink-0 flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
      <Input
        placeholder={searchPlaceholder}
        value={globalFilter}
        onChange={(e) => onGlobalFilterChange(e.target.value)}
        className="max-w-sm h-7 sm:h-9 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1"
      />
      {showDiffFilter && onDiffFilterChange && (
        <Select value={diffFilter} onValueChange={onDiffFilterChange}>
          <SelectTrigger className="w-[120px] sm:w-[180px] h-7 sm:h-9 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="missing">Only Missing</SelectItem>
            <SelectItem value="mismatch">Only Mismatch</SelectItem>
            <SelectItem value="extra">Only Extra</SelectItem>
            <SelectItem value="ok">Only OK</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
