import { useEffect, useRef } from "react";
import maplibregl, {
  Map as MLMap,
  Popup,
  NavigationControl,
  ScaleControl,
  FullscreenControl,
  GeolocateControl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Aircraft } from "@/types/aircraft";
import type { FlightRoute } from "@/lib/airlabs-route.server";
import type { StyleSpecification } from "maplibre-gl";
import type { Feature, FeatureCollection, LineString, Point } from "geojson";


// Free raster styles (OSM + Carto tiles). No API key required.
const OSM_ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

function rasterStyle(variant: "dark" | "light"): StyleSpecification {
  const url =
    variant === "dark"
      ? "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
      : "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png";
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      basemap: {
        type: "raster",
        tiles: [url],
        tileSize: 256,
        attribution: OSM_ATTRIB,
      },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": variant === "dark" ? "#0b0b12" : "#eef2f6" } },
      { id: "basemap", type: "raster", source: "basemap" },
    ],
  };
}

// Draw a small plane icon on a canvas so we can register it as a map image.
function makePlaneImage(color: string, size = 44): ImageData {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d")!;
  const s = size;
  // Soft shadow disk for readability on tiles.
  g.fillStyle = "rgba(0,0,0,0.25)";
  g.beginPath();
  g.arc(s / 2, s / 2, s * 0.38, 0, Math.PI * 2);
  g.fill();
  // Plane silhouette, pointing up (north). MapLibre applies icon-rotate.
  g.translate(s / 2, s / 2);
  g.fillStyle = color;
  g.strokeStyle = "rgba(255,255,255,0.9)";
  g.lineWidth = 1.4;
  const k = s / 44;
  g.beginPath();
  g.moveTo(0, -16 * k);
  g.lineTo(3 * k, -4 * k);
  g.lineTo(18 * k, 4 * k);
  g.lineTo(18 * k, 8 * k);
  g.lineTo(3 * k, 6 * k);
  g.lineTo(3 * k, 12 * k);
  g.lineTo(7 * k, 15 * k);
  g.lineTo(7 * k, 17 * k);
  g.lineTo(0, 15 * k);
  g.lineTo(-7 * k, 17 * k);
  g.lineTo(-7 * k, 15 * k);
  g.lineTo(-3 * k, 12 * k);
  g.lineTo(-3 * k, 6 * k);
  g.lineTo(-18 * k, 8 * k);
  g.lineTo(-18 * k, 4 * k);
  g.lineTo(-3 * k, -4 * k);
  g.closePath();
  g.fill();
  g.stroke();
  return g.getImageData(0, 0, size, size);
}

// GeoJSON namespace alias (avoids namespace lookups in signatures).

const ICONS: Record<string, string> = {
  "plane-primary": "#2563EB",
  "plane-success": "#22C55E",
  "plane-accent": "#06B6D4",
  "plane-warning": "#F59E0B",
};

function aircraftToFeatures(list: Aircraft[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: list
      .filter((a) => a.longitude !== null && a.latitude !== null)
      .map((a) => ({
        type: "Feature",
        id: a.icao24,
        geometry: { type: "Point", coordinates: [a.longitude!, a.latitude!] },
        properties: {
          icao24: a.icao24,
          callsign: a.callsign ?? "",
          country: a.originCountry,
          heading: a.heading ?? 0,
          onGround: a.onGround,
          verticalRate: a.verticalRate ?? 0,
        },
      })),
  };
}

// Great-circle interpolation between two lng/lat points (returns N+1 points).
function greatCircle(
  a: [number, number],
  b: [number, number],
  n = 64,
): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const λ1 = toRad(lng1);
  const λ2 = toRad(lng2);
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((φ2 - φ1) / 2) ** 2 +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2,
      ),
    );
  if (!Number.isFinite(d) || d === 0) return [a, b];
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    const φ = Math.atan2(z, Math.sqrt(x * x + y * y));
    const λ = Math.atan2(y, x);
    pts.push([toDeg(λ), toDeg(φ)]);
  }
  return pts;
}

