import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { SearchBar } from "@/components/map/SearchBar";
import { AircraftDetailsPanel } from "@/components/map/AircraftDetailsPanel";
import { StatsPanel } from "@/components/map/StatsPanel";
import { StatusBar } from "@/components/map/StatusBar";
import { SettingsSheet } from "@/components/map/SettingsSheet";
import { FiltersPanel, DEFAULT_FILTERS, type Filters } from "@/components/map/FiltersPanel";
import { useSettings } from "@/hooks/useSettings";
import { useFlights, type BBox } from "@/hooks/useFlights";
import { useFlightRoute } from "@/hooks/useFlightRoute";

import type { Aircraft } from "@/types/aircraft";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

const FlightMap = lazy(() => import("@/components/map/FlightMap"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Live Flight Map · AeroFlow" },
      {
        name: "description",
        content:
          "Track live aircraft worldwide on an interactive map. Real-time positions, altitudes, and speeds.",
      },
      { property: "og:title", content: "Live Flight Map · AeroFlow" },
      {
        property: "og:description",
        content: "Real-time aircraft tracking on a beautiful interactive map.",
      },
    ],
  }),
  component: MapPage,
});

function MapSkeleton() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm">Loading map…</span>
      </div>
    </div>
  );
}

function MapPage() {
  const { settings, update } = useSettings();
  const [bbox, setBbox] = useState<BBox>(null);
  const [center, setCenter] = useState<{ lng: number; lat: number } | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [selectedIcao, setSelectedIcao] = useState<string | null>(null);
  const [focusIcao, setFocusIcao] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<Filters>(DEFAULT_FILTERS);
  const setFilters = useCallback(
    (patch: Partial<Filters>) => setFiltersState((prev) => ({ ...prev, ...patch })),
    [],
  );

  const query = useFlights(bbox, settings.refreshIntervalMs);
  const aircraftAll = query.data?.aircraft ?? [];

  const aircraftFiltered = useMemo(() => {
    return aircraftAll.filter((a) => {
      if (!filters.showGrounded && a.onGround) return false;
      if (!filters.showAirborne && !a.onGround) return false;
      if ((a.baroAltitude ?? 0) > filters.maxAltitudeM && !a.onGround) return false;
      if (filters.country !== "all" && a.originCountry !== filters.country) return false;
      return true;
    });
  }, [aircraftAll, filters]);

  const selected: Aircraft | null = useMemo(
    () => aircraftAll.find((a) => a.icao24 === selectedIcao) ?? null,
    [aircraftAll, selectedIcao],
  );

  const routeQuery = useFlightRoute(selectedIcao);

  // Throttle bbox updates to avoid rate limiting on frequent pans.
  const bboxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleViewportChange = useCallback(
    (b: BBox, c: { lng: number; lat: number }, z: number) => {
      setCenter(c);
      setZoom(z);
      if (bboxTimer.current) clearTimeout(bboxTimer.current);
      bboxTimer.current = setTimeout(() => setBbox(b), 400);
    },
    [],
  );

  // Show a toast once when the flights API is rate-limited.
  const notifiedRef = useRef(false);
  useEffect(() => {
    if (query.data?.error && !notifiedRef.current) {
      notifiedRef.current = true;
      toast.warning("Flights API is rate-limiting", {
        description: "Showing cached data — live updates will resume shortly.",
      });
    }
  }, [query.data?.error]);

  const status: "ok" | "loading" | "error" = query.isError
    ? "error"
    : query.isFetching
      ? "loading"
      : "ok";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Map layer */}
      <ClientOnly fallback={<MapSkeleton />}>
        <Suspense fallback={<MapSkeleton />}>
          <FlightMap
            aircraft={aircraftFiltered}
            mapStyle={settings.mapStyle}
            markerSize={settings.markerSize}
            selectedIcao={selectedIcao}
            onSelect={setSelectedIcao}
            onViewportChange={handleViewportChange}
            focusIcao={focusIcao}
            route={routeQuery.data ?? null}
          />
        </Suspense>
      </ClientOnly>

      {/* Top nav */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="pointer-events-none absolute inset-x-0 top-0 z-30 p-3 sm:p-4"
      >
        <div className="pointer-events-auto mx-auto flex max-w-[1600px] items-center gap-2 sm:gap-3">
          <div className="glass-panel rounded-xl px-3 py-2 hidden sm:flex">
            <Logo />
          </div>
          <div className="flex-1 min-w-0 flex justify-center">
            <SearchBar
              aircraft={aircraftAll}
              onSelect={(a) => {
                setSelectedIcao(a.icao24);
                setFocusIcao(a.icao24);
              }}
            />
          </div>
          <FiltersPanel filters={filters} setFilters={setFilters} aircraft={aircraftAll} />
          <SettingsSheet settings={settings} update={update} />
        </div>
      </motion.header>

      {/* Stats — desktop only */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="pointer-events-none absolute left-4 top-24 z-20 hidden lg:block"
      >
        <div className="pointer-events-auto">
          <StatsPanel aircraft={aircraftFiltered} units={settings.units} />
        </div>
      </motion.div>

      {/* Details panel */}
      <div className="pointer-events-none absolute right-4 top-24 bottom-16 z-20 hidden md:flex items-start justify-end">
        <div className="pointer-events-auto">
          <AircraftDetailsPanel
            aircraft={selected}
            units={settings.units}
            onClose={() => setSelectedIcao(null)}
          />
        </div>
      </div>

      {/* Mobile details sheet — slide up */}
      <div className="md:hidden">
        {selected && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 260 }}
            className="fixed inset-x-0 bottom-0 z-30 p-3"
          >
            <div className="mx-auto max-w-md">
              <AircraftDetailsPanel
                aircraft={selected}
                units={settings.units}
                onClose={() => setSelectedIcao(null)}
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Status bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
        <div className="pointer-events-auto">
          <StatusBar
            count={aircraftFiltered.length}
            lastUpdate={query.data?.time ?? null}
            refreshMs={settings.refreshIntervalMs}
            status={status}
            center={center}
            zoom={zoom}
          />
        </div>
      </div>

      {/* Mobile stats — floating pill */}
      <div className="lg:hidden absolute left-3 top-20 z-10 pointer-events-none">
        <div className="pointer-events-auto glass-panel rounded-full px-3 py-1.5 text-xs">
          <span className="font-semibold text-foreground">{aircraftFiltered.length.toLocaleString()}</span>{" "}
          <span className="text-muted-foreground">aircraft</span>
        </div>
      </div>

      {/* Empty state */}
      {query.isSuccess && aircraftAll.length === 0 && (
        <div className="absolute inset-0 z-10 grid place-items-center pointer-events-none">
          <div className="glass-panel rounded-2xl p-6 max-w-sm text-center pointer-events-auto">
            <div className="text-sm text-muted-foreground">
              No aircraft in this area right now. Try zooming out or panning to another region.
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => query.refetch()}
            >
              Refresh
            </Button>
          </div>
        </div>
      )}

      <Toaster position="top-center" />
    </div>
  );
}
