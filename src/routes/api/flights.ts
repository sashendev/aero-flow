import { createFileRoute } from "@tanstack/react-router";
import { fetchOpenSkyStates } from "@/lib/opensky.server";
import type { FlightsResponse } from "@/types/aircraft";

// GET /api/flights?lamin=&lomin=&lamax=&lomax=
// Returns aircraft states inside the bounding box (or world if none given).
export const Route = createFileRoute("/api/flights")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const nums = ["lamin", "lomin", "lamax", "lomax"].map((k) => {
          const v = url.searchParams.get(k);
          return v === null ? null : Number(v);
        });
        const allNumbers = nums.every((n) => n !== null && Number.isFinite(n));
        const bbox = allNumbers ? (nums as [number, number, number, number]) : null;

        const { time, aircraft, cached, error } = await fetchOpenSkyStates({ bbox });

        const body: FlightsResponse = {
          time,
          aircraft,
          count: aircraft.length,
          bbox,
          cached,
          error,
        };
        return new Response(JSON.stringify(body), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
          },
        });
      },
    },
  },
});
