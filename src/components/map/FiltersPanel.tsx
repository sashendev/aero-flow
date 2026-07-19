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
          className="bg-surface-container/80 backdrop-blur-md border border-outline-variant/50 rounded shadow-lg h-10 w-10 relative text-on-surface-variant hover:text-primary hover:bg-surface-variant/50 transition-colors"
          aria-label="Open filters"
        >
          <Filter className="h-4 w-4" />
          {active && (
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="bg-surface-container/90 backdrop-blur-xl border border-outline-variant/30 w-80 space-y-5 text-on-surface">
        <div className="border-b border-outline-variant/30 pb-3 mb-2">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest text-xs">Filters</h3>
          <p className="text-xs text-on-surface-variant/70">Refine what's visible on the map.</p>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="airborne" className="text-on-surface text-xs font-medium">Airborne</Label>
          <Switch
            id="airborne"
            checked={filters.showAirborne}
            onCheckedChange={(v) => setFilters({ showAirborne: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="ground" className="text-on-surface text-xs font-medium">On the ground</Label>
          <Switch
            id="ground"
            checked={filters.showGrounded}
            onCheckedChange={(v) => setFilters({ showGrounded: v })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-on-surface text-xs font-medium">Max altitude</Label>
            <span className="text-xs text-on-surface-variant tabular-nums">
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
          <Label className="text-on-surface text-xs font-medium">Country of origin</Label>
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
