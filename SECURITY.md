# Security Policy

## Reporting

Do not publish credentials, exploitable vulnerability details, private infrastructure information, or personal/citizen data in public issues. Use GitHub's private vulnerability reporting channel for this repository when available. Provide affected versions, impact, safe reproduction steps, and relevant logs with secrets and personal data removed.

## Baseline requirements

- Treat device telemetry, public submissions, geospatial feeds, and partner integrations as untrusted input.
- Authenticate devices and services; rotate and revoke credentials.
- Enforce role- and tenant-scoped authorization on the server for every protected operation.
- Minimize location and personal data; document purpose, retention, and access.
- Validate payloads and impose request, upload, and message size limits.
- Keep secrets out of source control and logs; use environment-specific secret management.
- Audit administrative actions and changes to critical infrastructure records.
- Use synthetic data in development and tests.
- Do not connect prototypes to operational city infrastructure without a reviewed threat model, safety assessment, and explicit authorization.

## Project status

This repository is an incremental foundation. A security policy is not a certification or evidence that controls have been implemented or independently tested.
