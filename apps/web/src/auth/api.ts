import { getAccessToken } from "./keycloak";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1";

/** Authenticated API helper. Tokens remain in the Keycloak adapter's memory, never local storage. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(`${apiBase}/${path.replace(/^\/+/, "")}`, { ...init, headers });
}
