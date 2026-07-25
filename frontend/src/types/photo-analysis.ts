export type RoomCategory = 
  | 'Alfresco' | 'Balcony' | 'Bathroom' | 'Bedroom' | 'Bedroom 1' | 'Bedroom 2' | 'Bedroom 3' | 'Bedroom 4' 
  | 'Bedroom 5' | 'Bedroom 6' | 'Deck' | 'Dining' | 'Ensuite' | 'Ensuite 2' | 'Entertainment Area' | 'Family' 
  | 'Family And Meals' | 'Formal Dining' | 'General' | 'Kitchen' | 'Kitchen 1' | 'Kitchen 2' | 'Kitchen And Dining' 
  | 'Kitchen And Meals' | 'Laundry' | 'Living' | 'Living And Dining' | 'Lounge' | 'Office Room' | 'Media Room' 
  | 'Patio' | 'Porch' | 'Powder Room' | 'Retreat' | 'Rumpus' | 'Storage' | 'Study' | 'Sunroom' | 'Swimming Pool' 
  | 'Theatre Room' | 'Toilet' | 'Workshop' | string;

export type FlooringType = 
  | 'Brick' | 'Carpet' | 'Concrete Flooring' | 'Cork' | 'Hardwood' | 'Laminated Floorboards' | 'Marble Flooring' 
  | 'Parquet' | 'Polished Concrete' | 'Porcelain Tile' | 'Floorboards' | 'Rubber Mat' | 'Tile Flooring' 
  | 'Timber Flooring' | 'Vinyl' | 'Other' | string;

export type FeatureFixture = 
  | 'aluminium framed windows' | 'fitted mirror' | 'bath tub' | 'timber framed windows' | 'built-in wardrobe' 
  | 'blinds' | 'plantation shutters' | 'walk-in wardrobe' | 'sliding door' | 'timber glazed door' | 'bi-fold door' 
  | 'aluminium glazed door' | 'kitchen cupboards' | 'overhead cupboards' | 'security system' | 'smoke alarm' | string;

export type PrimeCostItem = 
  | "butler's pantry" | 'ceiling fans' | 'cooktop' | 'dishwasher' | 'double bowl sink' | 'ducted air conditioning' 
  | 'ducted heater' | 'european laundry' | 'evaporative cooling system' | 'exhaust fan' | 'extra toilet' | 'fireplace' 
  | 'fly screen' | 'freestanding cooktop' | 'gas heater' | 'heater' | 'heat lamp' | 'hot water system' 
  | 'internal laundry' | 'kitchenette' | 'linen' | 'oven' | 'paths' | 'pergola' | 'powder room' | 'rangehood' 
  | 'retaining walls' | 'roller shutters' | 'room unit air conditioning' | 'separate toilet' | 'shed' | 'shower' 
  | 'single bowl sink' | 'solar panels' | 'spa' | 'split system air conditioning' | 'stainless steel laundry tub' 
  | 'swimming pool' | 'toilet suite' | 'vanity' | 'verandah' | 'walk-in pantry' | 'wall mounted heater' | 'wood heater' | string;

export interface PhotoAnalysisResult {
  category: RoomCategory | null;
  flooring: FlooringType | null;
  featuresAndFixtures: FeatureFixture[];
  primeCostItems: PrimeCostItem[];
}

export interface AnalyzePhotoRequest {
  imageUrl: string; // The URL of the image to analyze
  expectedCategory?: RoomCategory; // Context for the AI to limit scope
}
