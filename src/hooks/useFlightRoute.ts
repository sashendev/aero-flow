import { useQuery } from "@tanstack/react-query";
import type { FlightRoute } from "@/lib/airlabs-route.server";

async function fetchRoute(icao24: string, signal: AbortSignal): Promise<FlightRoute | null> {
  const res = await fetch(`/api/route/${icao24}`, { signal });
  if (!res.ok) return null;
  const json = (await res.json()) as { route: FlightRoute | null };
  return json.route;
}

export function useFlightRoute(icao24: string | null) {
  return useQuery({
    queryKey: ["flight-route", icao24],
    queryFn: ({ signal }) => fetchRoute(icao24!, signal),
    enabled: !!icao24,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
