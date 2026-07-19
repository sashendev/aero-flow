import { useEffect, useMemo, useRef } from "react";
import maplibregl, {
  FullscreenControl,
  GeolocateControl,
  Map as MLMap,
  NavigationControl,
  Popup,
  ScaleControl,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, FeatureCollection, LineString, Point } from "geojson";
import type { Aircraft } from "@/types/aircraft";
import type { FlightRoute } from "@/lib/airlabs-route.server";

const OSM_ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const AIRPORTS = [
  { code: "LHR", name: "London Heathrow", lng: -0.4543, lat: 51.47 },
  { code: "CDG", name: "Paris Charles de Gaulle", lng: 2.55, lat: 49.0097 },
  { code: "FRA", name: "Frankfurt", lng: 8.5706, lat: 50.0333 },
  { code: "AMS", name: "Amsterdam Schiphol", lng: 4.7639, lat: 52.3086 },
  { code: "DXB", name: "Dubai", lng: 55.3644, lat: 25.2532 },
  { code: "DOH", name: "Doha Hamad", lng: 51.6138, lat: 25.2731 },
  { code: "SIN", name: "Singapore Changi", lng: 103.994, lat: 1.3644 },
  { code: "HND", name: "Tokyo Haneda", lng: 139.7798, lat: 35.5494 },
  { code: "JFK", name: "New York JFK", lng: -73.7781, lat: 40.6413 },
  { code: "LAX", name: "Los Angeles", lng: -118.4085, lat: 33.9416 },
  { code: "ORD", name: "Chicago O'Hare", lng: -87.9073, lat: 41.9742 },
  { code: "ATL", name: "Atlanta", lng: -84.4277, lat: 33.6407 },
  { code: "YYZ", name: "Toronto Pearson", lng: -79.6248, lat: 43.6777 },
  { code: "GRU", name: "Sao Paulo Guarulhos", lng: -46.4731, lat: -23.4356 },
  { code: "SYD", name: "Sydney", lng: 151.1772, lat: -33.9399 },
  { code: "CMB", name: "Colombo Bandaranaike", lng: 79.8841, lat: 7.1808 },
];

const SRC = "aircraft-src";
const LAYER = "aircraft-layer";
const HALO_LAYER = "aircraft-halo-layer";
const LABEL_LAYER = "aircraft-label-layer";
const ROUTE_SRC = "route-src";
const ROUTE_GLOW = "route-glow-layer";
const ROUTE_PAST = "route-past-layer";
const ROUTE_FUTURE = "route-future-layer";
const ENDPOINT_SRC = "route-endpoints-src";
const ENDPOINT_LAYER = "route-endpoint-layer";
const ENDPOINT_LABEL = "route-endpoint-label-layer";
const AIRPORT_SRC = "airport-src";
const AIRPORT_LAYER = "airport-layer";
const AIRPORT_LABEL = "airport-label-layer";
const TRAIL_SRC = "trail-src";
const TRAIL_LAYER = "trail-layer";

interface Props {
  aircraft: Aircraft[];
  mapStyle: "dark" | "light";
  markerSize: number;
  selectedIcao: string | null;
  onSelect: (icao24: string) => void;
  onViewportChange: (
    bbox: [number, number, number, number],
    center: { lng: number; lat: number },
    zoom: number,
  ) => void;
  focusIcao: string | null;
  route: FlightRoute | null;
  animations?: boolean;
}

function rasterStyle(variant: "dark" | "light"): StyleSpecification {
  const tiles =
    variant === "dark"
      ? ["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"]
      : ["https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"];
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      basemap: { type: "raster", tiles, tileSize: 256, attribution: OSM_ATTRIB },
    },
    layers: [
      {
        id: "bg",
        type: "background",
        paint: { "background-color": variant === "dark" ? "#070b12" : "#eef4f7" },
      },
      {
        id: "basemap",
        type: "raster",
        source: "basemap",
        paint: {
          "raster-saturation": variant === "dark" ? -0.35 : -0.15,
          "raster-contrast": variant === "dark" ? 0.15 : 0.04,
          "raster-brightness-min": variant === "dark" ? 0.08 : 0.02,
          "raster-brightness-max": variant === "dark" ? 0.74 : 1,
        },
      },
    ],
  };
}

