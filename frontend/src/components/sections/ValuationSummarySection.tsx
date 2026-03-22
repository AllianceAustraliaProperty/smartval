import React from 'react';
import { FormField, Input, CurrencyInput } from '../ui/FormField';
import { SectionProps } from '@/types/property-valuation';

export const ValuationSummarySection: React.FC<SectionProps> = ({
  register,
  errors
}) => {
  return (
    <div className="space-y-8">
      {/* Required Market Value */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Valuation Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Market Value"
            required
            error={(errors as any).valuationSummary?.marketValue?.message}
          >
            <CurrencyInput
              {...(register as any)('valuationSummary.marketValue', {
                required: 'Market value is required',
                valueAsNumber: true
              })}
              placeholder="Enter market value"
              error={(errors as any).valuationSummary?.marketValue?.message}
            />
          </FormField>

          <FormField
            label="Interest Valued"
            error={(errors as any).valuationSummary?.interestValued?.message}
          >
            <Input
              {...(register as any)('valuationSummary.interestValued')}
              placeholder="Enter interest valued"
              error={(errors as any).valuationSummary?.interestValued?.message}
            />
          </FormField>

          <FormField
            label="Market Value Text"
            error={(errors as any).valuationSummary?.marketValueText?.message}
          >
            <Input
              {...(register as any)('valuationSummary.marketValueText')}
              placeholder="Enter market value in text format"
              error={(errors as any).valuationSummary?.marketValueText?.message}
            />
          </FormField>
        </div>
      </div>

      {/* Value Components */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Value Components</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Land Value"
            error={(errors as any).valuationSummary?.valueComponent?.land?.message}
          >
            <CurrencyInput
              {...(register as any)('valuationSummary.valueComponent.land', {
                valueAsNumber: true
              })}
              placeholder="Enter land value"
              error={(errors as any).valuationSummary?.valueComponent?.land?.message}
            />
          </FormField>

          <FormField
            label="Improvements Value"
            error={(errors as any).valuationSummary?.valueComponent?.improvements?.message}
          >
            <CurrencyInput
              {...(register as any)('valuationSummary.valueComponent.improvements', {
                valueAsNumber: true
              })}
              placeholder="Enter improvements value"
              error={(errors as any).valuationSummary?.valueComponent?.improvements?.message}
            />
          </FormField>
        </div>
      </div>

      {/* Other Assessments */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Other Assessments</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Rental Assessment (Unfurnished)"
            error={(errors as any).valuationSummary?.otherAssessments?.rentalAssessmentUnfurnished?.message}
          >
            <Input
              {...(register as any)('valuationSummary.otherAssessments.rentalAssessmentUnfurnished')}
              placeholder="Enter rental assessment"
              error={(errors as any).valuationSummary?.otherAssessments?.rentalAssessmentUnfurnished?.message}
            />
          </FormField>

          <FormField
            label="Insurance Estimate"
            error={(errors as any).valuationSummary?.otherAssessments?.insuranceEstimate?.message}
          >
            <CurrencyInput
              {...(register as any)('valuationSummary.otherAssessments.insuranceEstimate', {
                valueAsNumber: true
              })}
              placeholder="Enter insurance estimate"
              error={(errors as any).valuationSummary?.otherAssessments?.insuranceEstimate?.message}
            />
          </FormField>
        </div>
      </div>

      {/* Valuation Summary Notes */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Summary Information</h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Valuation Summary:</strong> This section contains the core valuation results including market value, 
            value components (land and improvements), and other relevant assessments such as rental and insurance estimates.
          </p>
        </div>
      </div>
    </div>
  );
};
