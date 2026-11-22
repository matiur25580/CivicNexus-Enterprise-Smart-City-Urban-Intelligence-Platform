# CivicNexus

Enterprise Smart City Infrastructure & Urban Intelligence Platform.

CivicNexus is a modular MERN platform for operating city infrastructure through geospatial asset intelligence, digital-twin foundations, IoT telemetry, predictive maintenance, emergency coordination, citizen engagement, and measurable urban outcomes.

## Architecture

- **Web:** React, TypeScript, Vite
- **API:** Node.js, Express, TypeScript
- **Data:** MongoDB with Mongoose
- **Contracts:** shared TypeScript package
- **Operations:** Docker Compose, GitHub Actions

## Development status

The project is being delivered in milestone-based increments. The initial milestone establishes the monorepo, application shells, configuration, developer tooling, local infrastructure, and architecture documentation. Domain capabilities will be introduced behind explicit module boundaries in subsequent milestones.

## Repository layout

```text
apps/
  api/       Express API
  web/       React application
packages/
  contracts/ Shared API contracts
infra/       Local infrastructure
docs/        Architecture and engineering decisions
```

## Getting started

See [docs/architecture/overview.md](docs/architecture/overview.md) and the workspace README files. Copy each app's `.env.example` to a local `.env` file before starting services.

## Engineering principles

Security by default, validated configuration, typed boundaries, observable services, reproducible local development, automated quality gates, and incremental delivery.


## Security and contribution guidance

- [Security policy](SECURITY.md) — responsible vulnerability reporting and project security expectations.
- [Contributing guide](CONTRIBUTING.md) — engineering standards and pull request expectations.

These documents describe intended safeguards and contribution practices; they do not imply that planned product controls are already implemented or independently verified.
