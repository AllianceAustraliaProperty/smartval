'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { apiRepository } from '@/lib/api-repository';
import { PropertyValuationData, PropertyData, DEFAULT_PROPERTY_FORM } from '@/types/property-valuation';
import { API_BASE_URL } from '@/lib/api-config';
import { Navigation } from '@/components/Navigation';
import {
  AddressAndContactSection,
  PropertyDetailsSection,
  LocationDetailsSection,
  PropertyDescriptorsSection,
  AncillaryImprovementsSection,
  GeneralCommentsSection,
  ValuationDetailsSection,
  ReferralDetailsSection,
  PhotosSection,
  ComparablesSection,
} from '@/components/sections';
import { Save, ArrowLeft, CheckCircle, X, ChevronLeft, ChevronRight, FilePlus2, FileText, FileSearch, Download, AlertTriangle, Receipt, ChevronDown, Send } from 'lucide-react';
import { PreviewReportModal } from '@/components/PreviewReportModal';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const sectionComponents = {
  propertyAddress: AddressAndContactSection,
  propertyDetails: PropertyDetailsSection,
  locationDetails: LocationDetailsSection,
  propertyDescriptors: PropertyDescriptorsSection,
  ancillaryImprovements: AncillaryImprovementsSection,
  generalComments: GeneralCommentsSection,
  valuationDetails: ValuationDetailsSection,
  referralDetails: ReferralDetailsSection,
  photos: PhotosSection,
  comparables: ComparablesSection,
};

const sections = [
  { id: 'propertyAddress', title: 'Property Address', icon: 'Navigation' },
  { id: 'valuationDetails', title: 'Valuation Details', icon: 'DollarSign' },
  { id: 'propertyDetails', title: 'Property Details', icon: 'Building' },
  { id: 'locationDetails', title: 'Location Details', icon: 'MapPin' },
  { id: 'propertyDescriptors', title: 'Property Descriptors', icon: 'ClipboardList' },
  { id: 'ancillaryImprovements', title: 'Ancillary Improvements', icon: 'Hammer' },
  { id: 'generalComments', title: 'General Comments', icon: 'MessageCircle' },
  { id: 'referralDetails', title: 'Financial & Referral', icon: 'DollarSign' },
  { id: 'comparables', title: 'Comparables', icon: 'Scale' },
  { id: 'photos', title: 'Photos', icon: 'Camera' },
];

