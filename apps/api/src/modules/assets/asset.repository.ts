import type { AuthenticatedPrincipal } from "@civicnexus/contracts";
import type { FilterQuery, UpdateQuery } from "mongoose";
import { HttpError } from "../../lib/http-error.js";
import {
  assertJurisdictionAssignment,
  buildJurisdictionScopedFilter,
} from "../identity/scoped-query.js";
import { Asset } from "./asset.model.js";
import type { AssetRecord } from "./asset.model.js";
import {
  assetCreateSchema,
  assetListQuerySchema,
  assetUpdateSchema,
} from "./asset.schema.js";
import type { AssetCreateInput, AssetListQuery, AssetUpdateInput } from "./asset.schema.js";

export interface AssetPersistence {
  insert(record: AssetRecord): Promise<unknown>;
  findMany(filter: FilterQuery<AssetRecord>, limit: number): Promise<AssetRecord[]>;
  findOne(filter: FilterQuery<AssetRecord>): Promise<AssetRecord | null>;
  updateOne(filter: FilterQuery<AssetRecord>, update: UpdateQuery<AssetRecord>): Promise<AssetRecord | null>;
  deleteOne(filter: FilterQuery<AssetRecord>): Promise<boolean>;
}

// Isolate MongoDB operations behind the persistence interface so asset workflows can use a consistent data boundary.
const mongoAssetPersistence: AssetPersistence = {
  async insert(record) {
    return Asset.create(record);
  },
  async findMany(filter, limit) {
    return Asset.find(filter).sort({ createdAt: -1 }).limit(limit).lean().exec() as Promise<AssetRecord[]>;
  },
  async findOne(filter) {
    return Asset.findOne(filter).lean().exec() as Promise<AssetRecord | null>;
  },
  async updateOne(filter, update) {
    return Asset.findOneAndUpdate(filter, update, { new: true, runValidators: true })
      .lean().exec() as Promise<AssetRecord | null>;
  },
  async deleteOne(filter) {
    const result = await Asset.deleteOne(filter).exec();
    return result.deletedCount === 1;
  },
};

function parseInput<T>(result: { success: boolean; data?: T }): T {
  if (!result.success || result.data === undefined) {
    throw new HttpError(400, "INVALID_ASSET_INPUT", "The supplied asset data is invalid.");
  }
  return result.data;
}

/** Every operation derives its tenant and jurisdiction scope from the verified principal. */
export class AssetRepository {
  constructor(private readonly persistence: AssetPersistence = mongoAssetPersistence) {}

  async create(
    principal: AuthenticatedPrincipal,
    input: unknown,
    requestedTenantId?: string,
  ): Promise<unknown> {
    const data: AssetCreateInput = parseInput(assetCreateSchema.safeParse(input));
    const tenantId = assertJurisdictionAssignment(principal, data.jurisdictionId, requestedTenantId);
    return this.persistence.insert({
      ...data,
      tenantId,
      createdBy: principal.userId,
      updatedBy: principal.userId,
    });
  }

  async list(
    principal: AuthenticatedPrincipal,
    query: unknown = {},
    requestedTenantId?: string,
  ): Promise<AssetRecord[]> {
    const parsed: AssetListQuery = parseInput(assetListQuerySchema.safeParse(query));
    const filter = buildJurisdictionScopedFilter<AssetRecord>(
      principal,
      { status: parsed.status, category: parsed.category },
      requestedTenantId,
    );
    return this.persistence.findMany(filter, parsed.limit);
  }

  async getById(
    principal: AuthenticatedPrincipal,
    assetId: string,
    requestedTenantId?: string,
  ): Promise<AssetRecord | null> {
    if (!assetId || assetId.length > 128) {
      throw new HttpError(400, "INVALID_ASSET_ID", "A valid asset identifier is required.");
    }
    const filter = buildJurisdictionScopedFilter<AssetRecord>(principal, { _id: assetId }, requestedTenantId);
    return this.persistence.findOne(filter);
  }

  async update(
    principal: AuthenticatedPrincipal,
    assetId: string,
    input: unknown,
    requestedTenantId?: string,
  ): Promise<AssetRecord | null> {
    if (!assetId || assetId.length > 128) {
      throw new HttpError(400, "INVALID_ASSET_ID", "A valid asset identifier is required.");
    }
    const data: AssetUpdateInput = parseInput(assetUpdateSchema.safeParse(input));
    const filter = buildJurisdictionScopedFilter<AssetRecord>(principal, { _id: assetId }, requestedTenantId);
    return this.persistence.updateOne(filter, { $set: { ...data, updatedBy: principal.userId } });
  }

  async delete(
    principal: AuthenticatedPrincipal,
    assetId: string,
    requestedTenantId?: string,
  ): Promise<boolean> {
    if (!assetId || assetId.length > 128) {
      throw new HttpError(400, "INVALID_ASSET_ID", "A valid asset identifier is required.");
    }
    const filter = buildJurisdictionScopedFilter<AssetRecord>(principal, { _id: assetId }, requestedTenantId);
    return this.persistence.deleteOne(filter);
  }
}
