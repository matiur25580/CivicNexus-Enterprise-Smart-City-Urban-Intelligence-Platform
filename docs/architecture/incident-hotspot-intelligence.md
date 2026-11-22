# Geospatial incident hotspot intelligence

CivicNexus exposes an operational hotspot analysis endpoint that groups active incidents into spatial cells and ranks those cells by explainable risk.

## Endpoint

`GET /api/v1/incidents/hotspots`

Requires authentication and `incidents:read`. Tenant and jurisdiction filters are always combined with the authenticated principal's scope. Platform administrators must select an explicit tenant. A requested jurisdiction outside an operator's assignment produces no cross-jurisdiction data.

### Query parameters

| Parameter | Required | Default | Bounds |
|---|---:|---:|---|
| longitude | yes | — | -180 to 180 |
| latitude | yes | — | -90 to 90 |
| radiusMeters | no | 5,000 | 100 to 50,000 |
| cellSizeMeters | no | 500 | 100 to 5,000 |
| windowHours | no | 168 | 1 to 720 |
| limit | no | 20 | 1 to 50 |
| tenantId | platform admin | — | 1 to 128 characters |
| jurisdictionId | no | — | 1 to 128 characters |

The query uses MongoDB's 2dsphere index and considers incidents that are not resolved or closed and were created within the requested time window. At most 5,000 matching incidents are analyzed. When more records match, `meta.truncated` is true and the summary is explicitly partial.

## Spatial aggregation and risk scoring

Incidents are assigned to latitude-aware grid cells of the requested approximate size. The API returns aggregate cell centers and counts, not individual incident identifiers or descriptions.

Risk points per incident:
- Low severity: 1
- Medium severity: 2
- High severity: 4
- Critical severity: 7
- Safety risk: +5
- Impact: +min(5, floor(log10(impactCount + 1)))

Cell priority:
- Critical: score at least 30 or at least one critical incident
- High: score at least 15 or at least one high-severity incident
- Medium: score at least 6
- Low: otherwise

Cells are sorted by risk score, then incident count. The dominant incident category determines a suggested response action (for example, a road-maintenance inspection or water-network crew assessment). These are decision-support recommendations, not automated dispatches or guarantees of available crews.

## Operational limitations

This is a spatial concentration heuristic, not a predictive model. Grid boundaries can split nearby incidents, and the approximate cell dimensions vary with latitude. Impact counts are reported values, not independently verified population estimates. The endpoint does not account for crew capacity, travel time, road closures, live asset condition, or weather. Dispatch decisions remain with authorized operators. The result cap and truncation metadata must be preserved by dashboards.
