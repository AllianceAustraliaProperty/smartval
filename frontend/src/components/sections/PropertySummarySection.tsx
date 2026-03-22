import React from 'react';
import { FormField, Input, Select, Checkbox } from '../ui/FormField';
import { SectionProps } from '@/types/property-valuation';

export const PropertySummarySection: React.FC<SectionProps> = ({
  register,
  errors
}) => {
  return (
    <div className="space-y-6">
      {/* Required Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Property Address"
          required
          error={(errors as any).propertySummary?.propertyAddress?.message}
        >
          <Input
            {...(register as any)('propertySummary.propertyAddress', {
              required: 'Property address is required'
            })}
            placeholder="Enter property address"
            error={(errors as any).propertySummary?.propertyAddress?.message}
          />
        </FormField>

        <FormField
          label="Site Area (sqm)"
          required
          error={(errors as any).propertySummary?.siteArea?.message}
        >
          <Input
            type="number"
            step="0.01"
            {...(register as any)('propertySummary.siteArea', {
              required: 'Site area is required',
              valueAsNumber: true
            })}
            placeholder="Enter site area in square meters"
            error={(errors as any).propertySummary?.siteArea?.message}
          />
        </FormField>

        <FormField
          label="Current Use"
          required
          error={(errors as any).propertySummary?.currentUse?.message}
        >
          <Input
            {...(register as any)('propertySummary.currentUse', {
              required: 'Current use is required'
            })}
            placeholder="Enter current use of the property"
            error={(errors as any).propertySummary?.currentUse?.message}
          />
        </FormField>
      </div>

      {/* Optional Property Details */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Property Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Title Search Sighted"
            error={(errors as any).propertySummary?.titleSearchSighted?.message}
          >
            <Input
              {...(register as any)('propertySummary.titleSearchSighted')}
              placeholder="Enter title search details"
              error={(errors as any).propertySummary?.titleSearchSighted?.message}
            />
          </FormField>

          <FormField
            label="Real Property Description"
            error={(errors as any).propertySummary?.realPropertyDescription?.message}
          >
            <Input
              {...(register as any)('propertySummary.realPropertyDescription')}
              placeholder="Enter real property description"
              error={(errors as any).propertySummary?.realPropertyDescription?.message}
            />
          </FormField>

          <FormField
            label="Encumbrances & Restrictions"
            error={(errors as any).propertySummary?.encumbrancesRestrictions?.message}
          >
            <Input
              {...(register as any)('propertySummary.encumbrancesRestrictions')}
              placeholder="Enter encumbrances and restrictions"
              error={(errors as any).propertySummary?.encumbrancesRestrictions?.message}
            />
          </FormField>

          <FormField
            label="Site Dimensions"
            error={(errors as any).propertySummary?.siteDimensions?.message}
          >
            <Input
              {...(register as any)('propertySummary.siteDimensions')}
              placeholder="Enter site dimensions"
              error={(errors as any).propertySummary?.siteDimensions?.message}
            />
          </FormField>

          <FormField
            label="Zoning"
            error={(errors as any).propertySummary?.zoning?.message}
          >
            <Input
              {...(register as any)('propertySummary.zoning')}
              placeholder="Enter zoning information"
              error={(errors as any).propertySummary?.zoning?.message}
            />
          </FormField>

          <FormField
            label="Local Government Area (LGA)"
            error={(errors as any).propertySummary?.lga?.message}
          >
            <Input
              {...(register as any)('propertySummary.lga')}
              placeholder="Enter LGA"
              error={(errors as any).propertySummary?.lga?.message}
            />
          </FormField>

          <FormField
            label="Main Dwelling"
            error={(errors as any).propertySummary?.mainDwelling?.message}
          >
            <Input
              {...(register as any)('propertySummary.mainDwelling')}
              placeholder="Enter main dwelling description"
              error={(errors as any).propertySummary?.mainDwelling?.message}
            />
          </FormField>

          <FormField
            label="Built About"
            error={(errors as any).propertySummary?.builtAbout?.message}
          >
            <Input
              {...(register as any)('propertySummary.builtAbout')}
              placeholder="Enter construction period"
              error={(errors as any).propertySummary?.builtAbout?.message}
            />
          </FormField>

          <FormField
            label="Car Accommodation"
            error={(errors as any).propertySummary?.carAccommodation?.message}
          >
            <Input
              {...(register as any)('propertySummary.carAccommodation')}
              placeholder="Enter car accommodation details"
              error={(errors as any).propertySummary?.carAccommodation?.message}
            />
          </FormField>

          <FormField
            label="Additions"
            error={(errors as any).propertySummary?.additions?.message}
          >
            <Input
              {...(register as any)('propertySummary.additions')}
              placeholder="Enter additions details"
              error={(errors as any).propertySummary?.additions?.message}
            />
          </FormField>
        </div>
      </div>

      {/* Areas Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Property Areas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Living Area (sqm)"
            error={(errors as any).propertySummary?.areas?.living?.message}
          >
            <Input
              type="number"
              step="0.01"
              {...(register as any)('propertySummary.areas.living', {
                valueAsNumber: true
              })}
              placeholder="Enter living area"
              error={(errors as any).propertySummary?.areas?.living?.message}
            />
          </FormField>

          <FormField
            label="Outdoor Area (sqm)"
            error={(errors as any).propertySummary?.areas?.outdoor?.message}
          >
            <Input
              type="number"
              step="0.01"
              {...(register as any)('propertySummary.areas.outdoor', {
                valueAsNumber: true
              })}
              placeholder="Enter outdoor area"
              error={(errors as any).propertySummary?.areas?.outdoor?.message}
            />
          </FormField>

          <FormField
            label="Car Areas (sqm)"
            error={(errors as any).propertySummary?.areas?.carAreas?.message}
          >
            <Input
              type="number"
              step="0.01"
              {...(register as any)('propertySummary.areas.carAreas', {
                valueAsNumber: true
              })}
              placeholder="Enter car areas"
              error={(errors as any).propertySummary?.areas?.carAreas?.message}
            />
          </FormField>

          <FormField
            label="Other Areas (sqm)"
            error={(errors as any).propertySummary?.areas?.other?.message}
          >
            <Input
              type="number"
              step="0.01"
              {...(register as any)('propertySummary.areas.other', {
                valueAsNumber: true
              })}
              placeholder="Enter other areas"
              error={(errors as any).propertySummary?.areas?.other?.message}
            />
          </FormField>
        </div>
      </div>

      {/* Issues and Assessments */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Issues and Assessments</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Heritage Issues"
            error={(errors as any).propertySummary?.heritageIssues?.message}
          >
            <Input
              {...(register as any)('propertySummary.heritageIssues')}
              placeholder="Enter heritage issues"
              error={(errors as any).propertySummary?.heritageIssues?.message}
            />
          </FormField>

          <FormField
            label="Marketability"
            error={(errors as any).propertySummary?.marketability?.message}
          >
            <Input
              {...(register as any)('propertySummary.marketability')}
              placeholder="Enter marketability assessment"
              error={(errors as any).propertySummary?.marketability?.message}
            />
          </FormField>

          <FormField
            label="Environmental Issues"
            error={(errors as any).propertySummary?.environmentalIssues?.message}
          >
            <Input
              {...(register as any)('propertySummary.environmentalIssues')}
              placeholder="Enter environmental issues"
              error={(errors as any).propertySummary?.environmentalIssues?.message}
            />
          </FormField>

          <FormField
            label="Essential Repairs"
            error={(errors as any).propertySummary?.essentialRepairs?.message}
          >
            <Input
              {...(register as any)('propertySummary.essentialRepairs')}
              placeholder="Enter essential repairs"
              error={(errors as any).propertySummary?.essentialRepairs?.message}
            />
          </FormField>

          <FormField
            label="Estimated Cost"
            error={(errors as any).propertySummary?.estimatedCost?.message}
          >
            <Input
              {...(register as any)('propertySummary.estimatedCost')}
              placeholder="Enter estimated cost"
              error={(errors as any).propertySummary?.estimatedCost?.message}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};
