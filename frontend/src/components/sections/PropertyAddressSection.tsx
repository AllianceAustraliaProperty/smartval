import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE_URL } from '@/lib/api-config';
import { FormField, Input, Select } from '../ui/FormField';
import { SectionProps } from '@/types/property-valuation';
import { MapPin, Home, Building, Link2 } from 'lucide-react';
import { STATE_OPTIONS } from '@/types/property-valuation';
import { mapRpDataPropertyType } from '@/constants/property-types';
import { HeaderActionPortal } from '../report-nav';

export const PropertyAddressSection: React.FC<SectionProps> = ({ register, errors, watch, setValue, reportId }) => {
  const [rpSuggestions, setRpSuggestions] = useState<Array<{ suggestion: string; suggestionId: number }>>([]);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isModalOpen]);
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

  const prevStateRef = React.useRef(state);
  // Synchronize default tenure type based on property state (ACT -> Crown Leasehold, otherwise Freehold)
  useEffect(() => {
    const isAct = String(state || '').trim().toUpperCase() === 'ACT';
    const defaultTenure = isAct ? 'Crown Leasehold' : 'Freehold';
    const currentTenure = watch('propertyDetails.tenureType');

    if (!currentTenure || (prevStateRef.current !== undefined && prevStateRef.current !== state)) {
      setValue('propertyDetails.tenureType', defaultTenure, { shouldDirty: true });
    }
    prevStateRef.current = state;
  }, [state, setValue, watch]);

  const handleLinkToRpData = async () => {
    setLinkError(null);
    setRpSuggestions([]);
    if (!fullAddress || !fullAddress.trim()) {
      setLinkError('Please enter the address fields to build a full address first.');
      return;
    }
    try {
      setIsLinking(true);
      const resp = await fetch(`${API_BASE_URL}/rpdata/search-address?address=${encodeURIComponent(fullAddress)}`, {
        credentials: 'include'
      });
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
      const resp = await fetch(`${API_BASE_URL}/rpdata/search-address?address=${encodeURIComponent(term)}`, {
        credentials: 'include'
      });
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
      <HeaderActionPortal>
        <div className="flex items-center gap-3">
          {linkError && (
            <span className="text-sm font-medium text-red-600">{linkError}</span>
          )}
          <button
            type="button"
            onClick={handleLinkToRpData}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white bg-[#006ABE] hover:bg-[#00589e] shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold cursor-pointer"
            disabled={isLinking}
            title="Link to RP Data"
          >
            <Link2 className="w-4 h-4" />
            {isLinking ? 'Linking…' : 'Link to RP Data'}
          </button>
        </div>
      </HeaderActionPortal>

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
          {isModalOpen && mounted && createPortal(
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setIsModalOpen(false)}></div>
              <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150" role="dialog" aria-modal="true">
                <div className="px-6 py-4 bg-[#006ABE] text-white flex items-center justify-between">
                  <h3 className="text-base md:text-lg font-bold tracking-wide">Select RP Data Address</h3>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center text-white text-xl leading-none transition-colors"
                    onClick={() => setIsModalOpen(false)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="flex gap-2.5 items-center">
                    <input
                      type="text"
                      className="flex-1 min-h-[46px] rounded-full border-2 border-gray-400/80 px-5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006ABE]/20 focus:border-[#006ABE] hover:border-[#006ABE] text-gray-900 placeholder-gray-400 transition-all bg-white"
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
                      className="min-h-[46px] px-6 py-2.5 rounded-full font-bold text-white bg-[#006ABE] hover:bg-[#00589e] shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isSearching}
                    >
                      {isSearching ? 'Searching…' : 'Search'}
                    </button>
                  </div>
                  {linkError && (
                    <div className="mt-2 text-sm text-red-600 font-medium">{linkError}</div>
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
                      className="w-full text-left px-5 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      onClick={async () => {
                        setValue('rpDataId', String(s.suggestionId));
                        setIsModalOpen(false);

                        // Pre-populate propertyType from RP Data commons if available
                        try {
                          const resp = await fetch(`${API_BASE_URL}/rpdata/commons/${encodeURIComponent(String(s.suggestionId))}`);
                          if (resp.ok) {
                            const payload = await resp.json();
                            const data = payload?.data || payload;
                            const mappedType = mapRpDataPropertyType(
                              data?.attrCore?.propertyType || data?.propertyType,
                              data?.attrCore?.propertySubType || data?.propertySubType
                            );
                            if (mappedType) {
                              setValue('propertyDetails.propertyType', mappedType, { shouldDirty: true });
                            }

                            const rawT = String(data?.attrCore?.propertyType || data?.propertyType || '').toLowerCase();
                            const rawSub = String(data?.attrCore?.propertySubType || data?.propertySubType || '').toLowerCase();
                            const isUnitType = rawT.includes('unit') || rawSub.includes('unit') || rawSub.includes('apartment') || rawSub.includes('flat');
                            setValue('valuationDetails.isUnit', isUnitType, { shouldDirty: true });
                            setValue('valuationDetails.showLandValue', !isUnitType, { shouldDirty: true });
                            setValue('valuationDetails.showImprovements', !isUnitType, { shouldDirty: true });
                            setValue('valuationDetails.showCurrencyOfValuation', true, { shouldDirty: true });
                            if (isUnitType) {
                              setValue('valuationDetails.improvements', undefined, { shouldDirty: true });
                            }

                            const carSpaces = Number(data?.attrCore?.carSpaces);
                            const buildingArea = Number(data?.attrAdditional?.floorArea);
                            let parkingArea: number | undefined = undefined;
                            if (Number.isFinite(carSpaces) && carSpaces > 0) {
                              parkingArea = carSpaces * 18;
                              setValue('propertyDetails.parkingArea', parkingArea, { shouldDirty: true });
                            }
                            if (Number.isFinite(buildingArea) && buildingArea > 0) {
                              setValue('propertyDetails.buildingArea', buildingArea, { shouldDirty: true });
                              if (isUnitType) {
                                setValue('propertyDetails.livingArea', buildingArea, { shouldDirty: true });
                              } else if (parkingArea !== undefined) {
                                setValue('propertyDetails.livingArea', Math.max(0, buildingArea - parkingArea), { shouldDirty: true });
                              } else {
                                setValue('propertyDetails.livingArea', buildingArea, { shouldDirty: true });
                              }
                            }
                          }
                        } catch (_) {
                          // ignore background prefetch errors
                        }
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
              </div>
            </div>,
            document.body
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
