import { createPublicKey, verify as verifySignature } from "node:crypto";
import type { JsonWebKey } from "node:crypto";
import type { RequestHandler } from "express";
import { env } from "../../config/env.js";
import { HttpError } from "../../lib/http-error.js";
import { resolveMembership } from "./membership.js";

type JwtHeader = { alg?: string; kid?: string; typ?: string };
type JwtClaims = {
  iss?: unknown; aud?: unknown; exp?: unknown; nbf?: unknown; sub?: unknown;
  tenant_id?: unknown;
};
type Jwk = JsonWebKey & { kid?: string; use?: string; alg?: string; kty?: string };
type JwksDocument = { keys?: Jwk[] };

export interface VerifiedIdentity {
  userId: string;
  tenantId: string;
}

const CLOCK_TOLERANCE_SECONDS = 5;
const JWKS_CACHE_MS = 5 * 60 * 1000;
let cachedKeys: Jwk[] = [];
let cacheExpiresAt = 0;
let refreshInFlight: Promise<Jwk[]> | undefined;

function unauthorized(): HttpError {
  return new HttpError(401, "INVALID_CREDENTIALS", "The supplied access token is invalid or expired.");
}

function decodeSegment<T>(segment: string): T {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as T;
}

async function loadJwks(force = false): Promise<Jwk[]> {
  if (!env.OIDC_JWKS_URI) throw unauthorized();
  if (!force && cachedKeys.length > 0 && Date.now() < cacheExpiresAt) return cachedKeys;
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const response = await fetch(env.OIDC_JWKS_URI!, { signal: AbortSignal.timeout(5_000) });
      if (!response.ok) throw unauthorized();
      const document = await response.json() as JwksDocument;
      if (!Array.isArray(document.keys)) throw unauthorized();
      const keys = document.keys.filter((key) =>
        key.kty === "RSA" && typeof key.kid === "string" &&
        (!key.use || key.use === "sig") && (!key.alg || key.alg === "RS256") &&
        typeof key.n === "string" && typeof key.e === "string",
      );
      if (keys.length === 0) throw unauthorized();
      cachedKeys = keys;
      cacheExpiresAt = Date.now() + JWKS_CACHE_MS;
      return keys;
    })().finally(() => { refreshInFlight = undefined; });
  }
  return refreshInFlight;
}

function buildIdentity(claims: JwtClaims): VerifiedIdentity {
  if (typeof claims.sub !== "string" || claims.sub.length === 0 || claims.sub.length > 256 ||
      typeof claims.tenant_id !== "string" || claims.tenant_id.length === 0 || claims.tenant_id.length > 128) {
    throw unauthorized();
  }
  return { userId: claims.sub, tenantId: claims.tenant_id };
}

export async function verifyAccessToken(token: string): Promise<VerifiedIdentity> {
  if (!env.OIDC_ISSUER || !env.OIDC_AUDIENCE || !env.OIDC_JWKS_URI) throw unauthorized();
  const segments = token.split(".");
  if (segments.length !== 3 || segments.some((part) => part.length === 0)) throw unauthorized();

  let header: JwtHeader;
  let claims: JwtClaims;
  try {
    header = decodeSegment<JwtHeader>(segments[0]!);
    claims = decodeSegment<JwtClaims>(segments[1]!);
  } catch {
    throw unauthorized();
  }
  if (header.alg !== "RS256" || typeof header.kid !== "string" || header.kid.length === 0) throw unauthorized();

  let keys = await loadJwks();
  let jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) {
    keys = await loadJwks(true);
    jwk = keys.find((key) => key.kid === header.kid);
  }
  if (!jwk) throw unauthorized();

  let signatureValid = false;
  try {
    const publicKey = createPublicKey({ key: jwk, format: "jwk" });
    signatureValid = verifySignature(
      "RSA-SHA256",
      Buffer.from(segments.slice(0, 2).join(".")),
      publicKey,
      Buffer.from(segments[2]!, "base64url"),
    );
  } catch {
    throw unauthorized();
  }
  if (!signatureValid) throw unauthorized();

  const now = Math.floor(Date.now() / 1000);
  const audience = claims.aud;
  const audienceMatches = audience === env.OIDC_AUDIENCE ||
    (Array.isArray(audience) && audience.includes(env.OIDC_AUDIENCE));
  if (
    claims.iss !== env.OIDC_ISSUER ||
    !audienceMatches ||
    typeof claims.exp !== "number" || !Number.isFinite(claims.exp) ||
    claims.exp <= now - CLOCK_TOLERANCE_SECONDS ||
    (claims.nbf !== undefined &&
      (typeof claims.nbf !== "number" || !Number.isFinite(claims.nbf) || claims.nbf > now + CLOCK_TOLERANCE_SECONDS))
  ) throw unauthorized();

  return buildIdentity(claims);
}

/** Verifies the OIDC identity, then hydrates permissions from an active MongoDB membership. */
export const authenticateOidc: RequestHandler = (request, _response, next) => {
  const authorization = request.header("authorization");
  if (!authorization) { next(); return; }
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/i.exec(authorization);
  if (!match) { next(unauthorized()); return; }
  void verifyAccessToken(match[1]!)
    .then((identity) => resolveMembership(identity))
    .then((principal) => { request.auth = principal; next(); })
    .catch((error: unknown) => {
      if (error instanceof HttpError) { next(error); return; }
      next(new HttpError(503, "IDENTITY_MEMBERSHIP_UNAVAILABLE", "Identity membership could not be verified."));
    });
};

/** Test helper only: clears process-local signing-key cache between isolated tests. */
export function clearOidcJwksCache(): void {
  cachedKeys = [];
  cacheExpiresAt = 0;
  refreshInFlight = undefined;
}
