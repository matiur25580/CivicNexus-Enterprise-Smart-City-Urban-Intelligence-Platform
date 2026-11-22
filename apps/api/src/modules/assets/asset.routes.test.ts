import express from "express";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import type { AuthenticatedPrincipal } from "@civicnexus/contracts";
import { HttpError } from "../../lib/http-error.js";
import { createAssetRouter } from "./asset.routes.js";
import { AssetRepository } from "./asset.repository.js";
import type { AssetPersistence } from "./asset.repository.js";

const operator: AuthenticatedPrincipal = {
  userId: "operator-1",
  tenantId: "tenant-a",
  role: "city_operator",
  jurisdictionIds: ["ward-1"],
};
const analyst: AuthenticatedPrincipal = {
  ...operator,
  userId: "analyst-1",
  role: "analyst",
};

const sampleAsset = {
  _id: "asset-1",
  tenantId: "tenant-a",
  jurisdictionId: "ward-1",
  name: "Central Library",
  description: "",
  category: "building" as const,
  location: { type: "Point" as const, coordinates: [88.36, 22.57] as [number, number] },
  status: "active" as const,
  createdBy: operator.userId,
  updatedBy: operator.userId,
};

function makePersistence(): AssetPersistence {
  return {
    insert: async (record) => ({ ...record, _id: "asset-1" }),
    findMany: async () => [sampleAsset],
    findOne: async () => sampleAsset,
    updateOne: async (_filter, update) => ({ ...sampleAsset, ...update.$set }),
    deleteOne: async () => true,
  };
}

async function startServer(principal?: AuthenticatedPrincipal) {
  const app = express();
  app.use(express.json());
  app.use((request, _response, next) => {
    if (principal) request.auth = principal;
    next();
  });
  app.use("/api/v1/assets", createAssetRouter(new AssetRepository(makePersistence())));
  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const status = error instanceof HttpError ? error.statusCode : 500;
    response.status(status).json({ error: { code: error instanceof HttpError ? error.code : "TEST_ERROR" } });
  });
  const server: Server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP address");
  return {
    baseUrl: `http://127.0.0.1:${address.port}/api/v1/assets`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

const servers: Array<{ close: () => Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe("asset HTTP routes", () => {
  it("requires authentication", async () => {
    const server = await startServer();
    servers.push(server);
    const response = await fetch(server.baseUrl);
    expect(response.status).toBe(401);
  });

  it("allows an authorized operator to create and list assets", async () => {
    const server = await startServer(operator);
    servers.push(server);
    const created = await fetch(server.baseUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jurisdictionId: "ward-1",
        name: "Central Library",
        category: "building",
        location: { type: "Point", coordinates: [88.36, 22.57] },
      }),
    });
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({ data: { tenantId: "tenant-a", createdBy: "operator-1" } });

    const listed = await fetch(server.baseUrl);
    expect(listed.status).toBe(200);
    expect(await listed.json()).toMatchObject({ meta: { count: 1 }, data: [{ _id: "asset-1" }] });
  });

  it("denies write routes to read-only analysts", async () => {
    const server = await startServer(analyst);
    servers.push(server);
    const response = await fetch(`${server.baseUrl}/asset-1`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Changed" }),
    });
    expect(response.status).toBe(403);
  });

  it("returns a consistent not-found response for inaccessible assets", async () => {
    const persistence = makePersistence();
    persistence.findOne = async () => null;
    const app = express();
    app.use(express.json());
    app.use((request, _response, next) => { request.auth = operator; next(); });
    app.use("/api/v1/assets", createAssetRouter(new AssetRepository(persistence)));
    app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
      response.status(error instanceof HttpError ? error.statusCode : 500)
        .json({ error: { code: error instanceof HttpError ? error.code : "TEST_ERROR" } });
    });
    const server: Server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");
    const testServer = {
      baseUrl: `http://127.0.0.1:${address.port}/api/v1/assets`,
      close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
    };
    servers.push(testServer);
    const response = await fetch(`${testServer.baseUrl}/asset-outside-scope`);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: "ASSET_NOT_FOUND" } });
  });

  it("rejects multi-valued tenant selection rather than guessing a scope", async () => {
    const server = await startServer(operator);
    servers.push(server);
    const response = await fetch(`${server.baseUrl}?tenantId=tenant-a&tenantId=tenant-b`);
    expect(response.status).toBe(400);
  });
});
