import { useMemo } from "react";
import { Filter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Aircraft } from "@/types/aircraft";

export interface Filters {
  showAirborne: boolean;
  showGrounded: boolean;
  maxAltitudeM: number; // upper bound; UI value in meters
  country: string; // "all" or country name
}

export const DEFAULT_FILTERS: Filters = {
  showAirborne: true,
  showGrounded: true,
  maxAltitudeM: 15000,
  country: "all",
};

interface Props {
  filters: Filters;
  setFilters: (patch: Partial<Filters>) => void;
  aircraft: Aircraft[];
}

export function FiltersPanel({ filters, setFilters, aircraft }: Props) {
  const countries = useMemo(() => {
    const set = new Set<string>();
    for (const a of aircraft) set.add(a.originCountry);
    return Array.from(set).sort();
  }, [aircraft]);

  const active =
    !filters.showAirborne ||
    !filters.showGrounded ||
    filters.maxAltitudeM < 15000 ||
    filters.country !== "all";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="glass-panel rounded-xl border-glass-border h-10 w-10 relative"
          aria-label="Open filters"
        >
          <Filter className="h-4 w-4" />
          {active && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-accent shadow-glow" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="glass-panel w-80 space-y-5">
        <div>
          <h3 className="font-display text-sm font-semibold">Filters</h3>
          <p className="text-xs text-muted-foreground">Refine what's visible on the map.</p>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="airborne">Airborne</Label>
          <Switch
            id="airborne"
            checked={filters.showAirborne}
            onCheckedChange={(v) => setFilters({ showAirborne: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="ground">On the ground</Label>
          <Switch
            id="ground"
            checked={filters.showGrounded}
            onCheckedChange={(v) => setFilters({ showGrounded: v })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Max altitude</Label>
            <span className="text-xs text-muted-foreground tabular-nums">
              ≤ {Math.round(filters.maxAltitudeM).toLocaleString()} m
            </span>
          </div>
          <Slider
            value={[filters.maxAltitudeM]}
            min={0}
            max={15000}
            step={500}
            onValueChange={([v]) => setFilters({ maxAltitudeM: v })}
          />
        </div>

        <div className="space-y-2">
          <Label>Country of origin</Label>
          <Select value={filters.country} onValueChange={(v) => setFilters({ country: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="all">All countries</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setFilters(DEFAULT_FILTERS)}
        >
          Reset filters
        </Button>
      </PopoverContent>
    </Popover>
  );
}
