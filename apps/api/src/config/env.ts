import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_HOST: z.string().default("0.0.0.0"),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/civicnexus"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  OIDC_ISSUER: z.string().url().optional(),
  OIDC_JWKS_URI: z.string().url().optional(),
  OIDC_AUDIENCE: z.string().min(1).optional(),
});

const parsed = envSchema.parse(process.env);
const oidcValues = [parsed.OIDC_ISSUER, parsed.OIDC_JWKS_URI, parsed.OIDC_AUDIENCE];
if (oidcValues.some(Boolean) && !oidcValues.every(Boolean)) {
  throw new Error("OIDC_ISSUER, OIDC_JWKS_URI, and OIDC_AUDIENCE must be configured together.");
}
if (parsed.NODE_ENV === "production" && !oidcValues.every(Boolean)) {
  throw new Error("OIDC issuer, JWKS URI, and audience are required in production.");
}

export const env = parsed;
