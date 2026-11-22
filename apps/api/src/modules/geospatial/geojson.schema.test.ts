import { describe, expect, it } from "vitest";
import { geoJsonGeometrySchema } from "./geojson.schema.js";

describe("GeoJSON geometry validation", () => {
  it("accepts a WGS84 point in longitude-latitude order", () => {
    expect(geoJsonGeometrySchema.safeParse({ type: "Point", coordinates: [88.3639, 22.5726] }).success).toBe(true);
  });

  it("rejects point coordinates outside WGS84 bounds", () => {
    expect(geoJsonGeometrySchema.safeParse({ type: "Point", coordinates: [220, 22.5726] }).success).toBe(false);
  });

  it("accepts a polygon with a closed exterior ring", () => {
    expect(geoJsonGeometrySchema.safeParse({
      type: "Polygon",
      coordinates: [[[88.3, 22.5], [88.4, 22.5], [88.4, 22.6], [88.3, 22.5]]],
    }).success).toBe(true);
  });

  it("rejects a polygon whose linear ring is not closed", () => {
    expect(geoJsonGeometrySchema.safeParse({
      type: "Polygon",
      coordinates: [[[88.3, 22.5], [88.4, 22.5], [88.4, 22.6], [88.3, 22.6]]],
    }).success).toBe(false);
  });
});
