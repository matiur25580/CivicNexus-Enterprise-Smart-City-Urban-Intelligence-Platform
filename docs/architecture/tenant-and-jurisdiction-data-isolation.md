# Tenant and jurisdiction data isolation

## Purpose

Route middleware is not a substitute for database isolation. Every tenant-owned MongoDB operation must include a server-derived tenant predicate, and every jurisdiction-owned operation must also include the authenticated principal's jurisdiction assignments.

## Shared query helpers

Import the helpers from `apps/api/src/modules/identity/scoped-query.ts`:

- `buildTenantScopedFilter(principal, filter, requestedTenantId?)` adds a mandatory `tenantId` predicate.
- `buildJurisdictionScopedFilter(principal, filter, requestedTenantId?)` adds mandatory tenant and jurisdiction predicates.

Use the returned filter directly with Mongoose `find`, `findOne`, `countDocuments`, `updateOne`, `updateMany`, `deleteOne`, and `deleteMany`. Do not perform an unscoped read followed by an application-side ownership check.

The helper combines the caller's trusted domain filter and the security predicates with `$and`. A caller-supplied `tenantId` or `jurisdictionId` therefore cannot replace or broaden the authenticated scope. It does not mutate the supplied filter or principal.

## Platform administrator behavior

Platform administrators can operate across tenants, but each database operation must still name exactly one target tenant. Omitting the target tenant fails with `TENANT_SCOPE_REQUIRED`; this prevents accidental unbounded cross-tenant queries. Platform administrators may operate across jurisdictions within that selected tenant.

## Fail-closed rules

- Missing tenant scope: HTTP 400 `TENANT_SCOPE_REQUIRED`.
- Non-platform principal requesting another tenant: HTTP 403 `TENANT_ACCESS_DENIED`.
- Non-platform principal with no jurisdiction assignments: HTTP 403 `JURISDICTION_SCOPE_REQUIRED`.
- Jurisdiction access is limited to the assigned ID set; client-provided filters can narrow but never widen it.

## Example

```ts
const filter = buildJurisdictionScopedFilter(request.auth!, {
  lifecycleStatus: "active",
});
const assets = await Asset.find(filter).lean().exec();
```

For updates and deletes, pass the same scoped filter as the first argument to the corresponding Mongoose operation. Keep the principal server-derived from verified OIDC identity and active membership. Never accept a principal, tenant ID, or jurisdiction assignment from a request body or arbitrary header.

## Adoption requirement

These helpers are the mandatory foundation for upcoming domain repositories. Every new tenant-owned collection must include indexed `tenantId` and, when applicable, `jurisdictionId` fields. Review all future query paths—including aggregation pipelines, bulk writes, background jobs, exports, and geospatial queries—for equivalent predicates. The helpers do not automatically secure raw MongoDB driver calls or aggregation pipelines; those paths need explicit, reviewed scope stages.

No domain-resource endpoints are exposed by this change. Domain models and APIs should be added only with scoped repository methods and cross-tenant integration tests.
