import React, { useMemo, useState } from 'react';
import { FormField, Input, Select, Textarea, Checkbox, MultiSelectDropdown } from '../ui/FormField';
import { Controller } from 'react-hook-form';
import { CONDITION_OPTIONS, SectionProps } from '@/types/property-valuation';
import { ROOFING_TYPES } from '@/constants/roofing-types';
import { INTERNAL_WALLS, EXTERNAL_WALLS } from '@/constants/wall-types';
import { PARKING_TYPES } from '@/constants/parking-types';
import { ResidentialMainBuildingTypes, CommercialMainBuildingTypes, AllMainBuildingTypes } from '@/constants/main-building-types';
import { ResidentialPropertyTypes, CommercialPropertyTypes } from '@/constants/property-types';
import { Wand2, AlertTriangle, AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { summarizePhotos } from '@/lib/photo-utils';
import { apiRepository } from '@/lib/api-repository';

interface UiMessage {
  type: 'error' | 'warning' | 'success' | 'info';
  title: string;
  message?: string;
  details?: string[];
}

export const PropertyDescriptorsSection: React.FC<SectionProps> = ({ register, errors, watch, setValue, control, reportId }) => {
  const [isAutomating, setIsAutomating] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [uiMessage, setUiMessage] = useState<UiMessage | null>(null);

  // Watch the property type to determine which building types to show
  const propertyType = watch('propertyDetails.propertyType');
  const isGrannyFlat = watch('propertyDescriptors.isGrannyFlat');
  const photos = watch('photos') || [];
  
  const hasCoverPhoto = useMemo(() => {
    return Array.isArray(photos) && photos.some(p => p.isCover && p.photoUrl);
  }, [photos]);
  
  // Filter building types based on property type
  const availableBuildingTypes = useMemo(() => {
    if (!propertyType) {
      return AllMainBuildingTypes;
    }
    
    if (ResidentialPropertyTypes.includes(propertyType as any)) {
      return ResidentialMainBuildingTypes;
    }
    
    if (CommercialPropertyTypes.includes(propertyType as any)) {
      return CommercialMainBuildingTypes;
    }
    
    // For other property types (Rural, Land), show all options
    return AllMainBuildingTypes;
  }, [propertyType]);

  const handleAutomate = async () => {
    setIsAutomating(true);
    setUiMessage(null);
    const updatedFields: string[] = [];

    try {
      // 1. Get photos from form state or API
      let currentPhotos = watch('photos') || [];
      if ((!currentPhotos || currentPhotos.length === 0) && reportId && reportId !== 'temp') {
        try {
          const resp = await fetch(`${API_BASE_URL}/photos/list/${reportId}`);
          if (resp.ok) {
            const data = await resp.json();
            currentPhotos = data.photos || [];
          }
        } catch (e) {
          console.error('Error fetching photos list:', e);
        }
      }

      if (!currentPhotos || currentPhotos.length === 0) {
        setUiMessage({
          type: 'error',
          title: 'No Photos Found',
          message: 'Please upload property photos in the Photos section first before running automation.'
        });
        return;
      }

      // 2. Count bedrooms and bathrooms from photos
      // Bathrooms and Ensuite count as 1, Toilets / Powder Room count as 0.5
      const photosSummary = summarizePhotos(currentPhotos);
      let bedroomCount = 0;
      let bathroomCount = 0;

      for (const catObj of photosSummary.categories) {
        const lower = (catObj.category || '').toLowerCase().trim();
        if (lower.startsWith('bedroom')) {
          bedroomCount += 1;
        } else if (lower.startsWith('bathroom')) {
          bathroomCount += 1;
        } else if (lower.startsWith('ensuite')) {
          bathroomCount += 1;
        } else if (lower.startsWith('toilet') || lower.startsWith('powder room') || lower.includes('toilet')) {
          bathroomCount += 0.5;
        }
      }

      if (bedroomCount > 0) {
        setValue('propertyDescriptors.bedrooms', bedroomCount, { shouldDirty: true });
        updatedFields.push(`Bedrooms: ${bedroomCount}`);
      }
      if (bathroomCount > 0) {
        setValue('propertyDescriptors.bathrooms', bathroomCount, { shouldDirty: true });
        updatedFields.push(`Bathrooms: ${bathroomCount}`);
      }

      // 3. Find cover photo and analyze building descriptors
      const coverPhoto = currentPhotos.find(p => p.isCover && p.photoUrl);
      let coverPhotoAnalyzed = false;
      let coverPhotoError: string | null = null;

      if (coverPhoto?.photoUrl) {
        try {
          const response = await fetch('/internal-api/analyze-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrl: coverPhoto.photoUrl,
              isCover: true,
              propertyType: propertyType || undefined,
            }),
          });

          if (!response.ok) {
            let errorData;
            try { errorData = await response.json(); } catch (_) {}
            throw new Error(errorData?.error || 'Failed to analyze cover photo');
          }

          const { data } = await response.json();
          if (data) {
            coverPhotoAnalyzed = true;
            if (data.mainBuildingType) {
              setValue('propertyDescriptors.mainBuildingType', data.mainBuildingType, { shouldDirty: true });
              updatedFields.push(`Main Building Type: ${data.mainBuildingType}`);
            }
            if (data.roofingType) {
              setValue('propertyDescriptors.roofingType', data.roofingType, { shouldDirty: true });
              updatedFields.push(`Roofing Type: ${data.roofingType}`);
            }
            if (data.externalWalls) {
              const wallsStr = Array.isArray(data.externalWalls)
                ? data.externalWalls.join(', ')
                : String(data.externalWalls);
              if (wallsStr) {
                setValue('propertyDescriptors.externalWalls', wallsStr, { shouldDirty: true });
                updatedFields.push(`External Walls: ${wallsStr}`);
              }
            }
          }
        } catch (err: any) {
          console.error('Error analyzing cover photo:', err);
          coverPhotoError = err.message || 'Cover photo analysis failed';
        }
      }

      // 4. Auto-save if reportId exists
      if (reportId && reportId !== 'temp') {
        try {
          setIsAutoSaving(true);
          const formData = watch();
          await apiRepository.updateValuationReport(String(reportId), formData as any);
        } catch (error) {
          console.error('Auto-save error in Property Descriptors:', error);
        } finally {
          setIsAutoSaving(false);
        }
      }

      // 5. Display UI message with appropriate severity
      if (!coverPhoto) {
        setUiMessage({
          type: 'warning',
          title: 'Cover Photo Missing',
          message: 'Room counts were calculated, but Main Building Type, Roofing Type, and External Walls could not be detected because no Cover Photo is selected.',
          details: [
            ...updatedFields.map(f => `Updated ${f}`),
            'To detect building type, roofing, and external walls, mark an exterior photo as "Cover Photo" in the Photos section and click Automate again.'
          ]
        });
      } else if (coverPhotoError) {
        setUiMessage({
          type: 'warning',
          title: 'Cover Photo Analysis Warning',
          message: coverPhotoError,
          details: updatedFields.map(f => `Updated ${f}`)
        });
      } else {
        setUiMessage({
          type: 'success',
          title: 'Property Descriptors Automated',
          message: 'Successfully populated descriptor details from photos and auto-saved.',
          details: updatedFields
        });
      }
    } catch (err: any) {
      console.error('Automation error:', err);
      setUiMessage({
        type: 'error',
        title: 'Automation Failed',
        message: err.message || 'An unexpected error occurred during automation.'
      });
    } finally {
      setIsAutomating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Property Descriptors</h2>
          <p className="text-gray-600">Record the internal layout, construction materials, and condition of the improvements.</p>
        </div>
        <button
          type="button"
          onClick={handleAutomate}
          disabled={isAutomating || isAutoSaving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          title="Automate descriptors from photos"
        >
          {isAutomating || isAutoSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              {isAutomating ? 'Automating...' : 'Saving...'}
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Automate
            </>
          )}
        </button>
      </div>

      {/* Dynamic Feedback Banner */}
      {uiMessage && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm transition-all duration-200 ${
            uiMessage.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-900'
              : uiMessage.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : uiMessage.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          {uiMessage.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
          {uiMessage.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />}
          {uiMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
          {uiMessage.type === 'info' && <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />}

          <div className="flex-1 text-sm space-y-1">
            <p className="font-semibold">{uiMessage.title}</p>
            {uiMessage.message && <p>{uiMessage.message}</p>}
            {uiMessage.details && uiMessage.details.length > 0 && (
              <ul className="list-disc list-inside space-y-0.5 text-xs opacity-90 mt-1">
                {uiMessage.details.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={() => setUiMessage(null)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Proactive Warning when photos exist but no Cover Photo is selected */}
      {!uiMessage && photos.length > 0 && !hasCoverPhoto && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-amber-950">No Cover Photo Selected in Photos Section</p>
            <p className="text-amber-800 mt-0.5">
              To automatically detect <strong>Main Building Type</strong>, <strong>Roofing Type</strong>, and <strong>External Walls</strong>, please select a photo and mark it as <strong>Cover Photo</strong> in the Photos section.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormField
          label="Bedrooms"
          error={errors.propertyDescriptors?.bedrooms?.message}
        >
          <Input
            type="number"
            min={0}
            {...register('propertyDescriptors.bedrooms', { valueAsNumber: true })}
            placeholder="e.g., 3"
            error={errors.propertyDescriptors?.bedrooms?.message}
          />
        </FormField>

        <FormField
          label="Bathrooms"
          error={errors.propertyDescriptors?.bathrooms?.message}
        >
          <Input
            type="number"
            min={0}
            step="any"
            {...register('propertyDescriptors.bathrooms', { valueAsNumber: true })}
            placeholder="e.g., 2"
            error={errors.propertyDescriptors?.bathrooms?.message}
          />
        </FormField>

        <FormField
          label="Car Spaces"
          error={errors.propertyDescriptors?.carSpaces?.message}
        >
          <Input
            type="number"
            min={0}
            {...register('propertyDescriptors.carSpaces', { valueAsNumber: true })}
            placeholder="e.g., 2"
            error={errors.propertyDescriptors?.carSpaces?.message}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Onsite Parking"
          error={(errors as any).propertyDescriptors?.onsiteParking?.message}
        >
          <Input
            type="number"
            min={0}
            {...register('propertyDescriptors.onsiteParking', { valueAsNumber: true })}
            placeholder="e.g., 4"
            error={(errors as any).propertyDescriptors?.onsiteParking?.message}
          />
        </FormField>

        <FormField
          label="Visitor's Parking"
          error={(errors as any).propertyDescriptors?.visitorsParking?.message}
        >
          <Input
            type="number"
            min={0}
            {...register('propertyDescriptors.visitorsParking', { valueAsNumber: true })}
            placeholder="e.g., 2"
            error={(errors as any).propertyDescriptors?.visitorsParking?.message}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Main Building Type"
          error={errors.propertyDescriptors?.mainBuildingType?.message}
        >
          <Select
            {...register('propertyDescriptors.mainBuildingType')}
            options={availableBuildingTypes.map(type => ({ value: type, label: type }))}
            error={errors.propertyDescriptors?.mainBuildingType?.message}
          />
        </FormField>

        <FormField
          label="Roofing Type"
          error={errors.propertyDescriptors?.roofingType?.message}
        >
          <Select
            {...register('propertyDescriptors.roofingType')}
            options={ROOFING_TYPES.map(type => ({ value: type, label: type }))}
            error={errors.propertyDescriptors?.roofingType?.message}
          />
        </FormField>

        <FormField
          label="External Walls"
          error={errors.propertyDescriptors?.externalWalls?.message}
        >
          <Controller
            name="propertyDescriptors.externalWalls"
            control={control}
            render={({ field }) => (
              <MultiSelectDropdown
                options={EXTERNAL_WALLS.map(type => ({ value: type, label: type }))}
                value={field.value || ''}
                onChange={field.onChange}
                error={errors.propertyDescriptors?.externalWalls?.message}
              />
            )}
          />
        </FormField>

        <FormField
          label="Internal Walls"
          error={errors.propertyDescriptors?.internalWalls?.message}
        >
          <Select
            {...register('propertyDescriptors.internalWalls')}
            options={INTERNAL_WALLS.map(type => ({ value: type, label: type}))}
            error={errors.propertyDescriptors?.internalWalls?.message}
          />
        </FormField>

        <FormField
          label="Parking Type"
          error={errors.propertyDescriptors?.parkingType?.message}
        >
          <Controller
            name="propertyDescriptors.parkingType"
            control={control}
            render={({ field }) => (
              <MultiSelectDropdown
                options={PARKING_TYPES.map(type => ({ value: type, label: type }))}
                value={field.value || ''}
                onChange={field.onChange}
                error={errors.propertyDescriptors?.parkingType?.message}
              />
            )}
          />
        </FormField>

        {/* Move Internal Condition next to Parking Type */}
        <FormField
          label="Internal Condition"
          error={errors.propertyDescriptors?.internalCondition?.message}
        >
          <Select
            {...register('propertyDescriptors.internalCondition')}
            options={CONDITION_OPTIONS}
            error={errors.propertyDescriptors?.internalCondition?.message}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* External Condition to the left (replacing Internal Condition spot) */}
        <FormField
          label="External Condition"
          error={errors.propertyDescriptors?.externalCondition?.message}
        >
          <Select
            {...register('propertyDescriptors.externalCondition')}
            options={CONDITION_OPTIONS}
            error={errors.propertyDescriptors?.externalCondition?.message}
          />
        </FormField>

        {/* Checkbox in place of External Condition old position */}
        <FormField label="">
          <Checkbox
            {...register('propertyDescriptors.isGrannyFlat')}
            label="Is Granny Flat?"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Repair Requirements"
          error={errors.propertyDescriptors?.repairsRequirements?.message}
        >
          <Textarea
            {...register('propertyDescriptors.repairsRequirements')}
            placeholder="Items requiring maintenance or repair"
            rows={4}
            error={errors.propertyDescriptors?.repairsRequirements?.message}
          />
        </FormField>

        <FormField
          label="Noted Defects"
          error={errors.propertyDescriptors?.defects?.message}
        >
          <Textarea
            {...register('propertyDescriptors.defects')}
            placeholder="Structural or cosmetic defects observed"
            rows={4}
            error={errors.propertyDescriptors?.defects?.message}
          />
        </FormField>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900">Building Services</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Lighting"
          error={(errors as any).propertyDescriptors?.lighting?.message}
        >
          <Input
            {...register('propertyDescriptors.lighting')}
            placeholder="e.g., Standard commercial"
            error={(errors as any).propertyDescriptors?.lighting?.message}
          />
        </FormField>

        <FormField
          label="Airconditioning"
          error={(errors as any).propertyDescriptors?.airconditioning?.message}
        >
          <Input
            {...register('propertyDescriptors.airconditioning')}
            placeholder="e.g., Ducted"
            error={(errors as any).propertyDescriptors?.airconditioning?.message}
          />
        </FormField>

        <FormField
          label="Fire Services"
          error={(errors as any).propertyDescriptors?.fireServices?.message}
        >
          <Input
            {...register('propertyDescriptors.fireServices')}
            placeholder="e.g., Detectors present"
            error={(errors as any).propertyDescriptors?.fireServices?.message}
          />
        </FormField>

        <FormField
          label="Lifts"
          error={(errors as any).propertyDescriptors?.lifts?.message}
        >
          <Input
            {...register('propertyDescriptors.lifts')}
            placeholder="e.g., None"
            error={(errors as any).propertyDescriptors?.lifts?.message}
          />
        </FormField>
      </div>

      {/* Granny Flat subsection */}
      {isGrannyFlat && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Granny Flat</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Roofing Type">
              <Select
                {...register('propertyDescriptors.grannyFlat.roofingType')}
                options={ROOFING_TYPES.map(type => ({ value: type, label: type }))}
              />
            </FormField>
            <FormField label="External Walls">
              <Controller
                name="propertyDescriptors.grannyFlat.externalWalls"
                control={control}
                render={({ field }) => (
                  <MultiSelectDropdown
                    options={EXTERNAL_WALLS.map(type => ({ value: type, label: type }))}
                    value={field.value || ''}
                    onChange={field.onChange}
                  />
                )}
              />
            </FormField>
            <FormField label="Internal Walls">
              <Select
                {...register('propertyDescriptors.grannyFlat.internalWalls')}
                options={INTERNAL_WALLS.map(type => ({ value: type, label: type }))}
              />
            </FormField>
            <FormField label="Parking Type">
              <Controller
                name="propertyDescriptors.grannyFlat.parkingType"
                control={control}
                render={({ field }) => (
                  <MultiSelectDropdown
                    options={PARKING_TYPES.map(type => ({ value: type, label: type }))}
                    value={field.value || ''}
                    onChange={field.onChange}
                  />
                )}
              />
            </FormField>
            <FormField label="Internal Condition">
              <Select
                {...register('propertyDescriptors.grannyFlat.internalCondition')}
                options={CONDITION_OPTIONS}
              />
            </FormField>
            <FormField label="External Condition">
              <Select
                {...register('propertyDescriptors.grannyFlat.externalCondition')}
                options={CONDITION_OPTIONS}
              />
            </FormField>
          </div>
        </div>
      )}
    </div>
  );
};