// Split polyline at anti-meridian so MapLibre doesn't draw across the globe.
function splitAtDateline(pts: [number, number][]): [number, number][][] {
  const segs: [number, number][][] = [];
  let cur: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    if (i === 0) {
      cur.push(pts[i]);
      continue;
    }
    const prev = pts[i - 1];
    const p = pts[i];
    if (Math.abs(p[0] - prev[0]) > 180) {
      segs.push(cur);
      cur = [p];
    } else {
      cur.push(p);
    }
  }
  if (cur.length > 1) segs.push(cur);
  return segs.filter((s) => s.length > 1);
}

function routeToFeatures(
  route: FlightRoute | null,
  current: [number, number] | null,
): FeatureCollection {
  if (!route) return { type: "FeatureCollection", features: [] };
  const features: Feature<LineString>[] = [];
  const push = (
    a: [number, number] | null | undefined,
    b: [number, number] | null | undefined,
    kind: "past" | "future",
  ) => {
    if (!a || !b) return;
    for (const seg of splitAtDateline(greatCircle(a, b, 96))) {
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: seg },
        properties: { kind },
      });
    }
  };
  const dep = route.dep ? ([route.dep.lng, route.dep.lat] as [number, number]) : null;
  const arr = route.arr ? ([route.arr.lng, route.arr.lat] as [number, number]) : null;
  if (current) {
    push(dep, current, "past");
    push(current, arr, "future");
  } else if (dep && arr) {
    push(dep, arr, "future");
  }
  return { type: "FeatureCollection", features };
}

function endpointFeatures(route: FlightRoute | null): FeatureCollection {
  if (!route) return { type: "FeatureCollection", features: [] };
  const feats: Feature<Point>[] = [];
  if (route.dep) {
    feats.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [route.dep.lng, route.dep.lat] },
      properties: { kind: "dep", label: route.dep.iata ?? "" },
    });
  }
  if (route.arr) {
    feats.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [route.arr.lng, route.arr.lat] },
      properties: { kind: "arr", label: route.arr.iata ?? "" },
    });
  }
  return { type: "FeatureCollection", features: feats };
}

interface Props {
  aircraft: Aircraft[];
  mapStyle: "dark" | "light";
  markerSize: number;
  selectedIcao: string | null;
  onSelect: (icao24: string) => void;
  onViewportChange: (bbox: [number, number, number, number], center: { lng: number; lat: number }, zoom: number) => void;
  focusIcao: string | null; // when set, fly to this aircraft
  route: FlightRoute | null;
}


const SRC = "aircraft-src";
const LAYER = "aircraft-layer";
const ROUTE_SRC = "route-src";
const ROUTE_LAYER_GLOW = "route-layer-glow";
const ROUTE_LAYER_PAST = "route-layer-past";
const ROUTE_LAYER_FUTURE = "route-layer-future";
const ENDPOINT_SRC = "route-endpoints-src";
const ENDPOINT_LAYER = "route-endpoints-layer";
const ENDPOINT_LABEL_LAYER = "route-endpoints-label";




