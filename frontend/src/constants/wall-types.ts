export const INTERNAL_WALLS = [
  "Plasterboard",
  "Rendered Brick",
  "Concrete Slab",
  "Gyprock",
  "Rendered Face Brick",
  "Face Brick"
] as const;

export const EXTERNAL_WALLS = [
  "Brick Veneer",
  "Brick Veneer/Cladding",
  "Double Brick",
  "Concrete Slab",
  "Horizontal Cladding",
  "Cavity Brick",
  "Weatherboard",
  "Rendered Brick",
  "Rendered Brick/Cladding",
  "Timber Cladding",
  "Bagged Brick",
  "Sandstone",
  "Rendered Hebel",
  "Rendered Masonry",
  "Fibre Cement"
] as const;

export type InternalWallType = typeof INTERNAL_WALLS[number];
export type ExternalWallType = typeof EXTERNAL_WALLS[number];
