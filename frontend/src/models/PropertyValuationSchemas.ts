import { z } from 'zod';

// Address validation schema
const AddressSchema = z.object({
  streetName: z.string().min(1, 'Street name is required'),
  streetNameOnly: z.string().min(1, 'Street name only is required'),
  suburb: z.string().min(1, 'Suburb is required'),
  state: z.enum(['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT']),
  postcode: z.string().regex(/^[0-9]{4}$/, 'Must be a 4-digit Australian postcode'),
  unitNumber: z.string().optional()
});

// Property Summary validation schema
const PropertySummarySchema = z.object({
  propertyAddress: z.string().min(1, 'Property address is required'),
  siteArea: z.number().min(0, 'Site area must be positive'),
  currentUse: z.string().min(1, 'Current use is required'),
  titleSearchSighted: z.string().optional(),
  realPropertyDescription: z.string().optional(),
  encumbrancesRestrictions: z.string().optional(),
  siteDimensions: z.string().optional(),
  zoning: z.string().optional(),
  lga: z.string().optional(),
  mainDwelling: z.string().optional(),
  builtAbout: z.string().optional(),
  areas: z.object({
    living: z.number().optional(),
    outdoor: z.number().optional(),
    carAreas: z.number().optional(),
    other: z.number().optional()
  }).optional(),
  carAccommodation: z.string().optional(),
  additions: z.string().optional(),
  heritageIssues: z.string().optional(),
  marketability: z.string().optional(),
  environmentalIssues: z.string().optional(),
  essentialRepairs: z.string().optional(),
  estimatedCost: z.string().nullable().optional()
});

// Risk Analysis validation schema
const RiskAnalysisSchema = z.object({
  propertyRiskRatings: z.object({
    locationNeighbourhood: z.number().min(1).max(5).optional(),
    landPlanningTitle: z.number().min(1).max(5).optional(),
    environmentalIssues: z.number().min(1).max(5).optional(),
    improvements: z.number().min(1).max(5).optional()
  }).optional(),
  marketRiskRatings: z.object({
    recentMarketDirection: z.number().min(1).max(5).optional(),
    marketActivity: z.number().min(1).max(5).optional(),
    localRegionalEconomyImpact: z.number().min(1).max(5).optional(),
    marketSegmentConditions: z.number().min(1).max(5).optional()
  }).optional()
});

// Valuation Summary validation schema
const ValuationSummarySchema = z.object({
  marketValue: z.number().min(0, 'Market value must be positive'),
  interestValued: z.string().optional(),
  instructingParty: z.string().optional(),
  dateOfInstruction: z.string().optional(),
  primaryMethod: z.string().optional(),
  secondaryMethod: z.string().optional(),
  commercialSubType: z.string().optional(),
  valueComponent: z.object({
    land: z.number().optional(),
    improvements: z.number().optional()
  }).optional(),
  marketValueText: z.string().optional(),
  otherAssessments: z.object({
    rentalAssessmentUnfurnished: z.string().optional(),
    insuranceEstimate: z.number().optional()
  }).optional()
});

// Land validation schema
const LandSchema = z.object({
  propertyIdentification: z.string().optional(),
  zoningEffect: z.string().optional(),
  location: z.string().optional(),
  neighbourhood: z.string().optional(),
  siteDescriptionAccess: z.string().optional(),
  services: z.string().optional()
});

// Dwelling Description validation schema
const DwellingDescriptionSchema = z.object({
  style: z.string().optional(),
  streetAppeal: z.string().optional(),
  mainWallsRoof: z.string().optional(),
  mainInteriorLining: z.string().optional(),
  flooring: z.string().optional(),
  windowFrames: z.string().optional(),
  accommodation: z.string().optional(),
  interiorLayout: z.string().optional(),
  fixturesFittings: z.string().optional(),
  extras: z.string().optional(),
  internalCondition: z.string().optional(),
  externalCondition: z.string().optional()
});

// Main Property Valuation validation schema
const PropertyValuationSchema = z.object({
  address: AddressSchema,
  instructedBy: z.string().optional(),
  contact: z.string().nullable().optional(),
  clientRefNo: z.string().optional(),
  borrower: z.string().optional(),
  lender: z.string().optional(),
  loanRefNo: z.string().optional(),
  valuerRefNo: z.string().optional(),
  propertySummary: PropertySummarySchema,
  riskAnalysis: RiskAnalysisSchema.optional(),
  valuationSummary: ValuationSummarySchema,
  land: LandSchema.optional(),
  dwellingDescription: DwellingDescriptionSchema.optional(),
  ancillaryImprovements: z.string().optional()
});

export const propertyValuationValidationSchemas = {
  address: AddressSchema,
  propertySummary: PropertySummarySchema,
  riskAnalysis: RiskAnalysisSchema,
  valuationSummary: ValuationSummarySchema,
  land: LandSchema,
  dwellingDescription: DwellingDescriptionSchema,
  ancillaryImprovements: z.string().optional(),
  main: PropertyValuationSchema
};
