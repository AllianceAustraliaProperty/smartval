import React from 'react';
import { SectionProps } from '@/types/property-valuation';
import { PropertyAddressSection } from './PropertyAddressSection';
import { PrimaryContactSection } from './PrimaryContactSection';

export const AddressAndContactSection: React.FC<SectionProps> = (props) => {
  return (
    <div className="space-y-10">
      <PropertyAddressSection {...props} />
      <PrimaryContactSection {...props} />
    </div>
  );
};


