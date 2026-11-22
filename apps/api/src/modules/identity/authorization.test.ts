import type { NextFunction, Request, Response, RequestHandler } from "express";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedPrincipal } from "@civicnexus/contracts";
import {
  canAccessJurisdiction,
  canAccessTenant,
  hasPermission,
  requireAuthenticated,
  requireJurisdictionAccess,
  requirePermission,
  requireTenantAccess,
} from "./authorization.js";

const operator: AuthenticatedPrincipal = {
  userId: "user-1",
  tenantId: "tenant-north",
  role: "city_operator",
  jurisdictionIds: ["district-1", "district-2"],
};

function invokeGuard(
  guard: RequestHandler,
  principal?: AuthenticatedPrincipal,
  params: Record<string, string> = {},
) {
  const request = {
    params,
    ...(principal ? { auth: principal } : {}),
  } as unknown as Request;
  const next = vi.fn<NextFunction>();
  guard(request, {} as Response, next);
  return next;
}

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

  it("fails closed when the request has no verified principal", () => {
    const next = invokeGuard(requireAuthenticated);
    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0]?.[0]).toMatchObject({ statusCode: 401, code: "AUTHENTICATION_REQUIRED" });
  });

  it("denies permissions outside the caller's role", () => {
    const next = invokeGuard(requirePermission("users:manage"), operator);
    expect(next.mock.calls[0]?.[0]).toMatchObject({ statusCode: 403, code: "PERMISSION_DENIED" });
  });

  it("rejects cross-tenant route parameters", () => {
    const next = invokeGuard(requireTenantAccess, operator, { tenantId: "tenant-south" });
    expect(next.mock.calls[0]?.[0]).toMatchObject({ statusCode: 403, code: "TENANT_ACCESS_DENIED" });
  });

  it("rejects unassigned jurisdiction route parameters", () => {
    const next = invokeGuard(requireJurisdictionAccess, operator, {
      tenantId: "tenant-north",
      jurisdictionId: "district-9",
    });
    expect(next.mock.calls[0]?.[0]).toMatchObject({ statusCode: 403, code: "JURISDICTION_ACCESS_DENIED" });
  });

  it("continues when all required tenant and jurisdiction scopes match", () => {
    const next = invokeGuard(requireJurisdictionAccess, operator, {
      tenantId: "tenant-north",
      jurisdictionId: "district-1",
    });
    expect(next).toHaveBeenCalledWith();
  });
});
