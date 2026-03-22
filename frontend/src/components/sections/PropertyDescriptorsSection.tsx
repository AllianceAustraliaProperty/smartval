import React, { useMemo } from 'react';
import { FormField, Input, Select, Textarea, Checkbox } from '../ui/FormField';
import { CONDITION_OPTIONS, SectionProps } from '@/types/property-valuation';
import { ROOFING_TYPES } from '@/constants/roofing-types';
import { INTERNAL_WALLS, EXTERNAL_WALLS } from '@/constants/wall-types';
import { PARKING_TYPES } from '@/constants/parking-types';
import { ResidentialMainBuildingTypes, CommercialMainBuildingTypes, AllMainBuildingTypes } from '@/constants/main-building-types';
import { ResidentialPropertyTypes, CommercialPropertyTypes } from '@/constants/property-types';

export const PropertyDescriptorsSection: React.FC<SectionProps> = ({ register, errors, watch }) => {
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Property Descriptors</h2>
        <p className="text-gray-600">Record the internal layout, construction materials, and condition of the improvements.</p>
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
          <Select
            {...register('propertyDescriptors.externalWalls')}
            options={EXTERNAL_WALLS.map(type => ({ value: type, label: type }))}
            error={errors.propertyDescriptors?.externalWalls?.message}
          />
        </FormField>

        <FormField
          label="Internal Walls"
          error={errors.propertyDescriptors?.internalWalls?.message}
        >
          <Select
            {...register('propertyDescriptors.internalWalls')}
            options={INTERNAL_WALLS.map(type => ({ value: type, label: type }))}
            error={errors.propertyDescriptors?.internalWalls?.message}
          />
        </FormField>

        <FormField
          label="Parking Type"
          error={errors.propertyDescriptors?.parkingType?.message}
        >
          <Select
            {...register('propertyDescriptors.parkingType')}
            options={PARKING_TYPES.map(type => ({ value: type, label: type }))}
            error={errors.propertyDescriptors?.parkingType?.message}
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
            <FormField label="Main Building Type">
              <Select
                {...register('propertyDescriptors.grannyFlat.mainBuildingType')}
                options={availableBuildingTypes.map(type => ({ value: type, label: type }))}
              />
            </FormField>
            <FormField label="Roofing Type">
              <Select
                {...register('propertyDescriptors.grannyFlat.roofingType')}
                options={ROOFING_TYPES.map(type => ({ value: type, label: type }))}
              />
            </FormField>
            <FormField label="External Walls">
              <Select
                {...register('propertyDescriptors.grannyFlat.externalWalls')}
                options={EXTERNAL_WALLS.map(type => ({ value: type, label: type }))}
              />
            </FormField>
            <FormField label="Internal Walls">
              <Select
                {...register('propertyDescriptors.grannyFlat.internalWalls')}
                options={INTERNAL_WALLS.map(type => ({ value: type, label: type }))}
              />
            </FormField>
            <FormField label="Parking Type">
              <Select
                {...register('propertyDescriptors.grannyFlat.parkingType')}
                options={PARKING_TYPES.map(type => ({ value: type, label: type }))}
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
