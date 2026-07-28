// TypeScript interfaces based on MongoDB validation schema

import { Control, FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';

type DateISOString = string;

export const parseDelimitedText = (value: string | undefined | null): string[] => {
  if (!value) return [];
  return value
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean);
};

export const joinItemsToText = (items: string[] | undefined | null): string => {
  if (!items || items.length === 0) return '';
  return items.join('\n');
};

export type StateEnum =
  | 'NSW'
  | 'VIC'
  | 'QLD'
  | 'SA'
  | 'WA'
  | 'TAS'
  | 'ACT'
  | 'NT';

export type StateAbbrEnum =
  | 'NSW'
  | 'VIC'
  | 'QLD'
  | 'SA'
  | 'WA'
  | 'TAS'
  | 'ACT'
  | 'NT';

// Utility function to map state to abbreviation (now just returns the same value)
export const getStateAbbreviation = (state: StateEnum): StateAbbrEnum => {
  return state as StateAbbrEnum;
};

export interface AddressData {
  fullAddress?: string;
  streetName: string;
  streetNameOnly: string;
  suburb: string;
  state: StateAbbrEnum;
  postcode: string;
  unitNumber?: string;
}

export interface ContactData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  email2?: string;
}

export interface PrimaryContactData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  email2?: string;
  owners?: OwnerData[];
}

export interface OwnerData {
  firstName?: string;
  lastName?: string;
}

// PropertyData is now merged into ValuationReportData
// Keeping this for backward compatibility during transition
export interface PropertyData {
  id?: string;
  address: AddressData;
  rpDataId?: string;
  primaryContact?: ContactData;
  owners?: OwnerData[];
  createdAt?: DateISOString;
  updatedAt?: DateISOString;
}

export interface PropertyDetailsData {
  propertyType?: string;
  titleReference?: string;
  zoning?: string;
  tenureType?: string;
  siteArea?: number;
  buildingArea?: number;
  landShape?: string;
  councilArea?: string;
  zoningEffects?: string;
  permissibleUses?: string;
  heritageIssue?: string;
  flood?: string;
  bushfire?: string;
  rainfall?: string;
  townPlanning?: string;
  topography?: string;
  buildYear?: number;
  includeGrannyFlatBuildYear?: number | boolean;
  buildYearGrannyFlat?: number;
  includeGrannyFlatExternalArea?: boolean;
  externalAreaGrannyFlat?: number;
  accommodation?: string;
  livingArea?: number;
  externalArea?: number;
  parkingArea?: number;
  otherArea?: number;
  studyRoom?: boolean;
  landSlope?: string;
  frontage?: number;
  depth?: number;
  statutoryValue?: number;
  statutoryDate?: string;
  capitalImprovedValue?: number;
  netAnnualValue?: number;
}

export interface LocationDetailsData {
  suburbDescription?: string;
  surroundingDevelopment?: string;
  siteDescription?: string;
  access?: string;
  identification?: string;
  services?: string;
  includesGas?: boolean;
  map?: {
    photo?: string;
    source?: string;
  };
  latitude?: string;
  longitude?: string;
  situatedStreet?: string;
  nearestTransportation?: {
    name?: string;
    type?: string;
    distance?: number;
    unit?: string;
  };
  nearestShop?: {
    name?: string;
    type?: string;
    distance?: number;
    unit?: string;
  };
  nearestPrimarySchool?: {
    name?: string;
    type?: string;
    distance?: number;
    unit?: string;
  };
  nearestSecondarySchool?: {
    name?: string;
    type?: string;
    distance?: number;
    unit?: string;
  };
  nearestCBD?: {
    name?: string;
    type?: string;
    distance?: number;
    unit?: string;
  };
  nearestConnectingStreet?: {
    name?: string;
    type?: string;
    distance?: number;
    unit?: string;
  };
}

export type ConditionRating = 'Very Good' | 'Good' | 'Fair' | 'Average' | 'Poor';

