import { describe, expect, it } from "vitest";
import type { AuthenticatedPrincipal } from "@civicnexus/contracts";
import {
  canAccessJurisdiction,
  canAccessTenant,
  hasPermission,
} from "./authorization.js";

const operator: AuthenticatedPrincipal = {
  userId: "user-1",
  tenantId: "tenant-north",
  role: "city_operator",
  jurisdictionIds: ["district-1", "district-2"],
};

describe("CivicNexus authorization policy", () => {
  it("grants only permissions assigned to the role", () => {
    expect(hasPermission("city_operator", "assets:write")).toBe(true);
    expect(hasPermission("city_operator", "users:manage")).toBe(false);
    expect(hasPermission("analyst", "incidents:write")).toBe(false);
  });

  it("keeps tenant access isolated by default", () => {
    expect(canAccessTenant(operator, "tenant-north")).toBe(true);
    expect(canAccessTenant(operator, "tenant-south")).toBe(false);
  });

  it("allows access only to assigned jurisdictions inside the tenant", () => {
    expect(canAccessJurisdiction(operator, "district-1", "tenant-north")).toBe(true);
    expect(canAccessJurisdiction(operator, "district-3", "tenant-north")).toBe(false);
    expect(canAccessJurisdiction(operator, "district-1", "tenant-south")).toBe(false);
  });

  it("reserves cross-tenant and cross-jurisdiction scope for platform administrators", () => {
    const platformAdmin: AuthenticatedPrincipal = {
      userId: "platform-user",
      tenantId: "platform",
      role: "platform_admin",
      jurisdictionIds: [],
    };
    expect(canAccessTenant(platformAdmin, "tenant-south")).toBe(true);
    expect(canAccessJurisdiction(platformAdmin, "district-any", "tenant-south")).toBe(true);
  });

  it("does not elevate tenant administrators to platform permissions", () => {
    expect(hasPermission("tenant_admin", "tenant:manage")).toBe(true);
    expect(hasPermission("tenant_admin", "platform:manage")).toBe(false);
  });
});
