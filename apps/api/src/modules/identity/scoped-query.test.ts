import { describe, expect, it } from "vitest";
import type { AuthenticatedPrincipal } from "@civicnexus/contracts";
import { HttpError } from "../../lib/http-error.js";
import { buildJurisdictionScopedFilter, buildTenantScopedFilter } from "./scoped-query.js";
import { canAccessJurisdiction, canAccessTenant, hasPermission, requireAuthenticated, requireJurisdictionAccess, requirePermission, requireTenantAccess } from "./authorization.js";
import type { Request, Response, NextFunction } from "express";
import { vi } from "vitest";

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


describe("authorization policy and route middleware", () => {
  function invoke(
    middleware: (request: Request, response: Response, next: NextFunction) => unknown,
    auth?: AuthenticatedPrincipal,
    params: Record<string, string | string[]> = {},
  ) {
    const next = vi.fn();
    middleware({ auth, params } as unknown as Request, {} as Response, next);
    return next;
  }

  it("keeps incident write permission away from analysts and citizens", () => {
    expect(hasPermission("city_operator", "incidents:write")).toBe(true);
    expect(hasPermission("analyst", "incidents:write")).toBe(false);
    expect(hasPermission("citizen", "incidents:write")).toBe(false);
    expect(hasPermission("citizen", "citizen_requests:create")).toBe(true);
  });

  it("enforces tenant and jurisdiction boundaries in policy helpers", () => {
    expect(canAccessTenant(operator, "tenant-north")).toBe(true);
    expect(canAccessTenant(operator, "tenant-south")).toBe(false);
    expect(canAccessJurisdiction(operator, "district-1", "tenant-north")).toBe(true);
    expect(canAccessJurisdiction(operator, "district-1", "tenant-south")).toBe(false);
    expect(canAccessJurisdiction(operator, "district-9", "tenant-north")).toBe(false);
    expect(canAccessJurisdiction(platformAdmin, "district-9", "tenant-south")).toBe(true);
  });

  it("rejects unauthenticated requests", () => {
    expect(invoke(requireAuthenticated)).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 401, code: "AUTHENTICATION_REQUIRED",
    }));
  });

  it("rejects authenticated principals without the required permission", () => {
    expect(invoke(requirePermission("incidents:write"), { ...operator, role: "analyst" }))
      .toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403, code: "PERMISSION_DENIED" }));
  });

  it("allows a principal with the required permission", () => {
    expect(invoke(requirePermission("incidents:write"), operator)).toHaveBeenCalledWith();
  });

  it("fails closed for missing or multi-valued tenant route parameters", () => {
    expect(invoke(requireTenantAccess, operator)).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, code: "TENANT_SCOPE_REQUIRED",
    }));
    expect(invoke(requireTenantAccess, operator, {
      tenantId: ["tenant-north", "tenant-south"],
    })).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400, code: "TENANT_SCOPE_REQUIRED",
    }));
  });

  it("rejects cross-tenant routes and allows the authenticated tenant", () => {
    expect(invoke(requireTenantAccess, operator, { tenantId: "tenant-south" }))
      .toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403, code: "TENANT_ACCESS_DENIED" }));
    expect(invoke(requireTenantAccess, operator, { tenantId: "tenant-north" })).toHaveBeenCalledWith();
  });

  it("rejects unassigned jurisdictions and tenant-mismatched jurisdiction routes", () => {
    expect(invoke(requireJurisdictionAccess, operator, { jurisdictionId: "district-9" }))
      .toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403, code: "JURISDICTION_ACCESS_DENIED" }));
    expect(invoke(requireJurisdictionAccess, operator, {
      tenantId: "tenant-south", jurisdictionId: "district-1",
    })).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 403, code: "JURISDICTION_ACCESS_DENIED",
    }));
  });

  it("allows assigned jurisdictions and explicit platform-admin scope", () => {
    expect(invoke(requireJurisdictionAccess, operator, { jurisdictionId: "district-2" }))
      .toHaveBeenCalledWith();
    expect(invoke(requireJurisdictionAccess, platformAdmin, {
      tenantId: "tenant-south", jurisdictionId: "district-9",
    })).toHaveBeenCalledWith();
  });
});
