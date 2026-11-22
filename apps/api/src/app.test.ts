import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { app } from "./app.js";

describe("API foundation", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected a TCP server address");
    baseUrl = "http://127.0.0.1:" + address.port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  it("exposes a versioned API discovery endpoint with a correlation ID", async () => {
    const response = await fetch(baseUrl + "/api/v1");
    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    await expect(response.json()).resolves.toMatchObject({ name: "CivicNexus API", version: "v1" });
  });

  it("preserves a valid caller-supplied correlation ID", async () => {
    const response = await fetch(baseUrl + "/api/v1", { headers: { "x-request-id": "integration-test-42" } });
    expect(response.headers.get("x-request-id")).toBe("integration-test-42");
  });

  it("returns a consistent not-found envelope with a request ID", async () => {
    const response = await fetch(baseUrl + "/not-a-route");
    expect(response.status).toBe(404);
    const payload = await response.json();
    expect(payload).toMatchObject({
      error: { code: "NOT_FOUND", message: "The requested resource was not found.", requestId: response.headers.get("x-request-id") },
    });
  });

  it("returns a safe error for malformed JSON", async () => {
    const response = await fetch(baseUrl + "/api/v1/health", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid",
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_JSON", message: "The request body contains invalid JSON." },
    });
  });
});