function addRouteLayers(map: MLMap) {
  if (!map.getSource(ROUTE_SRC)) {
    map.addSource(ROUTE_SRC, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  }
  if (!map.getSource(ENDPOINT_SRC)) {
    map.addSource(ENDPOINT_SRC, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  }
  // Insert route layers BENEATH aircraft so planes stay on top.
  const before = map.getLayer(LAYER) ? LAYER : undefined;
  if (!map.getLayer(ROUTE_LAYER_GLOW)) {
    map.addLayer(
      {
        id: ROUTE_LAYER_GLOW,
        type: "line",
        source: ROUTE_SRC,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#a855f7",
          "line-width": 14,
          "line-opacity": 0.25,
          "line-blur": 8,
        },
      },
      before,
    );
  }
  if (!map.getLayer(ROUTE_LAYER_PAST)) {
    map.addLayer(
      {
        id: ROUTE_LAYER_PAST,
        type: "line",
        source: ROUTE_SRC,
        filter: ["==", ["get", "kind"], "past"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#a855f7", "line-width": 4, "line-opacity": 1 },
      },
      before,
    );
  }
  if (!map.getLayer(ROUTE_LAYER_FUTURE)) {
    map.addLayer(
      {
        id: ROUTE_LAYER_FUTURE,
        type: "line",
        source: ROUTE_SRC,
        filter: ["==", ["get", "kind"], "future"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#a855f7",
          "line-width": 3,
          "line-opacity": 0.75,
          "line-dasharray": [3, 3],
        },
      },
      before,
    );
  }
  if (!map.getLayer(ENDPOINT_LAYER)) {
    map.addLayer(
      {
        id: ENDPOINT_LAYER,
        type: "circle",
        source: ENDPOINT_SRC,
        paint: {
          "circle-radius": 8,
          "circle-color": "#ffffff",
          "circle-stroke-color": "#a855f7",
          "circle-stroke-width": 3,
        },
      },
      before,
    );
  }
  if (!map.getLayer(ENDPOINT_LABEL_LAYER)) {
    map.addLayer({
      id: ENDPOINT_LABEL_LAYER,
      type: "symbol",
      source: ENDPOINT_SRC,
      layout: {
        "text-field": ["get", "label"],
        "text-size": 14,
        "text-offset": [0, 1.8],
        "text-anchor": "top",
        "text-allow-overlap": true,
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
      },
      paint: {
        "text-color": "#a855f7",
        "text-halo-color": "rgba(255,255,255,0.95)",
        "text-halo-width": 2,
      },
    });
  }
}

export default function FlightMap({
  aircraft,
  mapStyle,
  markerSize,
  selectedIcao,
  onSelect,
  onViewportChange,
  focusIcao,
  route,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const readyRef = useRef(false);


  // Init map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: rasterStyle(mapStyle),
      center: [10, 30],
      zoom: 2.2,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    mapRef.current = map;

    map.addControl(new NavigationControl({ showCompass: true, visualizePitch: false }), "top-right");
    map.addControl(new FullscreenControl(), "top-right");
    map.addControl(
      new GeolocateControl({
        positionOptions: { enableHighAccuracy: false },
        trackUserLocation: false,
        showAccuracyCircle: false,
      }),
      "top-right",
    );
    map.addControl(new ScaleControl({ maxWidth: 100, unit: "metric" }), "bottom-left");

    popupRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 14,
      className: "aeroflow-popup",
    });

    const setup = () => {
      // Register plane icons in all status colors.
      for (const [name, color] of Object.entries(ICONS)) {
        if (map.hasImage(name)) continue;
        map.addImage(name, makePlaneImage(color), { pixelRatio: 2 });
      }

      if (!map.getSource(SRC)) {
        map.addSource(SRC, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      }
      if (!map.getLayer(LAYER)) {
        map.addLayer({
          id: LAYER,
          type: "symbol",
          source: SRC,
          layout: {
            "icon-image": [
              "case",
              ["get", "onGround"],
              "plane-warning",
              ["<", ["get", "verticalRate"], -1],
              "plane-accent",
              [">", ["get", "verticalRate"], 1],
              "plane-success",
              "plane-primary",
            ],
            "icon-rotate": ["get", "heading"],
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "icon-rotation-alignment": "map",
            "icon-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              2, 0.32 * markerSize,
              6, 0.46 * markerSize,
              10, 0.72 * markerSize,
              14, 0.98 * markerSize,
            ],

          },
        });
      }
      addRouteLayers(map);
      readyRef.current = true;


      // Interactions.
      map.on("mouseenter", LAYER, (e) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f || f.geometry.type !== "Point") return;
        const [lng, lat] = (f.geometry as Point).coordinates as [number, number];
        const cs = (f.properties?.callsign as string) || (f.properties?.icao24 as string).toUpperCase();
        popupRef.current
          ?.setLngLat([lng, lat])
          .setHTML(
            `<div style="font-family:var(--font-sans);font-size:12px;font-weight:600">${cs}</div>` +
              `<div style="font-family:var(--font-sans);font-size:10.5px;opacity:0.75">${f.properties?.country ?? ""}</div>`,
          )
          .addTo(map);
      });
      map.on("mouseleave", LAYER, () => {
        map.getCanvas().style.cursor = "";
        popupRef.current?.remove();
      });
      map.on("click", LAYER, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        onSelect(f.properties?.icao24 as string);
      });

      // Publish viewport.
      const publish = () => {
        const b = map.getBounds();
        onViewportChange(
          [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()],
          { lng: map.getCenter().lng, lat: map.getCenter().lat },
          map.getZoom(),
        );
      };
      map.on("moveend", publish);
      publish();

      // If aircraft already available, render.
      if (aircraft.length) {
        const src = map.getSource(SRC) as maplibregl.GeoJSONSource;
        src.setData(aircraftToFeatures(aircraft));
      }
    };

    map.on("load", setup);

    return () => {
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update data on aircraft change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const src = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(aircraftToFeatures(aircraft));
  }, [aircraft]);

  // Style switch (dark/light).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    readyRef.current = false;
    map.setStyle(rasterStyle(mapStyle));
    map.once("style.load", () => {
      // Re-add icons & layer after style swap.
      for (const [name, color] of Object.entries(ICONS)) {
        if (!map.hasImage(name)) map.addImage(name, makePlaneImage(color), { pixelRatio: 2 });
      }
      if (!map.getSource(SRC)) {
        map.addSource(SRC, { type: "geojson", data: aircraftToFeatures(aircraft) });
      }
      if (!map.getLayer(LAYER)) {
        map.addLayer({
          id: LAYER,
          type: "symbol",
          source: SRC,
          layout: {
            "icon-image": [
              "case",
              ["get", "onGround"], "plane-warning",
              ["<", ["get", "verticalRate"], -1], "plane-accent",
              [">", ["get", "verticalRate"], 1], "plane-success",
              "plane-primary",
            ],
            "icon-rotate": ["get", "heading"],
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "icon-rotation-alignment": "map",
            "icon-size": [
              "interpolate", ["linear"], ["zoom"],
              2, 0.32 * markerSize,
              6, 0.46 * markerSize,
              10, 0.72 * markerSize,
              14, 0.98 * markerSize,
            ],
          },
        });
      }
      addRouteLayers(map);
      readyRef.current = true;

    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyle]);

  // Fly-to when a focus target is set.
  useEffect(() => {
    if (!focusIcao) return;
    const map = mapRef.current;
    if (!map) return;
    const target = aircraft.find((a) => a.icao24 === focusIcao);
    if (!target || target.longitude === null || target.latitude === null) return;
    map.flyTo({
      center: [target.longitude, target.latitude],
      zoom: Math.max(map.getZoom(), 6),
      speed: 1.2,
      essential: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusIcao]);

  // Selection highlight — grow the selected marker.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || !map.getLayer(LAYER)) return;
    if (selectedIcao) {
      map.setLayoutProperty(LAYER, "icon-size", [
        "interpolate", ["linear"], ["zoom"],
        2,
        ["case", ["==", ["get", "icao24"], selectedIcao], 0.72 * markerSize, 0.32 * markerSize],
        10,
        ["case", ["==", ["get", "icao24"], selectedIcao], 1.24 * markerSize, 0.72 * markerSize],
        14,
        ["case", ["==", ["get", "icao24"], selectedIcao], 1.5 * markerSize, 0.98 * markerSize],
      ]);
    } else {
      map.setLayoutProperty(LAYER, "icon-size", [
        "interpolate", ["linear"], ["zoom"],
        2, 0.32 * markerSize,
        6, 0.46 * markerSize,
        10, 0.72 * markerSize,
        14, 0.98 * markerSize,
      ]);
    }
  }, [selectedIcao, markerSize]);

  // Update route source when route or selected aircraft position changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const selected = selectedIcao
      ? aircraft.find((a) => a.icao24 === selectedIcao)
      : null;
    const current: [number, number] | null =
      selected && selected.longitude !== null && selected.latitude !== null
        ? [selected.longitude, selected.latitude]
        : null;
    const routeSrc = map.getSource(ROUTE_SRC) as maplibregl.GeoJSONSource | undefined;
    const endSrc = map.getSource(ENDPOINT_SRC) as maplibregl.GeoJSONSource | undefined;
    if (routeSrc) routeSrc.setData(routeToFeatures(selectedIcao ? route : null, current));
    if (endSrc) endSrc.setData(endpointFeatures(selectedIcao ? route : null));
  }, [route, selectedIcao, aircraft]);


  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" aria-label="Interactive flight map" />
    </div>
  );
}
