export const ResidentialPropertyTypes = [
  "House",
  "Duplex",
  "Triplex",
  "Studio",
  "Apartment",
  "House & Granny Flat",
  "Dual Key Apartment",
  "Townhouse",
  "Villa",
  "Terrace",
  "Terrace House",
  "Granny Flat",
  "Semi-detached",
  "Unit"
] as const;

export const CommercialPropertyTypes = [
  "Commercial",
  "Commercial (Office)",
  "Commercial (Retail)",
  "Commercial (Warehouse)",
  "Car Space"
] as const;

export const OtherPropertyTypes = [
  "Rural",
  "Land"
] as const;

export const AllPropertyTypes = [...ResidentialPropertyTypes, ...CommercialPropertyTypes, ...OtherPropertyTypes] as const;

export type PropertyType = typeof AllPropertyTypes[number];

/**
 * Maps RP Data / CoreLogic propertyType and propertySubType to the Smartval PropertyType options.
 */
export function mapRpDataPropertyType(rawType?: string, rawSubType?: string): PropertyType | undefined {
  const sub = (rawSubType || '').trim();
  const main = (rawType || '').trim();

  if (!sub && !main) return undefined;

  // Exact match on subtype first
  const exactSub = AllPropertyTypes.find(t => t.toLowerCase() === sub.toLowerCase());
  if (exactSub) return exactSub;

  const lowerSub = sub.toLowerCase();
  const lowerMain = main.toLowerCase();
  const combined = `${lowerSub} ${lowerMain}`.trim();

  if (lowerSub.includes('townhouse') || lowerMain.includes('townhouse')) return 'Townhouse';
  if (lowerSub.includes('villa') || lowerMain.includes('villa')) return 'Villa';
  if (lowerSub.includes('apartment') || lowerMain.includes('apartment')) return 'Apartment';
  if (lowerSub.includes('duplex') || lowerMain.includes('duplex')) return 'Duplex';
  if (lowerSub.includes('triplex') || lowerMain.includes('triplex')) return 'Triplex';
  if (lowerSub.includes('terrace house') || combined.includes('terrace house')) return 'Terrace House';
  if (lowerSub.includes('terrace') || lowerMain.includes('terrace')) return 'Terrace';
  if (
    lowerSub.includes('semi-detached') ||
    lowerSub.includes('semi detached') ||
    combined.includes('semi-detached') ||
    combined.includes('semi detached')
  ) {
    return 'Semi-detached';
  }
  if (lowerSub.includes('studio') || lowerMain.includes('studio')) return 'Studio';
  if (lowerSub.includes('office') || combined.includes('office')) return 'Commercial (Office)';
  if (lowerSub.includes('retail') || lowerSub.includes('shop') || combined.includes('retail')) return 'Commercial (Retail)';
  if (lowerSub.includes('warehouse') || lowerSub.includes('industrial') || combined.includes('warehouse')) return 'Commercial (Warehouse)';
  if (lowerSub.includes('unit') || lowerSub.includes('flat') || lowerMain.includes('unit') || lowerMain.includes('flat')) return 'Unit';
  if (lowerSub.includes('house') || lowerMain.includes('house') || lowerMain.includes('dwelling')) return 'House';
  if (lowerSub.includes('vacant') || lowerSub.includes('land') || lowerMain.includes('land')) return 'Land';
  if (lowerSub.includes('rural') || lowerSub.includes('acreage') || lowerSub.includes('farm') || lowerMain.includes('rural')) return 'Rural';
  if (lowerSub.includes('commercial') || lowerMain.includes('commercial')) return 'Commercial';

  // Fallback to exact match on main type
  const exactMain = AllPropertyTypes.find(t => t.toLowerCase() === main.toLowerCase());
  if (exactMain) return exactMain;

  return undefined;
}
