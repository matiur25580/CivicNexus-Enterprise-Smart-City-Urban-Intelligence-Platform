# Geospatial asset domain foundation

## Data model

The first CivicNexus domain model is a tenant-owned geospatial asset. Each record stores an immutable `tenantId` and `jurisdictionId`, a display name, description, category, lifecycle status, WGS84 GeoJSON Point, and actor metadata. Mongoose timestamps provide creation and update times.

Indexes:
- `location: 2dsphere` for future proximity and geospatial queries.
- `tenantId + jurisdictionId + status` for common scoped inventory views.
- `tenantId + createdAt` for tenant-scoped chronological listings.

Tenant and jurisdiction ownership are immutable at the schema level. Moving an asset between jurisdictions requires a separate future audited workflow.

## Validation and repository boundary

`asset.schema.ts` defines strict Zod input schemas. Client input cannot include `tenantId`, `createdBy`, or `updatedBy`; unknown fields are rejected. Point coordinates use longitude/latitude order and WGS84 bounds.

`AssetRepository` is the only intended application entry point for asset persistence:
- `create` derives tenant and actor identity from the verified principal and verifies jurisdiction assignment.
- `list`, `getById`, `update`, and `delete` all apply the mandatory tenant and jurisdiction filter.
- Updates cannot change ownership and stamp `updatedBy` from the authenticated principal.
- Platform administrators must supply an explicit tenant for every operation.

The repository accepts a persistence port so unit tests can verify the actual filters passed to persistence without requiring a live database.

## API exposure boundary

No HTTP asset routes are exposed in this change. Add them only after the application has a connected MongoDB integration-test environment and route-level authentication/permission tests. Any geospatial aggregation or raw MongoDB query must independently include the same tenant and jurisdiction constraints; the repository helpers do not automatically secure raw driver calls or aggregation pipelines.
