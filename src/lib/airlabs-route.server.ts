// Server-only helper: resolve a flight's departure & arrival airports (coords)
// via AirLabs, with aggressive in-memory caching (free tier is rate-limited).

const AIRLABS_BASE = process.env.AIRLABS_BASE ?? "https://airlabs.co/api/v9";
const ROUTE_TTL_MS = 5 * 60_000; // route rarely changes mid-flight
const AIRPORT_TTL_MS = 24 * 60 * 60_000;

export interface Airport {
  iata: string | null;
  icao: string | null;
  name: string | null;
  city: string | null;
  country: string | null;
  lat: number;
  lng: number;
}

export interface FlightRoute {
  icao24: string;
  callsign: string | null;
  dep: Airport | null;
  arr: Airport | null;
  progress: number | null; // 0..1
  status: string | null;
}

const routeCache = new Map<string, { at: number; data: FlightRoute | null }>();
const airportCache = new Map<string, { at: number; data: Airport | null }>();

async function fetchAirport(iata: string, apiKey: string): Promise<Airport | null> {
  const k = iata.toUpperCase();
  const hit = airportCache.get(k);
  if (hit && Date.now() - hit.at < AIRPORT_TTL_MS) return hit.data;
  const url = `${AIRLABS_BASE}/airports?api_key=${apiKey}&iata_code=${encodeURIComponent(k)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { response?: Array<Record<string, unknown>> };
    const a = json.response?.[0];
    if (!a || typeof a.lat !== "number" || typeof a.lng !== "number") {
      airportCache.set(k, { at: Date.now(), data: null });
      return null;
    }
    const ap: Airport = {
      iata: (a.iata_code as string) ?? k,
      icao: (a.icao_code as string) ?? null,
      name: (a.name as string) ?? null,
      city: (a.city as string) ?? null,
      country: (a.country_code as string) ?? null,
      lat: a.lat as number,
      lng: a.lng as number,
    };
    airportCache.set(k, { at: Date.now(), data: ap });
    return ap;
  } catch {
    return null;
  }
}

export async function fetchFlightRoute(icao24: string): Promise<FlightRoute | null> {
  const key = icao24.toLowerCase();
  const hit = routeCache.get(key);
  if (hit && Date.now() - hit.at < ROUTE_TTL_MS) return hit.data;

  const apiKey = process.env.AIRLABS_API_KEY;
  if (!apiKey) return null;

  const url = `${AIRLABS_BASE}/flight?api_key=${apiKey}&hex=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) {
      routeCache.set(key, { at: Date.now(), data: null });
      return null;
    }
    const json = (await res.json()) as { response?: Record<string, unknown> };
    const r = json.response;
    if (!r) {
      routeCache.set(key, { at: Date.now(), data: null });
      return null;
    }
    const depIata = (r.dep_iata as string) || null;
    const arrIata = (r.arr_iata as string) || null;
    const [dep, arr] = await Promise.all([
      depIata ? fetchAirport(depIata, apiKey) : Promise.resolve(null),
      arrIata ? fetchAirport(arrIata, apiKey) : Promise.resolve(null),
    ]);
    const data: FlightRoute = {
      icao24: key,
      callsign:
        (r.flight_iata as string) || (r.flight_icao as string) || (r.flight_number as string) || null,
      dep,
      arr,
      progress: typeof r.percent === "number" ? (r.percent as number) / 100 : null,
      status: (r.status as string) ?? null,
    };
    routeCache.set(key, { at: Date.now(), data });
    return data;
  } catch {
    return null;
  }
}
