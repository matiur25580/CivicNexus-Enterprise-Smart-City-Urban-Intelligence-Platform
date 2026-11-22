export interface HealthResponse {
  status: "ok" | "initializing";
  service: string;
  timestamp: string;
}

export interface ApiError {
  error: { code: string; message: string; requestId?: string };
}

/** GeoJSON positions use WGS84 longitude, latitude order, with optional altitude. */
export type GeoJsonPosition = [longitude: number, latitude: number, ...altitude: number[]];

export interface GeoJsonPoint {
  type: "Point";
  coordinates: GeoJsonPosition;
}

export interface GeoJsonPolygon {
  type: "Polygon";
  /** Each linear ring is closed; the first ring is the exterior boundary. */
  coordinates: GeoJsonPosition[][];
}

export type GeoJsonGeometry = GeoJsonPoint | GeoJsonPolygon;

export interface GeoJsonFeature<Properties extends Record<string, unknown> = Record<string, unknown>> {
  type: "Feature";
  id?: string | number;
  geometry: GeoJsonGeometry | null;
  properties: Properties;
}

export interface GeoJsonFeatureCollection<Properties extends Record<string, unknown> = Record<string, unknown>> {
  type: "FeatureCollection";
  features: GeoJsonFeature<Properties>[];
}
