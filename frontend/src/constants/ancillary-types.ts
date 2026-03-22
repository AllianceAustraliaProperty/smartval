export const DRIVEWAY_TYPES = [
  'Concrete',
  'Paved',
  'Gravel',
  'Asphalt',
  'Brick'
] as const;

export const FENCING_TYPES = [
  'Timber',
  'Colorbond',
  'Brick',
  'Metal',
] as const;

export type DrivewayType = typeof DRIVEWAY_TYPES[number];
export type FencingType = typeof FENCING_TYPES[number];
