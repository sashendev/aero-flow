import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plane, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { flagEmoji } from "@/lib/country-flags";
import { cn } from "@/lib/utils";
import type { Aircraft } from "@/types/aircraft";

interface Props {
  aircraft: Aircraft[];
  onSelect: (aircraft: Aircraft) => void;
}

export function SearchBar({ aircraft, onSelect }: Props) {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return aircraft
      .filter((aircraft) => {
        const callsign = (aircraft.callsign ?? "").toLowerCase();
        return (
          aircraft.icao24.toLowerCase().includes(query) ||
          callsign.includes(query) ||
          aircraft.originCountry.toLowerCase().includes(query)
        );
      })
      .slice(0, 9);
  }, [q, aircraft]);

  return (
    <div className="relative w-full max-w-lg">
      <div
        className={cn(
          "radar-panel flex h-11 items-center gap-2 rounded-lg px-3 transition",
          focused && "border-yellow-300/50 shadow-[0_0_0_1px_rgba(250,204,21,.28)]",
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 140)}
          placeholder="Search flight, hex, or country"
          className="h-9 border-0 bg-transparent px-0 text-sm shadow-none placeholder:text-muted-foreground/80 focus-visible:ring-0 focus-visible:ring-offset-0"
          aria-label="Search flights"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            aria-label="Clear search"
            className="rounded-md p-1 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {focused && q && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="radar-panel absolute z-40 mt-2 w-full overflow-hidden rounded-lg"
            role="listbox"
          >
            {results.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No flights match "{q}".
              </div>
            ) : (
              <ul className="max-h-80 overflow-y-auto no-scrollbar">
                {results.map((aircraft) => (
                  <li key={aircraft.icao24}>
                    <button
                      onMouseDown={(event) => {
                        event.preventDefault();
                        onSelect(aircraft);
                        setQ("");
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-white/10"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-yellow-300/15 text-yellow-200">
                        <Plane className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {(aircraft.callsign || aircraft.icao24).trim().toUpperCase()}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {flagEmoji(aircraft.originCountry)} {aircraft.originCountry} /{" "}
                          {aircraft.icao24.toUpperCase()}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
