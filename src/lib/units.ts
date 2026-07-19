export type UnitSystem = "metric" | "imperial";

const M_TO_FT = 3.28084;
const MS_TO_KMH = 3.6;
const MS_TO_KT = 1.94384;

export function formatAltitude(meters: number | null, units: UnitSystem): string {
  if (meters === null || !Number.isFinite(meters)) return "--";
  return units === "metric"
    ? `${Math.round(meters).toLocaleString()} m`
    : `${Math.round(meters * M_TO_FT).toLocaleString()} ft`;
}

export function formatSpeed(ms: number | null, units: UnitSystem): string {
  if (ms === null || !Number.isFinite(ms)) return "--";
  return units === "metric"
    ? `${Math.round(ms * MS_TO_KMH)} km/h`
    : `${Math.round(ms * MS_TO_KT)} kt`;
}

export function formatVerticalRate(ms: number | null, units: UnitSystem): string {
  if (ms === null || !Number.isFinite(ms)) return "--";
  const val =
    units === "metric" ? `${ms.toFixed(1)} m/s` : `${Math.round(ms * M_TO_FT * 60)} ft/min`;
  return ms > 0 ? `up ${val}` : ms < 0 ? `down ${val.replace("-", "")}` : val;
}

export function formatHeading(deg: number | null): string {
  if (deg === null || !Number.isFinite(deg)) return "--";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const idx = Math.round((deg % 360) / 45) % 8;
  return `${Math.round(deg)} deg ${dirs[idx]}`;
}

export function formatCoord(v: number | null, kind: "lat" | "lng"): string {
  if (v === null || !Number.isFinite(v)) return "--";
  const abs = Math.abs(v);
  const suffix = kind === "lat" ? (v >= 0 ? "N" : "S") : v >= 0 ? "E" : "W";
  return `${abs.toFixed(4)} deg ${suffix}`;
}

export function formatLastContact(unixSec: number | null | undefined): string {
  if (!unixSec) return "--";
  const diff = Math.max(0, Math.floor(Date.now() / 1000 - unixSec));
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}
