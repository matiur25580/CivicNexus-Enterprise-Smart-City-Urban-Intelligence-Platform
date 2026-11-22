import { Router } from "express";
import type { HealthResponse } from "@civicnexus/contracts";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  const payload: HealthResponse = {
    status: "ok",
    service: "civicnexus-api",
    timestamp: new Date().toISOString(),
  };

  response.status(200).json(payload);
});