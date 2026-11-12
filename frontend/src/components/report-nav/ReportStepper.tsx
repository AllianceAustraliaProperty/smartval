'use client';

import React, { useState, useEffect } from 'react';
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

const StepperContent: React.FC<{
  currentSection: string;
  completedSections: Set<string>;
  onStepClick: (sectionId: string) => void;
}> = ({ currentSection, completedSections, onStepClick }) => {
  return (
    <div className="w-full max-w-[1140px] min-w-[840px] mx-auto">
      <div className="relative flex items-start justify-between">
        {/* Continuous Connecting Base Line Behind Nodes */}
        <div
          className="absolute top-[17px] left-[5%] right-[5%] h-[3px] -translate-y-1/2 z-0"
          aria-hidden="true"
        >
          {/* Base grey line */}
          <div className="w-full h-full bg-[#CBD5E1] rounded-full" />
        </div>

        {/* Progress segments between steps */}
        {REPORT_STEPS.slice(0, -1).map((step, idx) => {
          const nextStep = REPORT_STEPS[idx + 1];
          const isCurrentComplete = completedSections.has(step.id);
          const isNextComplete = completedSections.has(nextStep.id);
          const isNextActive = currentSection === nextStep.id;

          // Segment progression color:
          // 1. Both completed: Green (#00B050)
          // 2. Active incomplete step switched to after a completed step: Blue (#006ABE)
          // 3. Any step not switched to or previous step is incomplete: Gray (base line #CBD5E1)
          let segmentColor: string | null = null;
          if (isCurrentComplete && isNextComplete) {
            segmentColor = 'bg-[#00B050]';
          } else if (isCurrentComplete && isNextActive && !isNextComplete) {
            segmentColor = 'bg-[#006ABE]';
          }

          if (!segmentColor) return null;

          return (
            <div
              key={`segment-${step.id}`}
              className={`absolute top-[17px] -translate-y-1/2 h-[3px] ${segmentColor} transition-all duration-300 z-0`}
              style={{
                left: `${(idx + 0.5) * 10}%`,
                width: '10%',
              }}
              aria-hidden="true"
            />
          );
        })}

        {/* Stepper Nodes & Labels */}
        {REPORT_STEPS.map((step) => {
          const isActive = step.id === currentSection;
          const isCompleted = completedSections.has(step.id);

          // Determine circle styling
          let circleBg = 'bg-[#94A3B8] text-white';
          let labelColor = 'text-[#94A3B8] font-medium';

          if (isCompleted) {
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
                {isCompleted ? (
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
  );
};

export const ReportStepper: React.FC<ReportStepperProps> = ({
  currentSection,
  completedSections,
  onStepClick,
  className = '',
}) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          // Gracefully slide down once the user is scrolled past the inline stepper into the form (> 150px)
          // Retract cleanly when returning near the top (< 90px)
          setIsScrolled((prev) => {
            if (!prev && currentY > 150) return true;
            if (prev && currentY < 90) return false;
            return prev;
          });
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    if (window.scrollY > 150) {
      setIsScrolled(true);
    }
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* 1. Static inline stepper resting naturally at the top of the report below the top nav */}
      <div
        className={`
          ${montserrat.className}
          w-full overflow-x-auto py-4 px-4 sm:px-8 bg-white select-none
          border-b border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.02)]
          ${className}
        `}
      >
        <StepperContent
          currentSection={currentSection}
          completedSections={completedSections}
          onStepClick={onStepClick}
        />
      </div>

      {/* 2. Floating sticky stepper that gracefully drops down from behind the royal blue top nav and stays locked */}
      <div
        className={`
          fixed top-[80px] left-0 right-0 z-30
          ${isScrolled ? 'pointer-events-auto' : 'pointer-events-none'}
        `}
        style={{
          clipPath: 'inset(0px -50px -100px -50px)',
        }}
        aria-hidden={!isScrolled}
      >
        <div
          className={`
            ${montserrat.className}
            w-full overflow-x-auto py-3 px-4 sm:px-8
            bg-white select-none
            border-b border-[#E2E8F0]
            shadow-[0_4px_20px_rgba(0,0,0,0.08)]
            transition-all duration-[380ms]
            ${
              isScrolled
                ? 'translate-y-0 opacity-100 visible pointer-events-auto'
                : '-translate-y-full opacity-0 invisible pointer-events-none'
            }
            ${className}
          `}
          style={{
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <StepperContent
            currentSection={currentSection}
            completedSections={completedSections}
            onStepClick={onStepClick}
          />
        </div>
      </div>
    </>
  );
};
