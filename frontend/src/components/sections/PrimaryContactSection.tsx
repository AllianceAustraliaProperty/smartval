'use client';

import React from 'react';
import { SectionProps } from '@/types/property-valuation';
import { FormField, Input } from '@/components/ui/FormField';

export const PrimaryContactSection: React.FC<SectionProps> = ({
  register,
  control,
  watch,
  setValue,
  errors
}) => {
  const watchedOwners = watch('primaryContact.owners') || [];

  const addOwner = () => {
    const currentOwners = watchedOwners || [];
    setValue('primaryContact.owners', [
      ...currentOwners,
      { firstName: '', lastName: '' }
    ]);
  };

  const removeOwner = (index: number) => {
    const currentOwners = watchedOwners || [];
    setValue('primaryContact.owners', currentOwners.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-xl font-semibold text-gray-900">Primary Contact Information</h2>
          <p className="text-sm text-gray-600 mt-1">
            Contact details for the primary contact person
          </p>
        </div>

        <div className="space-y-8">
          {/* Primary Contact Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Contact Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="First Name"
                error={errors.primaryContact?.firstName?.message}
              >
                <Input
                  {...register('primaryContact.firstName')}
                  placeholder="Enter first name"
                  error={errors.primaryContact?.firstName?.message}
                />
              </FormField>

              <FormField
                label="Last Name"
                error={errors.primaryContact?.lastName?.message}
              >
                <Input
                  {...register('primaryContact.lastName')}
                  placeholder="Enter last name"
                  error={errors.primaryContact?.lastName?.message}
                />
              </FormField>

              <FormField
                label="Mobile"
                error={errors.primaryContact?.phone?.message}
              >
                <Input
                  {...register('primaryContact.phone')}
                  placeholder="Enter mobile number"
                  error={errors.primaryContact?.phone?.message}
                />
              </FormField>

              <FormField
                label="Email"
                error={errors.primaryContact?.email?.message}
              >
                <Input
                  {...register('primaryContact.email')}
                  placeholder="Enter email address"
                  error={errors.primaryContact?.email?.message}
                />
              </FormField>

              <FormField
                label="Secondary Mobile"
                error={errors.primaryContact?.phone2?.message}
              >
                <Input
                  {...register('primaryContact.phone2')}
                  placeholder="Enter secondary mobile number"
                  error={errors.primaryContact?.phone2?.message}
                />
              </FormField>

              <FormField
                label="Secondary Email"
                error={errors.primaryContact?.email2?.message}
              >
                <Input
                  {...register('primaryContact.email2')}
                  placeholder="Enter secondary email address"
                  error={errors.primaryContact?.email2?.message}
                />
              </FormField>
            </div>
          </div>

          {/* Property Owners */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Property Owners</h3>
              <button
                type="button"
                onClick={addOwner}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add Owner
              </button>
            </div>

            {watchedOwners.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No owners added yet</p>
                <p className="text-sm">Click "Add Owner" to add property owners</p>
              </div>
            ) : (
              <div className="space-y-3">
                {watchedOwners.map((_, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-700">Owner {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeOwner(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        label="First Name"
                        error={errors.primaryContact?.owners?.[index]?.firstName?.message}
                      >
                        <Input
                          {...register(`primaryContact.owners.${index}.firstName`)}
                          placeholder="First name"
                          error={errors.primaryContact?.owners?.[index]?.firstName?.message}
                        />
                      </FormField>

                      <FormField
                        label="Last Name"
                        error={errors.primaryContact?.owners?.[index]?.lastName?.message}
                      >
                        <Input
                          {...register(`primaryContact.owners.${index}.lastName`)}
                          placeholder="Last name"
                          error={errors.primaryContact?.owners?.[index]?.lastName?.message}
                        />
                      </FormField>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
