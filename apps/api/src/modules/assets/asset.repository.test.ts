import { describe, expect, it } from "vitest";
import type { AuthenticatedPrincipal } from "@civicnexus/contracts";
import type { FilterQuery, UpdateQuery } from "mongoose";
import { HttpError } from "../../lib/http-error.js";
import { AssetRepository } from "./asset.repository.js";
import type { AssetPersistence } from "./asset.repository.js";
import type { AssetRecord } from "./asset.model.js";

const operator: AuthenticatedPrincipal = {
  userId: "operator-1",
  tenantId: "tenant-north",
  role: "city_operator",
  jurisdictionIds: ["district-1"],
};

function createFakePersistence(): {
  store: AssetPersistence;
  calls: { insert?: AssetRecord; filters: FilterQuery<AssetRecord>[]; update?: UpdateQuery<AssetRecord> };
} {
  const calls: { insert?: AssetRecord; filters: FilterQuery<AssetRecord>[]; update?: UpdateQuery<AssetRecord> } = {
    filters: [],
  };
  const store: AssetPersistence = {
    async insert(record) { calls.insert = record; return record; },
    async findMany(filter) { calls.filters.push(filter); return []; },
    async findOne(filter) { calls.filters.push(filter); return null; },
    async updateOne(filter, update) { calls.filters.push(filter); calls.update = update; return null; },
    async deleteOne(filter) { calls.filters.push(filter); return true; },
  };
  return { store, calls };
}

const validAsset = {
  jurisdictionId: "district-1",
  name: "Central Library",
  description: "Public library",
  category: "building",
  location: { type: "Point", coordinates: [88.3639, 22.5726] },
};

describe("tenant-scoped geospatial asset repository", () => {
  it("derives tenant and audit identity from the verified principal on create", async () => {
    const { store, calls } = createFakePersistence();
    await new AssetRepository(store).create(operator, validAsset);
    expect(calls.insert).toMatchObject({
      tenantId: "tenant-north",
      jurisdictionId: "district-1",
      createdBy: "operator-1",
      updatedBy: "operator-1",
      location: validAsset.location,
    });
  });

  it("rejects creation in another tenant or unassigned jurisdiction", async () => {
    const { store, calls } = createFakePersistence();
    const repository = new AssetRepository(store);
    await expect(repository.create(operator, validAsset, "tenant-south")).rejects.toMatchObject({
      code: "TENANT_ACCESS_DENIED",
    });
    await expect(repository.create(operator, { ...validAsset, jurisdictionId: "district-2" })).rejects.toMatchObject({
      code: "JURISDICTION_ACCESS_DENIED",
    });
    expect(calls.insert).toBeUndefined();
  });

  it("rejects client attempts to assign tenant ownership", async () => {
    const { store, calls } = createFakePersistence();
    await expect(new AssetRepository(store).create(operator, {
      ...validAsset,
      tenantId: "tenant-south",
    })).rejects.toBeInstanceOf(HttpError);
    expect(calls.insert).toBeUndefined();
  });

  it("scopes list, detail, update, and delete to tenant and assigned jurisdictions", async () => {
    const { store, calls } = createFakePersistence();
    const repository = new AssetRepository(store);
    await repository.list(operator, { status: "active" });
    await repository.getById(operator, "asset-1");
    await repository.update(operator, "asset-1", { status: "inactive" });
    await repository.delete(operator, "asset-1");
    expect(calls.filters).toHaveLength(4);
    for (const filter of calls.filters) {
      expect(filter).toMatchObject({
        $and: expect.arrayContaining([
          { tenantId: "tenant-north" },
          { jurisdictionId: { $in: ["district-1"] } },
        ]),
      });
    }
  });

  it("does not allow updates to tenant or jurisdiction ownership", async () => {
    const { store, calls } = createFakePersistence();
    await expect(new AssetRepository(store).update(operator, "asset-1", {
      tenantId: "tenant-south",
    })).rejects.toBeInstanceOf(HttpError);
    await expect(new AssetRepository(store).update(operator, "asset-1", {
      jurisdictionId: "district-2",
    })).rejects.toBeInstanceOf(HttpError);
    expect(calls.update).toBeUndefined();
  });

  it("uses the authenticated actor for update audit metadata", async () => {
    const { store, calls } = createFakePersistence();
    await new AssetRepository(store).update(operator, "asset-1", { name: "Renamed Library" });
    expect(calls.update).toEqual({ $set: { name: "Renamed Library", updatedBy: "operator-1" } });
  });

  it("requires explicit tenant selection for platform administrators", async () => {
    const { store, calls } = createFakePersistence();
    const platformAdmin: AuthenticatedPrincipal = {
      userId: "platform-1", tenantId: "platform", role: "platform_admin", jurisdictionIds: [],
    };
    const repository = new AssetRepository(store);
    await expect(repository.list(platformAdmin)).rejects.toMatchObject({ code: "TENANT_SCOPE_REQUIRED" });
    await repository.create(platformAdmin, { ...validAsset, jurisdictionId: "any-district" }, "tenant-south");
    expect(calls.insert?.tenantId).toBe("tenant-south");
  });

  it("rejects malformed GeoJSON and invalid list filters before persistence", async () => {
    const { store, calls } = createFakePersistence();
    const repository = new AssetRepository(store);
    await expect(repository.create(operator, {
      ...validAsset,
      location: { type: "Point", coordinates: [190, 22] },
    })).rejects.toMatchObject({ code: "INVALID_ASSET_INPUT" });
    await expect(repository.list(operator, { $where: "true" })).rejects.toMatchObject({
      code: "INVALID_ASSET_INPUT",
    });
    expect(calls.insert).toBeUndefined();
    expect(calls.filters).toHaveLength(0);
  });
});
