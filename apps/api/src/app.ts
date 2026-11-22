import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import type { ErrorRequestHandler, RequestHandler } from "express";
import helmet from "helmet";
import type { ApiError } from "@civicnexus/contracts";
import { env } from "./config/env.js";
import { HttpError } from "./lib/http-error.js";
import { logger } from "./lib/logger.js";
import { authenticateOidc } from "./modules/identity/oidc.js";
import { healthRouter } from "./routes/health.routes.js";
import { identityRouter } from "./routes/identity.routes.js";

export const app = express();

const requestContext: RequestHandler = (request, response, next) => {
  const suppliedRequestId = request.header("x-request-id");
  const requestId = suppliedRequestId && /^[A-Za-z0-9._:-]{1,128}$/.test(suppliedRequestId)
    ? suppliedRequestId
    : randomUUID();
  response.locals.requestId = requestId;
  response.setHeader("x-request-id", requestId);
  const startedAt = process.hrtime.bigint();
  response.on("finish", () => {
    logger.info({
      requestId, method: request.method, path: request.originalUrl,
      statusCode: response.statusCode,
      durationMs: Number(process.hrtime.bigint() - startedAt) / 1_000_000,
    }, "HTTP request completed");
  });
  next();
};

const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  void next;
  const requestId = String(response.locals.requestId ?? randomUUID());
  const isMalformedJson = error instanceof SyntaxError && "status" in error && error.status === 400;
  const normalizedError = isMalformedJson
    ? new HttpError(400, "INVALID_JSON", "The request body contains invalid JSON.")
    : error instanceof HttpError
      ? error
      : new HttpError(500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred.");
  if (normalizedError.statusCode >= 500) {
    logger.error({ err: error, requestId }, "Unhandled API error");
  } else {
    logger.warn({ code: normalizedError.code, requestId }, "Request rejected");
  }
  const payload: ApiError = { error: { code: normalizedError.code, message: normalizedError.message, requestId } };
  response.status(normalizedError.statusCode).json(payload);
};

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(requestContext);
app.use(express.json({ limit: "1mb" }));
app.use(authenticateOidc);
app.get("/api/v1", (_request, response) => {
  response.status(200).json({ name: "CivicNexus API", version: "v1", documentation: "/api/v1/health" });
});
app.use("/api/v1/health", healthRouter);
app.use("/api/v1/identity", identityRouter);
app.use((_request, _response, next) => {
  next(new HttpError(404, "NOT_FOUND", "The requested resource was not found."));
});
app.use(errorHandler);
