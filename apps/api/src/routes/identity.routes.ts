import { Router } from "express";
import { requireAuthenticated } from "../modules/identity/authorization.js";

export const identityRouter = Router();

identityRouter.get("/me", requireAuthenticated, (request, response) => {
  response.status(200).json({
    userId: request.auth!.userId,
    tenantId: request.auth!.tenantId,
    role: request.auth!.role,
    jurisdictionIds: request.auth!.jurisdictionIds,
  });
});
