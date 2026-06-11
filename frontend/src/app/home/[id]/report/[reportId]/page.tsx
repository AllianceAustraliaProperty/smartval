'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { apiRepository } from '@/lib/api-repository';
import { PropertyValuationData, PropertyData, DEFAULT_PROPERTY_FORM } from '@/types/property-valuation';
import { API_BASE_URL } from '@/lib/api-config';
import { Navigation } from '@/components/Navigation';
import {
  PropertyAddressSection,
  PrimaryContactSection,
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
import { Save, ArrowLeft, CheckCircle, X, ChevronLeft, ChevronRight, FilePlus2, FileText, FileSearch } from 'lucide-react';
import { PreviewReportModal } from '@/components/PreviewReportModal';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const sectionComponents = {
  propertyAddress: PropertyAddressSection,
  primaryContact: PrimaryContactSection,
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
  { id: 'primaryContact', title: 'Primary Contact', icon: 'User' },
  { id: 'propertyDetails', title: 'Property Details', icon: 'Building' },
  { id: 'locationDetails', title: 'Location Details', icon: 'MapPin' },
  { id: 'propertyDescriptors', title: 'Property Descriptors', icon: 'ClipboardList' },
  { id: 'ancillaryImprovements', title: 'Ancillary Improvements', icon: 'Hammer' },
  { id: 'generalComments', title: 'General Comments', icon: 'MessageCircle' },
  { id: 'valuationDetails', title: 'Valuation Details', icon: 'DollarSign' },
  { id: 'referralDetails', title: 'Referral Details', icon: 'User' },
  { id: 'photos', title: 'Photos', icon: 'Camera' },
  { id: 'comparables', title: 'Comparables', icon: 'Scale' },
];

export default function ValuationReportEditPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const reportId = params.reportId as string;
  const propertyId = params.id as string;

  const [property, setProperty] = useState<PropertyValuationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState('propertyAddress');
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [sectionsWithErrors, setSectionsWithErrors] = useState<Set<string>>(new Set());
  const [showPreviewModal, setShowPreviewModal] = useState(false);

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
        return formData.address;
      case 'primaryContact':
        return formData.primaryContact;
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
        return !!(sectionData.streetName && sectionData.suburb && sectionData.state && sectionData.postcode);
      case 'primaryContact':
        return !!(sectionData.firstName && sectionData.lastName);
      case 'propertyDetails':
        return !!(sectionData.titleReference && sectionData.zoning);
      case 'locationDetails':
        return !!(sectionData.suburbDescription);
      case 'propertyDescriptors':
        return !!(sectionData.accommodation);
      case 'ancillaryImprovements':
        return true; // This section is optional
      case 'generalComments':
        return !!(sectionData.generalComments);
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
        return !!(formErrors.address);
      case 'primaryContact':
        return !!(formErrors.primaryContact);
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

  const handlePreview = () => {
    setShowPreviewModal(true);
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
  };

  const handleCancel = () => {
    if (isDirty) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        router.push('/home');
      }
    } else {
      router.push('/home');
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
            onClick={() => router.push('/home')}
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
                    <span className="font-medium">Back to Valuation Report</span>
                  </button>
                  
                  <div className="h-8 w-px bg-gray-300"></div>
                  
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Edit Valuation Report</h1>
                    <p className="text-gray-600">{property.address?.fullAddress || 'No address available'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <button
                    onClick={handlePreview}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-gray-700 bg-white border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300"
                  >
                    <FileSearch className="w-4 h-4 mr-2" />
                    Preview
                  </button>
                  
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
    </div>
  );
}
