# Contributing

Thank you for contributing to CivicNexus. The repository is being delivered incrementally; keep changes focused and distinguish working functionality from planned capabilities.

## Before starting
- Read the README, architecture documentation, and SECURITY.md.
- Discuss cross-cutting changes before introducing new services or dependencies.
- Use synthetic device, location, and citizen data only.

## Engineering expectations
- Validate and bound all external input, telemetry, uploads, and webhook payloads.
- Enforce server-side authorization and organization/tenant boundaries.
- Minimize personal and location data; never commit secrets or operational infrastructure details.
- Add tests for validation, access control, and failure handling.
- Keep interfaces accessible and document configuration and operational impact.

## Pull requests
Include motivation, scope, verification commands and results, security/privacy impact, screenshots where useful (with synthetic data), and known limitations. Do not connect prototypes to live infrastructure without explicit authorization and safety review.