export default function ValuationReportEditPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const reportId = params.id as string; // Use the same ID for both property and report

  const [property, setProperty] = useState<PropertyValuationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState('propertyAddress');
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [sectionsWithErrors, setSectionsWithErrors] = useState<Set<string>>(new Set());
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showInvoicePreviewModal, setShowInvoicePreviewModal] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);
  const [isInvoiceMenuOpen, setIsInvoiceMenuOpen] = useState(false);
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [missingRequirements, setMissingRequirements] = useState<string[]>([]);

  const { register, control, watch, setValue, handleSubmit, formState: { errors, isDirty }, reset } = useForm<PropertyValuationData>({
    defaultValues: DEFAULT_PROPERTY_FORM,
  });

  // Load property data
  useEffect(() => {
    async function loadProperty() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load the valuation report directly
        const report = await apiRepository.getValuationReport(reportId);
        if (!report) {
          setError('Valuation report not found');
          return;
        }

        setProperty(report);
        reset(report);
      } catch (err) {
        console.error('Failed to load valuation report:', err);
        setError('Failed to load valuation report');
      } finally {
        setIsLoading(false);
      }
    }

    if (reportId) {
      loadProperty();
    }
  }, [reportId, reset]);

  // Close invoice dropdown on outside click
  useEffect(() => {
    if (!isInvoiceMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-invoice-menu]')) {
        setIsInvoiceMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isInvoiceMenuOpen]);

  // Close report dropdown on outside click
  useEffect(() => {
    if (!isReportMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-report-menu]')) {
        setIsReportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isReportMenuOpen]);

  // Check for completed sections
  useEffect(() => {
    const subscription = watch((value) => {
      const completed = new Set<string>();
      const withErrors = new Set<string>();

      sections.forEach(section => {
        const sectionData = getSectionData(value, section.id);
        const hasData = checkSectionCompletion(sectionData, section.id);
        const hasErrors = checkSectionErrors(errors, section.id);
        
        if (hasData) {
          completed.add(section.id);
        }
        if (hasErrors) {
          withErrors.add(section.id);
        }
      });

      setCompletedSections(completed);
      setSectionsWithErrors(withErrors);
    });

    return () => subscription.unsubscribe();
  }, [watch, errors]);

  const getSectionData = (formData: any, sectionId: string) => {
    switch (sectionId) {
      case 'propertyAddress':
      return { address: formData.address, primaryContact: formData.primaryContact };
      case 'propertyDetails':
        return formData.propertyDetails;
      case 'locationDetails':
        return formData.locationDetails;
      case 'propertyDescriptors':
        return formData.propertyDescriptors;
      case 'ancillaryImprovements':
        return formData.ancillaryImprovements;
      case 'generalComments':
        return formData.generalComments;
      case 'valuationDetails':
        return formData.valuationDetails;
      case 'referralDetails':
        return formData.referralDetails;
      case 'photos':
        return formData.photos;
      case 'comparables':
        return formData.comparables;
      default:
        return null;
    }
  };

  const checkSectionCompletion = (sectionData: any, sectionId: string): boolean => {
    if (!sectionData) return false;

    switch (sectionId) {
      case 'propertyAddress':
      // Consider address completion only; contact optional within combined section
      const addr = sectionData.address || {};
      return !!(addr.streetName && addr.suburb && addr.state && addr.postcode);
      case 'propertyDetails':
        return !!(sectionData.titleReference && sectionData.zoning);
      case 'locationDetails':
        return !!(sectionData.suburbDescription);
      case 'propertyDescriptors':
        // Check if at least some key fields are filled
        return !!(sectionData.bedrooms || sectionData.bathrooms || sectionData.carSpaces || 
                  sectionData.mainBuildingType || sectionData.roofingType || sectionData.externalWalls);
      case 'ancillaryImprovements':
        return true; // This section is optional
      case 'generalComments':
        // Check if at least one of the comment fields is filled
        return !!(sectionData.propertyDescription || sectionData.marketOverview || sectionData.propertyComments);
      case 'valuationDetails':
        return !!(sectionData.valuationType && sectionData.valuationDate && sectionData.marketValue);
      case 'referralDetails':
        return !!(sectionData.referrerName);
      case 'photos':
        return !!(sectionData && sectionData.length > 0);
      case 'comparables':
        return !!(sectionData && (sectionData.sales?.length > 0 || sectionData.rentals?.length > 0));
      default:
        return false;
    }
  };

  const checkSectionErrors = (formErrors: any, sectionId: string): boolean => {
    if (!formErrors) return false;

    switch (sectionId) {
      case 'propertyAddress':
      return !!(formErrors.address || formErrors.primaryContact);
      case 'propertyDetails':
        return !!(formErrors.propertyDetails);
      case 'locationDetails':
        return !!(formErrors.locationDetails);
      case 'propertyDescriptors':
        return !!(formErrors.propertyDescriptors);
      case 'ancillaryImprovements':
        return !!(formErrors.ancillaryImprovements);
      case 'generalComments':
        return !!(formErrors.generalComments);
      case 'valuationDetails':
        return !!(formErrors.valuationDetails);
      case 'referralDetails':
        return !!(formErrors.referralDetails);
      case 'photos':
        return !!(formErrors.photos);
      case 'comparables':
        return !!(formErrors.comparables);
      default:
        return false;
    }
  };

  const onSubmit = async (data: PropertyValuationData) => {
    try {
      setIsSaving(true);
      setError(null);
      
      console.log('Form data being submitted:', data);
      
      // Update the valuation report
      await apiRepository.updateValuationReport(reportId, data);
      
      // Show success message
      alert('Valuation report updated successfully!');
    } catch (err) {
      console.error('Failed to update valuation report:', err);
      setError('Failed to update valuation report. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSectionChange = (sectionId: string) => {
    setCurrentSection(sectionId);
  };

  const validatePhotosAndComparables = (): boolean => {
    const photos = watch('photos' as const) as any[] | undefined;
    const comparables = watch('comparables' as const) as any | undefined;
    const missing: string[] = [];

    if (!photos || photos.length === 0) {
      missing.push('Photos');
    }

    const hasSales = Array.isArray(comparables?.sales) && comparables.sales.length > 0;
    const hasRentals = Array.isArray(comparables?.rentals) && comparables.rentals.length > 0;
    if (!hasSales && !hasRentals) {
      missing.push('Comparables');
    }

    if (missing.length > 0) {
      setMissingRequirements(missing);
      setShowValidationModal(true);
      return false;
    }
    return true;
  };

  const handlePreview = () => {
    if (!validatePhotosAndComparables()) return;
    setShowPreviewModal(true);
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
  };

  const handleGenerateReport = async () => {
    if (!validatePhotosAndComparables()) return;
    try {
      setIsGeneratingReport(true);
      
      // Generate the PDF report using the correct endpoint
      const response = await fetch(`${API_BASE_URL}/valuation-reports/${reportId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Create a blob from the response
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `valuation-report-${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate report:', err);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleSendReport = async () => {
    if (!validatePhotosAndComparables()) return;
    const recipient = (watch('primaryContact.email') || watch('primaryContact.email2') || '').trim();
    if (!recipient) {
      alert('No client email address found. Please add an email in the Property Address section before sending the report.');
      return;
    }
    if (!confirm(`Send the valuation report to ${recipient}?`)) return;
    try {
      setIsSendingReport(true);
      const result = await apiRepository.sendReport(reportId, { to: recipient });
      alert(`Report sent to ${result.recipient || recipient}.`);
    } catch (err) {
      console.error('Failed to send report:', err);
      alert(err instanceof Error ? err.message : 'Failed to send report. Please try again.');
    } finally {
      setIsSendingReport(false);
    }
  };

  const handlePreviewInvoice = () => {
    const reportFee = watch('invoiceDetails.reportFee');
    if (reportFee === undefined || reportFee === null || isNaN(Number(reportFee)) || Number(reportFee) <= 0) {
      alert('Please enter a Report Fee in the Financial & Referral Details section before previewing an invoice.');
      return;
    }
    setShowInvoicePreviewModal(true);
  };

  const handleGenerateInvoice = async () => {
    const reportFee = watch('invoiceDetails.reportFee');
    if (reportFee === undefined || reportFee === null || isNaN(Number(reportFee)) || Number(reportFee) <= 0) {
      alert('Please enter a Report Fee in the Financial & Referral Details section before generating an invoice.');
      return;
    }

    try {
      setIsGeneratingInvoice(true);

      const blob = await apiRepository.generateInvoice(reportId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate invoice:', err);
      alert('Failed to generate invoice. Please try again.');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleSendInvoice = async () => {
    const reportFee = watch('invoiceDetails.reportFee');
    if (reportFee === undefined || reportFee === null || isNaN(Number(reportFee)) || Number(reportFee) <= 0) {
      alert('Please enter a Report Fee in the Financial & Referral Details section before sending an invoice.');
      return;
    }
    const recipient = (watch('primaryContact.email') || watch('primaryContact.email2') || '').trim();
    if (!recipient) {
      alert('No client email address found. Please add an email in the Property Address section before sending the invoice.');
      return;
    }
    if (!confirm(`Send the invoice to ${recipient}?`)) return;
    try {
      setIsSendingInvoice(true);
      const result = await apiRepository.sendInvoice(reportId, { to: recipient });
      alert(`Invoice sent to ${result.recipient || recipient}.`);
    } catch (err) {
      console.error('Failed to send invoice:', err);
      alert(err instanceof Error ? err.message : 'Failed to send invoice. Please try again.');
    } finally {
      setIsSendingInvoice(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        router.push('/valuation-reports');
      }
    } else {
      router.push('/valuation-reports');
    }
  };

  const currentSectionIndex = sections.findIndex(s => s.id === currentSection);
  const canGoPrevious = currentSectionIndex > 0;
  const canGoNext = currentSectionIndex < sections.length - 1;

  const handlePrevious = () => {
    if (canGoPrevious) {
      setCurrentSection(sections[currentSectionIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      setCurrentSection(sections[currentSectionIndex + 1].id);
    }
  };

  if (isLoading) {
    return (
      <div
        className={`min-h-screen relative overflow-hidden flex items-center justify-center ${inter.className}`}
        style={{ background: 'radial-gradient(ellipse 80% 75% at bottom center, #1f7cc6 20%, #ddeaf4 70%, #ffffff 90%)' }}
      >
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, #ffffff 2px, transparent 0)',
            backgroundSize: '20px 20px'
          }}
        ></div>
        <div
          className="absolute inset-0 pointer-events-none animate-breath origin-bottom"
          style={{ background: 'radial-gradient(ellipse 80% 80% at bottom center, #1f7cc6 0%, transparent 70%)'}}
        ></div>
        
        <div className="relative z-10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0b70c5] border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-700 font-medium tracking-wide animate-pulse">Loading Valuation Report...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Report</h2>
          <p className="text-gray-600 mb-6">{error || 'The valuation report could not be loaded.'}</p>
          <button
            onClick={() => router.push('/valuation-reports')}
            className="inline-flex items-center px-6 py-3 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Valuation Reports
          </button>
        </div>
      </div>
    );
  }

  const CurrentSectionComponent = sectionComponents[currentSection as keyof typeof sectionComponents];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-blue-100">
      <div className="flex">
        {/* Navigation Sidebar */}
        <Navigation
          currentSection={currentSection}
          onSectionChange={handleSectionChange}
          completedSections={completedSections}
          sectionsWithErrors={sectionsWithErrors}
          propertyData={{
            valuationType: property.valuationDetails?.valuationType,
            valuationDate: property.valuationDetails?.valuationDate,
            bedrooms: property.propertyDescriptors?.bedrooms,
            bathrooms: property.propertyDescriptors?.bathrooms,
            carSpaces: property.propertyDescriptors?.carSpaces,
            buildingArea: property.propertyDetails?.buildingArea,
            siteArea: property.propertyDetails?.siteArea,
            marketValue: property.valuationDetails?.marketValue,
          }}
        />

        {/* Main Content */}
        <div className="flex-1 ml-80">
          <div className="p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleCancel}
                    className="group flex items-center space-x-3 px-4 py-2 text-gray-600 hover:text-blue-600 transition-colors duration-300"
                  >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
                    <span className="font-medium">Back to Valuation Reports</span>
                  </button>
                  
                  <div className="h-8 w-px bg-gray-300"></div>
                  
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Edit Valuation Report</h1>
                    <p className="text-gray-600">{property.address?.fullAddress || 'No address available'}</p>
                  </div>
                  
                  <div className="h-8 w-px bg-gray-300"></div>
                  
                  {/* File Number */}
                  <div className="flex flex-col">
                    <label className="text-xs font-medium text-gray-500 mb-1">File Number</label>
                    <input
                      type="text"
                      value={watch('fileNumber') || ''}
                      onChange={(e) => setValue('fileNumber', e.target.value, { shouldDirty: true })}
                      placeholder="Enter file number"
                      className="px-3 py-2 text-sm font-semibold text-gray-900 bg-white border-2 border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors w-32"
                    />
                  </div>
                  
                  <div className="h-8 w-px bg-gray-300"></div>
                  
                  {/* Stage Dropdown */}
                  <div className="flex flex-col">
                    <label className="text-xs font-medium text-gray-500 mb-1">Stage</label>
                    <select
                      value={watch('valuationDetails.stage') || ''}
                      onChange={(e) => setValue('valuationDetails.stage', e.target.value, { shouldDirty: true })}
                      className="px-3 py-2 text-sm font-semibold text-gray-900 bg-white border-2 border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="">Select Stage</option>
                      <option value="Booking">Booking</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Review">Review</option>
                      <option value="Completed">Completed</option>
                      <option value="On Hold">On Hold</option>
                    </select>
                  </div>

                  <div className="h-8 w-px bg-gray-300"></div>

                  {/* RP Data Link */}
                  <div className="flex flex-col">
                    <label className="text-xs font-medium text-gray-500 mb-1">RP Data</label>
                    {watch('rpDataId') ? (
                      <a
                        href={`https://rpp.corelogic.com.au/property/${watch('rpDataId')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 underline"
                        title="Open in RP Data"
                      >
                        {watch('rpDataId')}
                      </a>
                    ) : (
                      <span className="text-sm font-semibold text-gray-500">Not set</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="relative" data-report-menu>
                    <button
                      onClick={() => setIsReportMenuOpen((open) => !open)}
                      disabled={isGeneratingReport || isSendingReport}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-green-700 bg-green-50 border-2 border-green-200 hover:border-green-300 hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {(isGeneratingReport || isSendingReport) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent mr-2"></div>
                          {isSendingReport ? 'Sending...' : 'Generating...'}
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Report
                          <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 ${isReportMenuOpen ? 'rotate-180' : ''}`} />
                        </>
                      )}
                    </button>

                    {isReportMenuOpen && !isGeneratingReport && !isSendingReport && (
                      <div className="absolute right-0 mt-2 w-56 origin-top-right bg-white rounded-xl shadow-xl border border-green-100 z-30 overflow-hidden">
                        <button
                          onClick={() => {
                            setIsReportMenuOpen(false);
                            handlePreview();
                          }}
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors"
                        >
                          <FileSearch className="w-4 h-4 mr-3 text-green-600" />
                          Preview Report
                        </button>
                        <div className="h-px bg-green-100" />
                        <button
                          onClick={() => {
                            setIsReportMenuOpen(false);
                            handleGenerateReport();
                          }}
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors"
                        >
                          <Download className="w-4 h-4 mr-3 text-green-600" />
                          Generate PDF
                        </button>
                        <div className="h-px bg-green-100" />
                        <button
                          onClick={() => {
                            setIsReportMenuOpen(false);
                            handleSendReport();
                          }}
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors"
                        >
                          <Send className="w-4 h-4 mr-3 text-green-600" />
                          Send Report
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="relative" data-invoice-menu>
                    <button
                      onClick={() => setIsInvoiceMenuOpen((open) => !open)}
                      disabled={isGeneratingInvoice || isSendingInvoice}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-amber-700 bg-amber-50 border-2 border-amber-200 hover:border-amber-300 hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {(isGeneratingInvoice || isSendingInvoice) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-600 border-t-transparent mr-2"></div>
                          {isSendingInvoice ? 'Sending...' : 'Generating...'}
                        </>
                      ) : (
                        <>
                          <Receipt className="w-4 h-4 mr-2" />
                          Invoice
                          <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 ${isInvoiceMenuOpen ? 'rotate-180' : ''}`} />
                        </>
                      )}
                    </button>

                    {isInvoiceMenuOpen && !isGeneratingInvoice && !isSendingInvoice && (
                      <div className="absolute right-0 mt-2 w-56 origin-top-right bg-white rounded-xl shadow-xl border border-amber-100 z-30 overflow-hidden">
                        <button
                          onClick={() => {
                            setIsInvoiceMenuOpen(false);
                            handlePreviewInvoice();
                          }}
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-amber-50 transition-colors"
                        >
                          <FileSearch className="w-4 h-4 mr-3 text-amber-600" />
                          Preview Invoice
                        </button>
                        <div className="h-px bg-amber-100" />
                        <button
                          onClick={() => {
                            setIsInvoiceMenuOpen(false);
                            handleGenerateInvoice();
                          }}
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-amber-50 transition-colors"
                        >
                          <Download className="w-4 h-4 mr-3 text-amber-600" />
                          Generate PDF
                        </button>
                        <div className="h-px bg-amber-100" />
                        <button
                          onClick={() => {
                            setIsInvoiceMenuOpen(false);
                            handleSendInvoice();
                          }}
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-amber-50 transition-colors"
                        >
                          <Send className="w-4 h-4 mr-3 text-amber-600" />
                          Send Invoice
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleSubmit(onSubmit)}
                    disabled={isSaving}
                    className="group inline-flex items-center px-6 py-3 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center space-x-3">
                  <X className="w-5 h-5 text-red-500" />
                  <p className="text-red-800 font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Form Content */}
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8">
                {CurrentSectionComponent && (
                  <CurrentSectionComponent
                    register={register}
                    control={control}
                    watch={watch}
                    setValue={setValue}
                    errors={errors}
                    reportId={reportId}
                  />
                )}
              </div>
            </form>

            {/* Section Navigation */}
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={!canGoPrevious}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-gray-700 bg-white border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </button>

              <div className="flex items-center space-x-2">
                {sections.map((section, index) => (
                  <button
                    key={section.id}
                    onClick={() => setCurrentSection(section.id)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      currentSection === section.id
                        ? 'bg-blue-600 scale-125'
                        : completedSections.has(section.id)
                        ? 'bg-green-500'
                        : sectionsWithErrors.has(section.id)
                        ? 'bg-red-500'
                        : 'bg-gray-300'
                    }`}
                    title={section.title}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                disabled={!canGoNext}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-gray-700 bg-white border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <PreviewReportModal
        isOpen={showPreviewModal}
        onClose={handleClosePreview}
        reportId={reportId}
        propertyAddress={property.address?.fullAddress}
      />

      {/* Invoice Preview Modal */}
      <PreviewReportModal
        isOpen={showInvoicePreviewModal}
        onClose={() => setShowInvoicePreviewModal(false)}
        reportId={reportId}
        propertyAddress={property.address?.fullAddress}
        mode="invoice"
      />

      {/* Validation Warning Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setShowValidationModal(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Action Needed</h3>
                </div>
                <button
                  onClick={() => setShowValidationModal(false)}
                  className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <p className="text-gray-700 mb-3">The following sections are empty:</p>
                <ul className="list-disc list-inside text-gray-800 mb-6">
                  {missingRequirements.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="text-sm text-gray-600">Please add the required information before previewing or generating the report.</p>
              </div>

              <div className="px-6 pb-6 flex items-center justify-end space-x-2">
                {missingRequirements.length > 0 && (
                  <button
                    onClick={() => {
                      const target = missingRequirements.includes('Photos') ? 'photos' : 'comparables';
                      setCurrentSection(target);
                      setShowValidationModal(false);
                    }}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Go to {missingRequirements.includes('Photos') ? 'Photos' : 'Comparables'}
                  </button>
                )}
                <button
                  onClick={() => setShowValidationModal(false)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
