import { useQuery } from "@tanstack/react-query";
import type { FlightsResponse } from "@/types/aircraft";

export type BBox = [number, number, number, number] | null;

async function fetchFlights(bbox: BBox, signal: AbortSignal): Promise<FlightsResponse> {
  const params = new URLSearchParams();
  if (bbox) {
    params.set("lamin", String(bbox[0]));
    params.set("lomin", String(bbox[1]));
    params.set("lamax", String(bbox[2]));
    params.set("lomax", String(bbox[3]));
  }
  const res = await fetch(`/api/flights${params.toString() ? "?" + params : ""}`, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as FlightsResponse;
}

export function useFlights(bbox: BBox, refetchInterval: number) {
  return useQuery({
    queryKey: ["flights", bbox],
    queryFn: ({ signal }) => fetchFlights(bbox, signal),
    refetchInterval,
    refetchOnWindowFocus: false,
    staleTime: refetchInterval / 2,
    placeholderData: (prev) => prev,
    retry: 2,
  });
}
