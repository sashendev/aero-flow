import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Clock,
  Gauge,
  Hash,
  MapPin,
  Navigation,
  Plane,
  Radio,
  Route,
  Satellite,
  ShieldAlert,
  TowerControl,
  X,
} from "lucide-react";
import type { Aircraft } from "@/types/aircraft";
import type { FlightRoute } from "@/lib/airlabs-route.server";
import type { UnitSystem } from "@/lib/units";
import {
  formatAltitude,
  formatCoord,
  formatHeading,
  formatLastContact,
  formatSpeed,
  formatVerticalRate,
} from "@/lib/units";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { flagEmoji } from "@/lib/country-flags";
import { cn } from "@/lib/utils";

interface Props {
  aircraft: Aircraft | null;
  route?: FlightRoute | null;
  routeLoading?: boolean;
  units: UnitSystem;
  onClose: () => void;
}

function status(aircraft: Aircraft) {
  if (aircraft.onGround)
    return { label: "On ground", className: "bg-orange-500/15 text-orange-300" };
  if ((aircraft.verticalRate ?? 0) > 1)
    return { label: "Climbing", className: "bg-emerald-500/15 text-emerald-300" };
  if ((aircraft.verticalRate ?? 0) < -1)
    return { label: "Descending", className: "bg-sky-500/15 text-sky-300" };
  return { label: "Cruising", className: "bg-yellow-400/15 text-yellow-200" };
}

function DataTile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="radar-tile">
      <div className="flex items-center gap-2 text-[10px] uppercase text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-base font-semibold tabular-nums text-foreground">{value}</div>
      {sub && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 py-2.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-right text-sm text-foreground", mono && "font-mono tabular-nums")}>
        {value}
      </span>
    </div>
  );
}

function airportLine(route: FlightRoute | null | undefined, key: "dep" | "arr") {
  const airport = route?.[key];
  if (!airport) return { code: "--", name: "Unknown airport" };
  return {
    code: airport.iata || airport.icao || "--",
    name: [airport.city, airport.name].filter(Boolean).join(" - ") || airport.country || "Airport",
  };
}

export function AircraftDetailsPanel({ aircraft, route, routeLoading, units, onClose }: Props) {
  return (
    <AnimatePresence>
      {aircraft && (
        <motion.aside
          key={aircraft.icao24}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="radar-panel w-[390px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg"
          role="dialog"
          aria-label={`Aircraft details for ${aircraft.callsign ?? aircraft.icao24}`}
        >
          <header className="relative border-b border-white/10 p-4">
            <button
              onClick={onClose}
              aria-label="Close details"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="pr-10">
              <div className="flex items-center gap-2">
                <h2 className="text-3xl font-semibold tracking-normal text-foreground">
                  {(aircraft.callsign || aircraft.icao24).trim().toUpperCase()}
                </h2>
                <Badge className={cn("border-0", status(aircraft).className)}>
                  {status(aircraft).label}
                </Badge>
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <span>{flagEmoji(aircraft.originCountry)}</span>
                <span>{aircraft.originCountry}</span>
                <span className="text-white/25">/</span>
                <span className="font-mono">{aircraft.icao24.toUpperCase()}</span>
              </div>
            </div>
          </header>

          <section className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-2">
              <DataTile
                icon={Gauge}
                label="Ground speed"
                value={formatSpeed(aircraft.velocity, units)}
              />
              <DataTile
                icon={Plane}
                label="Altitude"
                value={formatAltitude(aircraft.baroAltitude, units)}
              />
              <DataTile icon={Navigation} label="Track" value={formatHeading(aircraft.heading)} />
              <DataTile
                icon={Radio}
                label="Vertical rate"
                value={formatVerticalRate(aircraft.verticalRate, units)}
              />
            </div>

            <div className="radar-section">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                  <Route className="h-3.5 w-3.5" />
                  Route
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {routeLoading ? "Resolving" : route ? route.status || "Live" : "No route filed"}
                </span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
                <div>
                  <div className="text-2xl font-semibold">{airportLine(route, "dep").code}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {airportLine(route, "dep").name}
                  </div>
                </div>
                <div className="mt-2 h-px w-12 bg-yellow-300/70" />
                <div className="text-right">
                  <div className="text-2xl font-semibold">{airportLine(route, "arr").code}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {airportLine(route, "arr").name}
                  </div>
                </div>
              </div>
              <Progress className="mt-4 h-1.5" value={Math.round((route?.progress ?? 0) * 100)} />
              <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                <span>Departed</span>
                <span>
                  {route?.progress !== null && route?.progress !== undefined
                    ? `${Math.round(route.progress * 100)}%`
                    : "--"}
                </span>
                <span>Arrival</span>
              </div>
            </div>

            <div className="radar-section">
              <InfoRow label="Latitude" value={formatCoord(aircraft.latitude, "lat")} mono />
              <InfoRow label="Longitude" value={formatCoord(aircraft.longitude, "lng")} mono />
              <InfoRow
                label="Geometric altitude"
                value={formatAltitude(aircraft.geoAltitude, units)}
                mono
              />
              <InfoRow
                label="Barometric altitude"
                value={formatAltitude(aircraft.baroAltitude, units)}
                mono
              />
              <InfoRow label="Squawk" value={aircraft.squawk ?? "--"} mono />
              <InfoRow label="Emergency SPI" value={aircraft.spi ? "Active" : "Inactive"} />
              <InfoRow
                label="Last position"
                value={formatLastContact(aircraft.timePosition)}
                mono
              />
              <InfoRow label="Last contact" value={formatLastContact(aircraft.lastContact)} mono />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <DataTile
                icon={Satellite}
                label="Source"
                value={`ADS-B ${aircraft.positionSource}`}
                sub="OpenSky state vector"
              />
              <DataTile
                icon={ShieldAlert}
                label="Ident"
                value={aircraft.squawk ?? "--"}
                sub={aircraft.spi ? "Special pulse" : "Normal"}
              />
              <DataTile
                icon={TowerControl}
                label="Phase"
                value={status(aircraft).label}
                sub={aircraft.onGround ? "Surface" : "En route"}
              />
            </div>

            <div className="flex items-center gap-2 rounded-md border border-yellow-300/20 bg-yellow-300/10 px-3 py-2 text-xs text-muted-foreground">
              <Activity className="h-3.5 w-3.5 text-yellow-200" />
              Click another aircraft to compare live position, route, altitude, speed, and
              transponder details.
            </div>
          </section>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
