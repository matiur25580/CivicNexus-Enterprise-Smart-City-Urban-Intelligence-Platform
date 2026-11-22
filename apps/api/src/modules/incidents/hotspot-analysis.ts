export interface HotspotIncident {
  location: { type: "Point"; coordinates: [number, number] };
  severity: "low" | "medium" | "high" | "critical";
  impactCount: number;
  safetyRisk: boolean;
  category: string;
}

const severityWeight: Record<HotspotIncident["severity"], number> = {
  low: 1, medium: 2, high: 4, critical: 7
};

function normalizeLongitude(longitude: number): number {
  return ((longitude + 180) % 360 + 360) % 360 - 180;
}

/** Deterministic latitude-aware grid aggregation; returns aggregate locations, never incident records. */
export function analyzeIncidentHotspots(
  incidents: HotspotIncident[],
  cellSizeMeters: number,
  limit: number
) {
  if (!Number.isInteger(cellSizeMeters) || cellSizeMeters < 100 || cellSizeMeters > 5_000) {
    throw new RangeError("cellSizeMeters must be an integer between 100 and 5000.");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new RangeError("limit must be an integer between 1 and 50.");
  }

  const cells = new Map<string, {
    latIndex: number; lonIndex: number; count: number; riskScore: number;
    impactCount: number; safetyRiskCount: number; categories: Map<string, number>;
    severityCounts: Record<HotspotIncident["severity"], number>;
  }>();
  for (const incident of incidents) {
    const [longitude, latitude] = incident.location.coordinates;
    const latStep = cellSizeMeters / 111_320;
    const lonStep = cellSizeMeters / (111_320 * Math.max(0.1, Math.cos(latitude * Math.PI / 180)));
    const latIndex = Math.floor((latitude + 90) / latStep);
    const lonIndex = Math.floor((normalizeLongitude(longitude) + 180) / lonStep);
    const key = `${latIndex}:${lonIndex}`;
    let cell = cells.get(key);
    if (!cell) {
      cell = {
        latIndex, lonIndex, count: 0, riskScore: 0, impactCount: 0, safetyRiskCount: 0,
        categories: new Map(),
        severityCounts: { low: 0, medium: 0, high: 0, critical: 0 }
      };
      cells.set(key, cell);
    }
    cell.count += 1;
    cell.riskScore += severityWeight[incident.severity] + (incident.safetyRisk ? 5 : 0)
      + Math.min(5, Math.floor(Math.log10(incident.impactCount + 1)));
    cell.impactCount += incident.impactCount;
    if (incident.safetyRisk) cell.safetyRiskCount += 1;
    cell.categories.set(incident.category, (cell.categories.get(incident.category) ?? 0) + 1);
    cell.severityCounts[incident.severity] += 1;
  }
  const hotspots = [...cells.values()].map(cell => {
    const latStep = cellSizeMeters / 111_320;
    const centerLatitude = Math.max(-90, Math.min(90, (cell.latIndex + 0.5) * latStep - 90));
    const lonStep = cellSizeMeters / (111_320 * Math.max(0.1, Math.cos(centerLatitude * Math.PI / 180)));
    const centerLongitude = normalizeLongitude((cell.lonIndex + 0.5) * lonStep - 180);
    const categories = Object.fromEntries([...cell.categories.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
    const dominantCategory = Object.entries(categories)[0]?.[0] ?? "other";
    const priority = cell.riskScore >= 30 || cell.severityCounts.critical > 0 ? "critical"
      : cell.riskScore >= 15 || cell.severityCounts.high > 0 ? "high"
      : cell.riskScore >= 6 ? "medium" : "low";
    const responseRecommendation: Record<string, string> = {
      road_damage: "Prioritize a road maintenance inspection and traffic-safety controls",
      water: "Dispatch a water-network crew to assess leaks, flooding, and service disruption",
      power: "Prioritize utility isolation and electrical safety assessment",
      waste: "Schedule a sanitation crew and assess public-health exposure",
      public_safety: "Escalate to the public-safety response coordinator",
      transport: "Coordinate transport operations and temporary route management",
      other: "Review the cluster and assign the appropriate municipal response team"
    };
    return {
      center: { type: "Point" as const, coordinates: [centerLongitude, centerLatitude] as [number, number] },
      incidentCount: cell.count,
      riskScore: cell.riskScore,
      priority,
      dominantCategory,
      responseRecommendation: responseRecommendation[dominantCategory] ?? responseRecommendation.other,
      impactCount: cell.impactCount,
      safetyRiskCount: cell.safetyRiskCount,
      severityCounts: cell.severityCounts,
      categories
    };
  }).sort((a, b) =>
    b.riskScore - a.riskScore
    || b.incidentCount - a.incidentCount
    || a.center.coordinates[1] - b.center.coordinates[1]
    || a.center.coordinates[0] - b.center.coordinates[0]
  ).slice(0, limit);
  return hotspots;
}
