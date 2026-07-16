// Server-side flights data client using AirLabs with in-memory cache.
import type { Aircraft } from "@/types/aircraft";

const AIRLABS_BASE = process.env.AIRLABS_BASE ?? "https://airlabs.co/api/v9";
const CACHE_TTL_MS = 10_000;

interface CacheEntry {
  time: number;
  aircraft: Aircraft[];
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

// Shape of a single flight response from AirLabs /flights endpoint.
interface AirLabsFlight {
  hex?: string | null;
  reg_number?: string | null;
  flag?: string | null;
  lat?: number | null;
  lng?: number | null;
  alt?: number | null;
  dir?: number | null;
  speed?: number | null; // km/h
  v_speed?: number | null; // m/s
  squawk?: string | null;
  flight_number?: string | null;
  flight_icao?: string | null;
  flight_iata?: string | null;
  airline_icao?: string | null;
  airline_iata?: string | null;
  aircraft_icao?: string | null;
  updated?: number | null;
  status?: string | null;
}

// Best-effort ISO-2 country code -> country name mapping using Intl.
const regionNames =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

function countryFromFlag(flag: string | null | undefined): string {
  if (!flag) return "Unknown";
  const code = flag.toUpperCase();
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

function toAircraft(f: AirLabsFlight): Aircraft | null {
  if (f.lat == null || f.lng == null) return null;
  const hex = (f.hex ?? "").toLowerCase();
  if (!hex) return null;
  const callsign =
    (f.flight_iata || f.flight_icao || f.flight_number || "")?.toString().trim() || null;
  const speedMs = f.speed != null ? f.speed / 3.6 : null; // km/h -> m/s
  const onGround = (f.status ?? "").toLowerCase() === "landed" || (f.alt ?? 0) <= 0;
  const now = Math.floor(Date.now() / 1000);
  return {
    icao24: hex,
    callsign,
    originCountry: countryFromFlag(f.flag),
    timePosition: f.updated ?? now,
    lastContact: f.updated ?? now,
    longitude: f.lng,
    latitude: f.lat,
    baroAltitude: f.alt ?? null,
    onGround,
    velocity: speedMs,
    heading: f.dir ?? null,
    verticalRate: f.v_speed ?? null,
    geoAltitude: f.alt ?? null,
    squawk: f.squawk ?? null,
    spi: false,
    positionSource: 0,
  };
}

export interface FetchArgs {
  bbox?: [number, number, number, number] | null; // [lamin, lomin, lamax, lomax]
  icao24?: string | null;
}

export async function fetchOpenSkyStates({ bbox, icao24 }: FetchArgs): Promise<{
  time: number;
  aircraft: Aircraft[];
  cached: boolean;
  error?: string;
}> {
  const key = icao24 ? `icao:${icao24}` : bbox ? `bbox:${bbox.join(",")}` : "world";
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.fetchedAt < CACHE_TTL_MS) {
    return { time: hit.time, aircraft: hit.aircraft, cached: true };
  }

  const apiKey = process.env.AIRLABS_API_KEY;
  if (!apiKey) {
    return {
      time: Math.floor(now / 1000),
      aircraft: [],
      cached: false,
      error: "AIRLABS_API_KEY not configured",
    };
  }

  const params = new URLSearchParams();
  params.set("api_key", apiKey);
  if (bbox) {
    // AirLabs bbox: "lat1,lng1,lat2,lng2" (sw, ne).
    params.set("bbox", `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}`);
  }
  if (icao24) params.set("hex", icao24.toLowerCase());

  const url = `${AIRLABS_BASE}/flights?${params.toString()}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "AeroFlow/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      if (hit)
        return { time: hit.time, aircraft: hit.aircraft, cached: true, error: `AirLabs ${res.status}` };
      return {
        time: Math.floor(now / 1000),
        aircraft: [],
        cached: false,
        error: `AirLabs ${res.status}`,
      };
    }
    const json = (await res.json()) as {
      response?: AirLabsFlight[];
      error?: { message?: string };
    };
    if (json.error) {
      if (hit)
        return { time: hit.time, aircraft: hit.aircraft, cached: true, error: json.error.message };
      return {
        time: Math.floor(now / 1000),
        aircraft: [],
        cached: false,
        error: json.error.message ?? "AirLabs error",
      };
    }
    const aircraft = (json.response ?? [])
      .map(toAircraft)
      .filter((a): a is Aircraft => a !== null);
    const time = Math.floor(now / 1000);
    const entry: CacheEntry = { time, aircraft, fetchedAt: now };
    cache.set(key, entry);
    if (cache.size > 32) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }
    return { time, aircraft, cached: false };
  } catch (err) {
    if (hit) return { time: hit.time, aircraft: hit.aircraft, cached: true, error: "network" };
    return {
      time: Math.floor(now / 1000),
      aircraft: [],
      cached: false,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
