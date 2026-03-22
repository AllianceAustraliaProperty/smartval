import mongoose, { Document, Schema } from 'mongoose';

// Address Schema
const AddressSchema = new Schema({
  streetName: {
    type: String,
    required: true,
    description: 'Street name is required'
  },
  streetNameOnly: {
    type: String,
    required: true,
    description: 'Street name is required (e.g., \'George\')'
  },
  suburb: {
    type: String,
    required: true,
    description: 'Suburb is required (e.g., \'Parramatta\')'
  },
  state: {
    type: String,
    required: true,
    enum: ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT']
  },
  postcode: {
    type: String,
    required: true,
    pattern: '^[0-9]{4}$',
    description: 'Must be a 4-digit Australian postcode'
  },
  unitNumber: {
    type: String,
    description: 'Optional unit/apartment number (e.g., \'5B\')'
  }
}, { _id: false });

// Contact Schema (for primaryContact field)
const ContactSchema = new Schema({
  firstName: { type: String },
  lastName: { type: String },
  phone: { type: String },
  phone2: { type: String },
  email: { type: String },
  email2: { type: String }
}, { _id: false });

// Owner Schema (for owners array)
const OwnerSchema = new Schema({
  firstName: { type: String },
  lastName: { type: String }
}, { _id: false });

// Property Areas Schema
const PropertyAreasSchema = new Schema({
  living: { type: Number },
  outdoor: { type: Number },
  carAreas: { type: Number },
  other: { type: Number }
}, { _id: false });

// Property Summary Schema
const PropertySummarySchema = new Schema({
  propertyAddress: {
    type: String,
    required: true
  },
  siteArea: {
    type: Number,
    required: true
  },
  currentUse: {
    type: String,
    required: true
  },
  titleSearchSighted: { type: String },
  realPropertyDescription: { type: String },
  encumbrancesRestrictions: { type: String },
  siteDimensions: { type: String },
  zoning: { type: String },
  lga: { type: String },
  mainDwelling: { type: String },
  builtAbout: { type: String },
  areas: PropertyAreasSchema,
  carAccommodation: { type: String },
  additions: { type: String },
  heritageIssues: { type: String },
  marketability: { type: String },
  environmentalIssues: { type: String },
  essentialRepairs: { type: String },
  estimatedCost: { type: String }
}, { _id: false });

// Risk Ratings Schema
const RiskRatingsSchema = new Schema({
  locationNeighbourhood: { type: Number, enum: [1, 2, 3, 4, 5] },
  landPlanningTitle: { type: Number, enum: [1, 2, 3, 4, 5] },
  environmentalIssues: { type: Number, enum: [1, 2, 3, 4, 5] },
  improvements: { type: Number, enum: [1, 2, 3, 4, 5] }
}, { _id: false });

const MarketRiskRatingsSchema = new Schema({
  recentMarketDirection: { type: Number, enum: [1, 2, 3, 4, 5] },
  marketActivity: { type: Number, enum: [1, 2, 3, 4, 5] },
  localRegionalEconomyImpact: { type: Number, enum: [1, 2, 3, 4, 5] },
  marketSegmentConditions: { type: Number, enum: [1, 2, 3, 4, 5] }
}, { _id: false });

// Risk Analysis Schema
const RiskAnalysisSchema = new Schema({
  propertyRiskRatings: RiskRatingsSchema,
  marketRiskRatings: MarketRiskRatingsSchema
}, { _id: false });

// Value Component Schema
const ValueComponentSchema = new Schema({
  land: { type: Number },
  improvements: { type: Number }
}, { _id: false });

// Other Assessments Schema
const OtherAssessmentsSchema = new Schema({
  rentalAssessmentUnfurnished: { type: String },
  insuranceEstimate: { type: Number }
}, { _id: false });

// Valuation Summary Schema
const ValuationSummarySchema = new Schema({
  marketValue: {
    type: Number,
    required: true
  },
  interestValued: { type: String },
  valueComponent: ValueComponentSchema,
  marketValueText: { type: String },
  otherAssessments: OtherAssessmentsSchema
}, { _id: false });

// Land Schema
const LandSchema = new Schema({
  propertyIdentification: { type: String },
  zoningEffect: { type: String },
  location: { type: String },
  neighbourhood: { type: String },
  siteDescriptionAccess: { type: String },
  services: { type: String }
}, { _id: false });

