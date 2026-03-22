import { DEFAULT_PROPERTY_FORM, PropertyData, PropertyValuationData, ValuationReportData, WorkflowStatus, parseDelimitedText, joinItemsToText } from '@/types/property-valuation';

const PROPERTY_KEY = 'smartval:properties';
const VALUATION_KEY = 'smartval:valuationReports';

interface StoredProperty extends PropertyData {
  id: string;
  workflowStatus?: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

interface StoredValuationReport extends ValuationReportData {
  id: string;
  propertyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyBundle {
  property: StoredProperty;
  valuationReports: StoredValuationReport[];
}

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `tmp_${Math.random().toString(36).slice(2, 10)}`;
};

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const readStorage = <T>(key: string): T[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as T[];
  } catch (error) {
    console.error(`Failed to parse localStorage key "${key}"`, error);
    return [];
  }
};

const writeStorage = <T>(key: string, data: T[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(data));
};

const syncProperty = (property: StoredProperty, patch: PropertyData): StoredProperty => {
  return {
    ...property,
    ...patch,
    address: {
      ...property.address,
      ...patch.address,
    },
    workflowStatus: (patch as any).workflowStatus ?? property.workflowStatus,
    createdAt: patch.createdAt ?? property.createdAt,
    updatedAt: new Date().toISOString(),
  };
};

const syncValuationReport = (
  report: StoredValuationReport,
  patch: ValuationReportData
): StoredValuationReport => {
  return {
    ...report,
    ...patch,
    propertyDetails: {
      ...report.propertyDetails,
      ...patch.propertyDetails,
    },
    locationDetails: {
      ...report.locationDetails,
      ...patch.locationDetails,
      map: {
        ...report.locationDetails?.map,
        ...patch.locationDetails?.map,
      },
    },
    propertyDescriptors: {
      ...report.propertyDescriptors,
      ...patch.propertyDescriptors,
    },
    ancillaryImprovements: {
      ...report.ancillaryImprovements,
      ...patch.ancillaryImprovements,
    },
    generalComments: {
      ...report.generalComments,
      ...patch.generalComments,
    },
    valuationDetails: {
      ...report.valuationDetails,
      ...patch.valuationDetails,
    },
    photos: patch.photos ?? report.photos ?? [],
    comparables: {
      sales: patch.comparables?.sales ?? report.comparables?.sales ?? [],
      rentals: patch.comparables?.rentals ?? report.comparables?.rentals ?? [],
    },
    createdAt: report.createdAt,
    updatedAt: new Date().toISOString(),
  };
};

type LoadValuationResult = {
  property: PropertyData;
  valuationReport: ValuationReportData;
  hasValuationReport: boolean;
};

