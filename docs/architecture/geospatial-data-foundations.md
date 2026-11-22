# Geospatial data foundations

## Coordinate reference

CivicNexus accepts GeoJSON positions in WGS84 longitude, latitude order. Point positions are validated against longitude [-180, 180] and latitude [-90, 90] bounds. Optional altitude is preserved as additional numeric position values.

## Supported geometry in the foundation

- `Point`: one WGS84 position, suitable for an asset or incident location.
- `Polygon`: one or more closed linear rings; the first ring represents the exterior boundary and subsequent rings represent holes.

The shared contracts package exports matching TypeScript geometry and feature types. The API geospatial module provides Zod runtime validation so untrusted payloads are checked at the boundary.

## Data ownership and future work

This milestone establishes geometry contracts only. It does not yet define a production geospatial asset collection, spatial indexes, jurisdiction boundaries, geometry simplification, or map-tile services. Those decisions belong with the asset registry and GIS integration milestones.

## Validation requirements

1. Reject out-of-range longitude and latitude values.
2. Require polygon rings to contain at least four positions.
3. Require the first and last position of each ring to match.
4. Preserve longitude/latitude ordering consistently across API, storage, and client map adapters.
5. Apply tenant and jurisdiction authorization before returning geometry to callers.
