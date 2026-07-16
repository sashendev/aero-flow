import { motion } from "framer-motion";
import { Plane, Gauge, Globe, TowerControl } from "lucide-react";
import type { Aircraft } from "@/types/aircraft";
import type { UnitSystem } from "@/lib/units";
import { formatAltitude, formatSpeed } from "@/lib/units";

interface Props {
  aircraft: Aircraft[];
  units: UnitSystem;
}

function useStats(aircraft: Aircraft[]) {
  const airborne = aircraft.filter((a) => !a.onGround);
  const grounded = aircraft.filter((a) => a.onGround);
  const alts = airborne.map((a) => a.baroAltitude).filter((v): v is number => v !== null);
  const spds = airborne.map((a) => a.velocity).filter((v): v is number => v !== null);
  const countries = new Set(aircraft.map((a) => a.originCountry));
  return {
    total: aircraft.length,
    airborne: airborne.length,
    grounded: grounded.length,
    countries: countries.size,
    avgAlt: alts.length ? alts.reduce((a, b) => a + b, 0) / alts.length : null,
    avgSpd: spds.length ? spds.reduce((a, b) => a + b, 0) / spds.length : null,
  };
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="glass-panel rounded-xl p-3 min-w-[130px]"
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${accent}`} />
        {label}
      </div>
      <div className="mt-1.5 font-display text-lg font-semibold tabular-nums">{value}</div>
    </motion.div>
  );
}

export function StatsPanel({ aircraft, units }: Props) {
  const s = useStats(aircraft);
  return (
    <div className="flex flex-wrap gap-2">
      <Stat
        icon={Plane}
        label="Tracked"
        value={s.total.toLocaleString()}
        accent="text-primary"
      />
      <Stat icon={Plane} label="Airborne" value={s.airborne.toLocaleString()} accent="text-success" />
      <Stat
        icon={TowerControl}
        label="On ground"
        value={s.grounded.toLocaleString()}
        accent="text-warning"
      />
      <Stat
        icon={Gauge}
        label="Avg altitude"
        value={s.avgAlt !== null ? formatAltitude(s.avgAlt, units) : "—"}
        accent="text-accent"
      />
      <Stat
        icon={Gauge}
        label="Avg speed"
        value={s.avgSpd !== null ? formatSpeed(s.avgSpd, units) : "—"}
        accent="text-accent"
      />
      <Stat
        icon={Globe}
        label="Countries"
        value={s.countries.toLocaleString()}
        accent="text-primary"
      />
    </div>
  );
}
