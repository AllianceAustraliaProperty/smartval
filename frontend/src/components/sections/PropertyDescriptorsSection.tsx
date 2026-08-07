import React, { useMemo, useState } from 'react';
import { FormField, Input, Select, Textarea, Checkbox, MultiSelectDropdown } from '../ui/FormField';
import { Controller } from 'react-hook-form';
import { CONDITION_OPTIONS, SectionProps } from '@/types/property-valuation';
import { ROOFING_TYPES } from '@/constants/roofing-types';
import { INTERNAL_WALLS, EXTERNAL_WALLS } from '@/constants/wall-types';
import { PARKING_TYPES } from '@/constants/parking-types';
import { ResidentialMainBuildingTypes, CommercialMainBuildingTypes, AllMainBuildingTypes } from '@/constants/main-building-types';
import { ResidentialPropertyTypes, CommercialPropertyTypes } from '@/constants/property-types';
import { Wand2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { summarizePhotos } from '@/lib/photo-utils';
import { apiRepository } from '@/lib/api-repository';

export const PropertyDescriptorsSection: React.FC<SectionProps> = ({ register, errors, watch, setValue, control, reportId }) => {
  const [isAutomating, setIsAutomating] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Watch the property type to determine which building types to show
  const propertyType = watch('propertyDetails.propertyType');
  const isGrannyFlat = watch('propertyDescriptors.isGrannyFlat');
  
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
    const steps: string[] = ['✓ Property descriptors automated:'];

    try {
      // 1. Get photos from form state or API
      let photos = watch('photos') || [];
      if ((!photos || photos.length === 0) && reportId && reportId !== 'temp') {
        try {
          const resp = await fetch(`${API_BASE_URL}/photos/list/${reportId}`);
          if (resp.ok) {
            const data = await resp.json();
            photos = data.photos || [];
          }
        } catch (e) {
          console.error('Error fetching photos list:', e);
        }
      }

      if (!photos || photos.length === 0) {
        alert('No photos found. Please upload photos and select a cover photo in the Photos section first.');
        return;
      }

      // 2. Count bedrooms and bathrooms from photos
      // Bathrooms and Ensuite count as 1, Toilets / Powder Room count as 0.5
      const photosSummary = summarizePhotos(photos);
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
        steps.push(`  • Bedrooms: ${bedroomCount}`);
      }
      if (bathroomCount > 0) {
        setValue('propertyDescriptors.bathrooms', bathroomCount, { shouldDirty: true });
        steps.push(`  • Bathrooms: ${bathroomCount}`);
      }

      // 3. Find cover photo and analyze building descriptors
      const coverPhoto = photos.find(p => p.isCover && p.photoUrl);
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
            if (data.mainBuildingType) {
              setValue('propertyDescriptors.mainBuildingType', data.mainBuildingType, { shouldDirty: true });
              steps.push(`  • Main Building Type: ${data.mainBuildingType}`);
            }
            if (data.roofingType) {
              setValue('propertyDescriptors.roofingType', data.roofingType, { shouldDirty: true });
              steps.push(`  • Roofing Type: ${data.roofingType}`);
            }
            if (data.externalWalls) {
              const wallsStr = Array.isArray(data.externalWalls)
                ? data.externalWalls.join(', ')
                : String(data.externalWalls);
              if (wallsStr) {
                setValue('propertyDescriptors.externalWalls', wallsStr, { shouldDirty: true });
                steps.push(`  • External Walls: ${wallsStr}`);
              }
            }
          }
        } catch (err: any) {
          console.error('Error analyzing cover photo:', err);
          steps.push(`  ⚠ Cover photo analysis warning: ${err.message || 'Analysis failed'}`);
        }
      } else {
        steps.push('  • Note: No Cover Photo selected in Photos section (Select one to auto-detect building type, roofing, and external walls).');
      }

      // 4. Auto-save if reportId exists
      if (reportId && reportId !== 'temp') {
        try {
          setIsAutoSaving(true);
          const formData = watch();
          await apiRepository.updateValuationReport(String(reportId), formData as any);
          steps.push('✓ Changes saved');
        } catch (error) {
          steps.push('⚠ Auto-save failed');
        } finally {
          setIsAutoSaving(false);
        }
      }

      alert(steps.join('\n'));
    } catch (err: any) {
      console.error('Automation error:', err);
      alert(`Automation failed: ${err.message || 'Unknown error'}`);
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
