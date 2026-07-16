import { useMemo, useState } from "react";
import { Search, Plane, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import type { Aircraft } from "@/types/aircraft";
import { flagEmoji } from "@/lib/country-flags";
import { cn } from "@/lib/utils";

interface Props {
  aircraft: Aircraft[];
  onSelect: (a: Aircraft) => void;
}

export function SearchBar({ aircraft, onSelect }: Props) {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return aircraft
      .filter((a) => {
        const cs = (a.callsign ?? "").toLowerCase();
        return (
          a.icao24.toLowerCase().includes(query) ||
          cs.includes(query) ||
          a.originCountry.toLowerCase().includes(query)
        );
      })
      .slice(0, 8);
  }, [q, aircraft]);

  return (
    <div className="relative w-full max-w-md">
      <div
        className={cn(
          "glass-panel flex items-center gap-2 rounded-xl px-3 py-2 transition",
          focused && "shadow-elegant ring-2 ring-primary/30",
        )}
      >
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search callsign, ICAO24, country…"
          className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 h-8 px-0 text-sm"
          aria-label="Search flights"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            aria-label="Clear search"
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition"
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
            className="glass-panel absolute z-40 mt-2 w-full overflow-hidden rounded-xl"
            role="listbox"
          >
            {results.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No flights match “{q}”.
              </div>
            ) : (
              <ul className="max-h-80 overflow-y-auto no-scrollbar">
                {results.map((a) => (
                  <li key={a.icao24}>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onSelect(a);
                        setQ("");
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/60 transition"
                    >
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                        <Plane className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {a.callsign || a.icao24.toUpperCase()}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          <span aria-hidden className="mr-1">
                            {flagEmoji(a.originCountry)}
                          </span>
                          {a.originCountry} · {a.icao24.toUpperCase()}
                        </div>
                      </div>
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
