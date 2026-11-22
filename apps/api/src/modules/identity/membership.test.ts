import { describe, expect, it, vi } from "vitest";
import type { CivicRole } from "@civicnexus/contracts";
import { HttpError } from "../../lib/http-error.js";
import { resolveMembership } from "./membership.js";
import type { MembershipRepository } from "./membership.js";

const identity = { userId: "keycloak-subject-42", tenantId: "tenant-north" };

describe("persisted tenant membership resolution", () => {
  it("uses the active database membership as the source of role and jurisdiction scope", async () => {
    const repository: MembershipRepository = {
      findActive: vi.fn().mockResolvedValue({
        userId: identity.userId,
        tenantId: identity.tenantId,
        role: "city_operator" as CivicRole,
        jurisdictionIds: ["ward-1", "ward-2"],
        status: "active",
      }),
    };
    await expect(resolveMembership(identity, repository)).resolves.toEqual({
      userId: identity.userId,
      tenantId: identity.tenantId,
      role: "city_operator",
      jurisdictionIds: ["ward-1", "ward-2"],
    });
    expect(repository.findActive).toHaveBeenCalledWith(identity.userId, identity.tenantId);
  });

  it("rejects users without an active membership", async () => {
    const repository: MembershipRepository = { findActive: vi.fn().mockResolvedValue(null) };
    await expect(resolveMembership(identity, repository)).rejects.toMatchObject({
      statusCode: 403, code: "ACTIVE_MEMBERSHIP_REQUIRED",
    });
  });

  it("does not mutate or reuse the repository jurisdiction array", async () => {
    const jurisdictions = ["ward-1"];
    const repository: MembershipRepository = {
      findActive: vi.fn().mockResolvedValue({
        userId: identity.userId, tenantId: identity.tenantId,
        role: "analyst", jurisdictionIds: jurisdictions, status: "active",
      }),
    };
    const principal = await resolveMembership(identity, repository);
    principal.jurisdictionIds.push("ward-evil");
    expect(jurisdictions).toEqual(["ward-1"]);
  });

  it("does not fall back to token-supplied permissions when membership lookup fails", async () => {
    const repository: MembershipRepository = {
      findActive: vi.fn().mockRejectedValue(new Error("database unavailable")),
    };
    await expect(resolveMembership(identity, repository)).rejects.toBeInstanceOf(Error);
  });
});
