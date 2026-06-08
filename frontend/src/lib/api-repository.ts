/**
 * API Repository
 * Replaces localStorage with real API calls to the backend
 */

import { apiClient } from './api-client';
import { API_BASE_URL } from './api-config';
import { PropertyData, ValuationReportData, DEFAULT_PROPERTY_FORM } from '@/types/property-valuation';

// PropertyBundle is now just a single ValuationReportData since property data is included
export interface PropertyBundle {
  property: ValuationReportData & { _id?: string; id?: string };
  valuationReports: Array<ValuationReportData & { _id?: string; id?: string }>;
}

interface ApiPropertyResponse {
  property: any;
  valuationReports: any[];
  valuationReportsCount: number;
}

interface ApiPropertiesListResponse {
  properties: any[];
  count: number;
}

interface ApiValuationReportsResponse {
  reports: any[];
  count: number;
}

interface ApiValuationReportResponse {
  // Single valuation report response
  [key: string]: any;
}

interface ApiCreatePropertyResponse {
  message: string;
  propertyId: string;
}

interface ApiCreateReportResponse {
  message: string;
  reportId: string;
}

interface PropertyCardData {
  id: string;
  address: string;
  rpDataId?: string;
  createdAt?: string;
  updatedAt?: string;
  valuationReportsCount?: number;
}

/**
 * Transform backend valuation report to frontend format (now includes property data)
 */
function transformValuationReport(backendReport: any): ValuationReportData {
  // Convert date fields to YYYY-MM-DD format for date inputs
  const valuationDetails = backendReport.valuationDetails || {};
  const dateFields = ['valuationDate', 'inspectionDate', 'conversionDate', 'deadlineDate', 'dateIssued'];
  dateFields.forEach(field => {
    if (valuationDetails[field]) {
      try {
        const date = new Date(valuationDetails[field]);
        valuationDetails[field] = date.toISOString().split('T')[0];
      } catch (e) {
        console.error(`Failed to convert ${field}:`, e);
      }
    }
  });

  // Convert dates in comparables
  const convertComparableDate = (comparable: any) => {
    if (comparable.saleLeaseDate) {
      try {
        const date = new Date(comparable.saleLeaseDate);
        comparable.saleLeaseDate = date.toISOString().split('T')[0];
      } catch (e) {
        console.error('Failed to convert saleLeaseDate:', e);
      }
    }
    return comparable;
  };

  const comparables = backendReport.comparables || { sales: [], rentals: [] };
  if (comparables.sales) {
    comparables.sales = comparables.sales.map(convertComparableDate);
  }
  if (comparables.rentals) {
    comparables.rentals = comparables.rentals.map(convertComparableDate);
  }

  return {
    id: backendReport._id || backendReport.id,
    address: backendReport.address || {},
    rpDataId: backendReport.rpDataId || '',
    rpData: backendReport.rpData || { localityId: undefined },
    allianceId: backendReport.allianceId,
    fileNumber: backendReport.fileNumber,
    primaryContact: backendReport.primaryContact || {
      firstName: '',
      lastName: '',
      phone: '',
      phone2: '',
      email: '',
      email2: '',
      owners: backendReport.owners || []
    },
    propertyDetails: backendReport.propertyDetails || {},
    locationDetails: backendReport.locationDetails || {},
    propertyDescriptors: backendReport.propertyDescriptors || {},
    ancillaryImprovements: {
      ...backendReport.ancillaryImprovements,
      otherItemsText: Array.isArray(backendReport.ancillaryImprovements?.otherItems)
        ? backendReport.ancillaryImprovements.otherItems.join('\n')
        : '',
    },
    generalComments: backendReport.generalComments || {},
    valuationDetails,
    referralDetails: backendReport.referralDetails || {},
    invoiceDetails: backendReport.invoiceDetails || {},
    photos: backendReport.photos || [],
    additionalPhotos: backendReport.additionalPhotos || [],
    additionalPhotosType: backendReport.additionalPhotosType || '',
    floorPlans: backendReport.floorPlans || [],
    titleSearch: backendReport.titleSearch || [],
    comparables,
    createdAt: backendReport.createdAt,
    updatedAt: backendReport.updatedAt,
  };
}


/**
 * Transform frontend valuation report to backend format (now includes property data)
 */
