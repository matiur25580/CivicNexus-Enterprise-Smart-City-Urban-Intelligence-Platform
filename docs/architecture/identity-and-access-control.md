# Identity and access control

## Authentication boundary

CivicNexus accepts OIDC bearer access tokens issued by the configured identity provider. The API verifies the RS256 signature against the configured JWKS endpoint, pins the algorithm, and validates issuer, audience, expiration, and not-before claims before extracting only the immutable identity subject (`sub`) and requested tenant context (`tenant_id`). Unknown key IDs trigger one JWKS refresh to support signing-key rotation. JWKS responses are cached for five minutes.

Configure `OIDC_ISSUER`, `OIDC_JWKS_URI`, and `OIDC_AUDIENCE` together. Production startup requires all three. In development, leave all three unset to keep the API in its existing fail-closed mode: protected routes still return 401 because no principal is attached.

## Persisted membership is authoritative

The API resolves each authenticated identity against the MongoDB `identity_memberships` collection. A membership is active only when the unique `userId + tenantId` record has `status: "active"`. The role and jurisdiction assignments are taken exclusively from that record. Token role and jurisdiction claims are deliberately ignored; a Keycloak realm role alone never grants CivicNexus access.

Membership records contain:
- `userId`: exact OIDC subject (`sub`) from the trusted issuer
- `tenantId`: tenant context selected by the signed `tenant_id` claim
- `role`: one of the six CivicNexus roles
- `jurisdictionIds`: bounded, unique jurisdiction IDs assigned by a trusted operator
- `status`: `active`, `suspended`, or `revoked`

A compound unique index prevents duplicate memberships for a user in a tenant. A directory index supports tenant/status/role administrative queries. A missing or inactive membership is rejected with 403; a database lookup failure is rejected with 503. Neither condition falls back to token-supplied permissions.

### Provisioning a development membership

First sign in to the local Keycloak realm and copy the stable user ID (the `sub` claim) from the user's account details or a trusted admin console. Then, from a trusted local MongoDB shell, insert a membership for that exact subject. Example only—replace all placeholder values with real IDs and assign the least privilege required:

```javascript
db.identity_memberships.insertOne({
  userId: "<exact-keycloak-sub>",
  tenantId: "<existing-tenant-id>",
  role: "analyst",
  jurisdictionIds: ["<existing-jurisdiction-id>"],
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
});
```

Do not expose membership writes through a public endpoint. Membership provisioning, role changes, suspension, and revocation must be restricted to a trusted administrative workflow and audited. The unique index means a second membership for the same user and tenant must be an explicit update, not another insert.

Platform administrators must also have an explicit active membership record with `tenantId: "platform"` and `role: "platform_admin"`. Do not assign platform role based only on Keycloak.

## Keycloak local integration

See [Keycloak local development](./keycloak-local-development.md) for the local realm and browser client setup. Configure the Keycloak API audience mapper so access tokens include `civicnexus-api` in `aud`. Configure a signed `tenant_id` claim only as a tenant-selection hint; it is not proof of membership. Do not rely on a browser client to assign authorization claims.

## Authorization

The role-to-permission matrix remains centralized in `apps/api/src/modules/identity/authorization.ts`. Protected route composition must include `requireAuthenticated`, permission checks, and tenant/jurisdiction guards. API services must independently include tenant and jurisdiction predicates in MongoDB queries. UI visibility is never an authorization boundary.

The authenticated identity endpoint is `GET /api/v1/identity/me`; it returns only the resolved membership principal. It does not reveal raw token claims.

## Operational requirements

- Use HTTPS for issuer and JWKS endpoints in production.
- Keep Keycloak in a supported production mode with a managed database, TLS, backups, MFA policy, account lifecycle controls, and externalized secrets.
- Keep access tokens short-lived and enforce identity-provider session revocation policies.
- Never log bearer tokens, authorization headers, or raw claims.
- This milestone establishes persisted identity-to-tenant membership. It does not yet provide a tenant administration UI, audited membership management, or domain-resource query scoping. Do not expose protected domain routes until every domain query applies tenant and jurisdiction predicates.
