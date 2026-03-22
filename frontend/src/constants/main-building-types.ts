export const ResidentialMainBuildingTypes = [
  "Freestanding single-storey dwelling",
  "Freestanding two-storey dwelling",
  "Freestanding three-storey dwelling",
  "Freestanding four-storey dwelling",
  "Semi-detached single-storey dwelling",
  "Semi-detached two-storey dwelling",
  "Semi-detached three-storey dwelling",
  "Freestanding granny flat",
  "Semi-detached granny flat",
  "Freestanding single storey duplex",
  "Freestanding two storey duplex",
  "Semi-detached single storey duplex",
  "Semi-detached two storey duplex",
  "Residential triplex",
  "Residential townhouse",
  "Residential studio",
  "Residential apartment",
  "Residential villa",
  "Freestanding two storey terrace house dwelling"
] as const;

export const CommercialMainBuildingTypes = [
  "Office",
  "Warehouse",
  "Retail",
  "Retail/Residential",
] as const;

export const AllMainBuildingTypes = [...ResidentialMainBuildingTypes, ...CommercialMainBuildingTypes] as const;

export type ResidentialMainBuildingType = typeof ResidentialMainBuildingTypes[number];
export type CommercialMainBuildingType = typeof CommercialMainBuildingTypes[number];
export type MainBuildingType = typeof AllMainBuildingTypes[number];