function transformValuationReportToBackend(report: ValuationReportData): any {
  // Convert otherItemsText to otherItems array
  const ancillaryImprovements = report.ancillaryImprovements ? {
    ...report.ancillaryImprovements,
    otherItems: report.ancillaryImprovements.otherItemsText
      ? report.ancillaryImprovements.otherItemsText.split('\n').map(item => item.trim()).filter(Boolean)
      : (report.ancillaryImprovements.otherItems ?? []),
  } : undefined;

  // Remove otherItemsText from the backend payload
  if (ancillaryImprovements) {
    delete (ancillaryImprovements as any).otherItemsText;
  }

  // Scrub client-only fields from comparables before sending to backend
  const scrubComparables = (comparables: any | undefined) => {
    if (!comparables) return comparables;
    const scrubItem = (item: any) => {
      if (!item || typeof item !== 'object') return item;
      const { tempPhoto, ...rest } = item;
      return rest;
    };
    return {
      sales: Array.isArray(comparables.sales) ? comparables.sales.map(scrubItem) : comparables.sales,
      rentals: Array.isArray(comparables.rentals) ? comparables.rentals.map(scrubItem) : comparables.rentals,
    };
  };

  return {
    address: report.address,
    rpDataId: report.rpDataId,
    rpData: report.rpData,
    fileNumber: report.fileNumber,
    allianceId: report.allianceId,
    primaryContact: report.primaryContact,
    propertyDetails: report.propertyDetails,
    locationDetails: report.locationDetails,
    propertyDescriptors: report.propertyDescriptors,
    ancillaryImprovements,
    generalComments: report.generalComments,
    valuationDetails: report.valuationDetails,
    referralDetails: report.referralDetails,
    invoiceDetails: report.invoiceDetails,
    photos: report.photos,
    additionalPhotos: report.additionalPhotos,
    additionalPhotosType: report.additionalPhotosType,
    floorPlans: report.floorPlans,
    titleSearch: report.titleSearch,
    comparables: scrubComparables(report.comparables),
  };
}


