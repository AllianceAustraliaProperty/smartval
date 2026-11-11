'use client';

import React from 'react';
import { Montserrat } from 'next/font/google';

const montserrat = Montserrat({ subsets: ['latin'] });

export interface StepMeta {
  stepNumber: number;
  title: string;
  description: string;
}

export const STEP_METADATA: Record<string, StepMeta> = {
  propertyAddress: {
    stepNumber: 1,
    title: 'Property Address',
    description: 'Enter and verify property location and client contact details.',
  },
  valuationDetails: {
    stepNumber: 2,
    title: 'Valuation Details',
    description: 'Record valuation dates, purpose, survey type, and market value.',
  },
  propertyDetails: {
    stepNumber: 3,
    title: 'Property Details',
    description: 'Enter title details, zoning, site area, and property classification.',
  },
  locationDetails: {
    stepNumber: 4,
    title: 'Location Details',
    description: 'Record neighborhood characteristics, amenities, and surroundings.',
  },
  propertyDescriptors: {
    stepNumber: 5,
    title: 'Property Descriptors',
    description: 'Document bedrooms, bathrooms, car spaces, materials, and features.',
  },
  ancillaryImprovements: {
    stepNumber: 6,
    title: 'Ancillary Improvements',
    description: 'Record additional site improvements, pools, sheds, and paving.',
  },
  generalComments: {
    stepNumber: 7,
    title: 'General Comments',
    description: 'Record market overview, condition remarks, and property comments.',
  },
  referralDetails: {
    stepNumber: 8,
    title: 'Financial & Referral',
    description: 'Record referral and financial information for this valuation report.',
  },
  comparables: {
    stepNumber: 9,
    title: 'Comparables',
    description: 'Review and manage comparable sales and rental market evidence.',
  },
  photos: {
    stepNumber: 10,
    title: 'Photos',
    description: 'Upload, organize, and annotate property inspection photographs.',
  },
};

export interface ReportCardShellProps {
  currentSection: string;
  fullAddress?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ReportCardShell: React.FC<ReportCardShellProps> = ({
  currentSection,
  fullAddress,
  headerAction,
  children,
  className = '',
}) => {
  const meta: StepMeta = STEP_METADATA[currentSection] || {
    stepNumber: 1,
    title: 'Section Details',
    description: 'Review and update section information for this report.',
  };

  return (
    <div
      className={`
        ${montserrat.className}
        bg-white rounded-[36px] border-2 border-[#E6EFF5] p-8 sm:p-10 md:p-12
        shadow-[0_4px_20px_rgba(0,0,0,0.03)] max-w-[1400px] w-full mx-auto transition-all
        ${className}
      `}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Upper breadcrumb: Property Address */}
          <div className="text-sm sm:text-base font-semibold text-[#64748B] tracking-wide mb-1">
            {fullAddress || '123 Feriola Street Auburn SA 9087'}
          </div>

          {/* Step Heading */}
          <h2 className="text-2xl sm:text-[32px] font-bold text-[#006ABE] tracking-tight mb-1">
            Step {meta.stepNumber} | {meta.title}
          </h2>

          {/* Description */}
          <p className="text-sm sm:text-base text-[#64748B] font-medium mb-6">
            {meta.description}
          </p>
        </div>

        {/* Top-Right Header Action Target Slot */}
        <div id="report-card-header-action" className="shrink-0 flex items-center gap-3 pt-2">
          {headerAction}
        </div>
      </div>

      {/* Clean Divider Line */}
      <div className="h-[1.5px] bg-[#E2E8F0] w-full mb-8" />

      {/* Form Content */}
      <div className="w-full">{children}</div>
    </div>
  );
};