export interface PropertyDescriptorsData {
  bedrooms?: number;
  bathrooms?: number;
  carSpaces?: number;
  onsiteParking?: number;
  visitorsParking?: number;
  mainBuildingType?: string;
  externalWalls?: string;
  internalWalls?: string;
  roofingType?: string;
  parkingType?: string;
  internalCondition?: ConditionRating;
  externalCondition?: ConditionRating;
  repairsRequirements?: string;
  defects?: string;
  lighting?: string;
  airconditioning?: string;
  fireServices?: string;
  lifts?: string;
  isGrannyFlat?: boolean;
  grannyFlat?: {
    mainBuildingType?: string;
    roofingType?: string;
    externalWalls?: string;
    internalWalls?: string;
    parkingType?: string;
    internalCondition?: ConditionRating;
    externalCondition?: ConditionRating;
  };
}

export interface AncillaryImprovementsData {
  showSection?: boolean;
  driveway?: string;
  fencing?: string;
  otherItems?: string[];
  otherItemsText?: string;
  accommodation?: string;
  waterUtilisation?: string;
}

export interface GeneralCommentsData {
  propertyDescription?: string;
  marketOverview?: string;
  propertyComments?: string;
  valuationCommentsPara?: string;
}

export interface ReferralDetailsData {
  referrerName?: string;
  referralFee?: number;
  invoiceStatus?: string;
}

export interface InvoiceDetailsData {
  reportFee?: number;
}

export interface OwnerData {
  firstName?: string;
  lastName?: string;
}

export interface PrimaryContactData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  email2?: string;
  owners?: OwnerData[];
}

export interface ValuationDetailsData {
  valuationType?: string;
  landValuationType?: string;
  valuationDate?: DateISOString;
  valuationDate2?: string;
  inspectionDate?: DateISOString;
  dateIssued?: DateISOString;
  currentDayValuation?: boolean;
  externalDesktopValuation?: boolean;
  isUnit?: boolean;
  marketValue?: number;
  valuationAmount?: number;
  interestValued?: string;
  instructingParty?: string;
  dateOfInstruction?: DateISOString;
  primaryMethod?: string;
  secondaryMethod?: string;
  commercialSubType?: string;
  showCurrencyOfValuation?: boolean;
  showLandValue?: boolean;
  landValue?: number;
  showImprovements?: boolean;
  improvements?: number;
  lowestValueSqm?: number;
  highestValueSqm?: number;
  squareMeterRate?: number;
  directComparison?: string;
  purposeOfReport?: string;
  conversionDate?: DateISOString;
  deadlineDate?: DateISOString;
  surveyType?: string;
  requestedValuationTarget?: string;
  valuationNotes?: string;
  stage?: string;
  fairMarketNetAnnualIncome?: number;
  yieldRate?: number;
  capitalisedValue?: number;
  nla?: number;
  assessedNetRental?: number;
  capitalisationRate?: number;
  marketRent?: number;
  lettingUpExpenses?: number;
  planningScheme?: string;
  planningApproval?: string;
  potentialFutureUse?: string;
  currentUse?: string;
  registeredProprietor?: string;
  // Capitalisation Method fields
  grossRentalRate?: number;
  vacancyAllowancePct?: number;
  outgoingsRate?: number;
  capRateLow?: number;
  capRateMid?: number;
  capRateHigh?: number;
  adoptedCapValue?: number;
  capitalExpenditureRate?: number;
  incentiveMonths?: number;
  lettingUpMonths?: number;
  agentsCommissionPct?: number;
  pvDiscountRate?: number;
  miscellaneousAmount?: number;
  pvOverageRent?: number;
  blankPagesCount?: number;
  blankPagesHeading?: string;
  logoType?: string;
}

export interface PhotoData {
  isCover?: boolean;
  isGallery?: boolean;
  isAnnexure?: boolean;
  annexureHeader?: string;
  featuresFixtures?: string[];
  primeCostItems?: string[];
  extraItems?: string[];
  internalCondition?: string;
  externalCondition?: string;
  externalWallsType?: string;
  internalWallsType?: string;
  photoUrl?: string;
  flooring?: string;
  category?: string;
}

