'use client';

import { ReportSchedule } from '@/components/ReportSchedule';

import { flushAdditionalPhotoSaves } from '@/lib/additional-photo-saves';

import dynamic from 'next/dynamic';
import { useSectionStatus } from '@/lib/use-section-status';
import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { apiRepository } from '@/lib/api-repository';
import { PropertyValuationData, PropertyData, DEFAULT_PROPERTY_FORM } from '@/types/property-valuation';
import { API_BASE_URL } from '@/lib/api-config';
import { ReportTopNav, ReportStepper, ReportCardShell, PropertySummaryCard } from '@/components/report-nav';
import { Montserrat } from 'next/font/google';

const montserrat = Montserrat({ subsets: ['latin'] });

import { Save, ArrowLeft, CheckCircle, X, ChevronLeft, ChevronRight, FilePlus2, FileText, FileSearch, Download, AlertTriangle, Receipt, ChevronDown, Send } from 'lucide-react';
import { PreviewReportModal } from '@/components/PreviewReportModal';


const SectionLoading = () => <p role="status" className="p-6 text-gray-600">Loading section…</p>;
const AddressAndContactSection = dynamic(() => import('@/components/sections/AddressAndContactSection').then(module => module.AddressAndContactSection), { loading: SectionLoading });
const PropertyDetailsSection = dynamic(() => import('@/components/sections/PropertyDetailsSection').then(module => module.PropertyDetailsSection), { loading: SectionLoading });
const LocationDetailsSection = dynamic(() => import('@/components/sections/LocationDetailsSection').then(module => module.LocationDetailsSection), { loading: SectionLoading });
const PropertyDescriptorsSection = dynamic(() => import('@/components/sections/PropertyDescriptorsSection').then(module => module.PropertyDescriptorsSection), { loading: SectionLoading });
const AncillaryImprovementsSection = dynamic(() => import('@/components/sections/AncillaryImprovementsSection').then(module => module.AncillaryImprovementsSection), { loading: SectionLoading });
const GeneralCommentsSection = dynamic(() => import('@/components/sections/GeneralCommentsSection').then(module => module.GeneralCommentsSection), { loading: SectionLoading });
const ValuationDetailsSection = dynamic(() => import('@/components/sections/ValuationDetailsSection').then(module => module.ValuationDetailsSection), { loading: SectionLoading });
const ReferralDetailsSection = dynamic(() => import('@/components/sections/ReferralDetailsSection').then(module => module.ReferralDetailsSection), { loading: SectionLoading });
const PhotosSection = dynamic(() => import('@/components/sections/PhotosSection').then(module => module.PhotosSection), { loading: SectionLoading });
const ComparablesSection = dynamic(() => import('@/components/sections/ComparablesSection').then(module => module.ComparablesSection), { loading: SectionLoading });

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
        return {
          ...formData.referralDetails,
          reportFee: formData.invoiceDetails?.reportFee,
        };
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
      case 'propertyDescriptors': {
        const hasBuildingType = !!(sectionData.mainBuildingType && String(sectionData.mainBuildingType).trim());
        const hasRoofing = !!(sectionData.roofingType && String(sectionData.roofingType).trim());
        const extWalls = sectionData.externalWalls;
        const hasExtWalls = Array.isArray(extWalls)
          ? extWalls.length > 0
          : !!(extWalls && String(extWalls).trim());
        return hasBuildingType && hasRoofing && hasExtWalls;
      }
      case 'ancillaryImprovements':
        return !!(
          sectionData.driveway ||
          sectionData.fencing ||
          (Array.isArray(sectionData.otherItems) && sectionData.otherItems.length > 0) ||
          sectionData.otherItemsText ||
          sectionData.accommodation ||
          sectionData.waterUtilisation
        );
      case 'generalComments':
        // Check if at least one of the comment fields is filled
        return !!(sectionData.propertyDescription || sectionData.marketOverview || sectionData.propertyComments);
      case 'valuationDetails':
        return !!(sectionData.valuationType && sectionData.valuationDate && sectionData.marketValue);
      case 'referralDetails': {
        const fee = sectionData.reportFee;
        const hasReportFee = fee !== undefined && fee !== null && fee !== '' && (!isNaN(Number(fee)) ? Number(fee) > 0 : true);
        return !!(sectionData.referrerName || hasReportFee || sectionData.referralFee);
      }
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
        return !!(formErrors.referralDetails || formErrors.invoiceDetails);
      case 'photos':
        return !!(formErrors.photos);
      case 'comparables':
        return !!(formErrors.comparables);
      default:
        return false;
    }
  };

