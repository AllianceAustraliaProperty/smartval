import { PhotoData } from '@/types/property-valuation';

interface PhotoCategorySummary {
  category: string;
  featuresFixtures: string[];
  primeCostItems: string[];
  floorings: string[];
}

interface PhotosSummary {
  categories: PhotoCategorySummary[];
  internalCondition: string | null;
  externalCondition: string | null;
  internalWallsType: string | null;
  externalWallsType: string | null;
  floorings: string[];
}

/**
 * Get the most common item from an array using a counter approach
 */
function getMostCommon(items: string[]): string | null {
  if (items.length === 0) return null;

  const counter = new Map<string, number>();
  for (const item of items) {
    counter.set(item, (counter.get(item) || 0) + 1);
  }

  let maxCount = 0;
  let mostCommon: string | null = null;

  for (const [item, count] of counter.entries()) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = item;
    }
  }

  return mostCommon;
}

const CATEGORY_ORDER: string[] = [
  'Bedroom', 'Bathroom', 'Ensuite', 'Ensuite 2',
  'Living', 'Living And Dining',
  'Dining', 'Formal Dining',
  'Kitchen', 'Kitchen 1', 'Kitchen 2', 'Kitchen And Dining', 'Kitchen And Meals',
  'Lounge',
  'Family', 'Family And Meals',
  'Alfresco', 'Porch', 'Balcony', 'Patio', 'Deck',
  'Laundry',
  'Study', 'Media Room', 'Theatre Room', 'Rumpus', 'Retreat',
  'Entertainment Area', 'Sunroom', 'Storage', 'Workshop',
  'Powder Room', 'Toilet', 'General', 'Backyard',
];

/**
 * Get sort key for a category: numbered bedrooms first, then defined order, then alphabetical
 */
function getCategorySortKey(category: string): [number, number, string] {
  const lower = category.toLowerCase();
  if (lower.startsWith('bedroom ')) {
    const match = lower.match(/bedroom (\d+)/);
    if (match) return [0, parseInt(match[1], 10), category];
  }
  const idx = CATEGORY_ORDER.indexOf(category);
  if (idx !== -1) return [1, idx, category];
  return [2, 0, category];
}

/**
 * Summarize photos by category, collecting features, fixtures, and conditions
 *
 * TypeScript port of the Python function from backend/utils/template.py
 */
export function summarizePhotos(photos: PhotoData[]): PhotosSummary {
  const summary = new Map<string, {
    featuresFixtures: Set<string>;
    primeCostItems: Set<string>;
    floorings: Set<string>;
  }>();

  const allFloorings = new Set<string>();

  // Process each photo
  for (const photo of photos) {
    if (!photo.category) {
      continue;
    }

    // Initialize category if it doesn't exist
    if (!summary.has(photo.category)) {
      summary.set(photo.category, {
        featuresFixtures: new Set(),
        primeCostItems: new Set(),
        floorings: new Set()
      });
    }

    const categorySummary = summary.get(photo.category)!;

    // Add features and fixtures
    if (photo.featuresFixtures && Array.isArray(photo.featuresFixtures)) {
      for (const item of photo.featuresFixtures) {
        if (item) categorySummary.featuresFixtures.add(item);
      }
    }

    // Add prime cost items
    if (photo.primeCostItems && Array.isArray(photo.primeCostItems)) {
      for (const item of photo.primeCostItems) {
        if (item) categorySummary.primeCostItems.add(item);
      }
    }

    // Add flooring
    if (photo.flooring) {
      categorySummary.floorings.add(photo.flooring);
      allFloorings.add(photo.flooring);
    }
  }

  // Convert summary to array format
  const categories: PhotoCategorySummary[] = [];
  for (const [category, data] of summary.entries()) {
    categories.push({
      category,
      featuresFixtures: Array.from(data.featuresFixtures),
      primeCostItems: Array.from(data.primeCostItems),
      floorings: Array.from(data.floorings)
    });
  }

  categories.sort((a, b) => {
    const [aGroup, aIdx, aName] = getCategorySortKey(a.category);
    const [bGroup, bIdx, bName] = getCategorySortKey(b.category);
    if (aGroup !== bGroup) return aGroup - bGroup;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return aName.localeCompare(bName);
  });

  // Collect conditions and wall types
  const internalConditions = photos
    .map(p => p.internalCondition)
    .filter((c): c is string => !!c);

  const externalConditions = photos
    .map(p => p.externalCondition)
    .filter((c): c is string => !!c);

  const internalWallsTypes = photos
    .map(p => p.internalWallsType)
    .filter((t): t is string => !!t);

  const externalWallsTypes = photos
    .map(p => p.externalWallsType)
    .filter((t): t is string => !!t);

  return {
    categories,
    internalCondition: getMostCommon(internalConditions),
    externalCondition: getMostCommon(externalConditions),
    internalWallsType: getMostCommon(internalWallsTypes),
    externalWallsType: getMostCommon(externalWallsTypes),
    floorings: Array.from(allFloorings)
  };
}
