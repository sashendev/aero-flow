import { Circle, Signal, RefreshCw, MapPin } from "lucide-react";
import { formatLastContact } from "@/lib/units";
import { cn } from "@/lib/utils";

interface Props {
  count: number;
  lastUpdate: number | null;
  refreshMs: number;
  status: "ok" | "loading" | "error";
  center: { lng: number; lat: number } | null;
  zoom: number | null;
}

export function StatusBar({ count, lastUpdate, refreshMs, status, center, zoom }: Props) {
  const color =
    status === "ok" ? "text-primary" : status === "loading" ? "text-secondary" : "text-error";
  const label = status === "ok" ? "Connected" : status === "loading" ? "Syncing" : "Degraded";

  return (
    <div
      className="fixed bottom-6 left-6 z-40 bg-surface-container/80 backdrop-blur-md border border-outline-variant/50 rounded-full px-4 py-1.5 text-xs text-on-surface-variant flex items-center gap-x-5 gap-y-1.5 shadow-lg"
      role="status"
    >
      <span className="flex items-center gap-1.5">
        <Circle className={cn("h-2 w-2 fill-current animate-pulse", color)} />
        <span className={cn("font-medium", color)}>{label}</span>
      </span>
      <span className="hidden sm:flex items-center gap-1.5">
        <Signal className="h-3 w-3" />
        <span className="tabular-nums">{count.toLocaleString()} aircraft</span>
      </span>
      <span className="hidden md:flex items-center gap-1.5">
        <RefreshCw className="h-3 w-3" />
        {formatLastContact(lastUpdate)} · every {Math.round(refreshMs / 1000)}s
      </span>
      {center && (
        <span className="hidden lg:flex items-center gap-1.5 font-mono">
          <MapPin className="h-3 w-3" />
          {center.lat.toFixed(2)}, {center.lng.toFixed(2)} · z{zoom?.toFixed(1) ?? "—"}
        </span>
      )}
    </div>
  );
}
