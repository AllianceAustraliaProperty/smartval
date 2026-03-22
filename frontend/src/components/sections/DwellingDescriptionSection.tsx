import React from 'react';
import { FormField, Input, Textarea } from '../ui/FormField';
import { SectionProps } from '@/types/property-valuation';

export const DwellingDescriptionSection: React.FC<SectionProps> = ({
  register,
  errors
}) => {
  return (
    <div className="space-y-8">
      {/* Basic Dwelling Information */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Dwelling Description</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Style"
            error={(errors as any).valuationReport?.propertyDetails?.dwellingDescription?.style?.message}
          >
            <Input
              {...(register as any)('propertyDetails.dwellingDescription.style')}
              placeholder="Enter dwelling style"
              error={(errors as any).valuationReport?.propertyDetails?.dwellingDescription?.style?.message}
            />
          </FormField>

          <FormField
            label="Street Appeal"
            error={(errors as any).valuationReport?.propertyDetails?.dwellingDescription?.streetAppeal?.message}
          >
            <Input
              {...(register as any)('propertyDetails.dwellingDescription.streetAppeal')}
              placeholder="Enter street appeal description"
              error={(errors as any).valuationReport?.propertyDetails?.dwellingDescription?.streetAppeal?.message}
            />
          </FormField>
        </div>
      </div>

      {/* Construction Details */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Construction Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Main Walls & Roof"
            error={(errors as any).valuationReport?.propertyDetails?.dwellingDescription?.mainWallsRoof?.message}
          >
            <Input
              {...(register as any)('propertyDetails.dwellingDescription.mainWallsRoof')}
              placeholder="Enter main walls and roof construction"
              error={(errors as any).valuationReport?.propertyDetails?.dwellingDescription?.mainWallsRoof?.message}
            />
          </FormField>

          <FormField
            label="Main Interior Lining"
            error={(errors as any).valuationReport?.propertyDetails?.dwellingDescription?.mainInteriorLining?.message}
          >
            <Input
              {...(register as any)('propertyDetails.dwellingDescription.mainInteriorLining')}
              placeholder="Enter main interior lining"
              error={(errors as any).valuationReport?.propertyDetails?.dwellingDescription?.mainInteriorLining?.message}
            />
          </FormField>

          <FormField
            label="Flooring"
            error={(errors as any).valuationReport?.propertyDetails?.dwellingDescription?.flooring?.message}
          >
            <Input
              {...(register as any)('propertyDetails.dwellingDescription.flooring')}
              placeholder="Enter flooring details"
              error={(errors as any).valuationReport?.propertyDetails?.dwellingDescription?.flooring?.message}
            />
          </FormField>

          <FormField
            label="Window Frames"
            error={(errors as any).valuationReport?.propertyDetails?.dwellingDescription?.windowFrames?.message}
          >
            <Input
              {...(register as any)('propertyDetails.dwellingDescription.windowFrames')}
              placeholder="Enter window frame details"
              error={(errors as any).valuationReport?.propertyDetails?.dwellingDescription?.windowFrames?.message}
            />
          </FormField>
        </div>
      </div>

      {/* Accommodation & Layout */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Accommodation & Layout</h3>
        <div className="grid grid-cols-1 gap-6">
          <FormField
            label="Accommodation"
            error={(errors as any).valuationReport?.propertyDetails?.dwellingDescription?.accommodation?.message}
          >
            <Textarea
              {...(register as any)('propertyDetails.dwellingDescription.accommodation')}
              placeholder="Enter accommodation details (bedrooms, bathrooms, etc.)"
              error={(errors as any).valuationReport?.propertyDetails?.dwellingDescription?.accommodation?.message}
              rows={3}
            />
          </FormField>

          <FormField
            label="Interior Layout"
            error={(errors as any).valuationReport?.propertyDetails?.dwellingDescription?.interiorLayout?.message}
          >
            <Textarea
              {...(register as any)('propertyDetails.dwellingDescription.interiorLayout')}
              placeholder="Enter interior layout description"
              error={(errors as any).valuationReport?.propertyDetails?.dwellingDescription?.interiorLayout?.message}
              rows={3}
            />
          </FormField>
        </div>
      </div>

      {/* Fixtures & Fittings */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Fixtures & Fittings</h3>
        <div className="grid grid-cols-1 gap-6">
          <FormField
            label="Fixtures & Fittings"
            error={(errors as any).valuationReport?.propertyDetails?.dwellingDescription?.fixturesFittings?.message}
          >
            <Textarea
              {...(register as any)('propertyDetails.dwellingDescription.fixturesFittings')}
              placeholder="Enter fixtures and fittings details"
              error={(errors as any).valuationReport?.propertyDetails?.dwellingDescription?.fixturesFittings?.message}
              rows={3}
            />
          </FormField>

          <FormField
            label="Extras"
            error={(errors as any).valuationReport?.propertyDetails?.dwellingDescription?.extras?.message}
          >
            <Textarea
              {...(register as any)('propertyDetails.dwellingDescription.extras')}
              placeholder="Enter any additional features or extras"
              error={(errors as any).valuationReport?.propertyDetails?.dwellingDescription?.extras?.message}
              rows={3}
            />
          </FormField>
        </div>
      </div>

      {/* Condition Assessment */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Condition Assessment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Internal Condition"
            error={(errors as any).valuationReport?.propertyDetails?.dwellingDescription?.internalCondition?.message}
          >
            <Input
              {...(register as any)('propertyDetails.dwellingDescription.internalCondition')}
              placeholder="Enter internal condition assessment"
              error={(errors as any).valuationReport?.propertyDetails?.dwellingDescription?.internalCondition?.message}
            />
          </FormField>

          <FormField
            label="External Condition"
            error={(errors as any).valuationReport?.propertyDetails?.dwellingDescription?.externalCondition?.message}
          >
            <Input
              {...(register as any)('propertyDetails.dwellingDescription.externalCondition')}
              placeholder="Enter external condition assessment"
              error={(errors as any).valuationReport?.propertyDetails?.dwellingDescription?.externalCondition?.message}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};
