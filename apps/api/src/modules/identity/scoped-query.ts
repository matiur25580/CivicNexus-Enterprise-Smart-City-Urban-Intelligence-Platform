import type { AuthenticatedPrincipal } from "@civicnexus/contracts";
import type { FilterQuery } from "mongoose";
import { HttpError } from "../../lib/http-error.js";

export function resolveTenantScope(principal: AuthenticatedPrincipal, requestedTenantId?: string): string {
  const tenantId = requestedTenantId ?? principal.tenantId;
  if (!tenantId || tenantId.trim().length === 0) {
    throw new HttpError(400, "TENANT_SCOPE_REQUIRED", "A tenant scope is required for this database operation.");
  }
  if (principal.role !== "platform_admin" && tenantId !== principal.tenantId) {
    throw new HttpError(403, "TENANT_ACCESS_DENIED", "The requested tenant is outside your access scope.");
  }
  if (principal.role === "platform_admin" && requestedTenantId === undefined) {
    throw new HttpError(400, "TENANT_SCOPE_REQUIRED", "Platform administrators must select an explicit tenant for this database operation.");
  }
  return tenantId;
}

export function assertJurisdictionAssignment(
  principal: AuthenticatedPrincipal,
  jurisdictionId: string,
  requestedTenantId?: string,
): string {
  const tenantId = resolveTenantScope(principal, requestedTenantId);
  if (principal.role !== "platform_admin" && !principal.jurisdictionIds.includes(jurisdictionId)) {
    throw new HttpError(403, "JURISDICTION_ACCESS_DENIED", "The requested jurisdiction is outside your access scope.");
  }
  return tenantId;
}

/** Adds a mandatory tenant predicate; caller filters cannot overwrite the security boundary. */
// Wrap caller filters with a mandatory tenant predicate that cannot be replaced by user-supplied conditions.
export function buildTenantScopedFilter<T>(
  principal: AuthenticatedPrincipal,
  filter: FilterQuery<T> = {},
  requestedTenantId?: string,
): FilterQuery<T> {
  const tenantId = resolveTenantScope(principal, requestedTenantId);
  return { $and: [filter, { tenantId } as FilterQuery<T>] } as FilterQuery<T>;
}

/** Adds tenant and jurisdiction predicates. Empty assignments fail closed. */
export function buildJurisdictionScopedFilter<T>(
  principal: AuthenticatedPrincipal,
  filter: FilterQuery<T> = {},
  requestedTenantId?: string,
): FilterQuery<T> {
  const tenantId = resolveTenantScope(principal, requestedTenantId);
  if (principal.role === "platform_admin") {
    return { $and: [filter, { tenantId } as FilterQuery<T>] } as FilterQuery<T>;
  }
  if (principal.jurisdictionIds.length === 0) {
    throw new HttpError(403, "JURISDICTION_SCOPE_REQUIRED", "No jurisdiction assignments are available for this database operation.");
  }
  return {
    $and: [
      filter,
      { tenantId } as FilterQuery<T>,
      { jurisdictionId: { $in: [...principal.jurisdictionIds] } } as FilterQuery<T>,
    ],
  } as FilterQuery<T>;
}
