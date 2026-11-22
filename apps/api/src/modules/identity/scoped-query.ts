import type { AuthenticatedPrincipal } from "@civicnexus/contracts";
import type { FilterQuery } from "mongoose";
import { HttpError } from "../../lib/http-error.js";

type ScopedDocument = Record<string, unknown>;

function resolveTenantId(principal: AuthenticatedPrincipal, requestedTenantId?: string): string {
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

/**
 * Adds a mandatory tenant predicate without allowing caller filters to overwrite it.
 * Use the returned filter for find, count, update, and delete operations.
 */
export function buildTenantScopedFilter<T extends ScopedDocument>(
  principal: AuthenticatedPrincipal,
  filter: FilterQuery<T> = {},
  requestedTenantId?: string,
): FilterQuery<T> {
  const tenantId = resolveTenantId(principal, requestedTenantId);
  return {
    $and: [filter, { tenantId } as FilterQuery<T>],
  } as FilterQuery<T>;
}

/**
 * Adds both tenant and assigned-jurisdiction predicates. An empty jurisdiction
 * assignment fails closed; platform administrators must still select a tenant.
 */
export function buildJurisdictionScopedFilter<T extends ScopedDocument>(
  principal: AuthenticatedPrincipal,
  filter: FilterQuery<T> = {},
  requestedTenantId?: string,
): FilterQuery<T> {
  const tenantId = resolveTenantId(principal, requestedTenantId);
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
