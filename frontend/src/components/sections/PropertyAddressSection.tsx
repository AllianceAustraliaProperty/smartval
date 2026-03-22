import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/api-config';
import { FormField, Input, Select } from '../ui/FormField';
import { SectionProps } from '@/types/property-valuation';
import { MapPin, Home, Building } from 'lucide-react';
import { STATE_OPTIONS } from '@/types/property-valuation';

export const PropertyAddressSection: React.FC<SectionProps> = ({ register, errors, watch, setValue, reportId }) => {
  const [rpSuggestions, setRpSuggestions] = useState<Array<{ suggestion: string; suggestionId: number }>>([]);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const addressData = watch('address');
  console.log('PropertyAddressSection - Current address data:', addressData);
  
  // Watch for changes in individual fields
  const unitNumber = watch('address.unitNumber');
  const streetName = watch('address.streetName');
  const suburb = watch('address.suburb');
  const state = watch('address.state');
  const postcode = watch('address.postcode');
  const fullAddress = watch('address.fullAddress');
  
  // Auto-generate full address from components
  useEffect(() => {
    // Keep streetNameOnly derived automatically from streetName
    const derivedStreetNameOnly = (streetName || '').split(' ')[0] || '';
    setValue('address.streetNameOnly', derivedStreetNameOnly);

    const addressParts = [
      unitNumber,
      streetName,
      suburb,
      state,
      postcode
    ].filter(part => part && part.trim() !== '');
    
    const fullAddress = addressParts.join(' ');
    
    if (fullAddress) {
      setValue('address.fullAddress', fullAddress);
    }
  }, [unitNumber, streetName, suburb, state, postcode, setValue]);

  const handleLinkToRpData = async () => {
    setLinkError(null);
    setRpSuggestions([]);
    if (!fullAddress || !fullAddress.trim()) {
      setLinkError('Please enter the address fields to build a full address first.');
      return;
    }
    try {
      setIsLinking(true);
      const resp = await fetch(`${API_BASE_URL}/api/rpdata/search-address?address=${encodeURIComponent(fullAddress)}`);
      if (!resp.ok) {
        throw new Error(`Request failed with status ${resp.status}`);
      }
      const data = await resp.json();
      // Support multiple response shapes:
      // 1) { data: { suggestions: [{ suggestion, suggestionId }] } }
      // 2) { suggestions: [{ suggestion, suggestionId }] }
      // 3) { data: [{ address, propertyId }] }
      let suggestions: Array<{ suggestion: string; suggestionId: number }> = [];
      const v1 = data?.data?.suggestions;
      const v2 = data?.suggestions;
      const v3 = Array.isArray(data?.data) ? data.data : null;

      if (Array.isArray(v1)) {
        suggestions = v1 as Array<{ suggestion: string; suggestionId: number }>;
      } else if (Array.isArray(v2)) {
        suggestions = v2 as Array<{ suggestion: string; suggestionId: number }>;
      } else if (Array.isArray(v3)) {
        suggestions = v3
          .filter((x: any) => x && (x.address || x.suggestion) && (x.propertyId || x.suggestionId))
          .map((x: any) => ({
            suggestion: x.address || x.suggestion,
            suggestionId: x.propertyId || x.suggestionId
          }));
      }

      setRpSuggestions(suggestions);
      if (!suggestions.length) {
        setLinkError('No RP Data suggestions found for this address.');
      }
      // Always open modal to allow manual search even if no results
      setSearchTerm(fullAddress || '');
      setIsModalOpen(true);
    } catch (e: any) {
      setLinkError(e?.message || 'Failed to link to RP Data');
    } finally {
      setIsLinking(false);
    }
  };

  const performSearch = async (term: string) => {
    setIsSearching(true);
    setLinkError(null);
    setRpSuggestions([]);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/rpdata/search-address?address=${encodeURIComponent(term)}`);
      if (!resp.ok) {
        throw new Error(`Request failed with status ${resp.status}`);
      }
      const data = await resp.json();
      let suggestions: Array<{ suggestion: string; suggestionId: number }> = [];
      const v1 = data?.data?.suggestions;
      const v2 = data?.suggestions;
      const v3 = Array.isArray(data?.data) ? data.data : null;
      if (Array.isArray(v1)) {
        suggestions = v1 as Array<{ suggestion: string; suggestionId: number }>;
      } else if (Array.isArray(v2)) {
        suggestions = v2 as Array<{ suggestion: string; suggestionId: number }>;
      } else if (Array.isArray(v3)) {
        suggestions = v3
          .filter((x: any) => x && (x.address || x.suggestion) && (x.propertyId || x.suggestionId))
          .map((x: any) => ({ suggestion: x.address || x.suggestion, suggestionId: x.propertyId || x.suggestionId }));
      }
      setRpSuggestions(suggestions);
      if (!suggestions.length) {
        setLinkError('No RP Data suggestions found for this search.');
      }
    } catch (e: any) {
      setLinkError(e?.message || 'Failed to search RP Data');
    } finally {
      setIsSearching(false);
    }
  };

  // Auto-save disabled by user request; values are set in form only
  
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Property Address</h2>
        <p className="text-gray-600">Enter the property address details for this valuation report.</p>
        </div>
        <div className="flex items-center gap-3">
          {linkError && (
            <span className="text-sm text-red-600">{linkError}</span>
          )}
          <button
            type="button"
            onClick={handleLinkToRpData}
            className="inline-flex items-center px-4 py-2 rounded-md text-white hover:opacity-95 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            style={{ backgroundColor: '#dc2626' }}
            disabled={isLinking}
            title="Link to RP Data"
          >
            {isLinking ? 'Linking…' : 'Link to RP Data'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="space-y-6">
          {/* Full Address - Auto-generated and disabled */}
          <FormField
            label="Full Address"
            error={errors.address?.fullAddress?.message}
          >
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                {...register('address.fullAddress')}
                placeholder="Auto-generated from address components"
                error={errors.address?.fullAddress?.message}
                className="pl-10 bg-gray-50 cursor-not-allowed"
                disabled
                readOnly
              />
            </div>
          </FormField>

          {/* Link button moved outside the card */}

          {/* RP Data suggestions modal */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)}></div>
              <div className="relative bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-xl mx-4" role="dialog" aria-modal="true">
                <div className="px-5 py-4 bg-red-600 text-white rounded-t-lg flex items-center justify-between">
                  <h3 className="text-base md:text-lg font-semibold tracking-wide">Select RP Data Address</h3>
                  <button
                    type="button"
                    className="text-white/90 hover:text-white text-xl leading-none"
                    onClick={() => setIsModalOpen(false)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="px-5 py-4 border-b border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-400"
                      placeholder="Search address"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          performSearch(searchTerm);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => performSearch(searchTerm)}
                      className="px-4 py-2 rounded-md text-white"
                      style={{ backgroundColor: '#dc2626' }}
                      disabled={isSearching}
                    >
                      {isSearching ? 'Searching…' : 'Search'}
                    </button>
                  </div>
                  {linkError && (
                    <div className="mt-2 text-sm text-red-600">{linkError}</div>
                  )}
                </div>
                <div className="max-h-96 overflow-auto">
                  {isSearching && (
                    <div className="px-5 py-6 text-sm text-gray-600">Searching…</div>
                  )}
                  {!isSearching && rpSuggestions.map((s) => (
                    <button
                      key={s.suggestionId}
                      type="button"
                      className="w-full text-left px-5 py-3 hover:bg-gray-50 border-b border-gray-100"
                      onClick={async () => {
                        setValue('rpDataId', String(s.suggestionId));
                        setIsModalOpen(false);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-red-600 mt-0.5" />
                        <div>
                          <div className="text-sm md:text-[15px] text-gray-900 font-medium">{s.suggestion}</div>
                          <div className="text-xs text-gray-500">ID: {s.suggestionId}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                  {!isSearching && rpSuggestions.length === 0 && (
                    <div className="px-5 py-6 text-sm text-gray-600">No suggestions found.</div>
                  )}
                </div>
                <div className="px-5 py-3 bg-gray-50 rounded-b-lg border-t border-gray-200 flex justify-end">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-white"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Unit Number and Street Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="House/Unit Number"
              error={errors.address?.unitNumber?.message}
            >
              <Input
                {...register('address.unitNumber')}
                placeholder="e.g., 10/462-464 (optional)"
                error={errors.address?.unitNumber?.message}
              />
            </FormField>

            <FormField
              label="Street Name"
              error={errors.address?.streetName?.message}
              required
            >
              <div className="relative">
                <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  {...register('address.streetName')}
                  placeholder="e.g., George Street"
                  error={errors.address?.streetName?.message}
                  className="pl-10"
                />
              </div>
            </FormField>
          </div>

          {/* Suburb, State and Postcode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              label="Suburb"
              error={errors.address?.suburb?.message}
              required
            >
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  {...register('address.suburb')}
                  placeholder="e.g., Parramatta"
                  error={errors.address?.suburb?.message}
                  className="pl-10"
                />
              </div>
            </FormField>

            <FormField
              label="State"
              error={errors.address?.state?.message}
            >
              <Select
                {...register('address.state')}
                options={STATE_OPTIONS.map(option => ({ value: option.value, label: option.label }))}
                error={errors.address?.state?.message}
              />
            </FormField>

            <FormField
              label="Postcode"
              error={errors.address?.postcode?.message}
            >
              <Input
                {...register('address.postcode')}
                placeholder="e.g., 2000"
                error={errors.address?.postcode?.message}
                maxLength={4}
              />
            </FormField>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">Property Address Information</h4>
              <p className="text-sm text-blue-700">
                This section captures the specific property address details for the valuation report.
                This information is used for location analysis and report generation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
