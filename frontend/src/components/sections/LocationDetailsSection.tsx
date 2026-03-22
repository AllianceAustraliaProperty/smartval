import React, { useState } from 'react';
import { FormField, Textarea, Checkbox, Input, Select } from '../ui/FormField';
import { SectionProps } from '@/types/property-valuation';
import { Wand2 } from 'lucide-react';
import { autofillLocationDetailsFromGoogle, buildFullAddress, geocodeAddress } from '@/utils/locationUtils';
import { getWikiSuburbDescription } from '@/utils/wikiUtils';
import { GoogleMapDisplay } from '../GoogleMap';
import { apiRepository } from '@/lib/api-repository';

const LocationItem: React.FC<{
  title: string;
  basePath: string;
  register: any;
  errors: any;
  showType?: boolean;
}> = ({ title, basePath, register, errors, showType = false }) => {
  const unitOptions = [
    { value: 'km', label: 'Kilometers' },
    { value: 'm', label: 'Meters' },
    { value: 'miles', label: 'Miles' },
    { value: 'feet', label: 'Feet' }
  ];

  // Safely get nested error messages
  const getNestedError = (path: string) => {
    const pathParts = path.split('.');
    let current = errors;
    for (const part of pathParts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    return current?.message;
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
      <h4 className="font-semibold text-gray-900">{title}</h4>
      <div className={`grid grid-cols-1 md:grid-cols-${showType ? '4' : '3'} gap-4`}>
        <FormField
          label="Name"
          error={getNestedError(`${basePath}.name`)}
        >
          <Input
            {...register(`${basePath}.name`)}
            placeholder="e.g., Central Station"
            error={getNestedError(`${basePath}.name`)}
          />
        </FormField>

        <FormField
          label="Distance"
          error={getNestedError(`${basePath}.distance`)}
        >
          <Input
            type="number"
            step="0.01"
            {...register(`${basePath}.distance`, { valueAsNumber: true })}
            placeholder="e.g., 1.5"
            error={getNestedError(`${basePath}.distance`)}
          />
        </FormField>

        <FormField
          label="Unit"
          error={getNestedError(`${basePath}.unit`)}
        >
          <Select
            {...register(`${basePath}.unit`)}
            options={unitOptions}
            error={getNestedError(`${basePath}.unit`)}
          />
        </FormField>

        {showType && (
          <FormField
            label="Type"
            error={getNestedError(`${basePath}.type`)}
          >
            <Input
              {...register(`${basePath}.type`)}
              placeholder="e.g., train station"
              error={getNestedError(`${basePath}.type`)}
            />
          </FormField>
        )}
      </div>
    </div>
  );
};

export const LocationDetailsSection: React.FC<SectionProps> = ({ register, errors, watch, setValue, reportId }) => {
  const [isAutomating, setIsAutomating] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [showMap, setShowMap] = useState(true);
  
  const handleAutoFillEverything = async () => {
    // Check if there's existing data and show warning
    const hasExistingData = !!(
      watch('locationDetails.latitude') || 
      watch('locationDetails.nearestTransportation.name') ||
      watch('locationDetails.nearestShop.name') ||
      watch('locationDetails.suburbDescription')
    );
    
    if (hasExistingData) {
      const confirmed = window.confirm(
        '⚠️ WARNING: This will overwrite existing location data including:\n\n' +
        '- Coordinates\n' +
        '- Nearest locations (transport, shops, schools)\n' +
        '- Suburb description\n\n' +
        'Do you want to continue?'
      );
      
      if (!confirmed) {
        return;
      }
    }
    
    const address = watch('address');
    const suburb = watch('address.suburb');
    const state = watch('address.state');
    const fullAddress = buildFullAddress(address as any);
    
    if (!fullAddress) {
      alert('Please enter the property address first.');
      return;
    }
    
    setIsAutomating(true);
    const steps = [];
    let nearestLocations: any = {};
    
    try {
      // Step 1: Coordinates - ALWAYS fetch
      steps.push('Fetching coordinates...');
      try {
        const geo = await geocodeAddress(fullAddress);
        const best = geo.results?.[0];
        
        if (best) {
          const lat = best.geometry.location.lat;
          const lng = best.geometry.location.lng;
          setValue('locationDetails.latitude', String(lat), { shouldDirty: true });
          setValue('locationDetails.longitude', String(lng), { shouldDirty: true });
          steps.push('✓ Coordinates retrieved');
        }
      } catch (error) {
        console.error('Error fetching coordinates:', error);
        steps.push('⚠ Coordinates failed');
      }
      
      // Step 2: Nearest Locations - ALWAYS fetch
      steps.push('Fetching nearest locations...');
      try {
        const result = await autofillLocationDetailsFromGoogle(fullAddress, state);
        nearestLocations = result;
        
        if (result.nearestTransportation) {
          setValue('locationDetails.nearestTransportation.name', result.nearestTransportation.name, { shouldDirty: true });
          setValue('locationDetails.nearestTransportation.distance', result.nearestTransportation.distance, { shouldDirty: true });
          setValue('locationDetails.nearestTransportation.unit', result.nearestTransportation.unit, { shouldDirty: true });
          setValue('locationDetails.nearestTransportation.type', result.nearestTransportation.type, { shouldDirty: true });
        }
        if (result.nearestShop) {
          setValue('locationDetails.nearestShop.name', result.nearestShop.name, { shouldDirty: true });
          setValue('locationDetails.nearestShop.distance', result.nearestShop.distance, { shouldDirty: true });
          setValue('locationDetails.nearestShop.unit', result.nearestShop.unit, { shouldDirty: true });
          setValue('locationDetails.nearestShop.type', result.nearestShop.type, { shouldDirty: true });
        }
        if (result.nearestPrimarySchool) {
          setValue('locationDetails.nearestPrimarySchool.name', result.nearestPrimarySchool.name, { shouldDirty: true });
          setValue('locationDetails.nearestPrimarySchool.distance', result.nearestPrimarySchool.distance, { shouldDirty: true });
          setValue('locationDetails.nearestPrimarySchool.unit', result.nearestPrimarySchool.unit, { shouldDirty: true });
          setValue('locationDetails.nearestPrimarySchool.type', result.nearestPrimarySchool.type, { shouldDirty: true });
        }
        if (result.nearestSecondarySchool) {
          setValue('locationDetails.nearestSecondarySchool.name', result.nearestSecondarySchool.name, { shouldDirty: true });
          setValue('locationDetails.nearestSecondarySchool.distance', result.nearestSecondarySchool.distance, { shouldDirty: true });
          setValue('locationDetails.nearestSecondarySchool.unit', result.nearestSecondarySchool.unit, { shouldDirty: true });
          setValue('locationDetails.nearestSecondarySchool.type', result.nearestSecondarySchool.type, { shouldDirty: true });
        }
        if (result.nearestCBD) {
          setValue('locationDetails.nearestCBD.name', result.nearestCBD.name, { shouldDirty: true });
          setValue('locationDetails.nearestCBD.distance', result.nearestCBD.distance, { shouldDirty: true });
          setValue('locationDetails.nearestCBD.unit', result.nearestCBD.unit, { shouldDirty: true });
        }
        if (result.nearestConnectingStreet) {
          setValue('locationDetails.nearestConnectingStreet.name', result.nearestConnectingStreet.name, { shouldDirty: true });
          setValue('locationDetails.nearestConnectingStreet.distance', result.nearestConnectingStreet.distance, { shouldDirty: true });
          setValue('locationDetails.nearestConnectingStreet.unit', result.nearestConnectingStreet.unit, { shouldDirty: true });
          setValue('locationDetails.nearestConnectingStreet.type', result.nearestConnectingStreet.type, { shouldDirty: true });
        }
        steps.push('✓ Nearest locations added');
      } catch (error) {
        console.error('Error fetching nearest locations:', error);
        steps.push('⚠ Nearest locations failed');
      }
      
      // Step 3: Suburb Description - ALWAYS fetch
      if (suburb && state) {
        steps.push('Fetching suburb description...');
        try {
          let description = await getWikiSuburbDescription(suburb, state);
          if (description) {
            // Add a paragraph about nearest locations
            const transportType = nearestLocations.nearestTransportation?.type?.toLowerCase();
            const transportDistance = nearestLocations.nearestTransportation?.distance || 'N/A';
            const transportUnit = nearestLocations.nearestTransportation?.unit || 'N/A';
            
            const shopType = nearestLocations.nearestShop?.type?.toLowerCase();
            const shopDistance = nearestLocations.nearestShop?.distance || 'N/A';
            const shopUnit = nearestLocations.nearestShop?.unit || 'N/A';
            
            const primarySchool = nearestLocations.nearestPrimarySchool?.name || 'N/A';
            const primaryDistance = nearestLocations.nearestPrimarySchool?.distance || 'N/A';
            const primaryUnit = nearestLocations.nearestPrimarySchool?.unit || 'N/A';
            
            const secondarySchool = nearestLocations.nearestSecondarySchool?.name || 'N/A';
            const secondaryDistance = nearestLocations.nearestSecondarySchool?.distance || 'N/A';
            const secondaryUnit = nearestLocations.nearestSecondarySchool?.unit || 'N/A';
            
            const cbdName = nearestLocations.nearestCBD?.name?.replace('CBD', '').trim() || 'N/A';
            const cbdDistance = nearestLocations.nearestCBD?.distance || 'N/A';
            const cbdUnit = nearestLocations.nearestCBD?.unit || 'N/A';
            
            const additionalParagraph = `\n\nThe nearest ${transportType} is ${transportDistance} ${transportUnit} away. The nearest ${shopType} is available ${shopDistance} ${shopUnit} away from the subject property. The nearest schools, ${primarySchool} and ${secondarySchool}, are ${primaryDistance} ${primaryUnit} and ${secondaryDistance} ${secondaryUnit} away respectively from the property. Road transport to the ${cbdName} CBD by car covers approximately ${cbdDistance} ${cbdUnit}.\n\nThe subject property is located in a well-established residential neighbourhood, comprising predominantly dwellings of varying age and style of complementary nature. The property is situated within close distance to local shops, schools, parks and public transport.`;
            
            description += additionalParagraph;
            setValue('locationDetails.suburbDescription', description, { shouldDirty: true });
            steps.push('✓ Suburb description added');
          }
        } catch (error) {
          console.error('Error fetching suburb description:', error);
          steps.push('⚠ Suburb description failed');
        }
      }
      // After populating values, auto-save the full form
      if (reportId) {
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
    } finally {
      setIsAutomating(false);
    }
  };
  
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Location Details</h2>
          <p className="text-gray-600">Describe the broader location attributes and utilities available to the property.</p>
        </div>
        <button
          type="button"
          onClick={handleAutoFillEverything}
          disabled={isAutomating || isAutoSaving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          title="Automate all location details"
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

      <FormField
        label="Suburb Description"
        error={errors.locationDetails?.suburbDescription?.message as string}
      >
        <Textarea
          {...register('locationDetails.suburbDescription')}
          placeholder="Summarise the suburb, proximity to amenities, demographics, etc."
          rows={4}
          error={errors.locationDetails?.suburbDescription?.message as string}
        />
      </FormField>

      <FormField
        label="Site Description"
        error={errors.locationDetails?.siteDescription?.message as string}
      >
        <Textarea
          {...register('locationDetails.siteDescription')}
          placeholder="Describe the site characteristics, shape, topography, etc."
          rows={3}
          error={errors.locationDetails?.siteDescription?.message as string}
        />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Access"
          error={errors.locationDetails?.access?.message as string}
        >
          <Input
            {...register('locationDetails.access')}
            placeholder="e.g., Via main road frontage"
            error={errors.locationDetails?.access?.message as string}
          />
        </FormField>

        <FormField
          label="Identification"
          error={errors.locationDetails?.identification?.message as string}
        >
          <Input
            {...register('locationDetails.identification')}
            placeholder="e.g., Street number/signage"
            error={errors.locationDetails?.identification?.message as string}
          />
        </FormField>
      </div>

      <FormField
        label="Services"
        error={(errors as any).locationDetails?.services?.message}
      >
        <Input
          {...register('locationDetails.services')}
          placeholder="e.g., Town water, electricity, sewerage"
          error={(errors as any).locationDetails?.services?.message}
        />
      </FormField>

      <FormField
        label="Includes Gas Supply"
        error={errors.locationDetails?.includesGas?.message as string}
      >
        <Checkbox
          {...register('locationDetails.includesGas')}
          label="Gas services are available to the property"
        />
      </FormField>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Map Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Map Photo URL"
            error={errors.locationDetails?.map?.photo?.message as string}
          >
            <Input
              {...register('locationDetails.map.photo')}
              placeholder="https://maps.google.com/..."
              error={errors.locationDetails?.map?.photo?.message as string}
            />
          </FormField>

          <FormField
            label="Map Source"
            error={errors.locationDetails?.map?.source?.message as string}
          >
            <Input
              {...register('locationDetails.map.source')}
              placeholder="e.g., Google Maps, Bing Maps, etc."
              error={errors.locationDetails?.map?.source?.message as string}
            />
          </FormField>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormField
          label="Latitude"
          error={errors.locationDetails?.latitude?.message as string}
        >
          <Input
            {...register('locationDetails.latitude')}
            placeholder="-33.8688"
            error={errors.locationDetails?.latitude?.message as string}
          />
        </FormField>

        <FormField
          label="Longitude"
          error={errors.locationDetails?.longitude?.message as string}
        >
          <Input
            {...register('locationDetails.longitude')}
            placeholder="151.2093"
            error={errors.locationDetails?.longitude?.message as string}
          />
        </FormField>

        <FormField
          label="Situated Street"
          error={errors.locationDetails?.situatedStreet?.message as string}
        >
          <Select
            {...register('locationDetails.situatedStreet')}
            options={[
              { value: 'Northern', label: 'Northern' },
              { value: 'North Western', label: 'North Western' },
              { value: 'Western', label: 'Western' },
              { value: 'South Western', label: 'South Western' },
              { value: 'Southern', label: 'Southern' },
              { value: 'South Eastern', label: 'South Eastern' },
              { value: 'Eastern', label: 'Eastern' },
              { value: 'North Eastern', label: 'North Eastern' }
            ]}
            error={errors.locationDetails?.situatedStreet?.message as string}
          />
        </FormField>
      </div>

      {/* Google Map Display */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Map Preview</h3>
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {showMap ? 'Hide Map' : 'Show Map'}
          </button>
        </div>
        {showMap && (
          <div className="w-full">
            <GoogleMapDisplay
              latitude={watch('locationDetails.latitude')}
              longitude={watch('locationDetails.longitude')}
              address={watch('address.fullAddress')}
            />
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Nearest Locations</h3>
          <p className="text-sm text-gray-600 mb-6">Record the nearest amenities and their distances from the property.</p>
        </div>

        <div className="space-y-4">
          <LocationItem
            title="Nearest Transportation"
            basePath="locationDetails.nearestTransportation"
            register={register}
            errors={errors.locationDetails}
            showType={true}
          />

          <LocationItem
            title="Nearest Shop"
            basePath="locationDetails.nearestShop"
            register={register}
            errors={errors.locationDetails}
            showType={true}
          />

          <LocationItem
            title="Nearest Primary School"
            basePath="locationDetails.nearestPrimarySchool"
            register={register}
            errors={errors.locationDetails}
          />

          <LocationItem
            title="Nearest Secondary School"
            basePath="locationDetails.nearestSecondarySchool"
            register={register}
            errors={errors.locationDetails}
          />

          <LocationItem
            title="Nearest CBD"
            basePath="locationDetails.nearestCBD"
            register={register}
            errors={errors.locationDetails}
          />

          <LocationItem
            title="Nearest Connecting Street"
            basePath="locationDetails.nearestConnectingStreet"
            register={register}
            errors={errors.locationDetails}
          />
        </div>
      </div>
    </div>
  );
};
