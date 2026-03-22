import React, { useEffect } from 'react';
import { FormField, Input, Select } from '../ui/FormField';
import { SectionProps, STATE_OPTIONS, OwnerData, getStateAbbreviation, StateEnum } from '@/types/property-valuation';
import { Plus, Trash2, User, Users, Phone, Mail } from 'lucide-react';

export const OverviewSection: React.FC<SectionProps> = ({ register, errors, watch, setValue }) => {
  const owners = watch('primaryContact.owners') ?? [];
  const selectedState = watch('address.state');
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Property Overview</h2>
      <p className="text-gray-600">Capture the key identifying details for this property.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="RP Data ID"
          error={errors.rpDataId?.message}
        >
          <Input
            {...register('rpDataId')}
            placeholder="Enter RP Data identifier"
            error={errors.rpDataId?.message}
          />
        </FormField>

        <FormField
          label="Full Address"
          error={errors.address?.fullAddress?.message}
        >
          <Input
            {...register('address.fullAddress')}
            placeholder="e.g., 123 Example St, Sydney NSW 2000"
            error={errors.address?.fullAddress?.message}
          />
        </FormField>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Street Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Unit Number"
            error={errors.address?.unitNumber?.message}
          >
            <Input
              {...register('address.unitNumber')}
              placeholder="Unit or apartment number"
              error={errors.address?.unitNumber?.message}
            />
          </FormField>

          <FormField
            label="Street Name"
            required
            error={errors.address?.streetName?.message}
          >
            <Input
              {...register('address.streetName', {
                required: 'Street name is required'
              })}
              placeholder="Full street name (e.g., 123 George St)"
              error={errors.address?.streetName?.message}
            />
          </FormField>

          <FormField
            label="Street Name Only"
            required
            error={errors.address?.streetNameOnly?.message}
          >
            <Input
              {...register('address.streetNameOnly', {
                required: 'Street name only is required'
              })}
              placeholder="Street name without suffix"
              error={errors.address?.streetNameOnly?.message}
            />
          </FormField>

          <FormField
            label="Suburb"
            required
            error={errors.address?.suburb?.message}
          >
            <Input
              {...register('address.suburb', {
                required: 'Suburb is required'
              })}
              placeholder="Suburb"
              error={errors.address?.suburb?.message}
            />
          </FormField>

          <FormField
            label="State"
            required
            error={errors.address?.state?.message}
          >
            <Select
              {...register('address.state', {
                required: 'State is required'
              })}
              options={STATE_OPTIONS.map(option => ({ value: option.value, label: option.label }))}
              error={errors.address?.state?.message}
            />
          </FormField>

          <FormField
            label="Postcode"
            required
            error={errors.address?.postcode?.message}
          >
            <Input
              {...register('address.postcode', {
                required: 'Postcode is required'
              })}
              placeholder="4-digit postcode"
              error={errors.address?.postcode?.message}
            />
          </FormField>
        </div>
      </div>

      {/* Primary Contact Section */}
      <div className="space-y-6 pt-8 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Primary Contact</h3>
            <p className="text-sm text-gray-600">Main point of contact for this property</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="First Name"
            error={errors.primaryContact?.firstName?.message}
          >
            <Input
              {...register('primaryContact.firstName')}
              placeholder="First name"
              error={errors.primaryContact?.firstName?.message}
            />
          </FormField>

          <FormField
            label="Last Name"
            error={errors.primaryContact?.lastName?.message}
          >
            <Input
              {...register('primaryContact.lastName')}
              placeholder="Last name"
              error={errors.primaryContact?.lastName?.message}
            />
          </FormField>

          <FormField
            label="Phone"
            error={errors.primaryContact?.phone?.message}
          >
            <Input
              {...register('primaryContact.phone')}
              placeholder="Primary phone number"
              error={errors.primaryContact?.phone?.message}
            />
          </FormField>

          <FormField
            label="Secondary Phone"
            error={errors.primaryContact?.phone2?.message}
          >
            <Input
              {...register('primaryContact.phone2')}
              placeholder="Alternative phone number"
              error={errors.primaryContact?.phone2?.message}
            />
          </FormField>

          <FormField
            label="Email"
            error={errors.primaryContact?.email?.message}
          >
            <Input
              type="email"
              {...register('primaryContact.email')}
              placeholder="Primary email address"
              error={errors.primaryContact?.email?.message}
            />
          </FormField>

          <FormField
            label="Secondary Email"
            error={errors.primaryContact?.email2?.message}
          >
            <Input
              type="email"
              {...register('primaryContact.email2')}
              placeholder="Alternative email address"
              error={errors.primaryContact?.email2?.message}
            />
          </FormField>
        </div>
      </div>

      {/* Owners Section */}
      <div className="space-y-6 pt-8 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Property Owners</h3>
              <p className="text-sm text-gray-600">Registered owners of the property</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const newOwner: OwnerData = { firstName: '', lastName: '' };
              setValue('primaryContact.owners', [...owners, newOwner]);
            }}
            className="group inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            Add Owner
          </button>
        </div>

        {owners.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No owners added yet</h4>
            <p className="text-gray-600 mb-6">Add property owners to keep track of ownership details.</p>
            <button
              type="button"
              onClick={() => {
                const newOwner: OwnerData = { firstName: '', lastName: '' };
                setValue('primaryContact.owners', [newOwner]);
              }}
              className="group inline-flex items-center px-6 py-3 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
              Add First Owner
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {owners.map((owner: OwnerData, index: number) => (
              <div key={`owner-${index}`} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">Owner #{index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => {
                      const updatedOwners = owners.filter((_: OwnerData, i: number) => i !== index);
                      setValue('primaryContact.owners', updatedOwners);
                    }}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="First Name"
                    error={errors.primaryContact?.owners?.[index]?.firstName?.message}
                  >
                    <Input
                      {...register(`primaryContact.owners.${index}.firstName` as const)}
                      placeholder="First name"
                      error={errors.primaryContact?.owners?.[index]?.firstName?.message}
                    />
                  </FormField>

                  <FormField
                    label="Last Name"
                    error={errors.primaryContact?.owners?.[index]?.lastName?.message}
                  >
                    <Input
                      {...register(`primaryContact.owners.${index}.lastName` as const)}
                      placeholder="Last name"
                      error={errors.primaryContact?.owners?.[index]?.lastName?.message}
                    />
                  </FormField>
                </div>
              </div>
            ))}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  const newOwner: OwnerData = { firstName: '', lastName: '' };
                  setValue('primaryContact.owners', [...owners, newOwner]);
                }}
                className="group inline-flex items-center px-6 py-3 text-sm font-bold rounded-xl text-gray-700 bg-white border-2 border-gray-200 hover:border-purple-400 hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                Add Another Owner
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 