export interface ComparableItem {
  id?: string;
  fullAddress?: string;
  saleLeasePrice?: number;
  imageUrl?: string;
  bedrooms?: number;
  bathrooms?: number;
  carSpaces?: number;
  siteArea?: number;
  buildingArea?: number;
  buildYear?: number;
  daysOnMarket?: number;
  saleLeaseDate?: DateISOString;
  distance?: number;
  comparison?: string;
  rpId?: string;
  photoUrl?: string;
  isComparable?: boolean;
  residualLandValue?: number;
  landValue?: number;
  // Temporary client-side-only photo holder to defer uploads until save
  tempPhoto?: { file?: File; previewUrl?: string };
}

export interface ComparablesData {
  sales?: ComparableItem[];
  rentals?: ComparableItem[];
}

export interface RpData {
  localityId?: number;
}

export interface ValuationReportData {
  id?: string;
  // Property data is now included directly
  address: AddressData;
  rpDataId?: string;
  rpData?: RpData;
  fileNumber?: string;
  allianceId?: string;
  primaryContact?: PrimaryContactData;
  // Valuation report specific data
  propertyDetails?: PropertyDetailsData;
  locationDetails?: LocationDetailsData;
  propertyDescriptors?: PropertyDescriptorsData;
  ancillaryImprovements?: AncillaryImprovementsData;
  generalComments?: GeneralCommentsData;
  valuationDetails?: ValuationDetailsData;
  referralDetails?: ReferralDetailsData;
  invoiceDetails?: InvoiceDetailsData;
  photos?: PhotoData[];
  additionalPhotos?: PhotoData[];
  additionalPhotosType?: string;
  floorPlans?: PhotoData[];
  titleSearch?: PhotoData[];
  comparables?: ComparablesData;
  createdAt?: DateISOString;
  updatedAt?: DateISOString;
}

// PropertyValuationData is now just ValuationReportData since property data is included
export type PropertyValuationData = ValuationReportData;

export interface SectionProps {
  register: UseFormRegister<PropertyValuationData>;
  control: Control<PropertyValuationData>;
  watch: UseFormWatch<PropertyValuationData>;
  setValue: UseFormSetValue<PropertyValuationData>;
  errors: FieldErrors<PropertyValuationData>;
  reportId?: string;
}

export const STATE_OPTIONS = [
  { value: 'NSW', label: 'NSW', abbr: 'NSW' },
  { value: 'VIC', label: 'VIC', abbr: 'VIC' },
  { value: 'QLD', label: 'QLD', abbr: 'QLD' },
  { value: 'SA', label: 'SA', abbr: 'SA' },
  { value: 'WA', label: 'WA', abbr: 'WA' },
  { value: 'TAS', label: 'TAS', abbr: 'TAS' },
  { value: 'ACT', label: 'ACT', abbr: 'ACT' },
  { value: 'NT', label: 'NT', abbr: 'NT' }
] as const;

export const STATE_ABBR_OPTIONS = STATE_OPTIONS.map(option => ({
  value: option.abbr,
  label: option.abbr
}));

export const RISK_RATING_OPTIONS = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Very High', label: 'Very High' }
] as const;

export type WorkflowStatus = 'draft' | 'in_progress' | 'completed' | 'archived';

export const CONDITION_OPTIONS: { value: ConditionRating; label: string }[] = [
  { value: 'Very Good', label: 'Very Good' },
  { value: 'Good', label: 'Good' },
  { value: 'Fair', label: 'Fair' },
  { value: 'Average', label: 'Average' },
  { value: 'Poor', label: 'Poor' }
];

