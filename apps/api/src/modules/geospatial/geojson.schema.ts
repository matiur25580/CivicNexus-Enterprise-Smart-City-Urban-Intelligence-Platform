import { z } from "zod";

export const geoJsonPositionSchema = z
  .tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
  .rest(z.number());

// GeoJSON polygon rings must contain enough positions and close by repeating their first coordinate.
const linearRingSchema = z
  .array(geoJsonPositionSchema)
  .min(4, "A linear ring must contain at least four positions.")
  .superRefine((positions, context) => {
    const first = positions[0];
    const last = positions[positions.length - 1];
    const isClosed = first && last && first.length === last.length && first.every((value, index) => value === last[index]);
    if (!isClosed) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A linear ring must have identical first and last positions.",
      });
    }
  });

export const geoJsonPointSchema = z.object({
  type: z.literal("Point"),
  coordinates: geoJsonPositionSchema,
});

export const geoJsonPolygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(linearRingSchema).min(1),
});

export const geoJsonGeometrySchema = z.discriminatedUnion("type", [
  geoJsonPointSchema,
  geoJsonPolygonSchema,
]);

export type ValidatedGeoJsonGeometry = z.infer<typeof geoJsonGeometrySchema>;
