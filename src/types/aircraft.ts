// Shared aircraft/flight types (isomorphic — safe on client & server).

export type AircraftStateVector = [
  string,           // 0  icao24
  string | null,    // 1  callsign
  string,           // 2  origin_country
  number | null,    // 3  time_position
  number,           // 4  last_contact
  number | null,    // 5  longitude
  number | null,    // 6  latitude
  number | null,    // 7  baro_altitude (m)
  boolean,          // 8  on_ground
  number | null,    // 9  velocity (m/s)
  number | null,    // 10 true_track (deg)
  number | null,    // 11 vertical_rate (m/s)
  number[] | null,  // 12 sensors
  number | null,    // 13 geo_altitude (m)
  string | null,    // 14 squawk
  boolean,          // 15 spi
  number,           // 16 position_source
];

export interface Aircraft {
  icao24: string;
  callsign: string | null;
  originCountry: string;
  timePosition: number | null;
  lastContact: number;
  longitude: number | null;
  latitude: number | null;
  baroAltitude: number | null;
  onGround: boolean;
  velocity: number | null;
  heading: number | null;
  verticalRate: number | null;
  geoAltitude: number | null;
  squawk: string | null;
  spi: boolean;
  positionSource: number;
}

export interface FlightsResponse {
  time: number;
  aircraft: Aircraft[];
  count: number;
  bbox: [number, number, number, number] | null;
  cached: boolean;
  error?: string;
}