export const DEFAULT_PROPERTY_FORM: PropertyValuationData = {
  address: {
    fullAddress: '',
    streetName: '',
    streetNameOnly: '',
    suburb: '',
    state: 'NSW',
    postcode: '',
    unitNumber: ''
  },
  rpDataId: '',
  rpData: {
    localityId: undefined,
  },
  primaryContact: {
    firstName: '',
    lastName: '',
    phone: '',
    phone2: '',
    email: '',
    email2: '',
    owners: []
  },
  propertyDetails: {
    propertyType: '',
    titleReference: '',
    zoning: '',
    siteArea: undefined,
    buildingArea: 1094,
    landShape: '',
    councilArea: '',
    permissibleUses: '',
    heritageIssue: '',
    flood: '',
    bushfire: '',
    rainfall: '',
    townPlanning: '',
    topography: '',
    buildYear: undefined,
    includeGrannyFlatBuildYear: false,
    buildYearGrannyFlat: undefined,
    includeGrannyFlatExternalArea: false,
    externalAreaGrannyFlat: undefined,
    accommodation: '',
    livingArea: undefined,
    externalArea: undefined,
    parkingArea: undefined,
    otherArea: undefined,
    studyRoom: false,
    landSlope: '',
    frontage: undefined,
    depth: undefined,
    statutoryValue: undefined,
    statutoryDate: ''
  },
  locationDetails: {
    suburbDescription: '',
    siteDescription: '',
    access: '',
    identification: '',
    includesGas: false,
    map: {
      photo: '',
      source: ''
    },
    latitude: '',
    longitude: ''
  },
  propertyDescriptors: {
    bedrooms: undefined,
    bathrooms: undefined,
    carSpaces: undefined,
    mainBuildingType: '',
    externalWalls: '',
    internalWalls: '',
    roofingType: '',
    parkingType: '',
    internalCondition: undefined,
    externalCondition: undefined,
    repairsRequirements: '',
    defects: '',
    lighting: '',
    airconditioning: '',
    fireServices: '',
    lifts: '',
    isGrannyFlat: false,
    grannyFlat: {
      mainBuildingType: '',
      roofingType: '',
      externalWalls: '',
      internalWalls: '',
      parkingType: '',
      internalCondition: undefined,
      externalCondition: undefined
    }
  },
  ancillaryImprovements: {
    showSection: false,
    driveway: '',
    fencing: '',
    otherItems: [],
    otherItemsText: '',
    accommodation: '',
    waterUtilisation: ''
  },
  generalComments: {
    propertyDescription: '',
    marketOverview: '',
    propertyComments: '',
    valuationCommentsPara: ''
  },
  valuationDetails: {
    valuationType: '',
    landValuationType: '',
    valuationDate: '',
    inspectionDate: '',
    dateIssued: '',
    currentDayValuation: false,
    externalDesktopValuation: false,
    marketValue: 3000000,
    interestValued: '',
    showCurrencyOfValuation: false,
    showLandValue: false,
    landValue: undefined,
    showImprovements: false,
    improvements: undefined,
    lowestValueSqm: undefined,
    highestValueSqm: undefined,
    squareMeterRate: undefined,
    directComparison: '',
    purposeOfReport: '',
    conversionDate: '',
    deadlineDate: '',
    surveyType: '',
    requestedValuationTarget: '',
    valuationNotes: '',
    stage: '',
    fairMarketNetAnnualIncome: undefined,
    yieldRate: undefined,
    capitalisedValue: undefined,
    nla: undefined,
    assessedNetRental: undefined,
    capitalisationRate: undefined,
    lettingUpExpenses: undefined,
    planningScheme: '',
    planningApproval: '',
    potentialFutureUse: '',
    currentUse: '',
    registeredProprietor: '',
    grossRentalRate: 170.00,
    vacancyAllowancePct: 0.00,
    outgoingsRate: 30.00,
    capRateLow: 4.75,
    capRateMid: 5.00,
    capRateHigh: 5.25,
    adoptedCapValue: 3060000,
    capitalExpenditureRate: 13.00,
    incentiveMonths: 0,
    lettingUpMonths: 3,
    agentsCommissionPct: 12.00,
    pvDiscountRate: 10.00,
    miscellaneousAmount: 0.00,
    pvOverageRent: 0.00,
    blankPagesCount: 0,
    blankPagesHeading: '',
    logoType: 'AAP'
  },
  referralDetails: {
    referrerName: '',
    referralFee: undefined
  },
  invoiceDetails: {
    reportFee: undefined
  },
  photos: [],
  additionalPhotos: [],
  additionalPhotosType: '',
  floorPlans: [],
  titleSearch: [],
  comparables: {
    sales: [],
    rentals: []
  }
};
