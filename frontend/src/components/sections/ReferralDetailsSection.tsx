import React, { useEffect } from 'react';
import { FormField, Input } from '../ui/FormField';
import { SectionProps } from '@/types/property-valuation';
import { User, DollarSign } from 'lucide-react';

export const ReferralDetailsSection: React.FC<SectionProps> = ({ register, errors, watch }) => {
  // Debug: Log the current form values
  const referralDetails = watch('referralDetails');
  console.log('ReferralDetailsSection - Current form values:', referralDetails);
  
  // Watch for changes in referralDetails
  useEffect(() => {
    console.log('ReferralDetails changed:', referralDetails);
  }, [referralDetails]);
  
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Financial & Referral Details</h2>
        <p className="text-gray-600">Record referral and financial information for this valuation report.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Referrer Name"
            error={errors.referralDetails?.referrerName?.message}
          >
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                {...register('referralDetails.referrerName')}
                placeholder="Enter referrer name"
                error={errors.referralDetails?.referrerName?.message}
                className="pl-10"
              />
            </div>
          </FormField>

          <FormField
            label="Referral Fee"
            error={errors.referralDetails?.referralFee?.message}
          >
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="number"
                {...register('referralDetails.referralFee', { valueAsNumber: true })}
                placeholder="Enter referral fee"
                error={errors.referralDetails?.referralFee?.message}
                className="pl-10"
              />
            </div>
          </FormField>

          <FormField
            label="Invoice Status"
            error={errors.referralDetails?.invoiceStatus?.message}
          >
            <select
              {...register('referralDetails.invoiceStatus')}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            >
              <option value="">Select invoice status</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </FormField>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">Referral Information</h4>
              <p className="text-sm text-blue-700">
                This section is used to track referral sources and associated fees for the valuation report.
                This information helps maintain records of business relationships and referral agreements.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
