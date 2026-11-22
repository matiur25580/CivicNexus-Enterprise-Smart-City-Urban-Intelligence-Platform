import mongoose, { Schema } from "mongoose";
import type { Model } from "mongoose";
import type { GeoJsonPoint } from "@civicnexus/contracts";

export type AssetCategory = "building" | "road" | "bridge" | "utility" | "vehicle" | "public_space" | "other";
export type AssetStatus = "active" | "inactive" | "under_maintenance" | "retired";

export interface AssetRecord {
  tenantId: string;
  jurisdictionId: string;
  name: string;
  description: string;
  category: AssetCategory;
  location: GeoJsonPoint;
  status: AssetStatus;
  createdBy: string;
  updatedBy: string;
}

const pointSchema = new Schema({
  type: { type: String, enum: ["Point"], required: true },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator: (coordinates: number[]) =>
        coordinates.length >= 2 && coordinates[0]! >= -180 && coordinates[0]! <= 180 &&
        coordinates[1]! >= -90 && coordinates[1]! <= 90,
      message: "Location must use WGS84 longitude, latitude coordinates.",
    },
  },
}, { _id: false, strict: "throw" });

const assetSchema = new Schema<AssetRecord>({
  tenantId: { type: String, required: true, trim: true, minlength: 1, maxlength: 128, immutable: true },
  jurisdictionId: { type: String, required: true, trim: true, minlength: 1, maxlength: 128, immutable: true },
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 2_000, default: "" },
  category: {
    type: String, required: true,
    enum: ["building", "road", "bridge", "utility", "vehicle", "public_space", "other"],
  },
  location: { type: pointSchema, required: true },
  status: {
    type: String, required: true,
    enum: ["active", "inactive", "under_maintenance", "retired"],
    default: "active",
  },
  createdBy: { type: String, required: true, immutable: true },
  updatedBy: { type: String, required: true },
}, { timestamps: true, strict: "throw", versionKey: false });

assetSchema.index({ location: "2dsphere" }, { name: "asset_location_2dsphere" });
assetSchema.index({ tenantId: 1, jurisdictionId: 1, status: 1 }, { name: "asset_tenant_jurisdiction_status" });
assetSchema.index({ tenantId: 1, createdAt: -1 }, { name: "asset_tenant_created_at" });

export const Asset: Model<AssetRecord> =
  (mongoose.models.Asset as Model<AssetRecord> | undefined) ??
  mongoose.model<AssetRecord>("Asset", assetSchema);
