import React from 'react';
import { FormField, Input, Select } from '../ui/FormField';
import { SectionProps, RISK_RATING_OPTIONS } from '@/types/property-valuation';

export const RiskAnalysisSection: React.FC<SectionProps> = ({
  register,
  errors
}) => {
  return (
    <div className="space-y-8">
      {/* Property Risk Ratings */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Property Risk Ratings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Location & Neighbourhood Risk"
            error={(errors as any).riskAnalysis?.propertyRiskRatings?.locationNeighbourhood?.message}
          >
            <Select
              {...(register as any)('riskAnalysis.propertyRiskRatings.locationNeighbourhood')}
              options={RISK_RATING_OPTIONS}
              error={(errors as any).riskAnalysis?.propertyRiskRatings?.locationNeighbourhood?.message}
            />
          </FormField>

          <FormField
            label="Land Planning & Title Risk"
            error={(errors as any).riskAnalysis?.propertyRiskRatings?.landPlanningTitle?.message}
          >
            <Select
              {...(register as any)('riskAnalysis.propertyRiskRatings.landPlanningTitle')}
              options={RISK_RATING_OPTIONS}
              error={(errors as any).riskAnalysis?.propertyRiskRatings?.landPlanningTitle?.message}
            />
          </FormField>

          <FormField
            label="Environmental Issues Risk"
            error={(errors as any).riskAnalysis?.propertyRiskRatings?.environmentalIssues?.message}
          >
            <Select
              {...(register as any)('riskAnalysis.propertyRiskRatings.environmentalIssues')}
              options={RISK_RATING_OPTIONS}
              error={(errors as any).riskAnalysis?.propertyRiskRatings?.environmentalIssues?.message}
            />
          </FormField>

          <FormField
            label="Improvements Risk"
            error={(errors as any).riskAnalysis?.propertyRiskRatings?.improvements?.message}
          >
            <Select
              {...(register as any)('riskAnalysis.propertyRiskRatings.improvements')}
              options={RISK_RATING_OPTIONS}
              error={(errors as any).riskAnalysis?.propertyRiskRatings?.improvements?.message}
            />
          </FormField>
        </div>
      </div>

      {/* Market Risk Ratings */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Market Risk Ratings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Recent Market Direction Risk"
            error={(errors as any).riskAnalysis?.marketRiskRatings?.recentMarketDirection?.message}
          >
            <Select
              {...(register as any)('riskAnalysis.marketRiskRatings.recentMarketDirection')}
              options={RISK_RATING_OPTIONS}
              error={(errors as any).riskAnalysis?.marketRiskRatings?.recentMarketDirection?.message}
            />
          </FormField>

          <FormField
            label="Market Activity Risk"
            error={(errors as any).riskAnalysis?.marketRiskRatings?.marketActivity?.message}
          >
            <Select
              {...(register as any)('riskAnalysis.marketRiskRatings.marketActivity')}
              options={RISK_RATING_OPTIONS}
              error={(errors as any).riskAnalysis?.marketRiskRatings?.marketActivity?.message}
            />
          </FormField>

          <FormField
            label="Local/Regional Economy Impact Risk"
            error={(errors as any).riskAnalysis?.marketRiskRatings?.localRegionalEconomyImpact?.message}
          >
            <Select
              {...(register as any)('riskAnalysis.marketRiskRatings.localRegionalEconomyImpact')}
              options={RISK_RATING_OPTIONS}
              error={(errors as any).riskAnalysis?.marketRiskRatings?.localRegionalEconomyImpact?.message}
            />
          </FormField>

          <FormField
            label="Market Segment Conditions Risk"
            error={(errors as any).riskAnalysis?.marketRiskRatings?.marketSegmentConditions?.message}
          >
            <Select
              {...(register as any)('riskAnalysis.marketRiskRatings.marketSegmentConditions')}
              options={RISK_RATING_OPTIONS}
              error={(errors as any).riskAnalysis?.marketRiskRatings?.marketSegmentConditions?.message}
            />
          </FormField>
        </div>
      </div>

      {/* Risk Assessment Notes */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Risk Assessment Notes</h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Risk Rating Scale:</strong><br />
            1 = Very Low Risk | 2 = Low Risk | 3 = Medium Risk | 4 = High Risk | 5 = Very High Risk
          </p>
        </div>
      </div>
    </div>
  );
};