export const apiRepository = {
  /**
   * Get all valuation reports (now includes property data directly)
   */
  async listPropertyBundles(): Promise<PropertyBundle[]> {
    try {
      const response = await apiClient.get<ApiValuationReportsResponse>('/valuation-reports/');

      return response.reports.map(report => ({
        property: transformValuationReport(report),
        valuationReports: [], // We'll fetch reports individually when needed
      }));
    } catch (error) {
      console.error('Failed to list valuation reports:', error);
      throw error;
    }
  },

  /**
   * Get a single valuation report (now includes property data directly)
   */
  async getPropertyBundle(propertyId: string): Promise<PropertyBundle | null> {
    try {
      const response = await apiClient.get<ApiValuationReportResponse>(`/valuation-reports/${propertyId}`);

      return {
        property: transformValuationReport(response),
        valuationReports: [transformValuationReport(response)], // Single report now
      };
    } catch (error) {
      console.error('Failed to get valuation report:', error);
      return null;
    }
  },

  /**
   * Get property valuation data (now just a single valuation report with property data)
   * This is used for editing a specific valuation report
   */
  async getPropertyValuation(propertyId: string): Promise<{
    property: ValuationReportData;
    valuationReport: ValuationReportData;
    hasValuationReport: boolean;
  } | null> {
    try {
      const response = await apiClient.get<ApiValuationReportResponse>(`/valuation-reports/${propertyId}`);

      const property = transformValuationReport(response);
      const hasValuationReport = true; // Always true since we're getting a valuation report

      // For the unified structure, property and valuationReport are the same
      const valuationReport = transformValuationReport(response);

      return {
        property,
        valuationReport,
        hasValuationReport,
      };
    } catch (error) {
      console.error('Failed to get property valuation:', error);
      return null;
    }
  },

  /**
   * Get a specific valuation report
   */
  async getValuationReport(reportId: string): Promise<ValuationReportData | null> {
    try {
      const response = await apiClient.get<{ report: any }>(`/valuation-reports/${reportId}`);
      return transformValuationReport(response.report);
    } catch (error) {
      console.error('Failed to get valuation report:', error);
      return null;
    }
  },

  /**
   * Create a new property (now creates a valuation report with property data)
   */
  async createProperty(propertyData?: ValuationReportData): Promise<{ propertyId: string }> {
    try {
      const dataToSend = propertyData
        ? transformValuationReportToBackend(propertyData)
        : transformValuationReportToBackend(DEFAULT_PROPERTY_FORM);
      const response = await apiClient.post<ApiCreateReportResponse>('/valuation-reports/', dataToSend);
      return { propertyId: response.reportId };
    } catch (error) {
      console.error('Failed to create property:', error);
      throw error;
    }
  },

  /**
   * Update valuation report (now includes property data directly)
   */
  async updateProperty(propertyId: string, propertyData: ValuationReportData): Promise<void> {
    try {
      const backendData = transformValuationReportToBackend(propertyData);
      await apiClient.put(`/valuation-reports/${propertyId}`, backendData);
    } catch (error) {
      console.error('Failed to update valuation report:', error);
      throw error;
    }
  },

  /**
   * Delete valuation report
   */
  async deleteProperty(propertyId: string): Promise<void> {
    try {
      await apiClient.delete(`/valuation-reports/${propertyId}`);
    } catch (error) {
      console.error('Failed to delete valuation report:', error);
      throw error;
    }
  },

  /**
   * Create a new valuation report (now creates a complete valuation report with property data)
   */
  async createValuationReport(
    initialData?: { valuationType?: string; valuationDate?: string; address?: any }
  ): Promise<{ reportId: string }> {
    try {
      const payload: any = {
        ...DEFAULT_PROPERTY_FORM,
        address: initialData?.address || DEFAULT_PROPERTY_FORM.address
      };

      // If initial data is provided, set it in valuationDetails
      if (initialData) {
        payload.valuationDetails = {
          ...DEFAULT_PROPERTY_FORM.valuationDetails,
          valuationType: initialData.valuationType,
          // Convert date string to ISO date string for proper backend handling
          valuationDate: initialData.valuationDate ? new Date(initialData.valuationDate).toISOString() : undefined,
        };
      }

      const response = await apiClient.post<ApiCreateReportResponse>(
        `/valuation-reports/`,
        payload
      );
      return { reportId: response.reportId };
    } catch (error) {
      console.error('Failed to create valuation report:', error);
      throw error;
    }
  },

  /**
   * Update a valuation report
   */
  async updateValuationReport(reportId: string, data: ValuationReportData): Promise<void> {
    try {
      const backendData = transformValuationReportToBackend(data);
      await apiClient.put(`/valuation-reports/${reportId}`, backendData);
    } catch (error) {
      console.error('Failed to update valuation report:', error);
      throw error;
    }
  },

  /**
   * Delete a valuation report
   */
  async deleteValuationReport(reportId: string): Promise<void> {
    try {
      await apiClient.delete(`/valuation-reports/${reportId}`);
    } catch (error) {
      console.error('Failed to delete valuation report:', error);
      throw error;
    }
  },

  /**
   * Duplicate a valuation report
   */
  async duplicateProperty(reportId: string, copies: number = 1): Promise<{ message: string; reportIds: string[] }> {
    try {
      const response = await apiClient.post<{ message: string; reportIds: string[] }>(
        `/valuation-reports/${reportId}/duplicate`,
        { copies }
      );
      return response;
    } catch (error) {
      console.error('Failed to duplicate valuation report:', error);
      throw error;
    }
  },

  /**
   * Save property valuation (now just updates the valuation report with property data)
   * This is a convenience method for forms that edit both
   */
  async savePropertyValuation(propertyId: string, data: ValuationReportData): Promise<void> {
    try {
      // Update the valuation report (which now includes property data)
      await this.updateProperty(propertyId, data);
    } catch (error) {
      console.error('Failed to save property valuation:', error);
      throw error;
    }
  },

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await apiClient.healthCheck();
      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  },

  /**
   * Photo upload methods - now using S3 direct upload
   */
  async uploadPhotos(reportId: string, files: FileList, photoType: string): Promise<{ uploadedUrls: string[] }> {
    try {
      // Import S3 upload function dynamically to avoid circular imports
      const { uploadMultipleFilesToS3 } = await import('./s3-upload');

      const { successful, failed } = await uploadMultipleFilesToS3(reportId, files);

      if (failed.length > 0) {
        throw new Error(`Failed to upload ${failed.length} files: ${failed.map(f => f.error).join(', ')}`);
      }

      return {
        uploadedUrls: successful.map(result => result.s3Url!).filter(Boolean)
      };
    } catch (error) {
      console.error('Failed to upload photos:', error);
      throw error;
    }
  },

  async deletePhoto(reportId: string, photoUrl: string, photoType: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/photos/delete/${reportId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photoUrl, photoType }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Failed to delete photo:', error);
      throw error;
    }
  },

  async getPhotos(reportId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/photos/list/${reportId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch photos');
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get photos:', error);
      throw error;
    }
  },

  /**
   * Generate HTML report preview
   */
  async generateReportPreview(reportId: string): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/valuation-reports/${reportId}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate report preview' }));
        throw new Error(errorData.error || 'Failed to generate report preview');
      }

      // Return the HTML content directly
      return await response.text();
    } catch (error) {
      console.error('Failed to generate report preview:', error);
      throw error;
    }
  },

  /**
   * Generate PDF report
   */
  async generateReport(reportId: string): Promise<Blob> {
    try {
      const response = await fetch(`${API_BASE_URL}/valuation-reports/${reportId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate PDF report' }));
        throw new Error(errorData.error || 'Failed to generate PDF report');
      }

      // Return the PDF blob
      return await response.blob();
    } catch (error) {
      console.error('Failed to generate PDF report:', error);
      throw error;
    }
  },

  /**
   * Generate invoice HTML preview for a valuation report
   */
  async generateInvoicePreview(reportId: string): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/valuation-reports/${reportId}/invoice/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate invoice preview' }));
        throw new Error(errorData.error || 'Failed to generate invoice preview');
      }

      return await response.text();
    } catch (error) {
      console.error('Failed to generate invoice preview:', error);
      throw error;
    }
  },

  /**
   * Generate invoice PDF for a valuation report
   */
  async generateInvoice(reportId: string): Promise<Blob> {
    try {
      const response = await fetch(`${API_BASE_URL}/valuation-reports/${reportId}/invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate invoice PDF' }));
        throw new Error(errorData.error || 'Failed to generate invoice PDF');
      }

      return await response.blob();
    } catch (error) {
      console.error('Failed to generate invoice PDF:', error);
      throw error;
    }
  },

  // Alliance API methods
  async getAllianceJobs(page: number = 1, perPage: number = 10): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/alliance/jobs?page=${page}&per_page=${perPage}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch Alliance jobs' }));
        throw new Error(errorData.error || 'Failed to fetch Alliance jobs');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch Alliance jobs:', error);
      throw error;
    }
  },

  async getAllianceJob(jobId: number): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/alliance/jobs/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch Alliance job' }));
        throw new Error(errorData.error || 'Failed to fetch Alliance job');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch Alliance job:', error);
      throw error;
    }
  },

  async transformAllianceJob(jobId: number): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/alliance/jobs/transform/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to transform Alliance job' }));
        throw new Error(errorData.error || 'Failed to transform Alliance job');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to transform Alliance job:', error);
      throw error;
    }
  },

  async getAllAllianceJobs(maxPages: number = 10): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/alliance/jobs/all?max_pages=${maxPages}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch all Alliance jobs' }));
        throw new Error(errorData.error || 'Failed to fetch all Alliance jobs');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch all Alliance jobs:', error);
      throw error;
    }
  },

  async checkAllianceHealth(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/alliance/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Alliance service is not responding' }));
        throw new Error(errorData.error || 'Alliance service is not responding');
      }

      return await response.json();
    } catch (error) {
      console.error('Alliance health check failed:', error);
      throw error;
    }
  },

  async importAllianceJob(jobId: number): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/alliance/jobs/import/${jobId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to import Alliance job' }));
        throw new Error(errorData.error || 'Failed to import Alliance job');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to import Alliance job:', error);
      throw error;
    }
  },

  // Inspection Reports API methods
  async getInspectionReports(page: number = 1, perPage: number = 20): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/inspection-reports/reports?page=${page}&per_page=${perPage}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch inspection reports' }));
        throw new Error(errorData.error || 'Failed to fetch inspection reports');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching inspection reports:', error);
      throw error;
    }
  },

  async deleteInspectionReport(reportId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/inspection-reports/reports/${reportId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete inspection report' }));
        throw new Error(errorData.error || 'Failed to delete inspection report');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting inspection report:', error);
      throw error;
    }
  },
};

export default apiRepository;
