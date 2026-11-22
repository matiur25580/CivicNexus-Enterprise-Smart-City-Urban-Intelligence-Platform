import { Router } from "express";
import type { RequestHandler } from "express";
import { HttpError } from "../../lib/http-error.js";
import {
  requireAuthenticated,
  requirePermission,
} from "../identity/authorization.js";
import { AssetRepository } from "./asset.repository.js";

function assetId(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 128) {
    throw new HttpError(400, "INVALID_ASSET_ID", "A valid asset identifier is required.");
  }
  return value;
}

function requestedTenantId(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 128) {
    throw new HttpError(400, "INVALID_TENANT_SCOPE", "tenantId must be a single non-empty identifier.");
  }
  return value;
}

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

/** Creates the asset HTTP surface; repository injection keeps route tests isolated from MongoDB. */
export function createAssetRouter(repository: AssetRepository = new AssetRepository()) {
  const router = Router();
  router.use(requireAuthenticated);

  router.post("/", requirePermission("assets:write"), asyncRoute(async (request, response) => {
    const tenantId = requestedTenantId(request.query.tenantId);
    const asset = await repository.create(request.auth!, request.body, tenantId);
    response.status(201).json({ data: asset });
  }));

  router.get("/", requirePermission("assets:read"), asyncRoute(async (request, response) => {
    const tenantId = requestedTenantId(request.query.tenantId);
    const { tenantId: _tenant, ...filters } = request.query;
    const assets = await repository.list(request.auth!, filters, tenantId);
    response.status(200).json({ data: assets, meta: { count: assets.length } });
  }));

  router.get("/:id", requirePermission("assets:read"), asyncRoute(async (request, response) => {
    const tenantId = requestedTenantId(request.query.tenantId);
    const asset = await repository.getById(request.auth!, assetId(request.params.id), tenantId);
    if (!asset) throw new HttpError(404, "ASSET_NOT_FOUND", "The requested asset was not found.");
    response.status(200).json({ data: asset });
  }));

  router.patch("/:id", requirePermission("assets:write"), asyncRoute(async (request, response) => {
    const tenantId = requestedTenantId(request.query.tenantId);
    const asset = await repository.update(request.auth!, request.params.id!, request.body, tenantId);
    if (!asset) throw new HttpError(404, "ASSET_NOT_FOUND", "The requested asset was not found.");
    response.status(200).json({ data: asset });
  }));

  router.delete("/:id", requirePermission("assets:write"), asyncRoute(async (request, response) => {
    const tenantId = requestedTenantId(request.query.tenantId);
    const deleted = await repository.delete(request.auth!, request.params.id!, tenantId);
    if (!deleted) throw new HttpError(404, "ASSET_NOT_FOUND", "The requested asset was not found.");
    response.status(204).end();
  }));

  return router;
}
