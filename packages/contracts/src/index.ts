export interface HealthResponse {
  status: "ok" | "initializing";
  service: string;
  timestamp: string;
}
export interface ApiError {
  error: { code: string; message: string; requestId?: string };
}