export const localRepository = {
  async listPropertyBundles(): Promise<PropertyBundle[]> {
    await delay();
    const properties = readStorage<StoredProperty>(PROPERTY_KEY);
    const valuationReports = readStorage<StoredValuationReport>(VALUATION_KEY);
    return properties.map((property) => ({
      property,
      valuationReports: valuationReports.filter((report) => report.propertyId === property.id),
    }));
  },

  async getPropertyBundle(propertyId: string): Promise<PropertyBundle | null> {
    await delay();
    const properties = readStorage<StoredProperty>(PROPERTY_KEY);
    const property = properties.find((item) => item.id === propertyId);
    if (!property) {
      return null;
    }
    const valuationReports = readStorage<StoredValuationReport>(VALUATION_KEY);
    const propertyValuationReports = valuationReports.filter((report) => report.propertyId === propertyId);
    return { property, valuationReports: propertyValuationReports };
  },

  async getPropertyValuation(propertyId: string): Promise<LoadValuationResult | null> {
    await delay();
    const bundle = await this.getPropertyBundle(propertyId);
    if (!bundle) {
      return null;
    }

    const base = deepClone(DEFAULT_PROPERTY_FORM);
    // Extract PropertyData fields from the base
    const basePropertyData: PropertyData = {
      id: base.id,
      address: base.address,
      rpDataId: base.rpDataId,
      primaryContact: base.primaryContact,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
    };
    
    const property: StoredProperty = {
      ...basePropertyData,
      ...bundle.property,
      address: {
        ...basePropertyData.address,
        ...bundle.property.address,
      },
      workflowStatus: (bundle.property as any).workflowStatus,
      createdAt: bundle.property.createdAt,
      updatedAt: bundle.property.updatedAt,
      id: bundle.property.id,
    };

    const hasValuation = Boolean(bundle.valuationReports);

    const valuationSource = bundle.valuationReports?.[0] ?? null;

    // Extract ValuationReportData fields from the base
    const baseValuationData = {
      address: base.address,
      propertyDetails: base.propertyDetails,
      locationDetails: base.locationDetails,
      propertyDescriptors: base.propertyDescriptors,
      ancillaryImprovements: base.ancillaryImprovements,
      generalComments: base.generalComments,
      valuationDetails: base.valuationDetails,
      referralDetails: base.referralDetails,
      photos: base.photos,
      comparables: base.comparables,
      rpDataId: base.rpDataId,
      primaryContact: base.primaryContact,
    };

    const valuation: ValuationReportData = valuationSource
      ? {
          address: valuationSource.address,
          rpDataId: valuationSource.rpDataId,
          primaryContact: valuationSource.primaryContact,
          propertyDetails: {
            ...deepClone(baseValuationData.propertyDetails),
            ...valuationSource.propertyDetails,
          },
          locationDetails: {
            ...deepClone(baseValuationData.locationDetails),
            ...valuationSource.locationDetails,
            map: {
              ...deepClone(baseValuationData.locationDetails?.map),
              ...valuationSource.locationDetails?.map,
            },
          },
          propertyDescriptors: {
            ...deepClone(baseValuationData.propertyDescriptors),
            ...valuationSource.propertyDescriptors,
          },
          ancillaryImprovements: {
            ...deepClone(baseValuationData.ancillaryImprovements),
            ...valuationSource.ancillaryImprovements,
            otherItemsText: joinItemsToText(valuationSource.ancillaryImprovements?.otherItems),
          },
          generalComments: {
            ...deepClone(baseValuationData.generalComments),
            ...valuationSource.generalComments,
          },
          referralDetails: {
            ...deepClone(baseValuationData.referralDetails),
            ...valuationSource.referralDetails,
          },
          valuationDetails: {
            ...deepClone(baseValuationData.valuationDetails),
            ...valuationSource.valuationDetails,
          },
          photos: valuationSource.photos ?? [],
          comparables: {
            sales: valuationSource.comparables?.sales ?? [],
            rentals: valuationSource.comparables?.rentals ?? [],
          },
        }
      : {
          address: baseValuationData.address,
          propertyDetails: deepClone(baseValuationData.propertyDetails),
          locationDetails: deepClone(baseValuationData.locationDetails),
          propertyDescriptors: deepClone(baseValuationData.propertyDescriptors),
          ancillaryImprovements: deepClone(baseValuationData.ancillaryImprovements),
          generalComments: deepClone(baseValuationData.generalComments),
          referralDetails: deepClone(baseValuationData.referralDetails),
          valuationDetails: deepClone(baseValuationData.valuationDetails),
          photos: baseValuationData.photos,
          comparables: baseValuationData.comparables,
          rpDataId: baseValuationData.rpDataId,
          primaryContact: baseValuationData.primaryContact,
        };

    return {
      property,
      valuationReport: valuation,
      hasValuationReport: hasValuation,
    };
  },

  async createProperty(): Promise<{ propertyId: string }> {
    await delay();
    const now = new Date().toISOString();
    const propertyId = generateId();
    const properties = readStorage<StoredProperty>(PROPERTY_KEY);

    // Extract PropertyData fields from DEFAULT_PROPERTY_FORM
    const basePropertyData: PropertyData = {
      id: DEFAULT_PROPERTY_FORM.id,
      address: DEFAULT_PROPERTY_FORM.address,
      rpDataId: DEFAULT_PROPERTY_FORM.rpDataId,
      primaryContact: DEFAULT_PROPERTY_FORM.primaryContact,
      createdAt: DEFAULT_PROPERTY_FORM.createdAt,
      updatedAt: DEFAULT_PROPERTY_FORM.updatedAt,
    };

    const property: StoredProperty = {
      ...deepClone(basePropertyData),
      id: propertyId,
      createdAt: now,
      updatedAt: now,
      workflowStatus: 'draft',
    };

    properties.push(property);
    writeStorage(PROPERTY_KEY, properties);

    return { propertyId };
  },

  async updateProperty(propertyId: string, propertyPatch: PropertyData): Promise<void> {
    await delay();
    const properties = readStorage<StoredProperty>(PROPERTY_KEY);
    const propertyIndex = properties.findIndex((item) => item.id === propertyId);
    if (propertyIndex === -1) {
      throw new Error('Property not found');
    }
    properties[propertyIndex] = syncProperty(properties[propertyIndex], propertyPatch);
    writeStorage(PROPERTY_KEY, properties);
  },

  async createValuationReport(propertyId: string): Promise<{ reportId: string }> {
    await delay();
    const properties = readStorage<StoredProperty>(PROPERTY_KEY);
    const property = properties.find((item) => item.id === propertyId);
    if (!property) {
      throw new Error('Property not found');
    }

    const valuationReports = readStorage<StoredValuationReport>(VALUATION_KEY);
    const now = new Date().toISOString();
    const reportId = generateId();
    // Extract ValuationReportData fields from DEFAULT_PROPERTY_FORM
    const baseValuationData: Partial<ValuationReportData> = {
      propertyDetails: DEFAULT_PROPERTY_FORM.propertyDetails,
      locationDetails: DEFAULT_PROPERTY_FORM.locationDetails,
      propertyDescriptors: DEFAULT_PROPERTY_FORM.propertyDescriptors,
      ancillaryImprovements: DEFAULT_PROPERTY_FORM.ancillaryImprovements,
      generalComments: DEFAULT_PROPERTY_FORM.generalComments,
      valuationDetails: DEFAULT_PROPERTY_FORM.valuationDetails,
      referralDetails: DEFAULT_PROPERTY_FORM.referralDetails,
      photos: DEFAULT_PROPERTY_FORM.photos,
      comparables: DEFAULT_PROPERTY_FORM.comparables,
    };

    const valuationReport: StoredValuationReport = {
      ...deepClone(baseValuationData),
      id: reportId,
      propertyId,
      address: property.address, // Copy property address to valuation report
      createdAt: now,
      updatedAt: now,
    };

    valuationReports.push(valuationReport);
    writeStorage(VALUATION_KEY, valuationReports);
    return { reportId };
  },

  async getValuationReport(reportId: string): Promise<StoredValuationReport | null> {
    await delay();
    const valuationReports = readStorage<StoredValuationReport>(VALUATION_KEY);
    return valuationReports.find((report) => report.id === reportId) ?? null;
  },

  async updateValuationReport(reportId: string, data: ValuationReportData): Promise<void> {
    await delay();
    const valuationReports = readStorage<StoredValuationReport>(VALUATION_KEY);
    const reportIndex = valuationReports.findIndex((item) => item.id === reportId);
    if (reportIndex === -1) {
      throw new Error('Valuation report not found');
    }

    valuationReports[reportIndex] = syncValuationReport(valuationReports[reportIndex], {
      ...data,
      ancillaryImprovements: {
        ...data.ancillaryImprovements,
        otherItems: parseDelimitedText(data.ancillaryImprovements?.otherItemsText),
      },
    });

    writeStorage(VALUATION_KEY, valuationReports);
  },

  async deleteValuationReport(reportId: string): Promise<void> {
    await delay();
    const valuationReports = readStorage<StoredValuationReport>(VALUATION_KEY).filter((item) => item.id !== reportId);
    writeStorage(VALUATION_KEY, valuationReports);
  },

  async savePropertyValuation(propertyId: string, data: PropertyValuationData): Promise<void> {
    await delay();
    const properties = readStorage<StoredProperty>(PROPERTY_KEY);
    const propertyIndex = properties.findIndex((item) => item.id === propertyId);
    if (propertyIndex === -1) {
      throw new Error('Property not found');
    }
    
    // Extract PropertyData fields from PropertyValuationData
    const propertyData: PropertyData = {
      id: data.id,
      address: data.address,
      rpDataId: data.rpDataId,
      primaryContact: data.primaryContact,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
    
    properties[propertyIndex] = syncProperty(properties[propertyIndex], propertyData);

    const valuationReports = readStorage<StoredValuationReport>(VALUATION_KEY);
    const reportIndex = valuationReports.findIndex((item) => item.propertyId === propertyId);
    if (reportIndex === -1) {
      throw new Error('Valuation report not found');
    }

    // Extract ValuationReportData fields from PropertyValuationData
    const valuationReportData: ValuationReportData = {
      address: data.address,
      rpDataId: data.rpDataId,
      primaryContact: data.primaryContact,
      propertyDetails: data.propertyDetails,
      locationDetails: data.locationDetails,
      propertyDescriptors: data.propertyDescriptors,
      ancillaryImprovements: data.ancillaryImprovements,
      generalComments: data.generalComments,
      valuationDetails: data.valuationDetails,
      referralDetails: data.referralDetails,
      photos: data.photos,
      comparables: data.comparables,
    };

    valuationReports[reportIndex] = syncValuationReport(valuationReports[reportIndex], {
      ...valuationReportData,
      ancillaryImprovements: {
        ...valuationReportData.ancillaryImprovements,
        otherItems: parseDelimitedText(data.ancillaryImprovements?.otherItemsText),
      },
    });

    writeStorage(PROPERTY_KEY, properties);
    writeStorage(VALUATION_KEY, valuationReports);
  },

  async updatePropertyStatus(propertyId: string, status: WorkflowStatus): Promise<void> {
    await delay();
    const properties = readStorage<StoredProperty>(PROPERTY_KEY);
    const propertyIndex = properties.findIndex((item) => item.id === propertyId);
    if (propertyIndex === -1) {
      throw new Error('Property not found');
    }
    properties[propertyIndex] = {
      ...properties[propertyIndex],
      workflowStatus: status,
      updatedAt: new Date().toISOString(),
    };
    writeStorage(PROPERTY_KEY, properties);
  },

  async deleteProperty(propertyId: string): Promise<void> {
    await delay();
    const properties = readStorage<StoredProperty>(PROPERTY_KEY).filter((item) => item.id !== propertyId);
    const valuationReports = readStorage<StoredValuationReport>(VALUATION_KEY).filter((item) => item.propertyId !== propertyId);
    writeStorage(PROPERTY_KEY, properties);
    writeStorage(VALUATION_KEY, valuationReports);
  },
};
