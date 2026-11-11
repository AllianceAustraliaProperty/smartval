'use client';

import React from 'react';
import { PillFormField, PillInput, PillCurrencyInput, PillSelect } from '../ui';
import { SectionProps } from '@/types/property-valuation';
import { User } from 'lucide-react';

export const ReferralDetailsSection: React.FC<SectionProps> = ({ register, errors }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
      {/* 1. Report Fee */}
      <PillFormField
        label="Report Fee"
        error={errors.invoiceDetails?.reportFee?.message}
      >
        <PillCurrencyInput
          {...register('invoiceDetails.reportFee', { valueAsNumber: true })}
          placeholder="Enter the report fee for the invoice"
          error={errors.invoiceDetails?.reportFee?.message}
        />
      </PillFormField>

      {/* 2. Referrer Name */}
      <PillFormField
        label="Referrer Name"
        error={errors.referralDetails?.referrerName?.message}
      >
        <PillInput
          icon={<User className="w-4 h-4 text-gray-500" />}
          {...register('referralDetails.referrerName')}
          placeholder="Enter referrer name"
          error={errors.referralDetails?.referrerName?.message}
        />
      </PillFormField>

      {/* 3. Referral Fee */}
      <PillFormField
        label="Referral Fee"
        error={errors.referralDetails?.referralFee?.message}
      >
        <PillCurrencyInput
          {...register('referralDetails.referralFee', { valueAsNumber: true })}
          placeholder="Enter referral fee"
          error={errors.referralDetails?.referralFee?.message}
        />
      </PillFormField>

      {/* 4. Invoice Status */}
      <PillFormField
        label="Invoice Status"
        error={errors.referralDetails?.invoiceStatus?.message}
      >
        <PillSelect
          {...register('referralDetails.invoiceStatus')}
          placeholder="Select invoice status"
          error={errors.referralDetails?.invoiceStatus?.message}
          options={[
            { value: 'paid', label: 'Paid' },
            { value: 'unpaid', label: 'Unpaid' },
            { value: 'pending', label: 'Pending' },
            { value: 'overdue', label: 'Overdue' },
          ]}
        />
      </PillFormField>
    </div>
  );
};
