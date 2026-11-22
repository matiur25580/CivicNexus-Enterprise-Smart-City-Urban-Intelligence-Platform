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
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  it("exposes a versioned API discovery endpoint", async () => {
    const response = await fetch(`${baseUrl}/api/v1`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ name: "CivicNexus API", version: "v1" });
  });

  it("returns a consistent not-found envelope", async () => {
    const response = await fetch(`${baseUrl}/not-a-route`);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "NOT_FOUND", message: "The requested resource was not found." },
    });
  });
});