# Identity and access control

## Authentication boundary

CivicNexus accepts OIDC bearer access tokens issued by the configured identity provider. The API verifies the RS256 signature against the configured JWKS endpoint, pins the algorithm, and validates issuer, audience, expiration, and not-before claims before constructing `request.auth`. Unknown key IDs trigger one JWKS refresh to support signing-key rotation. JWKS responses are cached for five minutes.

Configure `OIDC_ISSUER`, `OIDC_JWKS_URI`, and `OIDC_AUDIENCE` together. Production startup requires all three. In development, leave all three unset to keep the API in its existing fail-closed mode: protected routes still return 401 because no principal is attached. Do not set an issuer/audience without a reachable, trusted JWKS endpoint.

Only the six allowlisted CivicNexus roles are recognized. Tokens with zero or multiple recognized roles are rejected. Non-platform principals must carry a non-empty `tenant_id`; jurisdiction assignments are read from the signed `jurisdiction_ids` claim. Platform administrators receive the reserved platform tenant scope. These claims must be populated by trusted identity administration, never by caller-controlled headers or request bodies.

The verifier accepts only RS256 RSA signing keys with a matching `kid`. It does not follow token-provided key URLs, accept symmetric algorithms, or trust unverified JWT contents. Verification failures are returned as a generic 401 and never include token material.

## Keycloak local integration

See [Keycloak local development](./keycloak-local-development.md) for the local realm and browser client setup. Configure the Keycloak API audience mapper so access tokens include `civicnexus-api` in `aud`; configure realm roles and signed tenant/jurisdiction claims using trusted user attributes or server-managed membership. Do not rely on a browser client to assign these claims.

## Authorization

The role-to-permission matrix remains centralized in `apps/api/src/modules/identity/authorization.ts`. Protected route composition must include `requireAuthenticated`, permission checks, and tenant/jurisdiction guards. API services must independently include tenant and jurisdiction predicates in MongoDB queries. UI visibility is never an authorization boundary.

## Operational requirements

- Use HTTPS for issuer and JWKS endpoints in production.
- Keep Keycloak in a supported production mode with a managed database, TLS, backups, MFA policy, account lifecycle controls, and externalized secrets.
- Configure short-lived access tokens and identity-provider session revocation policies.
- Never log bearer tokens, authorization headers, or raw claims.
- The current API middleware verifies access tokens but does not implement browser login, logout, refresh-token rotation, persisted CivicNexus memberships, or authorization-decision audit events. Do not expose protected domain routes until trusted tenant/jurisdiction membership and query-level isolation are implemented and tested.
