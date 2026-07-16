import { createFileRoute } from "@tanstack/react-router";
import { fetchFlightRoute } from "@/lib/airlabs-route.server";

export const Route = createFileRoute("/api/route/$icao24")({
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
        const route = await fetchFlightRoute(icao24);
        return new Response(JSON.stringify({ route }), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        });
      },
    },
  },
});
