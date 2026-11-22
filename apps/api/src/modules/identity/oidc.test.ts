import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import { generateKeyPairSync, sign } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { clearOidcJwksCache as ClearOidcJwksCache, verifyAccessToken as VerifyAccessToken } from "./oidc.js";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = publicKey.export({ format: "jwk" });
const keyId = "civicnexus-test-key";
const originalEnv = {
  issuer: process.env.OIDC_ISSUER,
  jwks: process.env.OIDC_JWKS_URI,
  audience: process.env.OIDC_AUDIENCE,
};
let server: Server;
let issuer: string;
let verifyAccessToken: typeof VerifyAccessToken;
let clearOidcJwksCache: typeof ClearOidcJwksCache;

function token(overrides: Record<string, unknown> = {}, kid = keyId): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid })).toString("base64url");
  const claims = Buffer.from(JSON.stringify({
    iss: issuer, aud: "civicnexus-api", sub: "operator-1",
    exp: Math.floor(Date.now() / 1000) + 300,
    realm_access: { roles: ["city_operator"] },
    tenant_id: "tenant-north", jurisdiction_ids: ["district-1"],
    ...overrides,
  })).toString("base64url");
  const input = `${header}.${claims}`;
  return `${input}.${sign("RSA-SHA256", Buffer.from(input), privateKey).toString("base64url")}`;
}

describe("OIDC access-token verification", () => {
  beforeAll(async () => {
    server = createServer((_request, response) => {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ keys: [{ ...jwk, kid: keyId, use: "sig", alg: "RS256" }] }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    issuer = "https://identity.example.test/realms/civicnexus";
    process.env.OIDC_ISSUER = issuer;
    process.env.OIDC_JWKS_URI = `http://127.0.0.1:${address.port}/jwks`;
    process.env.OIDC_AUDIENCE = "civicnexus-api";
    vi.resetModules();
    const verifier = await import("./oidc.js");
    verifyAccessToken = verifier.verifyAccessToken;
    clearOidcJwksCache = verifier.clearOidcJwksCache;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    for (const [key, value] of Object.entries({
      OIDC_ISSUER: originalEnv.issuer, OIDC_JWKS_URI: originalEnv.jwks, OIDC_AUDIENCE: originalEnv.audience,
    })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    clearOidcJwksCache();
  });

  it("verifies a signed token and derives a typed least-privilege principal", async () => {
    await expect(verifyAccessToken(token())).resolves.toEqual({
      userId: "operator-1", tenantId: "tenant-north", role: "city_operator", jurisdictionIds: ["district-1"],
    });
  });

  it("rejects an invalid signature", async () => {
    const invalid = token().split(".");
    invalid[2] = Buffer.from("not-a-signature").toString("base64url");
    await expect(verifyAccessToken(invalid.join("."))).rejects.toMatchObject({ statusCode: 401 });
  });

  it("rejects issuer and audience mismatches", async () => {
    await expect(verifyAccessToken(token({ iss: "https://attacker.example" }))).rejects.toMatchObject({ statusCode: 401 });
    await expect(verifyAccessToken(token({ aud: "another-api" }))).rejects.toMatchObject({ statusCode: 401 });
  });

  it("rejects expired and not-yet-valid tokens", async () => {
    await expect(verifyAccessToken(token({ exp: 1 }))).rejects.toMatchObject({ statusCode: 401 });
    await expect(verifyAccessToken(token({ nbf: Math.floor(Date.now() / 1000) + 120 }))).rejects.toMatchObject({ statusCode: 401 });
  });

  it("rejects malformed tokens, unsupported algorithms, unknown keys, and ambiguous roles", async () => {
    await expect(verifyAccessToken("not.a.jwt")).rejects.toMatchObject({ statusCode: 401 });
    const parts = token().split(".");
    parts[0] = Buffer.from(JSON.stringify({ alg: "HS256", kid: keyId })).toString("base64url");
    await expect(verifyAccessToken(parts.join("."))).rejects.toMatchObject({ statusCode: 401 });
    await expect(verifyAccessToken(token({}, "unknown-key"))).rejects.toMatchObject({ statusCode: 401 });
    await expect(verifyAccessToken(token({ realm_access: { roles: ["city_operator", "tenant_admin"] } })))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it("rejects missing tenant scope and malformed jurisdiction assignments", async () => {
    await expect(verifyAccessToken(token({ tenant_id: undefined }))).rejects.toMatchObject({ statusCode: 401 });
    await expect(verifyAccessToken(token({ jurisdiction_ids: "district-1" }))).rejects.toMatchObject({ statusCode: 401 });
  });
});
