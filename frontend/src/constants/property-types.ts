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
