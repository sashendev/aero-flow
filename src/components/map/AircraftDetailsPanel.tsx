import { motion, AnimatePresence } from "framer-motion";
import { X, Plane, Radio, Navigation, Gauge, MapPin, Clock, Hash } from "lucide-react";
import type { Aircraft } from "@/types/aircraft";
import type { UnitSystem } from "@/lib/units";
import {
  formatAltitude,
  formatCoord,
  formatHeading,
  formatLastContact,
  formatSpeed,
  formatVerticalRate,
} from "@/lib/units";
import { flagEmoji } from "@/lib/country-flags";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  aircraft: Aircraft | null;
  units: UnitSystem;
  onClose: () => void;
}

function StatusBadge({ aircraft }: { aircraft: Aircraft }) {
  if (aircraft.onGround) {
    return (
      <Badge className="border-transparent bg-warning/15 text-warning hover:bg-warning/20">
        On ground
      </Badge>
    );
  }
  const climbing = (aircraft.verticalRate ?? 0) > 1;
  const descending = (aircraft.verticalRate ?? 0) < -1;
  if (climbing)
    return (
      <Badge className="border-transparent bg-success/15 text-success hover:bg-success/20">
        Climbing
      </Badge>
    );
  if (descending)
    return (
      <Badge className="border-transparent bg-accent/15 text-accent hover:bg-accent/20">
        Descending
      </Badge>
    );
  return (
    <Badge className="border-transparent bg-primary/15 text-primary hover:bg-primary/20">
      Cruising
    </Badge>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-border/60 last:border-none">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={cn("text-sm text-foreground text-right", mono && "font-mono")}>{value}</div>
    </div>
  );
}

export function AircraftDetailsPanel({ aircraft, units, onClose }: Props) {
  return (
    <AnimatePresence>
      {aircraft && (
        <motion.aside
          key={aircraft.icao24}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={cn(
            "glass-panel rounded-2xl overflow-hidden",
            "w-[360px] max-w-[calc(100vw-2rem)]",
          )}
          role="dialog"
          aria-label={`Aircraft details for ${aircraft.callsign ?? aircraft.icao24}`}
        >
          <header className="relative p-5 pb-4" style={{ background: "var(--gradient-primary)" }}>
            <button
              onClick={onClose}
              aria-label="Close details"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-primary-foreground/90 hover:bg-white/10 transition"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h2 className="font-data-lg text-[28px] text-on-surface tracking-tight leading-none">
                    {aircraft.callsign || aircraft.icao24.toUpperCase()}
                  </h2>
                  <StatusBadge aircraft={aircraft} />
                </div>
                <span className="font-body-md text-[13px] text-on-surface-variant mt-1">
                  {aircraft.originCountry} · {aircraft.icao24.toUpperCase()}
                </span>
              </div>
            </div>
          </header>
          <div className="p-5 space-y-4">
            <Row
              icon={Plane}
              label="Altitude"
              value={formatAltitude(aircraft.baroAltitude ?? 0, units)}
              mono
            />
            <Row
              icon={Gauge}
              label="Ground Speed"
              value={formatSpeed(aircraft.velocity ?? 0, units)}
              mono
            />
            <Row
              icon={Navigation}
              label="Heading"
              value={formatHeading(aircraft.trueTrack ?? 0)}
              mono
            />
            <Row
              icon={Radio}
              label="Vertical Rate"
              value={formatVerticalRate(aircraft.verticalRate ?? 0, units)}
              mono
            />
            <Row
              icon={MapPin}
              label="Position"
              value={<>{formatCoord(aircraft.latitude ?? 0, aircraft.longitude ?? 0)}</>}
              mono
            />
            <Row
              icon={Clock}
              label="Last Contact"
              value={formatLastContact(aircraft.lastContact)}
              mono
            />
            <Row
              icon={Hash}
              label="Squawk"
              value={aircraft.squawk ?? "—"}
              mono
            />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
