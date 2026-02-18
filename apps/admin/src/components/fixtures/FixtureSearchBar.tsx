import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FixtureSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function FixtureSearchBar({
  value,
  onChange,
  placeholder = "Search by fixture name...",
}: FixtureSearchBarProps) {
  const [localValue, setLocalValue] = useState(value);

  // Debounce: update parent after 400ms of no typing
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, 400);
    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  // Sync from parent (e.g. when cleared externally)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-8"
      />
      {localValue && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
          onClick={() => {
            setLocalValue("");
            onChange("");
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
