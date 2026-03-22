export const LAND_SHAPE_TYPES = [
  "Rectangular",
  "Regular", 
  "Irregular"
] as const;

export type LandShapeType = typeof LAND_SHAPE_TYPES[number];
