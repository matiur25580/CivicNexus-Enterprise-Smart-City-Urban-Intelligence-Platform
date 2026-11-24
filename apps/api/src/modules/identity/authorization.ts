import type { CivicPermission, CivicRole, AuthenticatedPrincipal } from "@civicnexus/contracts";
import type { RequestHandler } from "express";
import { HttpError } from "../../lib/http-error.js";

const ROLE_PERMISSIONS: Record<CivicRole, readonly CivicPermission[]> = {
  platform_admin: [
    "platform:manage", "tenant:manage", "users:manage", "jurisdictions:read",
    "assets:read", "assets:write", "incidents:read", "incidents:write",
    "work_orders:read", "work_orders:write", "analytics:read",
    "citizen_requests:create", "citizen_requests:read_own",
  ],
  tenant_admin: [
    "tenant:manage", "users:manage", "jurisdictions:read",
    "assets:read", "assets:write", "incidents:read", "incidents:write",
    "work_orders:read", "work_orders:write", "analytics:read",
    "citizen_requests:read_own",
  ],
  city_operator: [
    "jurisdictions:read", "assets:read", "assets:write",
    "incidents:read", "incidents:write", "work_orders:read", "work_orders:write",
  ],
  analyst: ["jurisdictions:read", "assets:read", "incidents:read", "analytics:read"],
  emergency_responder: [
    "jurisdictions:read", "assets:read", "incidents:read", "incidents:write",
    "work_orders:read", "work_orders:write",
  ],
  citizen: ["citizen_requests:create", "citizen_requests:read_own"],
};

// Keep role-to-permission decisions centralized so route guards share one authorization policy.
export function hasPermission(role: CivicRole, permission: CivicPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAccessTenant(principal: AuthenticatedPrincipal, tenantId: string): boolean {
  return principal.role === "platform_admin" || principal.tenantId === tenantId;
}

export function canAccessJurisdiction(
  principal: AuthenticatedPrincipal,
  jurisdictionId: string,
  tenantId?: string,
): boolean {
  if (principal.role === "platform_admin") return true;
  if (tenantId && !canAccessTenant(principal, tenantId)) return false;
  return principal.jurisdictionIds.includes(jurisdictionId);
}

export const requireAuthenticated: RequestHandler = (request, _response, next) => {
  if (!request.auth) {
    next(new HttpError(401, "AUTHENTICATION_REQUIRED", "Authentication is required."));
    return;
  }
  next();
};

export function requirePermission(permission: CivicPermission): RequestHandler {
  return (request, _response, next) => {
    const principal = request.auth;
    if (!principal) {
      next(new HttpError(401, "AUTHENTICATION_REQUIRED", "Authentication is required."));
      return;
    }
    if (!hasPermission(principal.role, permission)) {
      next(new HttpError(403, "PERMISSION_DENIED", "You do not have permission to perform this action."));
      return;
    }
    next();
  };
}

/** Apply after authentication on routes containing :tenantId. */
export const requireTenantAccess: RequestHandler = (request, _response, next) => {
  const principal = request.auth;
  if (!principal) {
    next(new HttpError(401, "AUTHENTICATION_REQUIRED", "Authentication is required."));
    return;
  }
  const tenantId = request.params.tenantId;
  if (typeof tenantId !== "string" || tenantId.length === 0) {
    next(new HttpError(400, "TENANT_SCOPE_REQUIRED", "A single tenant scope is required."));
    return;
  }
  if (!canAccessTenant(principal, tenantId)) {
    next(new HttpError(403, "TENANT_ACCESS_DENIED", "The requested tenant is outside your access scope."));
    return;
  }
  next();
};

/** Apply after authentication on routes containing :jurisdictionId. */
export const requireJurisdictionAccess: RequestHandler = (request, _response, next) => {
  const principal = request.auth;
  if (!principal) {
    next(new HttpError(401, "AUTHENTICATION_REQUIRED", "Authentication is required."));
    return;
  }
  const jurisdictionId = request.params.jurisdictionId;
  if (typeof jurisdictionId !== "string" || jurisdictionId.length === 0) {
    next(new HttpError(400, "JURISDICTION_SCOPE_REQUIRED", "A single jurisdiction scope is required."));
    return;
  }
  const tenantId = request.params.tenantId;
  if (tenantId !== undefined && typeof tenantId !== "string") {
    next(new HttpError(400, "TENANT_SCOPE_INVALID", "A single tenant scope is required."));
    return;
  }
  if (!canAccessJurisdiction(principal, jurisdictionId, tenantId)) {
    next(new HttpError(403, "JURISDICTION_ACCESS_DENIED", "The requested jurisdiction is outside your access scope."));
    return;
  }
  next();
};
