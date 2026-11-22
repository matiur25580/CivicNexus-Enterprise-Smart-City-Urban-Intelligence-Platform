# Identity and access control foundations

## Security boundary

CivicNexus authorization consumes an `AuthenticatedPrincipal` attached to the Express request by a trusted credential-verification layer. The authorization module does not parse caller-supplied identity headers, query parameters, or body fields. Until a credential verifier is installed, protected routes must remain inaccessible: the authentication guard returns `401 AUTHENTICATION_REQUIRED` when no verified principal exists.

This milestone establishes authorization policy and a safe integration seam. It does not claim to implement token issuance, password storage, login, refresh-token rotation, or JWT/session verification.

## Role-based access control

The initial roles are:

| Role | Intended boundary |
| --- | --- |
| `platform_admin` | Platform-wide operational administration |
| `tenant_admin` | Administration within one tenant |
| `city_operator` | Operational asset, incident, and work-order workflows |
| `analyst` | Read-only operational and analytics access |
| `emergency_responder` | Incident response and related operational workflows |
| `citizen` | Citizen request submission and own-request access |

Permissions are explicit and centrally mapped in `apps/api/src/modules/identity/authorization.ts`. New roles and permissions require policy tests and review. UI visibility is not an authorization boundary; APIs must enforce permissions.

## Tenant and jurisdiction isolation

- Tenant-scoped routes use `requireTenantAccess` after authentication.
- Jurisdiction-scoped routes use `requireJurisdictionAccess` after authentication.
- Non-platform principals can access only their own tenant and jurisdiction IDs explicitly present in the verified principal.
- A tenant administrator is not a platform administrator and cannot cross tenant boundaries.
- Data access services must still include tenant and jurisdiction predicates in MongoDB queries; middleware checks are not a substitute for scoped persistence queries.
- Platform-wide access is an explicit privileged role and should be audited whenever used.

## Route composition

Protected routes should compose guards in this order:

```ts
router.get(
  "/tenants/:tenantId/jurisdictions/:jurisdictionId/assets",
  requireAuthenticated,
  requirePermission("assets:read"),
  requireTenantAccess,
  requireJurisdictionAccess,
  listAssets,
);
```

## Next security work

1. Add a concrete identity provider or first-party credential verifier with key rotation and strict issuer/audience validation.
2. Define account lifecycle, MFA, session revocation, and refresh-token rotation policies.
3. Persist tenant membership and jurisdiction assignments with audit history.
4. Require tenant and jurisdiction predicates in repository methods and add cross-tenant integration tests.
5. Add authorization-decision audit events without logging credentials or sensitive request payloads.
