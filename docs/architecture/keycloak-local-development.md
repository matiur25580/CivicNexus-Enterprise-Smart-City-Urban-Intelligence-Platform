# Keycloak local development

CivicNexus uses OpenID Connect (OIDC) as its identity-provider boundary. Keycloak is the reference local provider because it is self-hostable and supports standard OIDC discovery, signed access tokens, and rotating signing keys.

## Start the local identity provider

1. Copy `.env.example` to `.env`.
2. Replace `KEYCLOAK_ADMIN_PASSWORD` with a long, unique local development password.
3. Start the infrastructure with `docker compose up -d`.
4. Wait for the `keycloak` container health check to pass.
5. Open [http://localhost:8080](http://localhost:8080), sign in to the administration console, and select the imported `civicnexus` realm.
6. The imported `civicnexus-web` client is a public browser client. It uses Authorization Code Flow with PKCE (S256); password/direct-access grants and implicit flow are disabled.

The local realm defines the CivicNexus application roles. It intentionally contains no sample users or production credentials.

## OIDC issuer and discovery

- Realm: `civicnexus`
- Issuer: `http://localhost:8080/realms/civicnexus`
- Discovery document: `http://localhost:8080/realms/civicnexus/.well-known/openid-configuration`
- Browser client ID: `civicnexus-web`

The API must validate access tokens against the issuer's discovered JWKS endpoint, pin accepted signing algorithms, and enforce the configured issuer and API audience. It must reject expired or not-yet-valid tokens and unknown signing key IDs. Key rotation is handled by refreshing the provider JWKS according to cache headers and retrying a missing key once.

## Security boundaries and limitations

- This compose profile is for local development only. Keycloak `start-dev` is not a production deployment configuration.
- Do not commit `.env`, real client secrets, signing keys, user exports, or production realm exports.
- The browser client is public and must never contain a client secret.
- Do not enable direct access grants or collect user passwords in the CivicNexus web app.
- Realm roles are identity-provider input, not authorization by themselves. The API must map only an explicit allowlist of roles and derive tenant and jurisdiction membership from trusted claims or persisted membership records.
- Never accept roles, tenant IDs, or jurisdiction IDs from caller-controlled request bodies or headers.
- The existing API authorization middleware remains fail-closed until credential verification has been implemented and tested. This bootstrap does not yet enable protected application routes or claim end-to-end login is complete.

For production, use TLS, a supported Keycloak production deployment mode, externalized secrets, database backups, a hardened hostname/proxy configuration, MFA policy, account lifecycle controls, and monitored audit events.
