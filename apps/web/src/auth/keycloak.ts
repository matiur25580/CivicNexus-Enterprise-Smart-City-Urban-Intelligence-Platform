import Keycloak from "keycloak-js";

const url = import.meta.env.VITE_OIDC_URL;
const realm = import.meta.env.VITE_OIDC_REALM;
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID;

export const oidcConfigured = Boolean(url && realm && clientId);

export const keycloak = oidcConfigured
  ? new Keycloak({ url, realm, clientId })
  : null;

export async function initializeIdentity(): Promise<boolean> {
  if (!keycloak) return false;
  return keycloak.init({
    onLoad: "check-sso",
    pkceMethod: "S256",
    checkLoginIframe: false,
    silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
    responseMode: "query",
  });
}

export async function getAccessToken(): Promise<string | undefined> {
  if (!keycloak?.authenticated) return undefined;
  try {
    await keycloak.updateToken(60);
    return keycloak.token;
  } catch {
    await keycloak.clearToken();
    return undefined;
  }
}
