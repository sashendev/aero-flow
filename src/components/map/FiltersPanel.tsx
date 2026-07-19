import { useMemo } from "react";
import { Filter } from "lucide-react";
import type { Aircraft } from "@/types/aircraft";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

export interface Filters {
  showAirborne: boolean;
  showGrounded: boolean;
  maxAltitudeM: number;
  country: string;
}

// eslint-disable-next-line react-refresh/only-export-components
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
    return Array.from(new Set(aircraft.map((item) => item.originCountry))).sort();
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
          className="radar-button relative h-11 w-11"
          aria-label="Open filters"
        >
          <Filter className="h-4 w-4" />
          {active && (
            <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-yellow-300" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="radar-panel w-80 space-y-5 rounded-lg p-4">
        <div>
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">Filters</h3>
          <p className="mt-1 text-xs text-muted-foreground/80">
            Refine the live traffic on the map.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="airborne" className="text-xs">
            Airborne
          </Label>
          <Switch
            id="airborne"
            checked={filters.showAirborne}
            onCheckedChange={(v) => setFilters({ showAirborne: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="ground" className="text-xs">
            On the ground
          </Label>
          <Switch
            id="ground"
            checked={filters.showGrounded}
            onCheckedChange={(v) => setFilters({ showGrounded: v })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Max altitude</Label>
            <span className="text-xs tabular-nums text-muted-foreground">
              up to {Math.round(filters.maxAltitudeM).toLocaleString()} m
            </span>
          </div>
          <Slider
            value={[filters.maxAltitudeM]}
            min={0}
            max={15000}
            step={500}
            onValueChange={([value]) => setFilters({ maxAltitudeM: value })}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Country of origin</Label>
          <Select value={filters.country} onValueChange={(country) => setFilters({ country })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="all">All countries</SelectItem>
              {countries.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
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
