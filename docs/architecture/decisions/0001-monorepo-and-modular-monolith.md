# ADR 0001: Monorepo with a modular API

- **Status:** Accepted
- **Date:** 2026-11-22

## Context

The platform needs coordinated evolution across a TypeScript web client, HTTP API, and shared contracts. Early service fragmentation would add operational overhead before domain boundaries and scaling characteristics are understood.

## Decision

Use an npm-workspaces monorepo. Keep the API as a modular monolith with explicit domain boundaries and shared contracts. Extract independently deployable services only when ownership, load, isolation, or reliability requirements justify the operational complexity.

## Consequences

- Shared tooling and consistent TypeScript conventions.
- Atomic changes across client and API contracts.
- Clear package boundaries without premature distributed-system complexity.
- Future extraction requires deliberate API and data ownership work.
