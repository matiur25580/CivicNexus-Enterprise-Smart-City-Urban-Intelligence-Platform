import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { HttpError } from "../../lib/http-error.js";
import { requireAuthenticated, requirePermission } from "../identity/authorization.js";
import { assertJurisdictionAssignment, buildJurisdictionScopedFilter } from "../identity/scoped-query.js";
import { Incident } from "./incident.model.js";
import { analyzeIncidentHotspots } from "./hotspot-analysis.js";

const createSchema = z.object({
  jurisdictionId: z.string().trim().min(1).max(128),
  title: z.string().trim().min(5).max(160),
  description: z.string().trim().min(10).max(3000),
  category: z.enum(["road_damage", "water", "power", "waste", "public_safety", "transport", "other"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  impactCount: z.number().int().min(0).max(10_000_000).default(0),
  safetyRisk: z.boolean().default(false),
  location: z.object({ type: z.literal("Point"), coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]) }),
});
const updateSchema = z.object({
  status: z.enum(["reported", "triaged", "assigned", "in_progress", "resolved", "closed"]).optional(),
  assignedTeam: z.string().trim().min(1).max(120).nullable().optional(),
  note: z.string().trim().max(500).optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one update field is required.");
const listSchema = z.object({
  tenantId: z.string().trim().min(1).max(128).optional(),
  jurisdictionId: z.string().trim().min(1).max(128).optional(),
  status: z.enum(["reported", "triaged", "assigned", "in_progress", "resolved", "closed"]).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
const router = Router();
router.use(requireAuthenticated);
function asyncRoute(handler: (request: Request, response: Response) => Promise<void>) {
  return (request: Request, response: Response, next: NextFunction) => {
    void handler(request, response).catch(next);
  };
}
function priorityScore(severity: string, impactCount: number, safetyRisk: boolean, createdAt: Date): number {
  const severityPoints: Record<string, number> = { low: 10, medium: 25, high: 45, critical: 60 };
  const impactPoints = Math.min(20, Math.floor(Math.log10(impactCount + 1) * 10));
  const ageHours = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / 3_600_000);
  return Math.min(100, severityPoints[severity]! + impactPoints + (safetyRisk ? 20 : 0) + Math.min(10, Math.floor(ageHours / 24)));
}
router.post("/", requirePermission("incidents:write"), asyncRoute(async (request, response) => {
  const parsed = createSchema.safeParse(request.body);
  if (!parsed.success) throw new HttpError(400, "INVALID_INCIDENT_INPUT", "The incident details are invalid.");
  const tenantId = assertJurisdictionAssignment(request.auth!, parsed.data.jurisdictionId);
  const incident = await Incident.create({
    ...parsed.data, tenantId, status: "reported",
    reportedBy: request.auth!.userId, updatedBy: request.auth!.userId,
    history: [{ status: "reported", note: "Incident reported", changedBy: request.auth!.userId, changedAt: new Date() }]
  });
  response.status(201).json({ data: incident, meta: { priorityScore: priorityScore(incident.severity, incident.impactCount, incident.safetyRisk, incident.createdAt) } });
}));
router.get("/", requirePermission("incidents:read"), asyncRoute(async (request, response) => {
  const parsed = listSchema.safeParse(request.query);
  if (!parsed.success) throw new HttpError(400, "INVALID_INCIDENT_FILTER", "The incident filters are invalid.");
  const { tenantId, jurisdictionId, status, severity, limit } = parsed.data;
  const filter = buildJurisdictionScopedFilter(request.auth!, { ...(jurisdictionId ? { jurisdictionId } : {}), ...(status ? { status } : {}), ...(severity ? { severity } : {}) }, tenantId);
  const records = await Incident.find(filter).sort({ createdAt: -1 }).limit(limit).lean().exec();
  const data = records.map((incident) => ({
    ...incident,
    priorityScore: priorityScore(incident.severity, incident.impactCount, incident.safetyRisk, incident.createdAt)
  })).sort((a, b) => b.priorityScore - a.priorityScore);
  response.status(200).json({ data, meta: { count: data.length, limit, ordering: "priority_score_desc" } });
}));
router.patch("/:incidentId", requirePermission("incidents:write"), asyncRoute(async (request, response) => {
  const incidentId = request.params.incidentId;
  if (typeof incidentId !== "string" || incidentId.length > 128) throw new HttpError(400, "INVALID_INCIDENT_ID", "A valid incident identifier is required.");
  const parsed = updateSchema.safeParse(request.body);
  if (!parsed.success) throw new HttpError(400, "INVALID_INCIDENT_UPDATE", "The incident update is invalid.");
  const filter = buildJurisdictionScopedFilter(request.auth!, { _id: incidentId });
  const incident = await Incident.findOne(filter);
  if (!incident) throw new HttpError(404, "INCIDENT_NOT_FOUND", "The incident was not found in your authorized scope.");
  if (incident.status === "closed" && parsed.data.status && parsed.data.status !== "closed") {
    throw new HttpError(409, "INCIDENT_CLOSED", "Closed incidents cannot be reopened through this endpoint.");
  }
  const statusChanged = parsed.data.status !== undefined && parsed.data.status !== incident.status;
  if (statusChanged) incident.status = parsed.data.status!;
  if (parsed.data.assignedTeam === null) incident.set("assignedTeam", undefined);
  else if (parsed.data.assignedTeam !== undefined) incident.assignedTeam = parsed.data.assignedTeam;
  // Keep the operational timeline complete for notes and assignment-only updates too.
  if (statusChanged || parsed.data.note !== undefined || parsed.data.assignedTeam !== undefined) {
    const note = parsed.data.note ?? (parsed.data.assignedTeam !== undefined ? "Response team assignment updated" : "");
    incident.history.push({ status: incident.status, note, changedBy: request.auth!.userId, changedAt: new Date() });
  }
  incident.updatedBy = request.auth!.userId;
  await incident.save();
  response.status(200).json({ data: incident, meta: { priorityScore: priorityScore(incident.severity, incident.impactCount, incident.safetyRisk, incident.createdAt) } });
}));
router.get("/hotspots", requirePermission("incidents:read"), asyncRoute(async (request, response) => {
  const querySchema = z.object({
    tenantId: z.string().trim().min(1).max(128).optional(),
    jurisdictionId: z.string().trim().min(1).max(128).optional(),
    longitude: z.coerce.number().min(-180).max(180),
    latitude: z.coerce.number().min(-90).max(90),
    radiusMeters: z.coerce.number().int().min(100).max(50_000).default(5_000),
    cellSizeMeters: z.coerce.number().int().min(100).max(5_000).default(500),
    windowHours: z.coerce.number().int().min(1).max(720).default(168),
    limit: z.coerce.number().int().min(1).max(50).default(20)
  });
  const parsed = querySchema.safeParse(request.query);
  if (!parsed.success) throw new HttpError(400, "INVALID_HOTSPOT_FILTER", "Hotspot coordinates or filters are invalid.");
  const { tenantId, jurisdictionId, longitude, latitude, radiusMeters, cellSizeMeters, windowHours, limit } = parsed.data;
  const scopedFilter = buildJurisdictionScopedFilter(request.auth!, {
    ...(jurisdictionId ? { jurisdictionId } : {}),
    status: { $nin: ["resolved", "closed"] },
    createdAt: { $gte: new Date(Date.now() - windowHours * 3_600_000) }
  }, tenantId);
  const records = await Incident.aggregate<{
    location: { type: "Point"; coordinates: [number, number] };
    severity: "low" | "medium" | "high" | "critical";
    impactCount: number;
    safetyRisk: boolean;
    category: string;
  }>([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [longitude, latitude] },
        key: "location",
        distanceField: "distanceMeters",
        maxDistance: radiusMeters,
        spherical: true,
        query: scopedFilter
      }
    },
    { $project: { _id: 0, location: 1, severity: 1, impactCount: 1, safetyRisk: 1, category: 1 } },
    { $limit: 5001 }
  ]).exec();
  const truncated = records.length > 5000;
  const hotspots = analyzeIncidentHotspots(records.slice(0, 5000), cellSizeMeters, limit);
  response.status(200).json({
    data: hotspots,
    meta: {
      center: { type: "Point", coordinates: [longitude, latitude] },
      radiusMeters, cellSizeMeters, windowHours,
      incidentsAnalyzed: Math.min(records.length, 5000),
      truncated,
      ordering: "risk_score_desc"
    }
  });
}));

export function createIncidentRouter() { return router; }
