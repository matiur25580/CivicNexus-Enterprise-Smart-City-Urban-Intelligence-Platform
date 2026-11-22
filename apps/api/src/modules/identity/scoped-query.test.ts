import { describe, expect, it } from "vitest";
import type { AuthenticatedPrincipal } from "@civicnexus/contracts";
import { HttpError } from "../../lib/http-error.js";
import { buildJurisdictionScopedFilter, buildTenantScopedFilter } from "./scoped-query.js";

const operator: AuthenticatedPrincipal = {
  userId: "user-1",
  tenantId: "tenant-north",
  role: "city_operator",
  jurisdictionIds: ["district-1", "district-2"],
};

const platformAdmin: AuthenticatedPrincipal = {
  userId: "platform-user",
  tenantId: "platform",
  role: "platform_admin",
  jurisdictionIds: [],
};

describe("MongoDB tenant and jurisdiction query scoping", () => {
  it("always adds the authenticated tenant predicate", () => {
    expect(buildTenantScopedFilter(operator, { status: "active" })).toEqual({
      $and: [{ status: "active" }, { tenantId: "tenant-north" }],
    });
  });

  it("does not allow caller filters to replace tenant scope", () => {
    expect(buildTenantScopedFilter(operator, { tenantId: "tenant-south" })).toEqual({
      $and: [{ tenantId: "tenant-south" }, { tenantId: "tenant-north" }],
    });
  });

  it("rejects a requested tenant outside the principal scope", () => {
    expect(() => buildTenantScopedFilter(operator, {}, "tenant-south")).toThrowError(
      expect.objectContaining({ code: "TENANT_ACCESS_DENIED" }),
    );
  });

  it("requires platform administrators to select one tenant explicitly", () => {
    expect(() => buildTenantScopedFilter(platformAdmin)).toThrowError(
      expect.objectContaining({ code: "TENANT_SCOPE_REQUIRED" }),
    );
    expect(buildTenantScopedFilter(platformAdmin, {}, "tenant-south")).toEqual({
      $and: [{}, { tenantId: "tenant-south" }],
    });
  });

  it("adds assigned jurisdictions to the tenant predicate", () => {
    expect(buildJurisdictionScopedFilter(operator, { status: "open" })).toEqual({
      $and: [
        { status: "open" },
        { tenantId: "tenant-north" },
        { jurisdictionId: { $in: ["district-1", "district-2"] } },
      ],
    });
  });

  it("prevents a caller filter from broadening jurisdiction scope", () => {
    expect(buildJurisdictionScopedFilter(operator, {
      jurisdictionId: "district-outside",
    })).toEqual({
      $and: [
        { jurisdictionId: "district-outside" },
        { tenantId: "tenant-north" },
        { jurisdictionId: { $in: ["district-1", "district-2"] } },
      ],
    });
  });

  it("fails closed when a principal has no jurisdiction assignments", () => {
    const unassigned = { ...operator, jurisdictionIds: [] };
    expect(() => buildJurisdictionScopedFilter(unassigned)).toThrowError(
      expect.objectContaining({ code: "JURISDICTION_SCOPE_REQUIRED" }),
    );
  });

  it("allows platform administrators all jurisdictions only inside an explicit tenant", () => {
    expect(buildJurisdictionScopedFilter(platformAdmin, {}, "tenant-south")).toEqual({
      $and: [{}, { tenantId: "tenant-south" }],
    });
  });

  it("does not mutate caller-provided filters or principal assignments", () => {
    const filter = { status: "active" };
    const jurisdictions = [...operator.jurisdictionIds];
    buildJurisdictionScopedFilter(operator, filter);
    expect(filter).toEqual({ status: "active" });
    expect(operator.jurisdictionIds).toEqual(jurisdictions);
  });

  it("uses typed HTTP errors for missing scope", () => {
    try {
      buildTenantScopedFilter({ ...operator, tenantId: "" });
      throw new Error("expected scope validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).code).toBe("TENANT_SCOPE_REQUIRED");
    }
  });
});
