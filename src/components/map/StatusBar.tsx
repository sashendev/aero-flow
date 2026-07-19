import { Circle, MapPin, RefreshCw, Signal } from "lucide-react";
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
    status === "ok"
      ? "text-emerald-300"
      : status === "loading"
        ? "text-yellow-300"
        : "text-red-300";
  const label = status === "ok" ? "Live" : status === "loading" ? "Syncing" : "Degraded";

  return (
    <div className="radar-panel flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center justify-center gap-x-5 gap-y-1.5 rounded-full px-4 py-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <Circle
          className={cn("h-2 w-2 fill-current", status !== "error" && "animate-pulse", color)}
        />
        <span className={cn("font-medium", color)}>{label}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <Signal className="h-3 w-3" />
        <span className="tabular-nums">{count.toLocaleString()} aircraft</span>
      </span>
      <span className="hidden items-center gap-1.5 sm:flex">
        <RefreshCw className="h-3 w-3" />
        {formatLastContact(lastUpdate)} / every {Math.round(refreshMs / 1000)}s
      </span>
      {center && (
        <span className="hidden items-center gap-1.5 font-mono lg:flex">
          <MapPin className="h-3 w-3" />
          {center.lat.toFixed(2)}, {center.lng.toFixed(2)} / z{zoom?.toFixed(1) ?? "--"}
        </span>
      )}
    </div>
  );
}
