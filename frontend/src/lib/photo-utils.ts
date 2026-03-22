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

/**
 * Extract bedroom number from category string for sorting
 */
function getBedroomNumber(category: string): number {
  const lower = category.toLowerCase();
  if (lower.startsWith('bedroom ')) {
    const match = lower.match(/bedroom (\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return Infinity; // Non-bedroom categories go to the end
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

  // Sort categories with custom sorting for bedrooms
  categories.sort((a, b) => {
    const aNum = getBedroomNumber(a.category);
    const bNum = getBedroomNumber(b.category);

    if (aNum !== bNum) {
      return aNum - bNum;
    }

    return a.category.localeCompare(b.category);
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
