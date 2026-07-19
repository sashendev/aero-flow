import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { AircraftDetailsPanel } from "@/components/map/AircraftDetailsPanel";
import { FiltersPanel, DEFAULT_FILTERS, type Filters } from "@/components/map/FiltersPanel";
import { SearchBar } from "@/components/map/SearchBar";
import { SettingsSheet } from "@/components/map/SettingsSheet";
import { StatusBar } from "@/components/map/StatusBar";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useFlightRoute } from "@/hooks/useFlightRoute";
import { useFlights, type BBox } from "@/hooks/useFlights";
import { useSettings } from "@/hooks/useSettings";
import type { Aircraft } from "@/types/aircraft";

const FlightMap = lazy(() => import("@/components/map/FlightMap"));

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Live Flight Map | AeroFlow" },
      {
        name: "description",
        content:
          "Track live aircraft worldwide on an interactive map with route, altitude, speed, and aircraft details.",
      },
      { property: "og:title", content: "Live Flight Map | AeroFlow" },
      {
        property: "og:description",
        content: "Real-time aircraft tracking on a polished interactive aviation map.",
      },
    ],
  }),
  component: MapPage,
});

function MapSkeleton() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-background">
      <div className="radar-panel flex flex-col items-center gap-3 rounded-lg px-5 py-4 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-yellow-300" />
        <span className="text-sm">Loading live map...</span>
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
  const aircraftAll = useMemo(() => query.data?.aircraft ?? [], [query.data?.aircraft]);
  const routeQuery = useFlightRoute(selectedIcao);

  const aircraftFiltered = useMemo(() => {
    return aircraftAll.filter((aircraft) => {
      if (!filters.showGrounded && aircraft.onGround) return false;
      if (!filters.showAirborne && !aircraft.onGround) return false;
      if ((aircraft.baroAltitude ?? 0) > filters.maxAltitudeM && !aircraft.onGround) return false;
      if (filters.country !== "all" && aircraft.originCountry !== filters.country) return false;
      return true;
    });
  }, [aircraftAll, filters]);

  const selected: Aircraft | null = useMemo(
    () => aircraftAll.find((aircraft) => aircraft.icao24 === selectedIcao) ?? null,
    [aircraftAll, selectedIcao],
  );

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

  const notifiedRef = useRef(false);
  useEffect(() => {
    if (query.data?.error && !notifiedRef.current) {
      notifiedRef.current = true;
      toast.warning("OpenSky is rate-limiting", {
        description: "Showing cached data. Live updates will resume shortly.",
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
      <ClientOnly fallback={<MapSkeleton />}>
        <Suspense fallback={<MapSkeleton />}>
          <FlightMap
            aircraft={aircraftFiltered}
            mapStyle={settings.mapStyle}
            markerSize={settings.markerSize}
            selectedIcao={selectedIcao}
            onSelect={(icao24) => {
              setSelectedIcao(icao24);
              setFocusIcao(icao24);
            }}
            onViewportChange={handleViewportChange}
            focusIcao={focusIcao}
            route={routeQuery.data ?? null}
            animations={settings.animations}
          />
        </Suspense>
      </ClientOnly>

      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="pointer-events-none absolute inset-x-0 top-0 z-30 p-3 sm:p-4"
      >
        <div className="pointer-events-auto mx-auto flex max-w-[1700px] items-center gap-2 sm:gap-3">
          <Link to="/" className="radar-button p-2" aria-label="Back to landing">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Link to="/map" className="radar-panel hidden rounded-lg px-3 py-2 sm:block">
            <Logo />
          </Link>
          <div className="flex min-w-0 flex-1 justify-center">
            <SearchBar
              aircraft={aircraftAll}
              onSelect={(aircraft) => {
                setSelectedIcao(aircraft.icao24);
                setFocusIcao(aircraft.icao24);
              }}
            />
          </div>
          <FiltersPanel filters={filters} setFilters={setFilters} aircraft={aircraftAll} />
          <SettingsSheet settings={settings} update={update} />
        </div>
      </motion.header>

      <div className="pointer-events-none absolute bottom-20 right-4 top-20 z-20 hidden items-start justify-end md:flex">
        <div className="pointer-events-auto">
          <AircraftDetailsPanel
            aircraft={selected}
            route={routeQuery.data ?? null}
            routeLoading={routeQuery.isFetching}
            units={settings.units}
            onClose={() => setSelectedIcao(null)}
          />
        </div>
      </div>

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
                route={routeQuery.data ?? null}
                routeLoading={routeQuery.isFetching}
                units={settings.units}
                onClose={() => setSelectedIcao(null)}
              />
            </div>
          </motion.div>
        )}
      </div>

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

      {query.isSuccess && aircraftAll.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <div className="radar-panel pointer-events-auto max-w-sm rounded-lg p-6 text-center">
            <div className="text-sm text-muted-foreground">
              No aircraft in this area right now. Try zooming out or panning to another region.
            </div>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => query.refetch()}>
              Refresh
            </Button>
          </div>
        </div>
      )}

      <Toaster position="top-center" />
    </div>
  );
}
