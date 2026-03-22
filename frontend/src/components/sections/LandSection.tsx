import React from 'react';
import { FormField, Input, Textarea } from '../ui/FormField';
import { SectionProps } from '@/types/property-valuation';

export const LandSection: React.FC<SectionProps> = ({
  register,
  errors
}) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Land Details</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Property Identification"
          error={(errors as any).land?.propertyIdentification?.message}
        >
          <Input
            {...(register as any)('land.propertyIdentification')}
            placeholder="Enter property identification details"
            error={(errors as any).land?.propertyIdentification?.message}
          />
        </FormField>

        <FormField
          label="Zoning Effect"
          error={(errors as any).land?.zoningEffect?.message}
        >
          <Input
            {...(register as any)('land.zoningEffect')}
            placeholder="Enter zoning effect details"
            error={(errors as any).land?.zoningEffect?.message}
          />
        </FormField>
      </div>

      <div className="space-y-6">
        <FormField
          label="Location"
          error={(errors as any).land?.location?.message}
        >
          <Textarea
            {...(register as any)('land.location')}
            placeholder="Enter location description"
            error={(errors as any).land?.location?.message}
            rows={3}
          />
        </FormField>

        <FormField
          label="Neighbourhood"
          error={(errors as any).land?.neighbourhood?.message}
        >
          <Textarea
            {...(register as any)('land.neighbourhood')}
            placeholder="Enter neighbourhood description"
            error={(errors as any).land?.neighbourhood?.message}
            rows={3}
          />
        </FormField>

        <FormField
          label="Site Description & Access"
          error={(errors as any).land?.siteDescriptionAccess?.message}
        >
          <Textarea
            {...(register as any)('land.siteDescriptionAccess')}
            placeholder="Enter site description and access details"
            error={(errors as any).land?.siteDescriptionAccess?.message}
            rows={4}
          />
        </FormField>

        <FormField
          label="Services"
          error={(errors as any).land?.services?.message}
        >
          <Textarea
            {...(register as any)('land.services')}
            placeholder="Enter services available to the property"
            error={(errors as any).land?.services?.message}
            rows={3}
          />
        </FormField>
      </div>
    </div>
  );
};