function makePlaneImage(color: string, size = 54): ImageData {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d")!;
  const k = size / 54;

  g.translate(size / 2, size / 2);
  g.shadowColor = "rgba(0,0,0,.34)";
  g.shadowBlur = 5;
  g.fillStyle = color;
  g.strokeStyle = "rgba(255,255,255,.86)";
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(0, -21 * k);
  g.lineTo(4.2 * k, -5 * k);
  g.lineTo(21 * k, 5 * k);
  g.lineTo(21 * k, 10 * k);
  g.lineTo(4 * k, 8 * k);
  g.lineTo(3 * k, 15 * k);
  g.lineTo(9 * k, 19 * k);
  g.lineTo(9 * k, 22 * k);
  g.lineTo(0, 18 * k);
  g.lineTo(-9 * k, 22 * k);
  g.lineTo(-9 * k, 19 * k);
  g.lineTo(-3 * k, 15 * k);
  g.lineTo(-4 * k, 8 * k);
  g.lineTo(-21 * k, 10 * k);
  g.lineTo(-21 * k, 5 * k);
  g.lineTo(-4.2 * k, -5 * k);
  g.closePath();
  g.fill();
  g.shadowBlur = 0;
  g.stroke();
  return g.getImageData(0, 0, size, size);
}

function aircraftToFeatures(list: Aircraft[]): FeatureCollection<Point> {
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
          callsign: (a.callsign || a.icao24).trim().toUpperCase(),
          country: a.originCountry,
          heading: a.heading ?? 0,
          onGround: a.onGround,
          verticalRate: a.verticalRate ?? 0,
          speed: a.velocity ?? 0,
          altitude: a.baroAltitude ?? 0,
        },
      })),
  };
}

function airportFeatures(): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: AIRPORTS.map((airport) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [airport.lng, airport.lat] },
      properties: airport,
    })),
  };
}

function toRad(v: number) {
  return (v * Math.PI) / 180;
}

function toDeg(v: number) {
  return (v * 180) / Math.PI;
}

function greatCircle(a: [number, number], b: [number, number], n = 96): [number, number][] {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const p1 = toRad(lat1);
  const p2 = toRad(lat2);
  const l1 = toRad(lng1);
  const l2 = toRad(lng2);
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2,
      ),
    );
  if (!Number.isFinite(d) || d === 0) return [a, b];
  return Array.from({ length: n + 1 }, (_, i) => {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
    const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
    const z = A * Math.sin(p1) + B * Math.sin(p2);
    return [toDeg(Math.atan2(y, x)), toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)))];
  });
}

function splitAtDateline(points: [number, number][]) {
  const segments: [number, number][][] = [];
  let current: [number, number][] = [];
  points.forEach((point, index) => {
    if (index > 0 && Math.abs(point[0] - points[index - 1][0]) > 180) {
      if (current.length > 1) segments.push(current);
      current = [];
    }
    current.push(point);
  });
  if (current.length > 1) segments.push(current);
  return segments;
}

function routeToFeatures(
  route: FlightRoute | null,
  current: [number, number] | null,
): FeatureCollection<LineString> {
  const features: Feature<LineString>[] = [];
  if (!route) return { type: "FeatureCollection", features };
  const dep = route.dep ? ([route.dep.lng, route.dep.lat] as [number, number]) : null;
  const arr = route.arr ? ([route.arr.lng, route.arr.lat] as [number, number]) : null;
  const push = (a: [number, number] | null, b: [number, number] | null, kind: string) => {
    if (!a || !b) return;
    for (const coordinates of splitAtDateline(greatCircle(a, b))) {
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates },
        properties: { kind },
      });
    }
  };
  if (current) {
    push(dep, current, "past");
    push(current, arr, "future");
  } else {
    push(dep, arr, "future");
  }
  return { type: "FeatureCollection", features };
}

function endpointFeatures(route: FlightRoute | null): FeatureCollection<Point> {
  if (!route) return { type: "FeatureCollection", features: [] };
  return {
    type: "FeatureCollection",
    features: [route.dep, route.arr].filter(Boolean).map((airport, index) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [airport!.lng, airport!.lat] },
      properties: {
        label: airport!.iata || airport!.icao || (index === 0 ? "DEP" : "ARR"),
        kind: index === 0 ? "Departure" : "Arrival",
        name: airport!.name || airport!.city || "",
      },
    })),
  };
}

