export type IncidentPrioritySeverity = "low" | "medium" | "high" | "critical";

const severityPoints: Record<IncidentPrioritySeverity, number> = {
  low: 10,
  medium: 25,
  high: 45,
  critical: 60
};

/**
 * Produces a bounded operational priority score.
 * nowMs is injectable so aging behavior can be tested without wall-clock timing.
 */
export function calculateIncidentPriorityScore(
  severity: IncidentPrioritySeverity,
  impactCount: number,
  safetyRisk: boolean,
  createdAt: Date,
  nowMs: number = Date.now()
): number {
  const safeImpactCount = Number.isFinite(impactCount) ? Math.max(0, impactCount) : 0;
  const impactPoints = Math.min(20, Math.floor(Math.log10(safeImpactCount + 1) * 10));
  const createdAtMs = new Date(createdAt).getTime();
  const ageHours = Number.isFinite(createdAtMs) && Number.isFinite(nowMs)
    ? Math.max(0, (nowMs - createdAtMs) / 3_600_000)
    : 0;
  const agePoints = Math.min(10, Math.floor(ageHours / 24));
  return Math.min(100, severityPoints[severity] + impactPoints + (safetyRisk ? 20 : 0) + agePoints);
}
