# CivicNexus

**Enterprise Smart City & Urban Intelligence Platform**

> Turn city infrastructure, incidents and spatial signals into accountable urban operations.

## Product overview

CivicNexus is a modular urban operations platform connecting city departments, infrastructure operators, field teams and approved partners through shared spatial and operational context.

## Current implementation

- Tenant- and jurisdiction-scoped geospatial incident management.
- GeoJSON/WGS84 location handling and geospatial query foundations.
- Incident assignment, severity, status history and auditable timeline.
- Hotspot intelligence with configurable radius, time window and risk scoring.
- Explainable incident priority and response recommendations.
- React/TypeScript web foundation and OIDC integration direction.

**Scope boundary:** live IoT feeds, city-system integrations, digital-twin simulation and predictive maintenance are product directions, not claims of live deployment.

## Technology stack

React 18 · TypeScript · Vite · Node.js · Express 5 · MongoDB · Mongoose · Keycloak OIDC · Zod · npm workspaces.

## Architecture

- `apps/web`: React operator console and client workflows.
- `apps/api`: versioned Express API, domain services and persistence.
- `packages/contracts`: shared API/domain contracts.
- `infra`: local infrastructure; `docs`: architecture and security decisions.
- Tenant and jurisdiction boundaries must be enforced server-side on every protected query.

## Local development

Prerequisites: Node.js 22+, npm 10+, Docker and MongoDB.

```bash
npm ci
# Copy the app .env.example files and configure local MongoDB / OIDC settings.
npm run dev
```

Web commonly runs at `http://localhost:5173`; API commonly runs at `http://localhost:4000`.

Quality checks:

```bash
npm run typecheck
npm test
npm run build
npm run lint
```

## Security and data governance

Validate all external inputs; derive tenant and jurisdiction context from authenticated server-side identity; keep secrets out of source control; log consequential changes without sensitive payloads; and define retention controls for location and telemetry data. Use synthetic data in demos. Production city integrations require threat modelling, privacy review, operational failover and emergency-services stakeholder validation.

## Illustrative dashboard gallery

The 12 views below are **illustrative SVG dashboard concepts**, not screenshots captured from a running deployment. They contain synthetic data and do not prove that every depicted module is implemented. The gallery is intentionally arranged in one vertical column.

### 01. Urban operations center

Illustrative city command center combining district KPIs, active service alerts and a map-based operational overview. All sample values are synthetic.

![CivicNexus Urban operations center](docs/assets/dashboard/01-urban-operations-center.svg)

### 02. Geospatial asset registry

Illustrative geospatial asset register showing infrastructure locations, asset classes, condition and criticality for maintenance planning. All sample values are synthetic.

![CivicNexus Geospatial asset registry](docs/assets/dashboard/02-geospatial-asset-registry.svg)

### 03. Incident response desk

Illustrative incident response desk for triage, severity review, ownership assignment and status tracking across city teams. All sample values are synthetic.

![CivicNexus Incident response desk](docs/assets/dashboard/03-incident-response-desk.svg)

### 04. Incident hotspot intelligence

Illustrative hotspot analysis view showing incident clusters, spatial density and explainable risk scores over a configurable time window. All sample values are synthetic.

![CivicNexus Incident hotspot intelligence](docs/assets/dashboard/04-incident-hotspot-intelligence.svg)

### 05. District performance

Illustrative district performance view comparing service levels, response times, open incidents and operational trends. All sample values are synthetic.

![CivicNexus District performance](docs/assets/dashboard/05-district-performance.svg)

### 06. IoT telemetry operations

Illustrative IoT operations view showing device connectivity, telemetry freshness, threshold alerts and sensor health. All sample values are synthetic.

![CivicNexus IoT telemetry operations](docs/assets/dashboard/06-iot-telemetry-operations.svg)

### 07. Predictive maintenance

Illustrative predictive maintenance view prioritizing assets by condition signals, risk indicators and recommended inspection windows. All sample values are synthetic.

![CivicNexus Predictive maintenance](docs/assets/dashboard/07-predictive-maintenance.svg)