// Dwelling Description Schema
const DwellingDescriptionSchema = new Schema({
  style: { type: String },
  streetAppeal: { type: String },
  mainWallsRoof: { type: String },
  mainInteriorLining: { type: String },
  flooring: { type: String },
  windowFrames: { type: String },
  accommodation: { type: String },
  interiorLayout: { type: String },
  fixturesFittings: { type: String },
  extras: { type: String },
  internalCondition: { type: String },
  externalCondition: { type: String }
}, { _id: false });

// Main Property Valuation Schema
const PropertyValuationSchema = new Schema({
  address: {
    type: AddressSchema,
    required: true
  },
  rpDataId: { type: String },
  primaryContact: { type: ContactSchema },
  owners: [OwnerSchema],
  instructedBy: { type: String },
  contact: { type: String },
  clientRefNo: { type: String },
  borrower: { type: String },
  lender: { type: String },
  loanRefNo: { type: String },
  valuerRefNo: { type: String },
  propertySummary: {
    type: PropertySummarySchema,
    required: true
  },
  riskAnalysis: RiskAnalysisSchema,
  valuationSummary: {
    type: ValuationSummarySchema,
    required: true
  },
  land: LandSchema,
  dwellingDescription: DwellingDescriptionSchema,
  ancillaryImprovements: { type: String }
}, { timestamps: true });

export interface IPropertyValuation extends Document {
  address: {
    streetName: string;
    streetNameOnly: string;
    suburb: string;
    state: string;
    postcode: string;
    unitNumber?: string;
    fullAddress?: string;
  };
  rpDataId?: string;
  primaryContact?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    phone2?: string;
    email?: string;
    email2?: string;
  };
  owners?: Array<{
    firstName?: string;
    lastName?: string;
  }>;
  instructedBy?: string;
  contact?: string | null;
  clientRefNo?: string;
  borrower?: string;
  lender?: string;
  loanRefNo?: string;
  valuerRefNo?: string;
  propertySummary: {
    propertyAddress: string;
    siteArea: number;
    currentUse: string;
    titleSearchSighted?: string;
    realPropertyDescription?: string;
    encumbrancesRestrictions?: string;
    siteDimensions?: string;
    zoning?: string;
    lga?: string;
    mainDwelling?: string;
    builtAbout?: string;
    areas?: {
      living?: number;
      outdoor?: number;
      carAreas?: number;
      other?: number;
    };
    carAccommodation?: string;
    additions?: string;
    heritageIssues?: string;
    marketability?: string;
    environmentalIssues?: string;
    essentialRepairs?: string;
    estimatedCost?: string | null;
  };
  riskAnalysis?: {
    propertyRiskRatings?: {
      locationNeighbourhood?: number;
      landPlanningTitle?: number;
      environmentalIssues?: number;
      improvements?: number;
    };
    marketRiskRatings?: {
      recentMarketDirection?: number;
      marketActivity?: number;
      localRegionalEconomyImpact?: number;
      marketSegmentConditions?: number;
    };
  };
  valuationSummary: {
    marketValue: number;
    interestValued?: string;
    valueComponent?: {
      land?: number;
      improvements?: number;
    };
    marketValueText?: string;
    otherAssessments?: {
      rentalAssessmentUnfurnished?: string;
      insuranceEstimate?: number;
    };
  };
  land?: {
    propertyIdentification?: string;
    zoningEffect?: string;
    location?: string;
    neighbourhood?: string;
    siteDescriptionAccess?: string;
    services?: string;
  };
  dwellingDescription?: {
    style?: string;
    streetAppeal?: string;
    mainWallsRoof?: string;
    mainInteriorLining?: string;
    flooring?: string;
    windowFrames?: string;
    accommodation?: string;
    interiorLayout?: string;
    fixturesFittings?: string;
    extras?: string;
    internalCondition?: string;
    externalCondition?: string;
  };
  ancillaryImprovements?: string;
}

if (mongoose.models['PropertyValuation']) {
  delete mongoose.models['PropertyValuation'];
}

export default mongoose.models.PropertyValuation || mongoose.model<IPropertyValuation>('PropertyValuation', PropertyValuationSchema);
