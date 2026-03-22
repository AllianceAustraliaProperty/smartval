import React from 'react';
import { FormField, Textarea, Checkbox, Input, Select } from '../ui/FormField';
import { SectionProps } from '@/types/property-valuation';
import { DRIVEWAY_TYPES, FENCING_TYPES } from '@/constants/ancillary-types';

export const AncillaryImprovementsSection: React.FC<SectionProps> = ({ register, errors, watch }) => {
  const otherItems = watch('ancillaryImprovements.otherItems') ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Ancillary Improvements</h2>
        <p className="text-gray-600">Document improvements that are not part of the main dwelling.</p>
      </div>

      <FormField
        label="Include Ancillary Improvements Section"
        error={errors.ancillaryImprovements?.showSection?.message}
      >
        <Checkbox
          {...register('ancillaryImprovements.showSection')}
          label="Display the ancillary improvements section in the valuation report"
        />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Driveway"
          error={errors.ancillaryImprovements?.driveway?.message}
        >
          <Select
            {...register('ancillaryImprovements.driveway')}
            options={DRIVEWAY_TYPES.map(type => ({ value: type, label: type }))}
            error={errors.ancillaryImprovements?.driveway?.message}
          />
        </FormField>

        <FormField
          label="Fencing"
          error={errors.ancillaryImprovements?.fencing?.message}
        >
          <Select
            {...register('ancillaryImprovements.fencing')}
            options={FENCING_TYPES.map(type => ({ value: type, label: type }))}
            error={errors.ancillaryImprovements?.fencing?.message}
          />
        </FormField>
      </div>

      <FormField
        label="Accommodation"
        error={(errors as any).ancillaryImprovements?.accommodation?.message}
      >
        <Textarea
          {...register('ancillaryImprovements.accommodation')}
          placeholder="Describe accommodation details for Other Improvements"
          rows={3}
          error={(errors as any).ancillaryImprovements?.accommodation?.message}
        />
      </FormField>

      <FormField
        label="Other Items (one per line)"
        error={errors.ancillaryImprovements?.otherItems?.message as string}
      >
        <Textarea
          {...register('ancillaryImprovements.otherItemsText' as const)}
          placeholder={"Pergola (timber, good condition)\nIn-ground pool with paved surrounds\nGarden shed (metal, average condition)"}
          rows={6}
        />
        <p className="text-xs text-gray-500 mt-2">
          Each line will be saved as a separate ancillary improvement item.
        </p>
      </FormField>

      {Array.isArray(otherItems) && otherItems.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Current Ancillary Items</h3>
          <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
            {otherItems.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};