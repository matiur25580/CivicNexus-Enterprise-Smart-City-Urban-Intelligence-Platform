export interface HealthResponse {
  status: "ok" | "initializing";
  service: string;
  timestamp: string;
}

export interface ApiError {
  error: { code: string; message: string; requestId?: string };
}

/** Identity context created only after a trusted authentication mechanism verifies a credential. */
export type CivicRole =
  | "platform_admin"
  | "tenant_admin"
  | "city_operator"
  | "analyst"
  | "emergency_responder"
  | "citizen";

export type CivicPermission =
  | "platform:manage"
  | "tenant:manage"
  | "users:manage"
  | "jurisdictions:read"
  | "assets:read"
  | "assets:write"
  | "incidents:read"
  | "incidents:write"
  | "work_orders:read"
  | "work_orders:write"
  | "analytics:read"
  | "citizen_requests:create"
  | "citizen_requests:read_own";

export interface AuthenticatedPrincipal {
  userId: string;
  tenantId: string;
  role: CivicRole;
  /** Jurisdictions explicitly assigned to the principal within their tenant. */
  jurisdictionIds: string[];
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
