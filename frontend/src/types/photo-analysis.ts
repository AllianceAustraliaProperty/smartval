export const ROOM_CATEGORIES_LIST = [
  'Alfresco', 'Balcony', 'Bathroom', 'Bedroom', 'Bedroom 1', 'Bedroom 2', 'Bedroom 3', 'Bedroom 4', 
  'Bedroom 5', 'Bedroom 6', 'Deck', 'Dining', 'Ensuite', 'Ensuite 2', 'Entertainment Area', 'Family', 
  'Family And Meals', 'Formal Dining', 'General', 'Kitchen', 'Kitchen 1', 'Kitchen 2', 'Kitchen And Dining', 
  'Kitchen And Meals', 'Laundry', 'Living', 'Living And Dining', 'Lounge', 'Office Room', 'Media Room', 
  'Patio', 'Porch', 'Powder Room', 'Retreat', 'Rumpus', 'Storage', 'Study', 'Sunroom', 
  'Theatre Room', 'Toilet', 'Workshop'
] as const;

export const FLOORING_TYPES_LIST = [
  'Brick', 'Carpet', 'Concrete Flooring', 'Cork', 'Hardwood', 'Laminated Floorboards', 'Marble Flooring', 
  'Parquet', 'Polished Concrete', 'Porcelain Tile', 'Floorboards', 'Rubber Mat', 'Tile Flooring', 
  'Timber Flooring', 'Vinyl', 'Other'
] as const;

export const FEATURE_FIXTURES_LIST = [
  'aluminium framed windows', 'fitted mirror', 'bath tub', 'timber framed windows', 'built-in wardrobe', 
  'blinds', 'plantation shutters', 'walk-in wardrobe', 'sliding door', 'timber glazed door', 'bi-fold door', 
  'aluminium glazed door', 'kitchen cupboards', 'overhead cupboards', 'security system', 'smoke alarm'
] as const;

export const PRIME_COST_ITEMS_LIST = [
  "butler's pantry", 'ceiling fans', 'cooktop', 'dishwasher', 'double bowl sink', 'ducted air conditioning', 
  'ducted heater', 'european laundry', 'evaporative cooling system', 'exhaust fan', 'extra toilet', 'fireplace', 
  'fly screen', 'freestanding cooktop', 'gas heater', 'heater', 'heat lamp', 'hot water system', 
  'internal laundry', 'kitchenette', 'linen', 'oven', 'paths', 'pergola', 'powder room', 'rangehood', 
  'retaining walls', 'roller shutters', 'room unit air conditioning', 'separate toilet', 'shed', 'shower', 
  'single bowl sink', 'solar panels', 'spa', 'split system air conditioning', 'stainless steel laundry tub', 
  'toilet suite', 'vanity', 'verandah', 'walk-in pantry', 'wall mounted heater', 'wood heater'
] as const;

export type RoomCategory = typeof ROOM_CATEGORIES_LIST[number] | string;
export type FlooringType = typeof FLOORING_TYPES_LIST[number] | string;
export type FeatureFixture = typeof FEATURE_FIXTURES_LIST[number] | string;
export type PrimeCostItem = typeof PRIME_COST_ITEMS_LIST[number] | string;

export interface PhotoAnalysisResult {
  category: RoomCategory | null;
  flooring: FlooringType | null;
  categorySpecificDetails: {
    featuresAndFixtures: FeatureFixture[];
    primeCostItems: PrimeCostItem[];
  } | null;
}

export interface AnalyzePhotoRequest {
  imageUrl: string; // The URL of the image to analyze
  expectedCategory?: RoomCategory; // Context for the AI to limit scope
}
