'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { Montserrat } from 'next/font/google';

const montserrat = Montserrat({ subsets: ['latin'] });

export interface ReportStep {
  id: string;
  title: string;
  stepNumber: number;
}

export const REPORT_STEPS: ReportStep[] = [
  { id: 'propertyAddress', title: 'Property Address', stepNumber: 1 },
  { id: 'valuationDetails', title: 'Valuation Details', stepNumber: 2 },
  { id: 'propertyDetails', title: 'Property Details', stepNumber: 3 },
  { id: 'locationDetails', title: 'Location Details', stepNumber: 4 },
  { id: 'propertyDescriptors', title: 'Property Descriptors', stepNumber: 5 },
  { id: 'ancillaryImprovements', title: 'Ancillary Improvements', stepNumber: 6 },
  { id: 'generalComments', title: 'General Comments', stepNumber: 7 },
  { id: 'referralDetails', title: 'Financial & Referral', stepNumber: 8 },
  { id: 'comparables', title: 'Comparables', stepNumber: 9 },
  { id: 'photos', title: 'Photos', stepNumber: 10 },
];

export interface ReportStepperProps {
  currentSection: string;
  completedSections: Set<string>;
  onStepClick: (sectionId: string) => void;
  className?: string;
}

export const ReportStepper: React.FC<ReportStepperProps> = ({
  currentSection,
  completedSections,
  onStepClick,
  className = '',
}) => {
  const currentIndex = REPORT_STEPS.findIndex((s) => s.id === currentSection);
  const activeIndex = currentIndex !== -1 ? currentIndex : 0;

  return (
    <div
      className={`
        ${montserrat.className}
        w-full overflow-x-auto py-4 px-4 sm:px-8 bg-white select-none
        border-b border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.02)]
        ${className}
      `}
    >
      <div className="w-full max-w-[1140px] min-w-[840px] mx-auto">
        <div className="relative flex items-start justify-between">
          {/* Continuous Connecting Line Behind Nodes */}
          <div
            className="absolute top-[17px] left-[5%] right-[5%] h-[3px] -translate-y-1/2 z-0"
            aria-hidden="true"
          >
            {/* Base grey line */}
            <div className="w-full h-full bg-[#CBD5E1] rounded-full" />

            {/* Green progress line covering completed steps */}
            <div
              className="absolute top-0 left-0 h-full bg-[#00B050] transition-all duration-300 rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  (activeIndex / (REPORT_STEPS.length - 1)) * 100
                )}%`,
              }}
            />
          </div>

          {/* Stepper Nodes & Labels */}
          {REPORT_STEPS.map((step, idx) => {
            const isActive = step.id === currentSection;
            const isCompleted = completedSections.has(step.id);
            const isPast = idx < activeIndex;

            // Determine circle styling
            let circleBg = 'bg-[#94A3B8] text-white';
            let labelColor = 'text-[#94A3B8] font-medium';

            if (isCompleted || isPast) {
              circleBg = 'bg-[#00B050] text-white shadow-xs';
              labelColor = 'text-[#00B050] font-semibold';
            }

            if (isActive) {
              circleBg = 'bg-[#006ABE] text-white ring-4 ring-[#006ABE]/20 shadow-md scale-105';
              labelColor = 'text-[#006ABE] font-bold';
            }

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onStepClick(step.id)}
                className="group relative z-10 flex flex-col items-center flex-1 focus:outline-none cursor-pointer"
              >
                {/* Step Circle Node */}
                <div
                  className={`
                    w-[34px] h-[34px] rounded-full flex items-center justify-center
                    transition-all duration-200 group-hover:scale-110
                    ${circleBg}
                  `}
                >
                  {isCompleted || (isPast && !isActive) ? (
                    <Check className="w-4 h-4 text-white" strokeWidth={2.75} />
                  ) : isActive ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-white/70" />
                  )}
                </div>

                {/* Step Label */}
                <span
                  className={`
                    mt-2 text-[11.5px] sm:text-[12px] leading-tight text-center max-w-[85px] sm:max-w-[95px]
                    transition-colors duration-200
                    ${labelColor}
                  `}
                >
                  {step.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
