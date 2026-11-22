import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { KeycloakTokenParsed } from "keycloak-js";
import { getAccessToken, initializeIdentity, keycloak, oidcConfigured } from "./keycloak";

type AuthState = {
  configured: boolean;
  ready: boolean;
  authenticated: boolean;
  profile: KeycloakTokenParsed | undefined;
  error: string | undefined;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  accessToken: () => Promise<string | undefined>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!oidcConfigured);
  const [authenticated, setAuthenticated] = useState(false);
  const [profile, setProfile] = useState<KeycloakTokenParsed>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const client = keycloak;
    if (!client) return;
    let active = true;
    void initializeIdentity()
      .then((signedIn) => {
        if (!active) return;
        setAuthenticated(signedIn);
        setProfile(client.tokenParsed);
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setError("Identity provider could not be reached. Check the OIDC configuration and Keycloak availability.");
        setReady(true);
      });
    return () => { active = false; };
  }, []);

  const signIn = useCallback(async () => {
    if (!keycloak) return;
    setError(undefined);
    await keycloak.login({ redirectUri: window.location.origin });
  }, []);

  const signOut = useCallback(async () => {
    if (!keycloak) return;
    await keycloak.logout({ redirectUri: window.location.origin });
  }, []);

  const value = useMemo<AuthState>(() => ({
    configured: oidcConfigured, ready, authenticated, profile, error,
    signIn, signOut, accessToken: getAccessToken,
  }), [ready, authenticated, profile, error, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
