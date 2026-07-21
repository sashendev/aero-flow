import { createFileRoute } from "@tanstack/react-router";
import { fetchOpenSkyStates } from "@/lib/opensky.server";

// GET /api/flight/:icao24 — single aircraft state.
export const Route = createFileRoute("/api/flight/$icao24")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const icao24 = params.icao24?.toLowerCase().trim();
        if (!icao24 || !/^[a-f0-9]{6}$/i.test(icao24)) {
          return new Response(JSON.stringify({ error: "Invalid ICAO24" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        const { time, aircraft, cached, error } = await fetchOpenSkyStates({ icao24 });
        const one = aircraft[0] ?? null;
        return new Response(JSON.stringify({ time, aircraft: one, cached, error }), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
          },
        });
      },
    },
  },
});