### 08. Citizen service requests

Illustrative citizen service request workspace showing intake categories, queue state, ownership and resolution progress. All sample values are synthetic.

![CivicNexus Citizen service requests](docs/assets/dashboard/08-citizen-service-requests.svg)

### 09. Emergency resource coordination

Illustrative emergency resource coordination view showing team availability, incident assignments and response coverage. All sample values are synthetic.

![CivicNexus Emergency resource coordination](docs/assets/dashboard/09-emergency-resource-coordination.svg)

### 10. Environmental monitoring

Illustrative environmental monitoring view summarizing air quality, water observations, noise levels and threshold exceptions. All sample values are synthetic.

![CivicNexus Environmental monitoring](docs/assets/dashboard/10-environmental-monitoring.svg)

### 11. Mobility & traffic intelligence

Illustrative mobility intelligence view highlighting traffic flow, congestion hotspots and corridor-level movement trends. All sample values are synthetic.

![CivicNexus Mobility & traffic intelligence](docs/assets/dashboard/11-mobility-traffic-intelligence.svg)

### 12. Governance & audit

Illustrative governance and audit view showing attributable administrative actions, access events and policy review signals. All sample values are synthetic.

![CivicNexus Governance & audit](docs/assets/dashboard/12-governance-audit.svg)


## Engineering delivery

CI, CodeQL, secret scanning and dependency auditing are maintained in GitHub Actions. The latest feature-branch dependency audit against the committed lockfile reports zero known vulnerabilities. Continue monitoring new advisories; remaining priorities include end-to-end tests, accessibility checks, tenant-boundary tests, immutable action pinning, observability and backup/restore exercises.

## Documentation

- [Architecture overview](docs/architecture/overview.md)
- [Tenant and jurisdiction isolation](docs/architecture/tenant-and-jurisdiction-data-isolation.md)
- [Incident hotspot intelligence](docs/architecture/incident-hotspot-intelligence.md)
- [Identity and access control](docs/architecture/identity-and-access-control.md)

## Responsible claims

CivicNexus is an actively developed portfolio project, not a certified public-safety or emergency-dispatch system. Spatial analytics and risk indicators are decision-support signals, not guarantees. Production deployment requires city-specific security, legal, accessibility and operational review.


## Security and contribution guidance

- [Security policy](SECURITY.md) — responsible vulnerability reporting and project security expectations.
- [Contributing guide](CONTRIBUTING.md) — engineering standards and pull request expectations.

These documents describe intended safeguards and contribution practices; they do not imply that planned product controls are already implemented or independently verified.


## Industry alignment and next capability increments

CivicNexus is positioned around interoperable, explainable urban operations—not an autonomous emergency dispatch system. The next high-value increments are:

1. **Standards-based sensor ingestion:** adapter boundaries for OGC SensorThings API 2.0 and MQTT, with device identity, timestamps, schema validation and telemetry freshness.
2. **Geospatial digital-twin foundations:** versioned asset geometry, event overlays, spatial lineage and scenario snapshots before any predictive claims.
3. **Resilience intelligence:** explainable hotspot and service-risk indicators with confidence, data freshness and human review.
4. **Privacy-aware civic analytics:** aggregation, retention controls and role-scoped access for sensitive location data.
5. **Operational readiness:** OpenTelemetry traces, SLOs, dead-letter handling, accessibility checks and disaster-recovery exercises.

Reference: [OGC SensorThings API 2.0](https://docs.ogc.org/is/23-019/23-019.html) defines an open geospatial IoT data model and REST API with HTTP/MQTT bindings. This is an integration direction, not a conformance claim.

## Interview-ready engineering narrative

- Explain how tenant and jurisdiction filters are enforced below the UI.
- Demonstrate why GeoJSON/WGS84 validation and spatial indexes matter.
- Show how a hotspot score can be explained and audited rather than treated as an opaque AI verdict.
- Distinguish implemented incident workflows from planned live sensor and city-system integrations.
- Describe how stale or incomplete telemetry should affect confidence and operator decisions.
