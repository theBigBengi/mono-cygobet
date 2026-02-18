/**
 * League Order Settings Page
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { GripVertical, Plus, Trash2, Check, Search, X, Loader2, ChevronsUpDown } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useLeagueOrderSettings, useUpdateLeagueOrderSettings } from "@/hooks/use-settings";
import { leaguesService } from "@/services/leagues.service";
import { countriesService } from "@/services/countries.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const MIN_SEARCH_LENGTH = 2;
const DEBOUNCE_MS = 400;
const PER_PAGE = 50;

type League = {
  id: number;
  name: string;
  imagePath: string | null;
  country: { id: number; name: string } | null;
};

function useDebounce<T>(value: T, delay: number, minLength?: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  React.useEffect(() => {
    if (minLength !== undefined && typeof value === "string" && value.length > 0 && value.length < minLength) {
      setDebouncedValue("" as T);
      return;
    }
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay, minLength]);
  return debouncedValue;
}

function SortableLeagueItem({ league, index, onRemove }: { league: League; index: number; onRemove: (id: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: league.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 ${isDragging ? "opacity-50 shadow-lg z-50" : ""}`}
    >
      <span className="text-xs text-muted-foreground w-5 text-center">{index + 1}</span>
      <button className="cursor-grab touch-none text-muted-foreground hover:text-foreground" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      {league.imagePath && <img src={league.imagePath} alt="" className="h-5 w-5 rounded object-contain" />}
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{league.name}</p>
      </div>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => onRemove(league.id)}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function AvailableLeagueItem({ league, isSelected, onToggle }: { league: League; isSelected: boolean; onToggle: (league: League) => void }) {
  return (
    <button
      onClick={() => onToggle(league)}
      className={`flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors ${
        isSelected ? "border-primary bg-primary/5" : "hover:bg-accent"
      }`}
    >
      {league.imagePath && <img src={league.imagePath} alt="" className="h-5 w-5 rounded object-contain" />}
      <span className="flex-1 text-sm truncate">{league.name}</span>
      {isSelected ? <Check className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-muted-foreground" />}
    </button>
  );
}

export default function LeagueOrderSettingsPage() {
  const { data: settingsData, isLoading: settingsLoading } = useLeagueOrderSettings();
  const updateMutation = useUpdateLeagueOrderSettings();

  const [selectedLeagues, setSelectedLeagues] = React.useState<League[]>([]);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [countryFilter, setCountryFilter] = React.useState<string>("all");
  const [countryOpen, setCountryOpen] = React.useState(false);

  const debouncedSearch = useDebounce(searchQuery, DEBOUNCE_MS, MIN_SEARCH_LENGTH);

  const { data: countriesData } = useQuery({
    queryKey: ["countries-list"],
    queryFn: () => countriesService.getFromDb({ perPage: 300 }),
    staleTime: 5 * 60 * 1000,
  });

  const countries = React.useMemo(() => {
    return (countriesData?.data ?? []).map((c) => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [countriesData]);

  const selectedCountryId = React.useMemo(() => {
    if (countryFilter === "all") return undefined;
    return countries.find((c) => c.name === countryFilter)?.id;
  }, [countryFilter, countries]);

  const { data: totalCountData } = useQuery({
    queryKey: ["leagues-total-count"],
    queryFn: () => leaguesService.getFromDb({ perPage: 1 }),
    staleTime: 5 * 60 * 1000,
  });

  const totalInDb = totalCountData?.pagination?.totalItems ?? 0;

  const { data: leaguesData, isLoading: leaguesLoading, isFetching } = useQuery({
    queryKey: ["leagues-filtered", { search: debouncedSearch, countryId: selectedCountryId }],
    queryFn: () => leaguesService.getFromDb({ perPage: PER_PAGE, search: debouncedSearch || undefined, countryId: selectedCountryId }),
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });

  const displayed = leaguesData?.data?.length ?? 0;
  const total = leaguesData?.pagination?.totalItems ?? 0;

  const availableLeagues = React.useMemo(() => {
    return (leaguesData?.data ?? []).map((l) => ({
      id: l.id,
      name: l.name,
      imagePath: l.imagePath,
      country: l.country ? { id: l.country.id, name: l.country.name } : null,
    }));
  }, [leaguesData]);

  const selectedIds = settingsData?.data?.defaultLeagueOrder ?? [];
  const { data: selectedLeaguesData } = useQuery({
    queryKey: ["leagues-selected", selectedIds],
    queryFn: async () => {
      if (selectedIds.length === 0) return { data: [] };
      const response = await leaguesService.getFromDb({ perPage: 100 });
      return { data: response.data.filter((l) => selectedIds.includes(l.id)) };
    },
    enabled: selectedIds.length > 0 && !settingsLoading,
    staleTime: 5 * 60 * 1000,
  });

  React.useEffect(() => {
    if (settingsData?.data?.defaultLeagueOrder && selectedLeaguesData?.data) {
      const leagueMap = new Map(
        selectedLeaguesData.data.map((l) => [l.id, { id: l.id, name: l.name, imagePath: l.imagePath, country: l.country ? { id: l.country.id, name: l.country.name } : null }])
      );
      const ordered = settingsData.data.defaultLeagueOrder.map((id) => leagueMap.get(id)).filter((l): l is League => l !== undefined);
      setSelectedLeagues(ordered);
      setHasChanges(false);
    }
  }, [settingsData?.data?.defaultLeagueOrder, selectedLeaguesData?.data]);

  const selectedIdSet = React.useMemo(() => new Set(selectedLeagues.map((l) => l.id)), [selectedLeagues]);

  const sortedAvailableLeagues = React.useMemo(() => {
    return [...availableLeagues].sort((a, b) => (selectedIdSet.has(a.id) ? 0 : 1) - (selectedIdSet.has(b.id) ? 0 : 1));
  }, [availableLeagues, selectedIdSet]);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSelectedLeagues((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setHasChanges(true);
    }
  };

  const handleToggle = (league: League) => {
    if (selectedIdSet.has(league.id)) {
      setSelectedLeagues((items) => items.filter((i) => i.id !== league.id));
    } else {
      setSelectedLeagues((items) => [...items, league]);
    }
    setHasChanges(true);
  };

  const handleRemove = (id: number) => {
    setSelectedLeagues((items) => items.filter((i) => i.id !== id));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate(selectedLeagues.map((l) => l.id), {
      onSuccess: () => { toast.success("Saved"); setHasChanges(false); },
      onError: (error) => { toast.error(error.message || "Failed to save"); },
    });
  };

  if (settingsLoading) {
    return (
      <div className="w-full p-4 sm:p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          <Skeleton className="h-7 w-40" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 pb-8 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">League Order</h1>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Selected */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium">Selected ({selectedLeagues.length})</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {selectedLeagues.length === 0 ? (
                <p className="text-center py-6 text-sm text-muted-foreground">No leagues selected</p>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={selectedLeagues.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1.5 max-h-[60vh] lg:max-h-[calc(100vh-280px)] overflow-y-auto">
                      {selectedLeagues.map((league, index) => (
                        <SortableLeagueItem key={league.id} league={league} index={index} onRemove={handleRemove} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>

          {/* Available */}
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                  Available
                  {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                </CardTitle>
                <span className="text-xs text-muted-foreground">{totalInDb.toLocaleString()} total</span>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-8 h-8 text-sm"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full sm:w-[140px] h-8 justify-between font-normal text-sm">
                      <span className="truncate">{countryFilter === "all" ? "All Countries" : countryFilter}</span>
                      <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[180px] p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Search..." className="h-8 text-sm" />
                      <CommandList>
                        <CommandEmpty>Not found</CommandEmpty>
                        <CommandGroup>
                          <CommandItem value="all" onSelect={() => { setCountryFilter("all"); setCountryOpen(false); }}>
                            <Check className={`mr-2 h-3.5 w-3.5 ${countryFilter === "all" ? "opacity-100" : "opacity-0"}`} />
                            All Countries
                          </CommandItem>
                          {countries.map((c) => (
                            <CommandItem key={c.id} value={c.name} onSelect={() => { setCountryFilter(c.name); setCountryOpen(false); }}>
                              <Check className={`mr-2 h-3.5 w-3.5 ${countryFilter === c.name ? "opacity-100" : "opacity-0"}`} />
                              {c.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Info */}
              <p className="text-xs text-muted-foreground">
                {displayed} of {total.toLocaleString()}
                {total > PER_PAGE && <span className="text-amber-600"> (filter for more)</span>}
              </p>

              {/* List */}
              <div className="max-h-[60vh] lg:max-h-[calc(100vh-340px)] overflow-y-auto space-y-1.5">
                {leaguesLoading ? (
                  <div className="space-y-1.5">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-9" />)}</div>
                ) : sortedAvailableLeagues.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">No leagues found</p>
                ) : (
                  sortedAvailableLeagues.map((league) => (
                    <AvailableLeagueItem key={league.id} league={league} isSelected={selectedIdSet.has(league.id)} onToggle={handleToggle} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
