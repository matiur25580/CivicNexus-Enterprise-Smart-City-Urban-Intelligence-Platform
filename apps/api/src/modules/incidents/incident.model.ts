import mongoose, { Schema } from "mongoose";
import type { Model } from "mongoose";
import type { GeoJsonPoint } from "@civicnexus/contracts";

export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "reported" | "triaged" | "assigned" | "in_progress" | "resolved" | "closed";
export interface IncidentRecord {
  tenantId: string;
  jurisdictionId: string;
  title: string;
  description: string;
  category: "road_damage" | "water" | "power" | "waste" | "public_safety" | "transport" | "other";
  severity: IncidentSeverity;
  impactCount: number;
  safetyRisk: boolean;
  location: GeoJsonPoint;
  status: IncidentStatus;
  assignedTeam?: string | undefined;
  reportedBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  history: Array<{ status: IncidentStatus; note: string; changedBy: string; changedAt: Date }>;
}
const pointSchema = new Schema({
  type: { type: String, enum: ["Point"], required: true },
  coordinates: { type: [Number], required: true, validate: {
    validator: (v: number[]) => v.length === 2 && v[0]! >= -180 && v[0]! <= 180 && v[1]! >= -90 && v[1]! <= 90,
    message: "Location must be a WGS84 longitude/latitude point."
  }}
}, { _id: false, strict: "throw" });
const historySchema = new Schema({
  status: { type: String, enum: ["reported", "triaged", "assigned", "in_progress", "resolved", "closed"], required: true },
  note: { type: String, trim: true, maxlength: 500, default: "" },
  changedBy: { type: String, required: true },
  changedAt: { type: Date, required: true, default: Date.now }
}, { _id: false });
const incidentSchema = new Schema<IncidentRecord>({
  tenantId: { type: String, required: true, immutable: true, maxlength: 128 },
  jurisdictionId: { type: String, required: true, immutable: true, maxlength: 128 },
  title: { type: String, required: true, trim: true, minlength: 5, maxlength: 160 },
  description: { type: String, required: true, trim: true, minlength: 10, maxlength: 3000 },
  category: { type: String, enum: ["road_damage", "water", "power", "waste", "public_safety", "transport", "other"], required: true },
  severity: { type: String, enum: ["low", "medium", "high", "critical"], required: true },
  impactCount: { type: Number, min: 0, max: 10000000, default: 0 },
  safetyRisk: { type: Boolean, default: false },
  location: { type: pointSchema, required: true },
  status: { type: String, enum: ["reported", "triaged", "assigned", "in_progress", "resolved", "closed"], default: "reported", required: true },
  assignedTeam: { type: String, trim: true, maxlength: 120 },
  reportedBy: { type: String, required: true, immutable: true },
  updatedBy: { type: String, required: true },
  history: { type: [historySchema], default: [] }
}, { timestamps: true, strict: "throw", versionKey: false });
incidentSchema.index({ location: "2dsphere" }, { name: "incident_location_2dsphere" });
incidentSchema.index({ tenantId: 1, jurisdictionId: 1, status: 1, severity: 1, createdAt: -1 }, { name: "incident_response_queue" });
export const Incident = (mongoose.models.Incident as Model<IncidentRecord> | undefined) ?? mongoose.model<IncidentRecord>("Incident", incidentSchema);
