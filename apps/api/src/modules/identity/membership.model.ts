import mongoose, { Schema } from "mongoose";
import type { Model } from "mongoose";
import type { CivicRole } from "@civicnexus/contracts";

export type MembershipStatus = "active" | "suspended" | "revoked";

export interface IdentityMembershipRecord {
  userId: string;
  tenantId: string;
  role: CivicRole;
  jurisdictionIds: string[];
  status: MembershipStatus;
}

const identityMembershipSchema = new Schema<IdentityMembershipRecord>({
  userId: { type: String, required: true, trim: true, minlength: 1, maxlength: 256 },
  tenantId: { type: String, required: true, trim: true, minlength: 1, maxlength: 128 },
  role: {
    type: String,
    required: true,
    enum: ["platform_admin", "tenant_admin", "city_operator", "analyst", "emergency_responder", "citizen"],
  },
  jurisdictionIds: {
    type: [{ type: String, trim: true, minlength: 1, maxlength: 128 }],
    default: [],
    validate: {
      validator: (values: string[]) => values.length <= 500 && new Set(values).size === values.length,
      message: "Jurisdiction assignments must be unique and contain at most 500 entries.",
    },
  },
  status: { type: String, required: true, enum: ["active", "suspended", "revoked"], default: "active" },
}, {
  timestamps: true,
  strict: "throw",
  versionKey: false,
});

identityMembershipSchema.index({ userId: 1, tenantId: 1 }, { unique: true, name: "uniq_user_tenant_membership" });
identityMembershipSchema.index({ tenantId: 1, status: 1, role: 1 }, { name: "tenant_membership_directory" });

export const IdentityMembership: Model<IdentityMembershipRecord> =
  (mongoose.models.IdentityMembership as Model<IdentityMembershipRecord> | undefined) ??
  mongoose.model<IdentityMembershipRecord>("IdentityMembership", identityMembershipSchema);