function trailFeature(points: [number, number][]): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features:
      points.length > 1
        ? [
            {
              type: "Feature",
              geometry: { type: "LineString", coordinates: points },
              properties: {},
            },
          ]
        : [],
  };
}

function addImages(map: MLMap) {
  const images = {
    "plane-cruise": "#ffcb32",
    "plane-climb": "#36d399",
    "plane-descend": "#38bdf8",
    "plane-ground": "#f97316",
    "plane-selected": "#ffffff",
  };
  Object.entries(images).forEach(([name, color]) => {
    if (!map.hasImage(name)) map.addImage(name, makePlaneImage(color), { pixelRatio: 2 });
  });
}

function addSourcesAndLayers(map: MLMap, markerSize: number) {
  if (!map.getSource(AIRPORT_SRC))
    map.addSource(AIRPORT_SRC, { type: "geojson", data: airportFeatures() });
  if (!map.getSource(TRAIL_SRC))
    map.addSource(TRAIL_SRC, { type: "geojson", data: trailFeature([]) });
  if (!map.getSource(ROUTE_SRC))
    map.addSource(ROUTE_SRC, { type: "geojson", data: routeToFeatures(null, null) });
  if (!map.getSource(ENDPOINT_SRC))
    map.addSource(ENDPOINT_SRC, { type: "geojson", data: endpointFeatures(null) });
  if (!map.getSource(SRC)) map.addSource(SRC, { type: "geojson", data: aircraftToFeatures([]) });

  if (!map.getLayer(AIRPORT_LAYER)) {
    map.addLayer({
      id: AIRPORT_LAYER,
      type: "circle",
      source: AIRPORT_SRC,
      minzoom: 2.4,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 2.5, 7, 5, 11, 8],
        "circle-color": "#8df4ff",
        "circle-opacity": 0.72,
        "circle-stroke-color": "rgba(255,255,255,.72)",
        "circle-stroke-width": 1,
      },
    });
  }
  if (!map.getLayer(AIRPORT_LABEL)) {
    map.addLayer({
      id: AIRPORT_LABEL,
      type: "symbol",
      source: AIRPORT_SRC,
      minzoom: 4.2,
      layout: {
        "text-field": ["get", "code"],
        "text-size": 11,
        "text-offset": [0, 1.25],
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
      },
      paint: {
        "text-color": "#83e9ff",
        "text-halo-color": "rgba(5,9,15,.86)",
        "text-halo-width": 1.2,
      },
    });
  }
  if (!map.getLayer(ROUTE_GLOW)) {
    map.addLayer({
      id: ROUTE_GLOW,
      type: "line",
      source: ROUTE_SRC,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#facc15", "line-width": 10, "line-opacity": 0.22, "line-blur": 8 },
    });
  }
  if (!map.getLayer(ROUTE_PAST)) {
    map.addLayer({
      id: ROUTE_PAST,
      type: "line",
      source: ROUTE_SRC,
      filter: ["==", ["get", "kind"], "past"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#facc15", "line-width": 3.5, "line-opacity": 0.95 },
    });
  }
  if (!map.getLayer(ROUTE_FUTURE)) {
    map.addLayer({
      id: ROUTE_FUTURE,
      type: "line",
      source: ROUTE_SRC,
      filter: ["==", ["get", "kind"], "future"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#ffffff",
        "line-width": 2.4,
        "line-opacity": 0.75,
        "line-dasharray": [2, 2],
      },
    });
  }
  if (!map.getLayer(TRAIL_LAYER)) {
    map.addLayer({
      id: TRAIL_LAYER,
      type: "line",
      source: TRAIL_SRC,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#facc15", "line-width": 2, "line-opacity": 0.75 },
    });
  }
  if (!map.getLayer(ENDPOINT_LAYER)) {
    map.addLayer({
      id: ENDPOINT_LAYER,
      type: "circle",
      source: ENDPOINT_SRC,
      paint: {
        "circle-radius": 7,
        "circle-color": "#0b1220",
        "circle-stroke-color": "#facc15",
        "circle-stroke-width": 2,
      },
    });
  }
  if (!map.getLayer(ENDPOINT_LABEL)) {
    map.addLayer({
      id: ENDPOINT_LABEL,
      type: "symbol",
      source: ENDPOINT_SRC,
      layout: {
        "text-field": ["get", "label"],
        "text-size": 12,
        "text-offset": [0, 1.6],
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
      },
      paint: {
        "text-color": "#facc15",
        "text-halo-color": "rgba(5,9,15,.92)",
        "text-halo-width": 1.5,
      },
    });
  }
  if (!map.getLayer(HALO_LAYER)) {
    map.addLayer({
      id: HALO_LAYER,
      type: "circle",
      source: SRC,
      paint: {
        "circle-radius": ["case", ["boolean", ["feature-state", "selected"], false], 22, 0],
        "circle-color": "#facc15",
        "circle-opacity": 0.2,
        "circle-blur": 0.4,
      },
    });
  }
  if (!map.getLayer(LAYER)) {
    map.addLayer({
      id: LAYER,
      type: "symbol",
      source: SRC,
      layout: {
        "icon-image": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          "plane-selected",
          ["get", "onGround"],
          "plane-ground",
          ["<", ["get", "verticalRate"], -1],
          "plane-descend",
          [">", ["get", "verticalRate"], 1],
          "plane-climb",
          "plane-cruise",
        ],
        "icon-rotate": ["get", "heading"],
        "icon-rotation-alignment": "map",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          2,
          0.22 * markerSize,
          6,
          0.36 * markerSize,
          10,
          0.55 * markerSize,
          14,
          0.76 * markerSize,
        ],
      },
    });
  }
  if (!map.getLayer(LABEL_LAYER)) {
    map.addLayer({
      id: LABEL_LAYER,
      type: "symbol",
      source: SRC,
      minzoom: 6,
      layout: {
        "text-field": ["get", "callsign"],
        "text-size": 11,
        "text-offset": [1.8, 0],
        "text-anchor": "left",
        "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#f8fafc",
        "text-halo-color": "rgba(0,0,0,.78)",
        "text-halo-width": 1.25,
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
  animations = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const readyRef = useRef(false);
  const aircraftRef = useRef(aircraft);
  const markerSizeRef = useRef(markerSize);
  const onSelectRef = useRef(onSelect);
  const onViewportChangeRef = useRef(onViewportChange);
  const routeRef = useRef(route);
  const routeCurrentRef = useRef<[number, number] | null>(null);
  const initialMapStyleRef = useRef(mapStyle);
  const previousFeatureRef = useRef<FeatureCollection<Point>>(aircraftToFeatures([]));
  const frameRef = useRef<number | null>(null);
  const selectedRef = useRef<string | null>(null);
  const trailRef = useRef<Map<string, [number, number][]>>(new Map());

  const routeCurrent = useMemo<[number, number] | null>(() => {
    const selected = selectedIcao ? aircraft.find((a) => a.icao24 === selectedIcao) : null;
    return selected?.longitude !== null && selected?.latitude !== null && selected
      ? [selected.longitude, selected.latitude]
      : null;
  }, [aircraft, selectedIcao]);

  useEffect(() => {
    aircraftRef.current = aircraft;
  }, [aircraft]);

  useEffect(() => {
    markerSizeRef.current = markerSize;
  }, [markerSize]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    routeRef.current = route;
    routeCurrentRef.current = routeCurrent;
  }, [route, routeCurrent]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: rasterStyle(initialMapStyleRef.current),
      center: [79.9, 7.2],
      zoom: 4.5,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      maxPitch: 0,
    });
    mapRef.current = map;
    popupRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 16,
      className: "aeroflow-popup",
    });

    map.addControl(
      new NavigationControl({ showCompass: true, visualizePitch: false }),
      "top-right",
    );
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

    const publish = () => {
      const b = map.getBounds();
      onViewportChangeRef.current(
        [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()],
        { lng: map.getCenter().lng, lat: map.getCenter().lat },
        map.getZoom(),
      );
    };

    const setup = () => {
      addImages(map);
      addSourcesAndLayers(map, markerSizeRef.current);
      readyRef.current = true;
      (map.getSource(SRC) as maplibregl.GeoJSONSource).setData(
        aircraftToFeatures(aircraftRef.current),
      );
      publish();
    };

    map.on("load", setup);
    map.on("moveend", publish);
    map.on("mouseenter", LAYER, (e) => {
      map.getCanvas().style.cursor = "pointer";
      const feature = e.features?.[0];
      if (!feature || feature.geometry.type !== "Point") return;
      const [lng, lat] = (feature.geometry as Point).coordinates as [number, number];
      popupRef.current
        ?.setLngLat([lng, lat])
        .setHTML(
          `<strong>${feature.properties?.callsign}</strong><span>${feature.properties?.country}</span>`,
        )
        .addTo(map);
    });
    map.on("mouseleave", LAYER, () => {
      map.getCanvas().style.cursor = "";
      popupRef.current?.remove();
    });
    map.on("click", LAYER, (e) => {
      const icao24 = e.features?.[0]?.properties?.icao24 as string | undefined;
      if (icao24) onSelectRef.current(icao24);
    });

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const next = aircraftToFeatures(aircraft);
    const src = map.getSource(SRC) as maplibregl.GeoJSONSource;

    for (const feature of next.features) {
      const id = String(feature.id);
      const coords = feature.geometry.coordinates as [number, number];
      const trail = trailRef.current.get(id) ?? [];
      const last = trail[trail.length - 1];
      if (
        !last ||
        Math.abs(last[0] - coords[0]) > 0.0001 ||
        Math.abs(last[1] - coords[1]) > 0.0001
      ) {
        trailRef.current.set(id, [...trail.slice(-18), coords]);
      }
    }

    if (!animations) {
      src.setData(next);
      previousFeatureRef.current = next;
      return;
    }

    const previousById = new Map(
      previousFeatureRef.current.features.map((feature) => [feature.id, feature]),
    );
    const started = performance.now();
    const duration = 1450;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - (1 - t) ** 3;
      const features = next.features.map((feature) => {
        const previous = previousById.get(feature.id);
        if (!previous) return feature;
        const a = previous.geometry.coordinates as [number, number];
        const b = feature.geometry.coordinates as [number, number];
        if (Math.abs(a[0] - b[0]) > 180) return feature;
        return {
          ...feature,
          geometry: {
            ...feature.geometry,
            coordinates: [a[0] + (b[0] - a[0]) * eased, a[1] + (b[1] - a[1]) * eased],
          },
        };
      });
      src.setData({ type: "FeatureCollection", features });
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    previousFeatureRef.current = next;
  }, [aircraft, animations]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    readyRef.current = false;
    map.setStyle(rasterStyle(mapStyle));
    map.once("style.load", () => {
      addImages(map);
      addSourcesAndLayers(map, markerSizeRef.current);
      readyRef.current = true;
      previousFeatureRef.current = aircraftToFeatures(aircraftRef.current);
      (map.getSource(SRC) as maplibregl.GeoJSONSource).setData(previousFeatureRef.current);
      (map.getSource(ROUTE_SRC) as maplibregl.GeoJSONSource).setData(
        routeToFeatures(routeRef.current, routeCurrentRef.current),
      );
      (map.getSource(ENDPOINT_SRC) as maplibregl.GeoJSONSource).setData(
        endpointFeatures(routeRef.current),
      );
    });
  }, [mapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    if (selectedRef.current) {
      map.setFeatureState({ source: SRC, id: selectedRef.current }, { selected: false });
    }
    selectedRef.current = selectedIcao;
    if (selectedIcao) {
      map.setFeatureState({ source: SRC, id: selectedIcao }, { selected: true });
    }
  }, [selectedIcao, aircraft]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    (map.getSource(ROUTE_SRC) as maplibregl.GeoJSONSource | undefined)?.setData(
      routeToFeatures(selectedIcao ? route : null, routeCurrent),
    );
    (map.getSource(ENDPOINT_SRC) as maplibregl.GeoJSONSource | undefined)?.setData(
      endpointFeatures(selectedIcao ? route : null),
    );
    const trail = selectedIcao ? (trailRef.current.get(selectedIcao) ?? []) : [];
    (map.getSource(TRAIL_SRC) as maplibregl.GeoJSONSource | undefined)?.setData(
      trailFeature(trail),
    );
  }, [route, selectedIcao, routeCurrent]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusIcao) return;
    const target = aircraft.find((a) => a.icao24 === focusIcao);
    if (!target || target.longitude === null || target.latitude === null) return;
    map.flyTo({
      center: [target.longitude, target.latitude],
      zoom: Math.max(map.getZoom(), 7),
      speed: 1.35,
    });
  }, [focusIcao, aircraft]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" aria-label="Interactive flight map" />
    </div>
  );
}
