import { describe, expect, it } from "vitest";
import { analyzeIncidentHotspots } from "./hotspot-analysis.js";

describe("analyzeIncidentHotspots", () => {
  const incident = (longitude: number, latitude: number, severity: "low" | "medium" | "high" | "critical" = "medium") => ({
    location: { type: "Point" as const, coordinates: [longitude, latitude] as [number, number] },
    severity, impactCount: 100, safetyRisk: false, category: "road_damage"
  });

  it("groups nearby incidents into aggregate hotspots and ranks risk", () => {
    const results = analyzeIncidentHotspots([
      incident(88.3600, 22.5700, "critical"),
      incident(88.3602, 22.5701, "high"),
      incident(88.3900, 22.5900, "low")
    ], 500, 10);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ incidentCount: 2, priority: "critical", severityCounts: { critical: 1, high: 1 } });
    expect(results[0]!.center.type).toBe("Point");
  });

  it("keeps distinct areas separate and respects the result limit", () => {
    const results = analyzeIncidentHotspots([
      incident(88.36, 22.57, "low"),
      incident(88.39, 22.59, "high"),
      incident(88.42, 22.61, "critical")
    ], 100, 2);
    expect(results).toHaveLength(2);
    expect(results[0]!.priority).toBe("critical");
  });

  it("returns an empty list for an empty incident set", () => {
    expect(analyzeIncidentHotspots([], 500, 10)).toEqual([]);
  });

  it("accounts for safety risk in hotspot priority", () => {
    const result = analyzeIncidentHotspots([{
      ...incident(88.36, 22.57, "medium"), safetyRisk: true
    }], 500, 10);
    expect(result[0]!.riskScore).toBeGreaterThan(0);
    expect(result[0]!.safetyRiskCount).toBe(1);
  });

  it("keeps GeoJSON centers within WGS84 bounds at the poles and date line", () => {
    const results = analyzeIncidentHotspots([
      incident(180, 90, "high"),
      incident(-180, -90, "critical")
    ], 500, 10);
    for (const result of results) {
      const [longitude, latitude] = result.center.coordinates;
      expect(longitude).toBeGreaterThanOrEqual(-180);
      expect(longitude).toBeLessThanOrEqual(180);
      expect(latitude).toBeGreaterThanOrEqual(-90);
      expect(latitude).toBeLessThanOrEqual(90);
    }
  });

  it("rejects invalid grid sizes and result limits", () => {
    expect(() => analyzeIncidentHotspots([], 0, 10)).toThrow(RangeError);
    expect(() => analyzeIncidentHotspots([], 500, 0)).toThrow(RangeError);
    expect(() => analyzeIncidentHotspots([], 500, 51)).toThrow(RangeError);
  });

  it("uses a stable lexical tie-break for equally frequent categories", () => {
    const results = analyzeIncidentHotspots([
      { ...incident(88.36, 22.57), category: "water" },
      { ...incident(88.3601, 22.5701), category: "road_damage" }
    ], 500, 10);
    expect(results[0]!.dominantCategory).toBe("road_damage");
  });
});
