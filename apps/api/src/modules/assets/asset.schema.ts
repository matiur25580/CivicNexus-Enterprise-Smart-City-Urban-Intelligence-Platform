import { z } from "zod";
import { geoJsonPointSchema } from "../geospatial/geojson.schema.js";

const assetText = (max: number) => z.string().trim().min(1).max(max);

export const assetCreateSchema = z.object({
  jurisdictionId: assetText(128),
  name: assetText(160),
  description: z.string().trim().max(2_000).default(""),
  category: z.enum(["building", "road", "bridge", "utility", "vehicle", "public_space", "other"]),
  location: geoJsonPointSchema,
  status: z.enum(["active", "inactive", "under_maintenance", "retired"]).default("active"),
}).strict();

export const assetUpdateSchema = z.object({
  name: assetText(160).optional(),
  description: z.string().trim().max(2_000).optional(),
  category: z.enum(["building", "road", "bridge", "utility", "vehicle", "public_space", "other"]).optional(),
  location: geoJsonPointSchema.optional(),
  status: z.enum(["active", "inactive", "under_maintenance", "retired"]).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one mutable asset field must be supplied.",
});

export const assetListQuerySchema = z.object({
  status: z.enum(["active", "inactive", "under_maintenance", "retired"]).optional(),
  category: z.enum(["building", "road", "bridge", "utility", "vehicle", "public_space", "other"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict();

export type AssetCreateInput = z.infer<typeof assetCreateSchema>;
export type AssetUpdateInput = z.infer<typeof assetUpdateSchema>;
export type AssetListQuery = z.infer<typeof assetListQuerySchema>;
