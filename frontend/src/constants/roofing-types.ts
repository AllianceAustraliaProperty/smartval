export const ROOFING_TYPES = [
  "Colorbond/Metal",
  "Terracotta Tile",
  "Concrete Slab",
  "Suspended Concrete",
  "Metal/Concrete",
  "Metal Deck",
  "Concrete Tile",
  "Galvanised Iron",
  "Corrugated Metal",
  "Corrugated Galvanised Iron"
] as const;

export type RoofingType = typeof ROOFING_TYPES[number];
