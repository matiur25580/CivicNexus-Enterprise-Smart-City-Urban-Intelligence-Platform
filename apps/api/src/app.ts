import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { healthRouter } from "./routes/health.routes.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(pinoHttp({ logger }));

app.get("/api/v1", (_request, response) => {
  response.status(200).json({
    name: "CivicNexus API",
    version: "v1",
    documentation: "/api/v1/health",
  });
});

app.use("/api/v1/health", healthRouter);

app.use((_request, response) => {
  response.status(404).json({
    error: { code: "NOT_FOUND", message: "The requested resource was not found." },
  });
});