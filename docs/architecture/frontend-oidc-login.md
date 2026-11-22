# Frontend OIDC login

The web application uses the maintained Keycloak JavaScript adapter. It is a public browser client and never has a client secret. The adapter uses Authorization Code Flow with PKCE S256; implicit and password grants remain disabled.

## Local configuration

Copy `.env.example` to `.env`, replace the local Keycloak bootstrap password, and start Docker Compose. The frontend reads:

- `VITE_OIDC_URL=http://localhost:8080`
- `VITE_OIDC_REALM=civicnexus`
- `VITE_OIDC_CLIENT_ID=civicnexus-web`

The API validates access tokens with the matching issuer and JWKS endpoint and expects `civicnexus-api` in the access-token audience. The imported realm includes a client-scope audience mapper attached to the web client.

## Session behavior

The adapter checks for an existing SSO session at startup, stores tokens in memory, and refreshes short-lived access tokens before API requests. It does not write access or refresh tokens to localStorage or sessionStorage. Sign-out delegates to the identity provider. The API helper adds the current access token to requests.

## Important deployment notes

- Add exact production redirect URIs and web origins to the Keycloak client; do not use wildcard origins in production.
- Set browser and API OIDC endpoints to the same trusted HTTPS realm.
- The `VITE_*` values are public configuration, never secrets.
- This is a browser login/session foundation. Tenant and jurisdiction claims must be populated from trusted identity administration or persisted memberships. Do not treat the UI role display as authorization.
- No protected domain routes are exposed by this change. API authorization and MongoDB tenant/jurisdiction query predicates remain mandatory before domain data is served.
- Configure CORS for the exact deployed web origin and apply a production CSP compatible with the chosen identity provider.
