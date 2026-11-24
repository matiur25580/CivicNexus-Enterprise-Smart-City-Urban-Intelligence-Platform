import type { AuthenticatedPrincipal } from "@civicnexus/contracts";
import { HttpError } from "../../lib/http-error.js";
import { IdentityMembership } from "./membership.model.js";
import type { IdentityMembershipRecord } from "./membership.model.js";

export interface VerifiedIdentity {
  userId: string;
  tenantId: string;
}

export interface MembershipRepository {
  findActive(userId: string, tenantId: string): Promise<IdentityMembershipRecord | null>;
}

const mongoMembershipRepository: MembershipRepository = {
  async findActive(userId, tenantId) {
    const membership = await IdentityMembership.findOne({
      userId,
      tenantId,
      status: "active",
    }).lean().exec();
    return membership as IdentityMembershipRecord | null;
  },
};

/** Resolves authority exclusively from an active server-managed membership record. */
// Derive the caller's role and jurisdiction scope from an active server-side membership, never token-supplied role data.
export async function resolveMembership(
  identity: VerifiedIdentity,
  repository: MembershipRepository = mongoMembershipRepository,
): Promise<AuthenticatedPrincipal> {
  const membership = await repository.findActive(identity.userId, identity.tenantId);
  if (!membership) {
    throw new HttpError(403, "ACTIVE_MEMBERSHIP_REQUIRED", "No active CivicNexus membership exists for this account and tenant.");
  }
  return {
    userId: membership.userId,
    tenantId: membership.tenantId,
    role: membership.role,
    jurisdictionIds: [...membership.jurisdictionIds],
  };
}