const sectionIds = sections.map(section => section.id);

export default function ValuationReportEditPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const reportId = params.id as string; // Use the same ID for both property and report

  const [property, setProperty] = useState<PropertyValuationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const pendingSave = React.useRef<Promise<void> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState('propertyAddress');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showInvoicePreviewModal, setShowInvoicePreviewModal] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);
  const [showSendReportModal, setShowSendReportModal] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [sendReportRecipientType, setSendReportRecipientType] = useState<'client' | 'poc'>('client');
  const [isInvoiceMenuOpen, setIsInvoiceMenuOpen] = useState(false);
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [missingRequirements, setMissingRequirements] = useState<string[]>([]);

  const { register, control, watch, getValues, setValue, handleSubmit, formState: { errors, isDirty }, reset } = useForm<PropertyValuationData>({
    defaultValues: DEFAULT_PROPERTY_FORM,
  });

  // load property data and restore session draft if exists
  useEffect(() => {
    async function loadProperty() {
      try {
        setIsLoading(true);
        setError(null);
        
        // load the valuation report directly
        const report = await apiRepository.getValuationReport(reportId);
        if (!report) {
          setError('Valuation report not found');
          return;
        }

        // restore local session draft if valuer had uncommitted edits
        let initialData = report;
        try {
          const cached = sessionStorage.getItem(`smartval-draft-${reportId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed === 'object') {
              initialData = { ...report, ...parsed };
            }
          }
        } catch {}

        setProperty(initialData);
        reset(initialData);
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

  // preserve in-progress edits in session storage so page reload never wipes progress
  useEffect(() => {
    const subscription = watch((value) => {
      try {
        if (value && reportId) {
          sessionStorage.setItem(`smartval-draft-${reportId}`, JSON.stringify(value));
        }
      } catch {}
    });
    return () => subscription.unsubscribe();
  }, [watch, reportId]);

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

  // Auto-update logo type when fileNumber starts with TAMN or CPV
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'fileNumber' && value.fileNumber) {
        const upper = value.fileNumber.toUpperCase();
        if (upper.startsWith('CPV')) {
          setValue('valuationDetails.logoType', 'CPV', { shouldDirty: true });
        } else if (upper.startsWith('TAMN')) {
          setValue('valuationDetails.logoType', 'TAMN', { shouldDirty: true });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue]);

  // Compute live formatted address for nav and shell
  const currentFullAddress = useMemo(() => {
    const full = watch('address.fullAddress') || property?.address?.fullAddress;
    if (full && full.trim()) return full.trim();
    const unit = watch('address.unitNumber') || property?.address?.unitNumber;
    const street = watch('address.streetName') || property?.address?.streetName || '';
    const suburb = watch('address.suburb') || property?.address?.suburb || '';
    const state = watch('address.state') || property?.address?.state || '';
    const postcode = watch('address.postcode') || property?.address?.postcode || '';
    const streetPart = unit ? `${unit}/${street}` : street;
    return [streetPart, suburb, state, postcode].filter(Boolean).join(' ').trim();
  }, [
    property?.address,
    watch('address.fullAddress'),
    watch('address.unitNumber'),
    watch('address.streetName'),
    watch('address.suburb'),
    watch('address.state'),
    watch('address.postcode'),
  ]);

  const { completedSections, sectionsWithErrors } = useSectionStatus(
    watch, getValues, errors, sectionIds, getSectionData, checkSectionCompletion, checkSectionErrors);

  const saveForm = (data: PropertyValuationData): Promise<void> => {
    if (pendingSave.current) return pendingSave.current;
    setIsSaving(true);
    setSaveError(null);
    const snapshot = JSON.parse(JSON.stringify(data));
    const operation = apiRepository.updateValuationReport(reportId, snapshot)
      .catch(err => {
        setSaveError(err instanceof Error ? err.message : 'Unable to save. Your edits are still here. Please retry.');
        throw err;
      }).finally(() => {
        pendingSave.current = null;
        setIsSaving(false);
      });
    pendingSave.current = operation;
    return operation;
  };

  const handleSave = async (data?: PropertyValuationData) => {
    try {
      const allValues = data && Object.keys(data).length > 0 ? { ...getValues(), ...data } : getValues();
      await saveForm(allValues);
      try {
        sessionStorage.removeItem(`smartval-draft-${reportId}`);
      } catch {}
      reset(allValues);
      setProperty(allValues);
      alert('Valuation report updated successfully!');
    } catch { /* Keep the form and its draft visible for retry. */ }
  };

  const onSubmit = async (data: PropertyValuationData) => {
    await handleSave(data);
  };

  const prepareReport = async (): Promise<boolean> => {
    let saved = false;
    try {
      await handleSubmit(async data => {
        const allValues = { ...getValues(), ...data };
        await saveForm(allValues);
        reset(allValues);
        setProperty(allValues);
        saved = true;
      }, () => {
        setSaveError('Please correct the highlighted fields before generating this document.');
      })();
    } catch { /* A failed save must never generate a stale document. */ }
    return saved;
  };

  const downloadDraft = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(getValues(), null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = `valuation-draft-${reportId}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleSectionChange = (sectionId: string) => {
    setCurrentSection(sectionId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const handlePreview = async () => {
    if (!validatePhotosAndComparables()) return;
    if (!await prepareReport()) return;
    setShowPreviewModal(true);
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
  };

  const handleGenerateReport = async () => {
    if (!validatePhotosAndComparables()) return;
    try {
      setIsGeneratingReport(true);
      
      if (!await prepareReport()) return;
      // Generate the PDF report using the correct endpoint
      await flushAdditionalPhotoSaves(reportId);
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
      
      let downloadFilename = `valuation-report-${reportId}.pdf`;
      const fileNumber = getValues('fileNumber');
      
      if (fileNumber) {
        downloadFilename = `${fileNumber}.pdf`;
      }
      
      link.download = downloadFilename;
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
    
    const logoType = watch('valuationDetails.logoType');
    if (logoType === 'CPV' || logoType === 'TAMN') {
      setShowSendReportModal(true);
      setSendReportRecipientType('poc');
    } else {
      if (!recipient) {
        alert('No client email address found. Please add an email in the Property Address section before sending the report.');
        return;
      }
      if (!confirm(`Send the valuation report to ${recipient}?`)) return;
      executeSendReport(recipient, 'client');
    }
  };

  const executeSendReport = async (recipientEmail: string, type: 'client' | 'poc') => {
    try {
      setIsSendingReport(true);
      setShowSendReportModal(false);
      if (!await prepareReport()) return;
      const result = await apiRepository.sendReport(reportId, { to: recipientEmail, recipientType: type });
      alert(`Report sent to ${result.recipient || recipientEmail}.`);
    } catch (err) {
      console.error('Failed to send report:', err);
      alert(err instanceof Error ? err.message : 'Failed to send report. Please try again.');
    } finally {
      setIsSendingReport(false);
    }
  };

  const handlePreviewInvoice = async () => {
    const reportFee = watch('invoiceDetails.reportFee');
    if (reportFee === undefined || reportFee === null || isNaN(Number(reportFee)) || Number(reportFee) <= 0) {
      alert('Please enter a Report Fee in the Financial & Referral Details section before previewing an invoice.');
      return;
    }
    if (!await prepareReport()) return;
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

      if (!await prepareReport()) return;
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
      if (!await prepareReport()) return;
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
        className={`min-h-screen relative overflow-hidden flex items-center justify-center`}
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
            className="inline-flex items-center px-7 py-3 text-sm font-bold rounded-full text-white bg-[#006ABE] hover:bg-[#00589e] shadow-md hover:shadow-lg transition-all duration-300"
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
    <div className={`${montserrat.className} min-h-screen bg-[#F8F9FA] flex flex-col pt-[80px]`}>
      {/* Sticky SMARTval Royal Blue Top Navigation Bar */}
      <ReportTopNav
        fileNumber={watch('fileNumber') || property?.fileNumber || ''}
        rpDataId={watch('rpDataId') || property?.rpDataId || ''}
        propertyAddress={currentFullAddress}
        onFileNumberChange={(newVal) => {
          setValue('fileNumber', newVal, { shouldDirty: true });
        }}
        onRpDataIdChange={(newVal) => {
          setValue('rpDataId', newVal, { shouldDirty: true });
        }}
        onBack={handleCancel}
        onOpenSchedule={() => setIsScheduleOpen(true)}
        onOpenPreview={handlePreview}
        onGenerateReport={handleGenerateReport}
        onSendReport={handleSendReport}
        onOpenFinancial={() => handleSectionChange('referralDetails')}
        onPreviewInvoice={handlePreviewInvoice}
        onGenerateInvoice={handleGenerateInvoice}
        onSendInvoice={handleSendInvoice}
        onSave={() => handleSave()}
        isSaving={isSaving}
        isDirty={isDirty}
        isScheduled={isScheduled}
        isGeneratingReport={isGeneratingReport}
        isSendingReport={isSendingReport}
        isGeneratingInvoice={isGeneratingInvoice}
        isSendingInvoice={isSendingInvoice}
      />

      {/* Horizontal Connected 10-Step Progress Stepper */}
      <ReportStepper
        currentSection={currentSection}
        completedSections={completedSections}
        onStepClick={handleSectionChange}
      />

      {/* Main Wizard Content Area */}
      <main className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center space-x-3">
            <X className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Save Error Alert */}
        {saveError && (
          <div role="alert" className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-red-800">
            <p className="font-medium">{saveError}</p>
            <button type="button" onClick={downloadDraft} className="mt-2 text-sm underline font-semibold">
              Download unsaved draft
            </button>
          </div>
        )}

        {/* Universal Step Card Shell */}
        <ReportCardShell
          currentSection={currentSection}
          fullAddress={currentFullAddress}
        >
          <form onSubmit={handleSubmit(onSubmit)}>
            <fieldset disabled={isSaving} className="min-w-0">
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
            </fieldset>
          </form>
        </ReportCardShell>

        {/* Property Summary Lower Card */}
        <PropertySummaryCard
          propertyData={{
            bedrooms: watch('propertyDescriptors.bedrooms') ?? property.propertyDescriptors?.bedrooms,
            bathrooms: watch('propertyDescriptors.bathrooms') ?? property.propertyDescriptors?.bathrooms,
            carSpaces: watch('propertyDescriptors.carSpaces') ?? property.propertyDescriptors?.carSpaces,
            buildingArea: watch('propertyDetails.buildingArea') ?? property.propertyDetails?.buildingArea,
            siteArea: watch('propertyDetails.siteArea') ?? property.propertyDetails?.siteArea,
            buildYear: watch('propertyDetails.buildYear') ?? property.propertyDetails?.buildYear,
            marketValue: watch('valuationDetails.marketValue') ?? property.valuationDetails?.marketValue,
            valuationDate: watch('valuationDetails.valuationDate') ?? property.valuationDetails?.valuationDate,
            valuationType: watch('valuationDetails.valuationType') ?? property.valuationDetails?.valuationType,
          }}
        />

        {/* Bottom Step Navigation Controls */}
        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            className="inline-flex items-center px-7 py-3 text-sm font-bold rounded-full text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 hover:shadow-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext}
            className="inline-flex items-center px-9 py-3 text-sm font-bold rounded-full text-white bg-[#006ABE] hover:bg-[#00589e] shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </main>

      {/* Schedule dialog component */}
      <ReportSchedule
        reportId={reportId || String(params.id)}
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        showTrigger={false}
        onScheduleChange={setIsScheduled}
        onPrepare={async () => {
          if (!validatePhotosAndComparables()) return false;
          return prepareReport();
        }}
      />

      {/* Send Report Modal */}
      {showSendReportModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" onClick={() => setShowSendReportModal(false)} />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden flex flex-col border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Send Valuation Report</h3>
              <button
                onClick={() => setShowSendReportModal(false)}
                className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                This report is configured for <strong>{watch('valuationDetails.logoType')}</strong>. Who would you like to send it to?
              </p>
              
              <div className="space-y-3">
                <label className={`flex items-start p-4 border rounded-2xl cursor-pointer transition-all ${sendReportRecipientType === 'client' ? 'border-[#006ABE] bg-blue-50/50 ring-2 ring-[#006ABE]/20' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <div className="flex items-center h-5">
                    <input
                      type="radio"
                      className="w-4 h-4 text-[#006ABE] focus:ring-[#006ABE] border-gray-300"
                      checked={sendReportRecipientType === 'client'}
                      onChange={() => setSendReportRecipientType('client')}
                    />
                  </div>
                  <div className="ml-3">
                    <span className="block text-sm font-semibold text-gray-900">Client</span>
                    <span className="block text-xs text-gray-500 mt-1">{(watch('primaryContact.email') || watch('primaryContact.email2') || '').trim()}</span>
                  </div>
                </label>

                <label className={`flex items-start p-4 border rounded-2xl cursor-pointer transition-all ${sendReportRecipientType === 'poc' ? 'border-[#006ABE] bg-blue-50/50 ring-2 ring-[#006ABE]/20' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <div className="flex items-center h-5">
                    <input
                      type="radio"
                      className="w-4 h-4 text-[#006ABE] focus:ring-[#006ABE] border-gray-300"
                      checked={sendReportRecipientType === 'poc'}
                      onChange={() => setSendReportRecipientType('poc')}
                    />
                  </div>
                  <div className="ml-3">
                    <span className="block text-sm font-semibold text-gray-900">{watch('valuationDetails.logoType')} POC</span>
                    <span className="block text-xs text-gray-500 mt-1">
                      {watch('valuationDetails.logoType') === 'CPV' ? 'info@certifiedpropertyvaluer.com.au' : 'info@tamn.com.au'}
                    </span>
                  </div>
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/70 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSendReportModal(false)}
                className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-full hover:bg-gray-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const clientEmail = (watch('primaryContact.email') || watch('primaryContact.email2') || '').trim();
                  if (sendReportRecipientType === 'client' && !clientEmail) {
                    alert('No client email address found. Please add an email in the Property Address section.');
                    return;
                  }
                  const targetEmail = sendReportRecipientType === 'poc' 
                    ? (watch('valuationDetails.logoType') === 'CPV' ? 'info@certifiedpropertyvaluer.com.au' : 'info@tamn.com.au')
                    : clientEmail;
                  executeSendReport(targetEmail, sendReportRecipientType);
                }}
                disabled={isSendingReport}
                className="inline-flex items-center px-6 py-2.5 text-sm font-bold rounded-full text-white bg-[#006ABE] hover:bg-[#00589e] shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSendingReport ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <PreviewReportModal
        isOpen={showPreviewModal}
        onClose={handleClosePreview}
        reportId={reportId}
        propertyAddress={currentFullAddress}
        fileNumber={property?.fileNumber}
      />

      {/* Invoice Preview Modal */}
      <PreviewReportModal
        isOpen={showInvoicePreviewModal}
        onClose={() => setShowInvoicePreviewModal(false)}
        reportId={reportId}
        propertyAddress={currentFullAddress}
        fileNumber={property?.fileNumber}
        mode="invoice"
      />

      {/* Validation Warning Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 z-[200]">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setShowValidationModal(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Action Needed</h3>
                </div>
                <button
                  onClick={() => setShowValidationModal(false)}
                  className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <p className="text-gray-700 mb-3 font-medium">The following sections are empty:</p>
                <ul className="list-disc list-inside text-gray-800 mb-6 space-y-1 font-semibold">
                  {missingRequirements.map(item => (
                    <li key={item} className="text-[#006ABE]">{item}</li>
                  ))}
                </ul>
                <p className="text-sm text-gray-600">Please add the required information before previewing or generating the report.</p>
              </div>

              <div className="px-6 py-4 bg-gray-50/70 border-t border-gray-100 flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowValidationModal(false)}
                  className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-full hover:bg-gray-50 transition-all cursor-pointer"
                >
                  OK
                </button>
                {missingRequirements.length > 0 && (
                  <button
                    onClick={() => {
                      const target = missingRequirements.includes('Photos') ? 'photos' : 'comparables';
                      setCurrentSection(target);
                      setShowValidationModal(false);
                    }}
                    className="inline-flex items-center px-6 py-2.5 text-sm font-bold rounded-full text-white bg-[#006ABE] hover:bg-[#00589e] shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    Go to {missingRequirements.includes('Photos') ? 'Photos' : 'Comparables'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
