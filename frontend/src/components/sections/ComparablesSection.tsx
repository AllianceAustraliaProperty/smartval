import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { FormField, Input, Textarea, Select } from '../ui/FormField';
import { SectionProps } from '@/types/property-valuation';
import { API_BASE_URL } from '@/lib/api-config';
import { apiRepository } from '@/lib/api-repository';
import { Plus, Trash2, Edit3, Eye, EyeOff, MapPin, DollarSign, Calendar, Home, Car, Ruler, Calendar as CalendarIcon, Navigation, FileText, ExternalLink, Upload, X, Camera, Search, Filter, ListPlus, CheckCircle2, AlertTriangle, AlertCircle, Loader2, Sparkles } from 'lucide-react';

interface Comparable {
  id: string;
  fullAddress: string;
  saleLeasePrice?: number;
  imageUrl: string;
  bedrooms?: number;
  bathrooms?: number;
  carSpaces?: number;
  siteArea?: number;
  buildingArea?: number;
  buildYear?: number;
  daysOnMarket?: number;
  saleLeaseDate: string;
  distance?: number;
  comparison: string;
  rpId: string;
  photoUrl?: string;
  isComparable?: boolean;
  netIncomeRental?: number;
  nlaRate?: number;
  yield?: number;
  rentalRate?: number;
  description?: string;
  passingRent?: number;
}

interface BulkLogEntry {
  address: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  message?: string;
  propertyAddress?: string;
  price?: number;
}

interface SearchFormState {
  propertyType: string[];
  radius: string;
  targetSuburb: boolean;
  customDate: boolean;
  predefinedPeriod: string;
  bedroomRange: number[];
  bathroomRange: number[];
  carSpacesRange: number[];
  soldWithinStart: string;
  soldWithinEnd: string;
  landSizeMin: string;
  landSizeMax: string;
  priceMin: string;
  priceMax: string;
}

interface SearchResult {
  id: string;
  fullAddress: string;
  saleLeasePrice?: number;
  imageUrl: string;
  bedrooms?: number;
  bathrooms?: number;
  carSpaces?: number;
  siteArea?: number;
  buildingArea?: number;
  buildYear?: number;
  daysOnMarket?: number;
  saleLeaseDate: string;
  distance?: number;
  comparison: string;
  rpId: string;
  photoUrl?: string;
  isComparable?: boolean;
  netIncomeRental?: number;
  nlaRate?: number;
  yield?: number;
  rentalRate?: number;
  description?: string;
  passingRent?: number;
  zoning?: string;
  // Additional fields from RP Data API
  propertyType?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
  firstPublishedPrice?: string;
  latestPublishedPrice?: string;
  isPriceWithheld?: boolean;
  isAgentsAdvice?: boolean;
}

const propertyTypes = [
  { value: 'house', label: 'House' },
  { value: 'unit', label: 'Unit' },
  { value: 'flats', label: 'Flats' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'land', label: 'Land' },
  { value: 'business', label: 'Business' },
  { value: 'storage unit', label: 'Storage Unit' },
  { value: 'other', label: 'Other' }
];

const sortOptions = [
  { label: 'Closest property', value: '+distance' },
  { label: 'Address', value: '+address' },
  { label: 'Sale date', value: '-salesLastSaleContractDate' },
  { label: 'Lowest sale price', value: '+salesLastSoldPrice' },
  { label: 'Highest sale price', value: '-salesLastSoldPrice' }
];

const formatSliderValue = (value: number) => {
  return value === 6 ? '6+' : value.toString();
};

// API integration function for searching comparables
const searchComparablesAPI = async (params: {
  propertyType: string[];
  radius: string;
  targetSuburb: boolean;
  customDate: boolean;
  predefinedPeriod: string;
  bedroomRange: number[];
  bathroomRange: number[];
  carSpacesRange: number[];
  soldWithinStart: string;
  soldWithinEnd: string;
  landSizeMin: string;
  landSizeMax: string;
  priceMin: string;
  priceMax: string;
  sort: string;
  offset: number;
  selectedDataType?: 'sales' | 'rentals';
  addressSuburb?: string;
  addressState?: string;
  addressPostcode?: string;
  lat?: number;
  lon?: number;
}): Promise<SearchResult[]> => {
  try {
    // Build the API parameters exactly like the original MarketEvidenceForm
    const apiParams: Record<string, string> = {
      offset: params.offset.toString(),
      sort: params.sort
    };

    // Property type is now guaranteed to exist
    apiParams.type = params.propertyType.join(',');

    // Handle radius
    if (parseInt(params.radius) <= 10000) {
      apiParams.radius = params.radius;
    }

    // Handle target suburb option
    if (params.targetSuburb) {
      if (params.addressSuburb) {
        apiParams.addressSuburb = params.addressSuburb.toUpperCase();
      }
      if (params.addressState) {
        apiParams.addressState = params.addressState.toUpperCase();
      }
      if (params.addressPostcode) {
        apiParams.addressPostcode = params.addressPostcode.toUpperCase();
      }
    }

    // Handle location coordinates
    if (params.lat !== undefined && params.lon !== undefined) {
      apiParams.lat = params.lat.toString();
      apiParams.lon = params.lon.toString();
    }

    // Handle dates - calculate date range if using predefined period
    let startDate: string;
    let endDate: string;

    if (params.customDate) {
      // Use custom date range
      startDate = params.soldWithinStart.replace(/-/g, '');
      endDate = params.soldWithinEnd.replace(/-/g, '');
    } else {
      // Calculate date range based on predefined period
      const periodInMonths = parseInt(params.predefinedPeriod);
      const end = new Date();
      const start = new Date();

      const currentDay = start.getDate();

      if (periodInMonths >= 12) {
        const years = Math.floor(periodInMonths / 12);
        const remainingMonths = periodInMonths % 12;
        start.setFullYear(start.getFullYear() - years);
        if (remainingMonths > 0) {
          start.setDate(1);
          start.setMonth(start.getMonth() - remainingMonths);
          const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
          start.setDate(Math.min(currentDay, daysInMonth));
        }
      } else {
        start.setDate(1);
        start.setMonth(start.getMonth() - periodInMonths);
        const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
        start.setDate(Math.min(currentDay, daysInMonth));
      }

      startDate = start.toISOString().split('T')[0].replace(/-/g, '');
      endDate = end.toISOString().split('T')[0].replace(/-/g, '');
    }

    // Apply parameters based on whether "Sales" or "Rentals" is selected
    if (params.selectedDataType === 'sales') {
      // For Sales, use salesLastSaleContractDate and salesLastSoldPrice
      apiParams.salesLastSaleContractDate = `${startDate}-${endDate}`;
      apiParams.isActive = "true";

      // Handle price range for sales
      if (params.priceMin || params.priceMax) {
        apiParams.salesLastSoldPrice = `${params.priceMin || ''}-${params.priceMax || ''}`;
      }
    } else {
      // For Rentals, use salesLastCampaignEndDate and salesLastCampaignLastListedPrice
      apiParams.salesLastCampaignEndDate = `${startDate}-${endDate}`;

      // Handle price range for rentals
      if (params.priceMin || params.priceMax) {
        apiParams.salesLastCampaignLastListedPrice = `${params.priceMin || ''}-${params.priceMax || ''}`;
      }
    }

    // Handle land size
    if (params.landSizeMin || params.landSizeMax) {
      apiParams.landArea = `${params.landSizeMin || ''}-${params.landSizeMax || ''}`;
    }

    // Handle bedroom range
    if (params.bedroomRange[0] > 0 || params.bedroomRange[1] < 6) {
      if (params.bedroomRange[1] === 6 && params.bedroomRange[0] > 0) {
        apiParams.beds = `${params.bedroomRange[0]}-`;
      } else if (params.bedroomRange[0] === params.bedroomRange[1]) {
        apiParams.beds = params.bedroomRange[0].toString();
      } else {
        apiParams.beds = `${params.bedroomRange[0]}-${params.bedroomRange[1]}`;
      }
    }

    if (params.bathroomRange[0] > 0 || params.bathroomRange[1] < 6) {
      if (params.bathroomRange[1] === 6 && params.bathroomRange[0] > 0) {
        apiParams.baths = `${params.bathroomRange[0]}-`;
      } else if (params.bathroomRange[0] === params.bathroomRange[1]) {
        apiParams.baths = params.bathroomRange[0].toString();
      } else {
        apiParams.baths = `${params.bathroomRange[0]}-${params.bathroomRange[1]}`;
      }
    }

    if (params.carSpacesRange[0] > 0 || params.carSpacesRange[1] < 6) {
      if (params.carSpacesRange[1] === 6 && params.carSpacesRange[0] > 0) {
        apiParams.carSpaces = `${params.carSpacesRange[0]}-`;
      } else if (params.carSpacesRange[0] === params.carSpacesRange[1]) {
        apiParams.carSpaces = params.carSpacesRange[0].toString();
      } else {
        apiParams.carSpaces = `${params.carSpacesRange[0]}-${params.carSpacesRange[1]}`;
      }
    }

    // Make the API call
    const response = await fetch(`${API_BASE_URL}/rpdata/sales-comparables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiParams),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    // Debug: Log the response structure
    console.log('API Response:', data);

    // Transform API response to SearchResult format
    // The RP Data API response structure: { success: true, data: { data: [...] } }
    let results = [];

    if (data.success && data.data && data.data.data) {
      // Response from our RPData blueprint: { success: true, data: { data: [...] } }
      results = data.data.data;
    } else if (data.success && data.data && Array.isArray(data.data)) {
      // Alternative structure: { success: true, data: [...] }
      results = data.data;
    } else if (Array.isArray(data)) {
      // Direct array response
      results = data;
    } else if (data.results) {
      // Response with results property
      results = data.results;
    } else {
      console.warn('Unexpected API response structure:', data);
      return [];
    }

    console.log('Extracted results:', results);

    return results.map((item: any) => {
      // Extract data from the nested structure
      const core = item.core || {};
      const sales = item.sales || {};
      const rapid = item.rapid || {};
      const listings = item.listings || {};

      return {
        id: core.propertyId?.toString() || `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fullAddress: core.singleLineAddress || core.address?.singleLine || '',
        saleLeasePrice: sales.lastSoldPrice || sales.salePrice || null,
        imageUrl: core.propertyPhotoUri || rapid.imageUrls?.mediumImageUrl || '',
        bedrooms: core.bedrooms || rapid.beds ? Number(core.bedrooms || rapid.beds) : null,
        bathrooms: core.bathrooms || rapid.baths ? Number(core.bathrooms || rapid.baths) : null,
        carSpaces: core.carSpaces || rapid.carSpaces ? Number(core.carSpaces || rapid.carSpaces) : null,
        siteArea: core.landArea || rapid.landArea ? Number(core.landArea || rapid.landArea) : null,
        buildingArea: core.buildingArea || core.floorArea || rapid.buildingArea || rapid.floorArea ? Number(core.buildingArea || core.floorArea || rapid.buildingArea || rapid.floorArea) : null,
        buildYear: core.yearBuilt || rapid.yearBuilt ? Number(core.yearBuilt || rapid.yearBuilt) : null,
        daysOnMarket: sales.daysOnMarket || listings.daysOnMarket ? Number(sales.daysOnMarket || listings.daysOnMarket) : null,
        saleLeaseDate: sales.saleDate || '',
        distance: core.distance || rapid.distance || null,
        comparison: '',
        rpId: core.propertyId?.toString() || rapid.id?.toString() || '',
        photoUrl: core.propertyPhotoUri || rapid.imageUrls?.mediumImageUrl || '',
        isComparable: false,
        zoning: core.zoning || rapid.zoning || core.zone || rapid.zone || '',
        // Additional useful data
        propertyType: core.propertyType || rapid.type || '',
        suburb: core.suburb || rapid.addressSuburb || '',
        state: core.state || rapid.addressState || '',
        postcode: core.postcode || rapid.addressPostcode || '',
        latitude: core.latitude || rapid.addressLocation?.lat || null,
        longitude: core.longitude || rapid.addressLocation?.lon || null,
        firstPublishedPrice: sales.firstPublishedPrice || listings.firstPublishedPrice || '',
        latestPublishedPrice: sales.latestPublishedPrice || listings.latestPublishedPrice || '',
        isPriceWithheld: sales.isPriceWithheld || false,
        isAgentsAdvice: sales.isAgentsAdvice || false
      };
    });
  } catch (error) {
    console.error('Error searching comparables:', error);
    // Return empty array on error
    return [];
  }
};

const SearchForm: React.FC<{
  formState: SearchFormState;
  setFormState: React.Dispatch<React.SetStateAction<SearchFormState>>;
  onSearch: () => void;
  isSearching: boolean;
  appliedFilters: SearchFormState;
  selectedDataType: 'sales' | 'rentals';
  onDataTypeChange: (type: 'sales' | 'rentals') => void;
}> = ({ formState, setFormState, onSearch, isSearching, appliedFilters, selectedDataType, onDataTypeChange }) => {
  const [dateErrors, setDateErrors] = useState({
    start: '',
    end: ''
  });

  const validateDates = (start: string, end: string): boolean => {
    const newErrors = {
      start: '',
      end: ''
    };
    let isValid = true;

    if (!start) {
      newErrors.start = 'Start date is required';
      isValid = false;
    }
    if (!end) {
      newErrors.end = 'End date is required';
      isValid = false;
    }

    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (startDate > endDate) {
        newErrors.start = 'Start date must be before end date';
        newErrors.end = 'End date must be after start date';
        isValid = false;
      }
    }

    setDateErrors(newErrors);
    return isValid;
  };

  const calculateDateRange = (periodInMonths: number): { start: string, end: string } => {
    const end = new Date();
    const start = new Date();

    const currentDay = start.getDate();

    if (periodInMonths >= 12) {
      const years = Math.floor(periodInMonths / 12);
      const remainingMonths = periodInMonths % 12;
      start.setFullYear(start.getFullYear() - years);
      if (remainingMonths > 0) {
        start.setDate(1);
        start.setMonth(start.getMonth() - remainingMonths);
        const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
        start.setDate(Math.min(currentDay, daysInMonth));
      }
    } else {
      start.setDate(1);
      start.setMonth(start.getMonth() - periodInMonths);
      const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      start.setDate(Math.min(currentDay, daysInMonth));
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  const handleDateChange = (field: 'soldWithinStart' | 'soldWithinEnd') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setFormState(prev => ({ ...prev, [field]: newValue }));

    if (formState.customDate) {
      validateDates(
        field === 'soldWithinStart' ? newValue : formState.soldWithinStart,
        field === 'soldWithinEnd' ? newValue : formState.soldWithinEnd
      );
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Search & Filter Comparables</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {/* Data Type Selection */}
        <FormField label="Data Type">
          <Select
            value={selectedDataType}
            onChange={(e) => onDataTypeChange(e.target.value as 'sales' | 'rentals')}
            options={[
              { value: 'sales', label: 'Sales' },
              { value: 'rentals', label: 'Listings' }
            ]}
          />
        </FormField>

        {/* Property Type */}
        <FormField label="Property Type" required>
          <Select
            value={formState.propertyType.join(',')}
            onChange={(e) => {
              const value = e.target.value;
              setFormState(prev => ({ ...prev, propertyType: value ? value.split(',') : [] }));
            }}
            options={propertyTypes}
          />
        </FormField>

        {/* Search Radius */}
        <FormField label="Search Radius">
          <Select
            value={formState.radius}
            onChange={(e) => setFormState(prev => ({ ...prev, radius: e.target.value }))}
            options={[
              { value: '0.5', label: '500m' },
              { value: '1', label: '1km' },
              { value: '1.5', label: '1.5km' },
              { value: '2', label: '2km' },
              { value: '2.5', label: '2.5km' },
              { value: '5', label: '5km' },
              { value: '10', label: '10km' },
              { value: '25', label: '25km' }
            ]}
          />
        </FormField>

        {/* Target Suburb */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="targetSuburb"
            checked={formState.targetSuburb}
            onChange={(e) => setFormState(prev => ({ ...prev, targetSuburb: e.target.checked }))}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="targetSuburb" className="text-sm text-gray-700">
            Target Suburb
          </label>
        </div>

        {/* Custom Date Toggle */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="customDate"
            checked={formState.customDate}
            onChange={(e) => {
              setFormState(prev => ({ ...prev, customDate: e.target.checked }));
              setDateErrors({ start: '', end: '' });
            }}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="customDate" className="text-sm text-gray-700">
            Custom Date Range
          </label>
        </div>
      </div>

      {/* Date Range Section */}
      {formState.customDate ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <FormField
            label="Sold within (Start)"
            error={dateErrors.start}
            required
          >
            <Input
              type="date"
              value={formState.soldWithinStart}
              onChange={handleDateChange('soldWithinStart')}
              error={dateErrors.start}
            />
          </FormField>
          <FormField
            label="Sold within (End)"
            error={dateErrors.end}
            required
          >
            <Input
              type="date"
              value={formState.soldWithinEnd}
              onChange={handleDateChange('soldWithinEnd')}
              error={dateErrors.end}
            />
          </FormField>
        </div>
      ) : (
        <div className="mb-6">
          <FormField label="Sales Time Period">
            <Select
              value={formState.predefinedPeriod}
              onChange={(e) => setFormState(prev => ({ ...prev, predefinedPeriod: e.target.value }))}
              options={[
                { value: '1', label: '1 month' },
                { value: '2', label: '2 months' },
                { value: '3', label: '3 months' },
                { value: '6', label: '6 months' },
                { value: '9', label: '9 months' },
                { value: '12', label: '1 year' },
                { value: '18', label: '18 months' },
                { value: '24', label: '2 years' },
                { value: '36', label: '3 years' },
                { value: '48', label: '4 years' }
              ]}
            />
          </FormField>
        </div>
      )}

      {/* Range Sliders (dual thumb on single track) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Bedrooms */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bedroom Range: {formState.bedroomRange[0]} - {formatSliderValue(formState.bedroomRange[1])}
          </label>
          <div className="relative pt-1 pb-4">
            <div className="relative h-2">
              {/* Track background */}
              <div className="absolute w-full h-2 bg-gray-200 rounded-full"></div>
              {/* Active range highlight */}
              <div
                className="absolute h-2 bg-blue-500 rounded-full transition-all duration-300 ease-out"
                style={{
                  left: `${(formState.bedroomRange[0] / 6) * 100}%`,
                  right: `${100 - (formState.bedroomRange[1] / 6) * 100}%`
                }}
              ></div>
              {/* Min thumb */}
              <input
                type="range"
                min="0"
                max="6"
                value={formState.bedroomRange[0]}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setFormState(prev => ({
                    ...prev,
                    bedroomRange: [Math.min(value, prev.bedroomRange[1]), prev.bedroomRange[1]]
                  }));
                }}
                className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md"
                style={{ zIndex: formState.bedroomRange[0] === formState.bedroomRange[1] ? 5 : 3 }}
              />
              {/* Max thumb */}
              <input
                type="range"
                min="0"
                max="6"
                value={formState.bedroomRange[1]}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setFormState(prev => ({
                    ...prev,
                    bedroomRange: [prev.bedroomRange[0], Math.max(value, prev.bedroomRange[0])]
                  }));
                }}
                className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md"
                style={{ zIndex: 4 }}
              />
            </div>
            {/* Value labels - clickable */}
            <div className="flex justify-between text-xs mt-1 px-1">
              {[0, 1, 2, 3, 4, 5, 6].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    const [min, max] = formState.bedroomRange;
                    // If closer to min, set as min; if closer to max, set as max
                    const distToMin = Math.abs(val - min);
                    const distToMax = Math.abs(val - max);
                    if (distToMin <= distToMax) {
                      setFormState(prev => ({ ...prev, bedroomRange: [val, Math.max(val, prev.bedroomRange[1])] }));
                    } else {
                      setFormState(prev => ({ ...prev, bedroomRange: [Math.min(prev.bedroomRange[0], val), val] }));
                    }
                  }}
                  className="text-gray-500 hover:text-blue-600 hover:font-semibold cursor-pointer transition-all duration-200 hover:scale-110"
                >
                  {val === 6 ? '6+' : val}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bathrooms */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bathroom Range: {formState.bathroomRange[0]} - {formatSliderValue(formState.bathroomRange[1])}
          </label>
          <div className="relative pt-1 pb-4">
            <div className="relative h-2">
              {/* Track background */}
              <div className="absolute w-full h-2 bg-gray-200 rounded-full"></div>
              {/* Active range highlight */}
              <div
                className="absolute h-2 bg-blue-500 rounded-full transition-all duration-300 ease-out"
                style={{
                  left: `${(formState.bathroomRange[0] / 6) * 100}%`,
                  right: `${100 - (formState.bathroomRange[1] / 6) * 100}%`
                }}
              ></div>
              {/* Min thumb */}
              <input
                type="range"
                min="0"
                max="6"
                value={formState.bathroomRange[0]}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setFormState(prev => ({
                    ...prev,
                    bathroomRange: [Math.min(value, prev.bathroomRange[1]), prev.bathroomRange[1]]
                  }));
                }}
                className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md"
                style={{ zIndex: formState.bathroomRange[0] === formState.bathroomRange[1] ? 5 : 3 }}
              />
              {/* Max thumb */}
              <input
                type="range"
                min="0"
                max="6"
                value={formState.bathroomRange[1]}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setFormState(prev => ({
                    ...prev,
                    bathroomRange: [prev.bathroomRange[0], Math.max(value, prev.bathroomRange[0])]
                  }));
                }}
                className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md"
                style={{ zIndex: 4 }}
              />
            </div>
            {/* Value labels - clickable */}
            <div className="flex justify-between text-xs mt-1 px-1">
              {[0, 1, 2, 3, 4, 5, 6].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    const [min, max] = formState.bathroomRange;
                    // If closer to min, set as min; if closer to max, set as max
                    const distToMin = Math.abs(val - min);
                    const distToMax = Math.abs(val - max);
                    if (distToMin <= distToMax) {
                      setFormState(prev => ({ ...prev, bathroomRange: [val, Math.max(val, prev.bathroomRange[1])] }));
                    } else {
                      setFormState(prev => ({ ...prev, bathroomRange: [Math.min(prev.bathroomRange[0], val), val] }));
                    }
                  }}
                  className="text-gray-500 hover:text-blue-600 hover:font-semibold cursor-pointer transition-all duration-200 hover:scale-110"
                >
                  {val === 6 ? '6+' : val}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Car Spaces */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Car Spaces Range: {formState.carSpacesRange[0]} - {formatSliderValue(formState.carSpacesRange[1])}
          </label>
          <div className="relative pt-1 pb-4">
            <div className="relative h-2">
              {/* Track background */}
              <div className="absolute w-full h-2 bg-gray-200 rounded-full"></div>
              {/* Active range highlight */}
              <div
                className="absolute h-2 bg-blue-500 rounded-full transition-all duration-300 ease-out"
                style={{
                  left: `${(formState.carSpacesRange[0] / 6) * 100}%`,
                  right: `${100 - (formState.carSpacesRange[1] / 6) * 100}%`
                }}
              ></div>
              {/* Min thumb */}
              <input
                type="range"
                min="0"
                max="6"
                value={formState.carSpacesRange[0]}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setFormState(prev => ({
                    ...prev,
                    carSpacesRange: [Math.min(value, prev.carSpacesRange[1]), prev.carSpacesRange[1]]
                  }));
                }}
                className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md"
                style={{ zIndex: formState.carSpacesRange[0] === formState.carSpacesRange[1] ? 5 : 3 }}
              />
              {/* Max thumb */}
              <input
                type="range"
                min="0"
                max="6"
                value={formState.carSpacesRange[1]}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setFormState(prev => ({
                    ...prev,
                    carSpacesRange: [prev.carSpacesRange[0], Math.max(value, prev.carSpacesRange[0])]
                  }));
                }}
                className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md"
                style={{ zIndex: 4 }}
              />
            </div>
            {/* Value labels - clickable */}
            <div className="flex justify-between text-xs mt-1 px-1">
              {[0, 1, 2, 3, 4, 5, 6].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    const [min, max] = formState.carSpacesRange;
                    // If closer to min, set as min; if closer to max, set as max
                    const distToMin = Math.abs(val - min);
                    const distToMax = Math.abs(val - max);
                    if (distToMin <= distToMax) {
                      setFormState(prev => ({ ...prev, carSpacesRange: [val, Math.max(val, prev.carSpacesRange[1])] }));
                    } else {
                      setFormState(prev => ({ ...prev, carSpacesRange: [Math.min(prev.carSpacesRange[0], val), val] }));
                    }
                  }}
                  className="text-gray-500 hover:text-blue-600 hover:font-semibold cursor-pointer transition-all duration-200 hover:scale-110"
                >
                  {val === 6 ? '6+' : val}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <FormField label="Land Size (min.)">
          <Input
            type="number"
            value={formState.landSizeMin}
            onChange={(e) => setFormState(prev => ({ ...prev, landSizeMin: e.target.value }))}
            placeholder="e.g., 500"
          />
        </FormField>

        <FormField label="Land Size (max.)">
          <Input
            type="number"
            value={formState.landSizeMax}
            onChange={(e) => setFormState(prev => ({ ...prev, landSizeMax: e.target.value }))}
            placeholder="e.g., 1000"
          />
        </FormField>

        <FormField label="Price (min.)">
          <Input
            type="number"
            value={formState.priceMin}
            onChange={(e) => setFormState(prev => ({ ...prev, priceMin: e.target.value }))}
            placeholder="e.g., 500000"
          />
        </FormField>

        <FormField label="Price (max.)">
          <Input
            type="number"
            value={formState.priceMax}
            onChange={(e) => setFormState(prev => ({ ...prev, priceMax: e.target.value }))}
            placeholder="e.g., 1000000"
          />
        </FormField>
      </div>

      {/* Applied Filters Display */}
      {appliedFilters.propertyType.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Applied Filters:</h4>
          <div className="flex flex-wrap gap-2">
            {appliedFilters.propertyType.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Type: {appliedFilters.propertyType.map(type => type.charAt(0).toUpperCase() + type.slice(1)).join(', ')}
              </span>
            )}
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Radius: {appliedFilters.radius} km
            </span>
            {(appliedFilters.bedroomRange[0] > 0 || appliedFilters.bedroomRange[1] < 6) && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Beds: {appliedFilters.bedroomRange[0]}-{appliedFilters.bedroomRange[1] === 6 ? '6+' : appliedFilters.bedroomRange[1]}
              </span>
            )}
            {(appliedFilters.landSizeMin || appliedFilters.landSizeMax) && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                Land: {appliedFilters.landSizeMin || '0'}-{appliedFilters.landSizeMax || '∞'}m²
              </span>
            )}
            {(appliedFilters.priceMin || appliedFilters.priceMax) && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Price: ${appliedFilters.priceMin || '0'}-${appliedFilters.priceMax || '∞'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Search Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSearch}
          disabled={isSearching || formState.propertyType.length === 0}
          className="inline-flex items-center px-6 py-3 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isSearching ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Search Comparables
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const SearchResults: React.FC<{
  searchResults: SearchResult[];
  onSelectResult: (result: SearchResult) => void;
  onAddToSales: (result: SearchResult) => void;
  onAddToRentals: (result: SearchResult) => void;
  isSearching: boolean;
  hasMoreResults: boolean;
  onLoadMore: () => void;
  selectedSort: string;
  onSortChange: (sort: string) => void;
  addedToSales: Set<string>;
  addedToRentals: Set<string>;
  existingSalesRpIds: Set<string>;
  existingRentalsRpIds: Set<string>;
}> = ({ searchResults, onSelectResult, onAddToSales, onAddToRentals, isSearching, hasMoreResults, onLoadMore, selectedSort, onSortChange, addedToSales, addedToRentals, existingSalesRpIds, existingRentalsRpIds }) => {

  const [addressFilter, setAddressFilter] = useState('');

  const formatPrice = (price: number | null | undefined) => {
    if (!price) return 'Price not available';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date not available';
    try {
      return new Date(dateString).toLocaleDateString('en-AU');
    } catch {
      return dateString;
    }
  };

  // Filter results based on address search
  const filteredResults = searchResults.filter(result => {
    if (!addressFilter.trim()) return true;
    const searchTerm = addressFilter.toLowerCase();
    return result.fullAddress.toLowerCase().includes(searchTerm);
  });

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Search Results ({filteredResults.length}{addressFilter ? ` of ${searchResults.length}` : ''})
        </h3>
        <div className="flex items-center gap-4">
          <FormField label="Sort by">
            <Select
              value={selectedSort}
              onChange={(e) => onSortChange(e.target.value)}
              options={sortOptions}
            />
          </FormField>
        </div>
      </div>

      {/* Address Filter Input */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={addressFilter}
            onChange={(e) => setAddressFilter(e.target.value)}
            placeholder="Filter by address..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-700 placeholder-gray-500"
          />
          {addressFilter && (
            <button
              type="button"
              onClick={() => setAddressFilter('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {searchResults.length > 0 ? (
        <>
          {filteredResults.length > 0 ? (
            <div className="max-h-96 overflow-y-auto pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredResults.map((result, index) => (
                  <div
                    key={result.id}
                    className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-md transition-all duration-200 bg-white"
                  >
                    {/* Property Image */}
                    <div className="w-full h-32 bg-gray-200 rounded-lg mb-3">
                      {result.imageUrl ? (
                        <img
                          src={result.imageUrl}
                          alt="Property"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Home className="w-8 h-8" />
                        </div>
                      )}
                    </div>

                    {/* Property Info */}
                    <div className="space-y-2">
                      {/* Address and Type */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm truncate">{result.fullAddress}</h4>
                          {result.suburb && result.state && (
                            <p className="text-xs text-gray-600 mt-1">
                              {result.suburb}, {result.state} {result.postcode}
                            </p>
                          )}
                        </div>
                        {result.propertyType && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-2 flex-shrink-0">
                            {result.propertyType}
                          </span>
                        )}
                      </div>

                      {/* Price */}
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-green-600">
                          {formatPrice(result.saleLeasePrice)}
                        </span>
                        {result.isPriceWithheld && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            Price Withheld
                          </span>
                        )}
                        {result.isAgentsAdvice && (
                          <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                            Agents&apos; Advice
                          </span>
                        )}
                      </div>

                      {/* Sale Date */}
                      {result.saleLeaseDate && (
                        <p className="text-xs text-gray-500">
                          Sold {formatDate(result.saleLeaseDate)}
                        </p>
                      )}

                      {/* Property Features */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Home className="w-3 h-3" />
                          <span>{result.bedrooms ?? '—'} bed{result.bedrooms !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Car className="w-3 h-3" />
                          <span>{result.bathrooms ?? '—'} bath{result.bathrooms !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Ruler className="w-3 h-3" />
                          <span>{result.buildingArea ? `${result.buildingArea.toLocaleString()}m²` : '—'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Navigation className="w-3 h-3" />
                          <span>{result.distance ? `${result.distance.toFixed(1)}km` : '—'}</span>
                        </div>
                      </div>

                      {/* Additional Details */}
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        {result.siteArea && (
                          <span>{result.siteArea.toLocaleString()}m² land</span>
                        )}
                        {result.carSpaces && (
                          <span>{result.carSpaces} car{result.carSpaces !== 1 ? 's' : ''}</span>
                        )}
                        {result.buildYear && (
                          <span>Built {result.buildYear}</span>
                        )}
                      </div>

                      {/* Days on Market */}
                      {result.daysOnMarket && (
                        <div className="text-xs text-gray-500">
                          {result.daysOnMarket} days on market
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToSales(result);
                        }}
                        disabled={addedToSales.has(result.id) || existingSalesRpIds.has(result.rpId)}
                        className={`flex-1 text-xs py-2 px-3 rounded transition-colors duration-200 ${addedToSales.has(result.id) || existingSalesRpIds.has(result.rpId)
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                      >
                        {addedToSales.has(result.id) || existingSalesRpIds.has(result.rpId) ? 'Added to Sales' : 'Add to Sales'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToRentals(result);
                        }}
                        disabled={addedToRentals.has(result.id) || existingRentalsRpIds.has(result.rpId)}
                        className={`flex-1 text-xs py-2 px-3 rounded transition-colors duration-200 ${addedToRentals.has(result.id) || existingRentalsRpIds.has(result.rpId)
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                      >
                        {addedToRentals.has(result.id) || existingRentalsRpIds.has(result.rpId) ? 'Added to Listings' : 'Add to Listings'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No results match your address filter. Try a different search term.</p>
            </div>
          )}

          {hasMoreResults && filteredResults.length > 0 && (
            <div className="flex justify-center pt-4 mt-4">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={isSearching}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Loading...
                  </>
                ) : (
                  'Load More Results'
                )}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No search results found. Try adjusting your search criteria.</p>
        </div>
      )}
    </div>
  );
};

const ComparableCard: React.FC<{
  comparable: any;
  index: number;
  type: 'sales' | 'rentals';
  register: any;
  errors: any;
  onRemove: (index: number) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  reportId: string;
  setValue: any;
  watch: any;
}> = ({ comparable, index, type, register, errors, onRemove, isExpanded, onToggleExpanded, reportId, setValue, watch }) => {
  const priceLabel = type === 'sales' ? 'Sale Price' : 'Lease Price';
  const dateLabel = type === 'sales' ? 'Sale Date' : 'Lease Date';

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [comparable?.photoUrl, (comparable as any)?.tempPhoto?.previewUrl]);

  // Convert address to proper title case but keep state abbreviations in CAPS
  const toTitleCase = (str: string | undefined) => {
    if (!str) return '';
    const stateAbbreviations = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];
    return str.split(' ').map(word => {
      // Keep state abbreviations in uppercase
      if (stateAbbreviations.includes(word.toUpperCase())) {
        return word.toUpperCase();
      }
      // Convert other words to title case
      return word.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
    }).join(' ');
  };

  // Auto note builder state - separate detail selection for each header
  const COMPARISON_DETAIL_OPTIONS = [
    'Accommodation',
    'Aspect',
    'Features',
    'Improvements',
    'Land size',
    'Land shape',
    'Location',
    'View profile',
    'Internal area',
    'Building condition',
    'Net Lettable Area',
  ];
  const OVERALL_DETAIL_OPTIONS = ['Similar', 'Inferior', 'Superior'];
  // NO DEFAULT VALUES - dropdowns start empty until loaded from database
  const [similarDetail, setSimilarDetail] = useState<string>('');
  const [inferiorDetail, setInferiorDetail] = useState<string>('');
  const [superiorDetail, setSuperiorDetail] = useState<string>('');
  const [overallDetail, setOverallDetail] = useState<string>('');
  const lastComparisonValue = useRef<string>('');
  const lastComparableKey = useRef<string>('');
  const isUpdatingFromDropdowns = useRef(false);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const comparisonValue = (watch(`comparables.${type}.${index}.comparison` as const) as string) ?? '';
  const comparableKey = `${type}-${index}`;

  // Auto-calculate NLA Rate = Sale Price / NLA (buildingArea)
  const saleLeasePrice = watch(`comparables.${type}.${index}.saleLeasePrice` as const) as number | undefined;
  const buildingArea = watch(`comparables.${type}.${index}.buildingArea` as const) as number | undefined;
  const netIncomeRental = watch(`comparables.${type}.${index}.netIncomeRental` as const) as number | undefined;

  useEffect(() => {
    if (saleLeasePrice && buildingArea && buildingArea > 0) {
      const calculated = Math.round((saleLeasePrice / buildingArea) * 100) / 100;
      setValue(`comparables.${type}.${index}.nlaRate` as any, calculated, { shouldDirty: true });
    }
  }, [saleLeasePrice, buildingArea]);

  useEffect(() => {
    if (netIncomeRental && saleLeasePrice && saleLeasePrice > 0) {
      const calculated = Math.round((netIncomeRental / saleLeasePrice) * 10000) / 100;
      setValue(`comparables.${type}.${index}.yield` as any, calculated, { shouldDirty: true });
    }
  }, [netIncomeRental, saleLeasePrice]);

  // Reset tracking when switching to a different comparable
  useEffect(() => {
    if (comparableKey !== lastComparableKey.current) {
      lastComparisonValue.current = '';
      lastComparableKey.current = comparableKey;
      // Don't reset dropdowns here - wait for comparisonValue to load first
    }
  }, [comparableKey]);

  // Initialize dropdown values from existing comparison text ONLY (no defaults)
  useEffect(() => {
    // Skip if this is the same value we already processed
    if (comparisonValue === lastComparisonValue.current) {
      return;
    }

    // Skip if we're currently updating from dropdowns (to avoid loops)
    if (isUpdatingFromDropdowns.current) {
      return;
    }

    // If comparison value exists and has content, try to extract dropdown values
    if (comparisonValue && comparisonValue.trim()) {
      const extractDetail = (label: string, options: string[]) => {
        const regex = new RegExp(`${label}\\s+(.+?)\\s*\\.`, 'i');
        const match = comparisonValue.match(regex);
        if (!match) return '';
        let matchedValue = match[1].trim();

        // Try exact match first, then case-insensitive
        const exactMatch = options.find((option) => option === matchedValue);
        if (exactMatch) return exactMatch;
        const caseInsensitiveMatch = options.find((option) => option.toLowerCase() === matchedValue.toLowerCase());
        return caseInsensitiveMatch ?? '';
      };

      const similarMatch = extractDetail('Similar', COMPARISON_DETAIL_OPTIONS);
      const inferiorMatch = extractDetail('Inferior', COMPARISON_DETAIL_OPTIONS);
      const superiorMatch = extractDetail('Superior', COMPARISON_DETAIL_OPTIONS);
      const overallMatch = extractDetail('Overall', OVERALL_DETAIL_OPTIONS);

      console.log('Loaded from DB:', { similarMatch, inferiorMatch, superiorMatch, overallMatch });

      setSimilarDetail(similarMatch);
      setInferiorDetail(inferiorMatch);
      setSuperiorDetail(superiorMatch);
      setOverallDetail(overallMatch);
    } else {
      // No comparison text -> leave dropdowns empty (no defaults!)
      setSimilarDetail('');
      setInferiorDetail('');
      setSuperiorDetail('');
      setOverallDetail('');
    }

    lastComparisonValue.current = comparisonValue;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparisonValue, type, index]);

  // Auto-update comparison notes when dropdown values change
  useEffect(() => {
    // Skip if we're currently updating from the comparison value (to avoid loops)
    if (isUpdatingFromDropdowns.current) {
      return;
    }

    // Only update if ALL dropdowns have values (no partial updates)
    if (!similarDetail || !inferiorDetail || !superiorDetail || !overallDetail) {
      return;
    }

    const comparisonText = `Similar ${similarDetail}. Inferior ${inferiorDetail}. Superior ${superiorDetail}. Overall ${overallDetail}.`;

    // Always update to ensure comparison notes match dropdowns
    const normalizedComparisonValue = (comparisonValue || '').trim();
    const normalizedComparisonText = comparisonText.trim();

    // Only update if the text is different to avoid unnecessary updates
    if (normalizedComparisonValue !== normalizedComparisonText) {
      console.log('Saving dropdown changes:', comparisonText);
      isUpdatingFromDropdowns.current = true;
      setValue(`comparables.${type}.${index}.comparison`, comparisonText, { shouldDirty: true });
      lastComparisonValue.current = comparisonText;

      // schedule autosave of updated comparables
      queueAutosaveComparables();

      setTimeout(() => {
        isUpdatingFromDropdowns.current = false;
      }, 100);
    }
  }, [similarDetail, inferiorDetail, superiorDetail, overallDetail, type, index, setValue, comparisonValue]);

  const handlePhotoSelect = (file: File) => {
    if (!file) return;
    setUploadError(null);
    const previewUrl = URL.createObjectURL(file);
    setValue(
      `comparables.${type}.${index}.tempPhoto`,
      { file, previewUrl },
      { shouldDirty: true, shouldTouch: true }
    );
  };

  // Queue an autosave of comparables after user changes dropdowns
  const queueAutosaveComparables = () => {
    if (!reportId || reportId === 'temp') return;
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(async () => {
      try {
        const comparablesAll = watch('comparables') ?? {};
        
        // Scrub tempPhoto from comparables before autosaving
        const scrubbedComparables = {
          sales: comparablesAll.sales?.map(({ tempPhoto, ...rest }: any) => rest) || [],
          rentals: comparablesAll.rentals?.map(({ tempPhoto, ...rest }: any) => rest) || []
        };
        
        console.log('Autosaving comparables to backend:', scrubbedComparables);
        const response = await fetch(`${API_BASE_URL}/api/valuation-reports/${reportId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comparables: scrubbedComparables }),
        });
        if (response.ok) {
          console.log('✓ Comparables saved to database successfully');
        } else {
          console.error('✗ Autosave failed:', await response.text());
        }
      } catch (err) {
        console.error('✗ Autosave comparables failed:', err);
      }
    }, 500);
  };

  // New: upload using presigned URL then confirm with backend
  const uploadComparableToS3 = async (file: File) => {
    if (!file) return null;
    if (!reportId || reportId === 'temp') {
      const msg = 'Please save the valuation report first before uploading comparable photos.';
      console.warn(msg);
      setUploadError(msg);
      return null;
    }
    setUploading(true);
    setUploadError(null);
    console.log('Starting comparable upload', { reportId, type, index, fileName: file.name });
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      // Check if this is an update (comparable already has a photo) or new upload
      const isUpdate = comparable && comparable.photoUrl;

      let presignRes;
      if (isUpdate) {
        // Use update endpoint for existing photos
        console.log('Updating existing comparable photo', { comparableId: comparable.id || comparable._id, oldPhotoUrl: comparable.photoUrl });
        presignRes = await fetch(`${API_BASE_URL}/comparables-photos/update-photo/${reportId}/${type}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileExtension,
            contentType: file.type,
            comparableId: comparable.id || comparable._id,
            oldPhotoUrl: comparable.photoUrl
          }),
        });
      } else {
        // Use presigned URL endpoint for new photos
        presignRes = await fetch(`${API_BASE_URL}/comparables-photos/presigned-url/${reportId}/${type}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileExtension, contentType: file.type }),
        });
      }

      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to get presigned URL');
      }

      const presign = await presignRes.json();
      console.log('Presign received for comparable:', presign);

      // 2) PUT file to S3 using presigned URL
      console.log('Uploading to S3:', {
        url: presign.presignedUrl,
        contentType: file.type,
        fileSize: file.size,
        fileName: file.name
      });

      const putRes = await fetch(presign.presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      console.log('S3 upload response:', {
        status: putRes.status,
        statusText: putRes.statusText,
        ok: putRes.ok
      });

      if (!putRes.ok) {
        const text = await putRes.text().catch(() => '');
        console.error('S3 upload failed:', { status: putRes.status, statusText: putRes.statusText, response: text });
        throw new Error(`S3 upload failed: ${putRes.status} ${putRes.statusText} ${text}`);
      }

      console.log('S3 upload successful!');

      // 3) Confirm with backend
      console.log('PUT to S3 successful, confirming with backend', { reportId, type, index });
      const confirmBody: any = { s3Url: presign.s3Url, fileKey: presign.fileKey };
      // include comparable id if available so backend can match by id
      if (comparable && (comparable.id || comparable._id)) {
        confirmBody.comparableId = comparable.id || comparable._id;
      }
      if (isUpdate && comparable.photoUrl) {
        confirmBody.oldPhotoUrl = comparable.photoUrl;
      }

      const confirmRes = await fetch(`${API_BASE_URL}/comparables-photos/confirm-upload/${reportId}/${type}/${index}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(confirmBody),
      });

      if (!confirmRes.ok) {
        const err = await confirmRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to confirm upload');
      }

      const confirmJson = await confirmRes.json();
      const finalUrl = confirmJson.photoUrl || presign.s3Url;
      const separator = finalUrl.includes('?') ? '&' : '?';
      const cacheBustedUrl = `${finalUrl}${separator}t=${Date.now()}`;
      // Update form value with returned photoUrl
      setValue(`comparables.${type}.${index}.photoUrl`, cacheBustedUrl, { shouldDirty: true, shouldTouch: true });
      return cacheBustedUrl;
    } catch (err) {
      console.error('Comparable upload error:', err);
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handlePhotoSelect(file);
    }
  };

  const deletePhoto = async () => {
    // If a staged photo exists, just clear it locally
    if ((comparable as any).tempPhoto?.previewUrl || (comparable as any).tempPhoto?.file) {
      try {
        if ((comparable as any).tempPhoto?.previewUrl) {
          URL.revokeObjectURL((comparable as any).tempPhoto.previewUrl);
        }
      } catch { }
      setValue(
        `comparables.${type}.${index}.tempPhoto`,
        undefined,
        { shouldDirty: true, shouldTouch: true }
      );
      return;
    }
    // If an existing server photo exists, delete immediately
    if (!comparable.photoUrl) return;
    try {
      const response = await fetch(`${API_BASE_URL}/comparables-photos/delete/${reportId}/${type}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photoUrl: comparable.photoUrl }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }
      setValue(
        `comparables.${type}.${index}.photoUrl`,
        '',
        { shouldDirty: true, shouldTouch: true }
      );
    } catch (error) {
      console.error('Delete error:', error);
      setUploadError(error instanceof Error ? error.message : 'Delete failed');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Home className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Comparable #{index + 1}</h4>
              <p className="text-sm text-gray-600">{toTitleCase(comparable.fullAddress) || 'Address not specified'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onToggleExpanded}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
            >
              {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Summary */}
      <div className="p-4 bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="font-medium text-gray-900">
              {comparable.saleLeasePrice ? `$${comparable.saleLeasePrice.toLocaleString()}` : 'Not set'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Home className="w-4 h-4 text-blue-600" />
            <span className="text-gray-700">
              {comparable.bedrooms ?? '—'} bed, {comparable.bathrooms ?? '—'} bath
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Ruler className="w-4 h-4 text-purple-600" />
            <span className="text-gray-700">
              {comparable.buildingArea ?? '—'} sqm
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Navigation className="w-4 h-4 text-orange-600" />
            <span className="text-gray-700">
              {comparable.distance ?? '—'} km
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Form */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Column - Photo Upload */}
            <div className="lg:col-span-2">
              <FormField
                label="Property Photo"
                error={errors.comparables?.[type]?.[index]?.photoUrl?.message}
              >
                <div className="space-y-4">
                  {uploadError && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-red-600 text-sm">{uploadError}</p>
                    </div>
                  )}

                  {/* Photo Display */}
                  {!imageError && (((comparable as any).tempPhoto?.previewUrl) || comparable.photoUrl) ? (
                    <div className="relative group">
                      <img
                        src={((comparable as any).tempPhoto?.previewUrl) || comparable.photoUrl}
                        alt={`Comparable ${index + 1} photo`}
                        className="w-full aspect-square object-cover rounded-lg border-2 border-gray-200"
                        onError={() => setImageError(true)}
                      />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            console.log('Change photo button clicked for comparable', { reportId, type, index });
                            fileInputRef.current?.click();
                          }}
                          className="bg-blue-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-blue-700"
                          title="Change photo"
                        >
                          <Camera className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={deletePhoto}
                          className="bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-700"
                          title="Delete photo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors aspect-square flex items-center justify-center">
                      <div className="flex flex-col items-center space-y-2">
                        <Camera className="w-6 h-6 text-gray-400" />
                        <p className="text-xs text-gray-600">No photo</p>
                        <button
                          type="button"
                          onClick={() => {
                            console.log('Upload button clicked for comparable', { reportId, type, index });
                            fileInputRef.current?.click();
                          }}
                          disabled={uploading}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                        >
                          {uploading ? 'Uploading...' : 'Upload'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      console.log('Comparable file input changed', { reportId, type, index });
                      const f = e.target.files?.[0];
                      if (!f) return;
                      // Try presigned flow first
                      const s3Url = await uploadComparableToS3(f);
                      if (s3Url) {
                        // ensure local tempPhoto is cleared if any
                        setValue(`comparables.${type}.${index}.tempPhoto`, undefined, { shouldDirty: true, shouldTouch: true });
                      }
                      
                      // Reset the file input so the same file can be selected again
                      if (e.target) {
                        e.target.value = '';
                      }
                    }}
                    className="sr-only"
                    disabled={uploading}
                  />

                  {/* Hidden input for form registration */}
                  <input
                    {...register(`comparables.${type}.${index}.photoUrl` as const)}
                    type="hidden"
                  />
                </div>
              </FormField>
            </div>

            {/* Right Column - Form Fields */}
            <div className="lg:col-span-3 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  label="Full Address"
                  error={errors.comparables?.[type]?.[index]?.fullAddress?.message}
                >
                  <Input
                    {...register(`comparables.${type}.${index}.fullAddress` as const)}
                    placeholder="Enter comparable address"
                    error={errors.comparables?.[type]?.[index]?.fullAddress?.message}
                  />
                </FormField>

                <FormField
                  label={priceLabel}
                  error={errors.comparables?.[type]?.[index]?.saleLeasePrice?.message}
                >
                  <Input
                    type="number"
                    {...register(`comparables.${type}.${index}.saleLeasePrice` as const, { valueAsNumber: true })}
                    placeholder="e.g., 750000"
                    error={errors.comparables?.[type]?.[index]?.saleLeasePrice?.message}
                  />
                </FormField>


                <FormField
                  label="Bedrooms"
                  error={errors.comparables?.[type]?.[index]?.bedrooms?.message}
                >
                  <Input
                    type="number"
                    {...register(`comparables.${type}.${index}.bedrooms` as const, { valueAsNumber: true })}
                    placeholder="e.g., 3"
                    error={errors.comparables?.[type]?.[index]?.bedrooms?.message}
                  />
                </FormField>

                <FormField
                  label="Bathrooms"
                  error={errors.comparables?.[type]?.[index]?.bathrooms?.message}
                >
                  <Input
                    type="number"
                    {...register(`comparables.${type}.${index}.bathrooms` as const, { valueAsNumber: true })}
                    placeholder="e.g., 2"
                    error={errors.comparables?.[type]?.[index]?.bathrooms?.message}
                  />
                </FormField>

                <FormField
                  label="Car Spaces"
                  error={errors.comparables?.[type]?.[index]?.carSpaces?.message}
                >
                  <Input
                    type="number"
                    {...register(`comparables.${type}.${index}.carSpaces` as const, { valueAsNumber: true })}
                    placeholder="e.g., 1"
                    error={errors.comparables?.[type]?.[index]?.carSpaces?.message}
                  />
                </FormField>

                <FormField
                  label="Site Area (sqm)"
                  error={errors.comparables?.[type]?.[index]?.siteArea?.message}
                >
                  <Input
                    type="number"
                    {...register(`comparables.${type}.${index}.siteArea` as const, { valueAsNumber: true })}
                    placeholder="e.g., 500"
                    error={errors.comparables?.[type]?.[index]?.siteArea?.message}
                  />
                </FormField>

                <FormField
                  label="Land Value Per Hectare Rate ($/ha)"
                  error={errors.comparables?.[type]?.[index]?.residualLandValue?.message}
                >
                  <Input
                    type="number"
                    step="0.01"
                    {...register(`comparables.${type}.${index}.residualLandValue` as const, { valueAsNumber: true })}
                    placeholder="e.g., 25000"
                    error={errors.comparables?.[type]?.[index]?.residualLandValue?.message}
                  />
                </FormField>

                <FormField
                  label="NLA / Building Area (sqm)"
                  error={errors.comparables?.[type]?.[index]?.buildingArea?.message}
                >
                  <Input
                    type="number"
                    {...register(`comparables.${type}.${index}.buildingArea` as const, { valueAsNumber: true })}
                    placeholder="e.g., 180"
                    error={errors.comparables?.[type]?.[index]?.buildingArea?.message}
                  />
                </FormField>

                <FormField
                  label="Net Income ($)"
                  error={errors.comparables?.[type]?.[index]?.netIncomeRental?.message}
                >
                  <Input
                    type="number"
                    {...register(`comparables.${type}.${index}.netIncomeRental` as const, { valueAsNumber: true })}
                    placeholder="e.g., 50000"
                    error={errors.comparables?.[type]?.[index]?.netIncomeRental?.message}
                  />
                </FormField>

                <FormField
                  label="Passing Rent ($)"
                  error={errors.comparables?.[type]?.[index]?.passingRent?.message}
                >
                  <Input
                    type="number"
                    {...register(`comparables.${type}.${index}.passingRent` as const, { valueAsNumber: true })}
                    placeholder="e.g., 60000"
                    error={errors.comparables?.[type]?.[index]?.passingRent?.message}
                  />
                </FormField>

                <FormField
                  label="NLA Rate ($/sqm)"
                  error={errors.comparables?.[type]?.[index]?.nlaRate?.message}
                >
                  <Input
                    type="number"
                    step="0.01"
                    {...register(`comparables.${type}.${index}.nlaRate` as const, { valueAsNumber: true })}
                    placeholder="Auto-calculated"
                    readOnly
                    style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                    error={errors.comparables?.[type]?.[index]?.nlaRate?.message}
                  />
                </FormField>

                <FormField
                  label="Yield (%)"
                  error={errors.comparables?.[type]?.[index]?.yield?.message}
                >
                  <Input
                    type="number"
                    step="0.01"
                    {...register(`comparables.${type}.${index}.yield` as const, { valueAsNumber: true })}
                    placeholder="Auto-calculated"
                    readOnly
                    style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                    error={errors.comparables?.[type]?.[index]?.yield?.message}
                  />
                </FormField>

                <FormField
                  label="Build Year"
                  error={errors.comparables?.[type]?.[index]?.buildYear?.message}
                >
                  <Input
                    type="number"
                    {...register(`comparables.${type}.${index}.buildYear` as const, { valueAsNumber: true })}
                    placeholder="e.g., 2005"
                    error={errors.comparables?.[type]?.[index]?.buildYear?.message}
                  />
                </FormField>

                <FormField
                  label="Days on Market"
                  error={errors.comparables?.[type]?.[index]?.daysOnMarket?.message}
                >
                  <Input
                    type="number"
                    {...register(`comparables.${type}.${index}.daysOnMarket` as const, { valueAsNumber: true })}
                    placeholder="e.g., 45"
                    error={errors.comparables?.[type]?.[index]?.daysOnMarket?.message}
                  />
                </FormField>

                <FormField
                  label={dateLabel}
                  error={errors.comparables?.[type]?.[index]?.saleLeaseDate?.message}
                >
                  <Input
                    type="date"
                    {...register(`comparables.${type}.${index}.saleLeaseDate` as const)}
                    error={errors.comparables?.[type]?.[index]?.saleLeaseDate?.message}
                  />
                </FormField>

                <FormField
                  label="Distance (km)"
                  error={errors.comparables?.[type]?.[index]?.distance?.message}
                >
                  <Input
                    type="number"
                    step="0.01"
                    {...register(`comparables.${type}.${index}.distance` as const, { valueAsNumber: true })}
                    placeholder="e.g., 1.2"
                    error={errors.comparables?.[type]?.[index]?.distance?.message}
                  />
                </FormField>

                <FormField
                  label="RP Data ID"
                  error={errors.comparables?.[type]?.[index]?.rpId?.message}
                >
                  <Input
                    {...register(`comparables.${type}.${index}.rpId` as const)}
                    placeholder="External reference ID"
                    error={errors.comparables?.[type]?.[index]?.rpId?.message}
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                  />
                </FormField>

                <FormField
                  label="Is Comparable"
                  error={errors.comparables?.[type]?.[index]?.isComparable?.message}
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      {...register(`comparables.${type}.${index}.isComparable` as const)}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        if (isChecked) {
                          // Uncheck all other comparables of the same type
                          const currentComparables = watch(`comparables.${type}`) ?? [];
                          currentComparables.forEach((_: any, i: number) => {
                            if (i !== index) {
                              setValue(`comparables.${type}.${i}.isComparable`, false, { shouldDirty: true });
                            }
                          });
                        }
                        // Set the current comparable's value
                        setValue(`comparables.${type}.${index}.isComparable`, isChecked, { shouldDirty: true });
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label className="text-sm text-gray-700">
                      This property is suitable for comparison
                    </label>
                  </div>
                </FormField>
              </div>

              {/* Description and Comparison Notes */}
              <div className="relative">
                <FormField
                  label="Description"
                  error={errors.comparables?.[type]?.[index]?.description?.message}
                >
                  <Textarea
                    {...register(`comparables.${type}.${index}.description` as const)}
                    placeholder="Brief description of the property..."
                    rows={3}
                    error={errors.comparables?.[type]?.[index]?.description?.message}
                  />
                </FormField>
                <button
                  type="button"
                  onClick={() => {
                    const comp = watch(`comparables.${type}.${index}`);
                    // Use the comparable's specific zoning if available, otherwise fallback to the subject property's zoning, or a placeholder
                    const subjectZone = watch('propertyDetails.zoning');
                    const zone = comp?.zoning || subjectZone || '[Zone]';
                    const buildingArea = comp?.buildingArea || '[building area]';
                    const distance = comp?.distance || '[distance]';
                    
                    const generatedText = `Commercial retail premises with a building area of approximately ${buildingArea} sqm, situated within the ${zone}. The property comprises a well-presented ground-floor commercial unit suitable for retail, showroom, or light commercial use, featuring an open-plan retail/display area, ancillary storage, staff amenities, and convenient on-site and street parking. The property is located approximately ${distance} km from the subject property.`;
                    
                    setValue(`comparables.${type}.${index}.description`, generatedText, { shouldDirty: true });
                  }}
                  className="absolute top-0 right-0 mt-1 mr-1 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
                >
                  <Sparkles className="w-3 h-3" /> Auto-generate
                </button>
              </div>

              {/* Comparison Notes and Auto-fill side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormField
                  label="Comparison Notes"
                  error={errors.comparables?.[type]?.[index]?.comparison?.message}
                >
                  <Textarea
                    {...register(`comparables.${type}.${index}.comparison` as const)}
                    placeholder="Summarise adjustments and comparability factors..."
                    rows={6}
                    error={errors.comparables?.[type]?.[index]?.comparison?.message}
                  />
                </FormField>

                {/* Auto-fill Comparison Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Auto-fill Options</label>
                  <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-2">
                    {/* Similar */}
                    <div className="flex items-center gap-2">
                      <div className="w-16 flex-shrink-0">
                        <span className="text-xs font-medium text-gray-700">Similar</span>
                      </div>
                      <select
                        value={similarDetail}
                        onChange={(e) => setSimilarDetail(e.target.value)}
                        className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
                      >
                        <option value="">Select...</option>
                        {COMPARISON_DETAIL_OPTIONS.map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>

                    {/* Inferior */}
                    <div className="flex items-center gap-2">
                      <div className="w-16 flex-shrink-0">
                        <span className="text-xs font-medium text-gray-700">Inferior</span>
                      </div>
                      <select
                        value={inferiorDetail}
                        onChange={(e) => setInferiorDetail(e.target.value)}
                        className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
                      >
                        <option value="">Select...</option>
                        {COMPARISON_DETAIL_OPTIONS.map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>

                    {/* Superior */}
                    <div className="flex items-center gap-2">
                      <div className="w-16 flex-shrink-0">
                        <span className="text-xs font-medium text-gray-700">Superior</span>
                      </div>
                      <select
                        value={superiorDetail}
                        onChange={(e) => setSuperiorDetail(e.target.value)}
                        className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
                      >
                        <option value="">Select...</option>
                        {COMPARISON_DETAIL_OPTIONS.map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>

                    {/* Overall */}
                    <div className="flex items-center gap-2">
                      <div className="w-16 flex-shrink-0">
                        <span className="text-xs font-medium text-gray-700">Overall</span>
                      </div>
                      <select
                        value={overallDetail}
                        onChange={(e) => setOverallDetail(e.target.value)}
                        className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
                      >
                        <option value="">Select...</option>
                        {OVERALL_DETAIL_OPTIONS.map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>

                    {/* Land Value (Land Valuation reports only) */}
                    {watch('valuationDetails.valuationType') === 'Land Valuation' && (
                      <div className="flex items-center gap-2">
                        <div className="w-16 flex-shrink-0">
                          <span className="text-xs font-medium text-gray-700">Land Value</span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          {...register(`comparables.${type}.${index}.landValue` as const, { valueAsNumber: true })}
                          placeholder="e.g., 165000"
                          className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const buildComparableFromRPItem = (item: any, fallbackAddress: string): Comparable => {
  const core = item.core || {};
  const sales = item.sales || {};
  const rapid = item.rapid || {};
  const listings = item.listings || {};

  return {
    id: core.propertyId?.toString() || `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    fullAddress: core.singleLineAddress || core.address?.singleLine || fallbackAddress || '',
    saleLeasePrice: sales.lastSoldPrice || sales.salePrice || undefined,
    imageUrl: core.propertyPhotoUri || rapid.imageUrls?.mediumImageUrl || '',
    bedrooms: core.bedrooms || rapid.beds ? Number(core.bedrooms || rapid.beds) : undefined,
    bathrooms: core.bathrooms || rapid.baths ? Number(core.bathrooms || rapid.baths) : undefined,
    carSpaces: core.carSpaces || rapid.carSpaces ? Number(core.carSpaces || rapid.carSpaces) : undefined,
    siteArea: core.landArea || rapid.landArea ? Number(core.landArea || rapid.landArea) : undefined,
    buildingArea: core.buildingArea || core.floorArea || rapid.buildingArea || rapid.floorArea ? Number(core.buildingArea || core.floorArea || rapid.buildingArea || rapid.floorArea) : undefined,
    buildYear: core.yearBuilt || rapid.yearBuilt ? Number(core.yearBuilt || rapid.yearBuilt) : undefined,
    daysOnMarket: sales.daysOnMarket || listings.daysOnMarket ? Number(sales.daysOnMarket || listings.daysOnMarket) : undefined,
    saleLeaseDate: sales.saleDate || '',
    distance: core.distance || rapid.distance || undefined,
    comparison: '',
    rpId: core.propertyId?.toString() || rapid.id?.toString() || '',
    photoUrl: core.propertyPhotoUri || rapid.imageUrls?.mediumImageUrl || '',
    isComparable: false
  };
};

const ComparableGroup: React.FC<SectionProps & { type: 'sales' | 'rentals'; title: string }> = ({
  register,
  errors,
  watch,
  setValue,
  type,
  title,
}) => {
  const comparables = watch(`comparables.${type}`) ?? [];

  // Auto-set lowestValueSqm / highestValueSqm from all comparables' nlaRate (sales only)
  useEffect(() => {
    if (type !== 'sales') return;
    const rates: number[] = comparables
      .map((c: any) => c.nlaRate)
      .filter((r: any) => typeof r === 'number' && !isNaN(r) && r > 0);
    if (rates.length === 0) return;
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    setValue('valuationDetails.lowestValueSqm' as any, Math.round(min * 100) / 100, { shouldDirty: true });
    setValue('valuationDetails.highestValueSqm' as any, Math.round(max * 100) / 100, { shouldDirty: true });
  }, [JSON.stringify(comparables.map((c: any) => c.nlaRate))]);

  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [addressSearch, setAddressSearch] = useState('');
  const [addressSearchResults, setAddressSearchResults] = useState<any[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [showAddressResults, setShowAddressResults] = useState(false);
  const [isFetchingComparable, setIsFetchingComparable] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Bulk Import state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkLogs, setBulkLogs] = useState<BulkLogEntry[]>([]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  // Reorder animation (FLIP)
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [pendingPositions, setPendingPositions] = useState<Record<string, DOMRect> | null>(null);

  const addComparable = () => {
    const newComparable: Comparable = {
      id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fullAddress: '',
      imageUrl: '',
      saleLeaseDate: '',
      comparison: '',
      rpId: '',
    };

    const currentComparables = watch(`comparables.${type}`) ?? [];
    setValue(`comparables.${type}`, [...currentComparables, newComparable], {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true
    });

    // Auto-expand the new card
    setExpandedCards(prev => new Set([...prev, currentComparables.length]));
  };

  const removeComparable = async (index: number) => {
    const currentComparables = watch(`comparables.${type}`) ?? [];
    const comparableToRemove = currentComparables[index];
    const reportId = watch('id') || 'temp';

    // Delete S3 photo if it exists and is from our bucket
    if (comparableToRemove?.photoUrl) {
      try {
        console.log('Deleting comparable photo from S3:', comparableToRemove.photoUrl);
        const deleteRes = await fetch(`${API_BASE_URL}/comparables-photos/delete/${reportId}/${type}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoUrl: comparableToRemove.photoUrl }),
        });

        if (deleteRes.ok) {
          console.log('S3 photo deleted successfully');
        } else {
          console.warn('Failed to delete S3 photo, but continuing with comparable removal');
        }
      } catch (error) {
        console.error('Error deleting S3 photo:', error);
        // Continue with removal even if S3 deletion fails
      }
    }

    // Remove from form state
    const updatedComparables = currentComparables.filter((_: any, i: number) => i !== index);
    setValue(`comparables.${type}`, updatedComparables, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true
    });

    // Update expanded cards
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      // Adjust indices for cards after the removed one
      const adjustedSet = new Set<number>();
      newSet.forEach(cardIndex => {
        if (cardIndex > index) {
          adjustedSet.add(cardIndex - 1);
        } else {
          adjustedSet.add(cardIndex);
        }
      });
      return adjustedSet;
    });
  };

  const toggleExpanded = (index: number) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleAddressSearch = async () => {
    if (!addressSearch.trim()) {
      alert('Please enter an address to search');
      return;
    }

    setIsSearchingAddress(true);
    setAddressSearchResults([]);

    try {
      const response = await fetch(`${API_BASE_URL}/rpdata/search-address?address=${encodeURIComponent(addressSearch)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Address search response:', data);

      // Extract the suggestions from the response
      if (data.success && data.data) {
        setAddressSearchResults(data.data);
        setShowAddressResults(true);
      } else {
        setAddressSearchResults([]);
        setShowAddressResults(true);
      }
    } catch (error) {
      console.error('Error searching address:', error);
      alert(`Error searching address: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setAddressSearchResults([]);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleBulkImport = async () => {
    const rawAddresses = bulkInput
      .split(/\r?\n/)
      .map(a => a.trim())
      .filter(a => a.length > 0);

    if (rawAddresses.length === 0) {
      alert('Please enter at least one address to import.');
      return;
    }

    const locationDetails = watch('locationDetails');
    const latitude = locationDetails?.latitude;
    const longitude = locationDetails?.longitude;

    if (!latitude || !longitude) {
      alert('Please enter property location coordinates (latitude/longitude) first in Location Details.');
      return;
    }

    setIsBulkProcessing(true);
    const initialLogs: BulkLogEntry[] = rawAddresses.map(addr => ({
      address: addr,
      status: 'pending'
    }));
    setBulkLogs(initialLogs);

    const newlyResolvedComparables: Comparable[] = [];
    const updatedLogs: BulkLogEntry[] = [...initialLogs];

    for (let i = 0; i < rawAddresses.length; i++) {
      const addr = rawAddresses[i];
      updatedLogs[i] = { ...updatedLogs[i], status: 'loading' };
      setBulkLogs([...updatedLogs]);

      try {
        // 1. Search address via RP Data
        const searchRes = await fetch(`${API_BASE_URL}/rpdata/search-address?address=${encodeURIComponent(addr)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!searchRes.ok) {
          throw new Error(`Address lookup failed (${searchRes.status})`);
        }

        const searchData = await searchRes.json();
        const suggestions = searchData?.data || [];

        if (!suggestions || suggestions.length === 0) {
          throw new Error('No matching property found in RP Data');
        }

        const topMatch = suggestions[0];
        const propertyId = topMatch.propertyId || topMatch.id;

        if (!propertyId) {
          throw new Error('No property ID found for address');
        }

        // 2. Fetch sales comparables by RP Data property ID
        const compRes = await fetch(`${API_BASE_URL}/rpdata/sales-comparables-by-id/${propertyId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: String(latitude),
            longitude: String(longitude),
          }),
        });

        if (!compRes.ok) {
          throw new Error(`Details fetch failed (${compRes.status})`);
        }

        const compData = await compRes.json();
        if (!compData.success || !compData.data) {
          throw new Error('No details returned from server');
        }

        let results = [];
        if (compData.data.data && Array.isArray(compData.data.data)) {
          results = compData.data.data;
        } else if (Array.isArray(compData.data)) {
          results = compData.data;
        } else if (compData.data.results && Array.isArray(compData.data.results)) {
          results = compData.data.results;
        } else {
          results = [compData.data];
        }

        if (results.length === 0) {
          throw new Error('No comparable sales records found for property');
        }

        const comparable = buildComparableFromRPItem(results[0], topMatch.singleLineAddress || addr);
        newlyResolvedComparables.push(comparable);

        updatedLogs[i] = {
          address: addr,
          status: 'success',
          propertyAddress: comparable.fullAddress,
          price: comparable.saleLeasePrice
        };
        setBulkLogs([...updatedLogs]);
      } catch (err: any) {
        console.error(`Error importing address "${addr}":`, err);
        updatedLogs[i] = {
          address: addr,
          status: 'error',
          message: err.message || 'Unknown error'
        };
        setBulkLogs([...updatedLogs]);
      }
    }

    if (newlyResolvedComparables.length > 0) {
      const currentComparables = watch(`comparables.${type}`) ?? [];
      const startIndex = currentComparables.length;
      const combined = [...currentComparables, ...newlyResolvedComparables];
      setValue(`comparables.${type}`, combined, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true
      });

      // Auto-expand newly added cards
      setExpandedCards(prev => {
        const next = new Set(prev);
        for (let idx = startIndex; idx < combined.length; idx++) {
          next.add(idx);
        }
        return next;
      });

      // Auto-save to report if ID exists
      const reportId = watch('id');
      if (reportId) {
        try {
          const formData = watch();
          await apiRepository.updateValuationReport(String(reportId), {
            ...formData,
            comparables: {
              ...(formData.comparables || {}),
              [type]: combined
            }
          } as any);
        } catch (saveErr) {
          console.warn('Auto-save after bulk comparables import failed:', saveErr);
        }
      }
    }

    setIsBulkProcessing(false);
  };

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowAddressResults(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowAddressResults(false);
      }
    };

    if (showAddressResults) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showAddressResults]);
  // Drag & drop reordering
  const handleDragStart = (index: number, e: React.DragEvent<HTMLDivElement>) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, overIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(overIndex);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    // Always clean up drag state when drag ends (successful drop or cancelled)
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (dropIndex: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (dragIndex === null || dragIndex === dropIndex) {
      handleDragEnd();
      return;
    }

    // Capture initial positions for FLIP
    const current = (watch(`comparables.${type}`) ?? []) as any[];
    const before: Record<string, DOMRect> = {};
    current.forEach((comp, i) => {
      const keyVal = `${type}_${comp.id || comp._id || i}`;
      const el = itemRefs.current[keyVal];
      if (el) before[keyVal] = el.getBoundingClientRect();
    });

    const reordered = [...current];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    setValue(`comparables.${type}` as const, reordered, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setPendingPositions(before);

    // Remap expanded cards to new indices to preserve state where possible
    setExpandedCards(prev => {
      const next = new Set<number>();
      prev.forEach(i => {
        let newIdx = i;
        if (i === dragIndex) newIdx = dropIndex;
        else if (dragIndex < dropIndex && i > dragIndex && i <= dropIndex) newIdx = i - 1;
        else if (dropIndex < dragIndex && i >= dropIndex && i < dragIndex) newIdx = i + 1;
        next.add(newIdx);
      });
      return next;
    });

    handleDragEnd();
  };

  // After DOM updates, animate from previous to new positions
  useLayoutEffect(() => {
    if (!pendingPositions) return;
    const currentList = (watch(`comparables.${type}`) ?? []) as any[];
    currentList.forEach((comp, i) => {
      const keyVal = `${type}_${comp.id || comp._id || i}`;
      const el = itemRefs.current[keyVal];
      const before = pendingPositions[keyVal];
      if (!el || !before) return;
      const after = el.getBoundingClientRect();
      const deltaY = before.top - after.top;
      const deltaX = before.left - after.left;
      if (deltaX !== 0 || deltaY !== 0) {
        el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        el.style.transition = 'transform 0s';
        // Force reflow
        void el.offsetWidth;
        el.style.transition = 'transform 200ms ease';
        el.style.transform = 'translate(0, 0)';
        const cleanup = () => {
          el.style.transition = '';
          el.removeEventListener('transitionend', cleanup);
        };
        el.addEventListener('transitionend', cleanup);
      }
    });
    setPendingPositions(null);
  }, [pendingPositions, setPendingPositions, type, watch]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        <button
          type="button"
          onClick={addComparable}
          className="group inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
          Add {type === 'sales' ? 'Sale' : 'Rental'}
        </button>
      </div>

      {/* Address Search */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            <h4 className="text-lg font-semibold text-gray-900">Search Address</h4>
          </div>
          <button
            type="button"
            onClick={() => {
              setBulkLogs([]);
              setShowBulkModal(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors shadow-xs"
            title="Paste multiple addresses to batch import all of them at once"
          >
            <ListPlus className="w-4 h-4 text-blue-600" />
            Bulk Paste Addresses
          </button>
        </div>

        <div className="relative" ref={searchContainerRef}>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                type="text"
                value={addressSearch}
                onPaste={(e) => {
                  const text = e.clipboardData?.getData('text') || '';
                  if (text.includes('\n')) {
                    e.preventDefault();
                    setBulkInput(text.trim());
                    setBulkLogs([]);
                    setShowBulkModal(true);
                  }
                }}
                onChange={(e) => {
                  const value = e.target.value;
                  setAddressSearch(value);

                  // Debounced auto-suggest: trigger search as user types (min 3 chars)
                  if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                  }

                  if (value.trim().length >= 3) {
                    debounceTimerRef.current = setTimeout(async () => {
                      try {
                        setIsSearchingAddress(true);
                        const response = await fetch(
                          `${API_BASE_URL}/rpdata/search-address?address=${encodeURIComponent(value)}`,
                          { method: 'GET', headers: { 'Content-Type': 'application/json' } }
                        );
                        if (!response.ok) throw new Error(`API request failed: ${response.status}`);
                        const data = await response.json();
                        if (data.success && data.data) {
                          setAddressSearchResults(data.data);
                          setShowAddressResults(true);
                        } else {
                          setAddressSearchResults([]);
                          setShowAddressResults(false);
                        }
                      } catch (err) {
                        console.error('Auto-suggest error:', err);
                      } finally {
                        setIsSearchingAddress(false);
                      }
                    }, 400);
                  } else {
                    // Too short — hide suggestions
                    setShowAddressResults(false);
                    setAddressSearchResults([]);
                  }
                }}
                onFocus={() => {
                  // Show cached results when clicking on the input
                  if (addressSearchResults.length > 0) {
                    setShowAddressResults(true);
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddressSearch();
                  }
                }}
                placeholder="Enter address to search (or paste multiple addresses)..."
                className="w-full"
              />
            </div>
            <button
              type="button"
              onClick={handleAddressSearch}
              disabled={isSearchingAddress || isFetchingComparable}
              className="inline-flex items-center px-6 py-3 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSearchingAddress ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Searching...
                </>
              ) : isFetchingComparable ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </button>
          </div>

          {/* Search Results Dropdown - Absolutely Positioned */}
          {showAddressResults && addressSearchResults.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-2">
              <div className="max-h-96 overflow-y-auto border border-gray-300 rounded-lg bg-white shadow-xl">
                {addressSearchResults.map((result: any, index: number) => (
                  <button
                    key={index}
                    type="button"
                    onClick={async () => {
                      console.log('Selected address:', result);
                      setShowAddressResults(false);
                      setAddressSearch('');
                      setAddressSearchResults([]);

                      // Get property ID from the result
                      const propertyId = result.propertyId || result.id;

                      if (!propertyId) {
                        console.error('No property ID found in result');
                        alert('No property ID found for this address');
                        return;
                      }

                      console.log('Fetching sales comparable for ID:', propertyId);
                      setIsFetchingComparable(true);

                      try {
                        // Get location details from form data
                        const locationDetails = watch('locationDetails');
                        const latitude = locationDetails?.latitude;
                        const longitude = locationDetails?.longitude;

                        if (!latitude || !longitude) {
                          console.error('No location details found in form');
                          alert('Please fill in the property location details first');
                          return;
                        }

                        const response = await fetch(`${API_BASE_URL}/rpdata/sales-comparables-by-id/${propertyId}`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            latitude: latitude,
                            longitude: longitude
                          }),
                        });

                        if (!response.ok) {
                          throw new Error(`API request failed: ${response.status}`);
                        }

                        const data = await response.json();
                        console.log('Sales comparable response:', data);

                        // Extract the first result from the data
                        if (data.success && data.data) {
                          let results = [];

                          // Handle different response structures
                          if (data.data.data && Array.isArray(data.data.data)) {
                            results = data.data.data;
                          } else if (Array.isArray(data.data)) {
                            results = data.data;
                          } else if (data.data.results && Array.isArray(data.data.results)) {
                            results = data.data.results;
                          } else {
                            // If it's a single object, wrap it in an array
                            results = [data.data];
                          }

                          if (results.length > 0) {
                            const item = results[0];

                            // Extract data from the nested structure (same as searchComparablesAPI)
                            const core = item.core || {};
                            const sales = item.sales || {};
                            const rapid = item.rapid || {};
                            const listings = item.listings || {};

                            const newComparable: Comparable = {
                              id: core.propertyId?.toString() || `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                              fullAddress: core.singleLineAddress || core.address?.singleLine || '',
                              saleLeasePrice: sales.lastSoldPrice || sales.salePrice || undefined,
                              imageUrl: core.propertyPhotoUri || rapid.imageUrls?.mediumImageUrl || '',
                              bedrooms: core.bedrooms || rapid.beds ? Number(core.bedrooms || rapid.beds) : undefined,
                              bathrooms: core.bathrooms || rapid.baths ? Number(core.bathrooms || rapid.baths) : undefined,
                              carSpaces: core.carSpaces || rapid.carSpaces ? Number(core.carSpaces || rapid.carSpaces) : undefined,
                              siteArea: core.landArea || rapid.landArea ? Number(core.landArea || rapid.landArea) : undefined,
                              buildingArea: core.buildingArea || core.floorArea || rapid.buildingArea || rapid.floorArea ? Number(core.buildingArea || core.floorArea || rapid.buildingArea || rapid.floorArea) : undefined,
                              buildYear: core.yearBuilt || rapid.yearBuilt ? Number(core.yearBuilt || rapid.yearBuilt) : undefined,
                              daysOnMarket: sales.daysOnMarket || listings.daysOnMarket ? Number(sales.daysOnMarket || listings.daysOnMarket) : undefined,
                              saleLeaseDate: sales.saleDate || '',
                              distance: core.distance || rapid.distance || undefined,
                              comparison: '',
                              rpId: core.propertyId?.toString() || rapid.id?.toString() || '',
                              photoUrl: core.propertyPhotoUri || rapid.imageUrls?.mediumImageUrl || '',
                              isComparable: false
                            };

                            console.log('Adding comparable:', newComparable);

                            // Add to the appropriate comparables list
                            const currentComparables = watch(`comparables.${type}`) ?? [];
                            setValue(`comparables.${type}`, [...currentComparables, newComparable], {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true
                            });

                            console.log(`Successfully added to ${type} comparables`);
                          } else {
                            console.warn('No results found in response');
                            alert('No property data found for this address');
                          }
                        } else {
                          console.warn('Unexpected response structure:', data);
                          alert('Unexpected response from server');
                        }
                      } catch (error) {
                        console.error('Error fetching sales comparable:', error);
                        alert(`Error fetching property details: ${error instanceof Error ? error.message : 'Unknown error'}`);
                      } finally {
                        setIsFetchingComparable(false);
                      }
                    }}
                    className="w-full text-left p-3 hover:bg-blue-50 border-b border-gray-200 last:border-b-0 transition-colors duration-150 focus:outline-none focus:bg-blue-50"
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {result.singleLineAddress || result.address || 'Unknown Address'}
                        </p>
                        {result.propertyId && (
                          <p className="text-xs text-gray-500 mt-1">
                            Property ID: {result.propertyId}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showAddressResults && addressSearchResults.length === 0 && (
            <div className="absolute z-50 left-0 right-0 mt-2">
              <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg border border-gray-300 shadow-xl">
                <p className="text-sm">No results found</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gradient-to-r from-blue-50/60 to-indigo-50/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                  <ListPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Bulk Add Comparables</h3>
                  <p className="text-xs text-gray-500">Paste multiple addresses below (one per line). Each will be added automatically as Comparable #1, #2, etc.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isBulkProcessing) {
                    setShowBulkModal(false);
                  }
                }}
                disabled={isBulkProcessing}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Address List (one address per line)
                  </label>
                  {bulkInput.trim() && (
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {bulkInput.split(/\r?\n/).filter(a => a.trim().length > 0).length} address{bulkInput.split(/\r?\n/).filter(a => a.trim().length > 0).length === 1 ? '' : 'es'} detected
                    </span>
                  )}
                </div>
                <textarea
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  disabled={isBulkProcessing}
                  rows={7}
                  placeholder={`26 SYDNEY STREET RYE VIC 3941\n416-424 DUNDAS STREET ST ANDREWS BEACH VIC 3941\n24 BETHANY CLOSE RYE VIC 3941\n19 AVON ROAD RYE VIC 3941\n9 EGERTON STREET BLAIRGOWRIE VIC 3942`}
                  className="w-full font-mono text-sm p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-y disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              {/* Real-time Progress Log */}
              {bulkLogs.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Import Progress</p>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {bulkLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs transition-all ${
                          log.status === 'loading'
                            ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                            : log.status === 'success'
                            ? 'bg-green-50/70 border-green-200 text-green-900'
                            : log.status === 'error'
                            ? 'bg-red-50/70 border-red-200 text-red-900'
                            : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          {log.status === 'loading' && (
                            <Loader2 className="w-4 h-4 text-blue-600 animate-spin mt-0.5 flex-shrink-0" />
                          )}
                          {log.status === 'success' && (
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          )}
                          {log.status === 'error' && (
                            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          )}
                          {log.status === 'pending' && (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">
                              #{idx + 1}: {log.address}
                            </p>
                            {log.propertyAddress && log.propertyAddress !== log.address && (
                              <p className="text-gray-500 text-[11px] truncate mt-0.5">
                                Matched: {log.propertyAddress}
                              </p>
                            )}
                            {log.message && (
                              <p className="text-red-600 font-medium text-[11px] mt-0.5">
                                {log.message}
                              </p>
                            )}
                          </div>
                        </div>
                        {log.price && (
                          <span className="font-bold text-gray-900 flex-shrink-0 bg-white px-2 py-0.5 rounded border border-gray-200 shadow-2xs">
                            ${Number(log.price).toLocaleString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setBulkInput('');
                  setBulkLogs([]);
                }}
                disabled={isBulkProcessing || !bulkInput.trim()}
                className="px-3 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 rounded-lg transition-colors disabled:opacity-40"
              >
                Clear
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  disabled={isBulkProcessing}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-50"
                >
                  {bulkLogs.some(l => l.status === 'success') ? 'Done' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={isBulkProcessing || !bulkInput.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBulkProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <ListPlus className="w-4 h-4" />
                      Import Comparables
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {comparables.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">No {type} comparables yet</h4>
          <p className="text-gray-600 mb-6">Add your first {type === 'sales' ? 'sale' : 'rental'} comparable to get started.</p>
          <button
            type="button"
            onClick={addComparable}
            className="group inline-flex items-center px-6 py-3 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            Add First {type === 'sales' ? 'Sale' : 'Rental'}
          </button>
        </div>
      ) : (
        <div className="space-y-4" ref={listRef}>
          {comparables.map((comparable, index: number) => {
            const keyVal = `${type}_${comparable.id || (comparable as any)._id || index}`;
            return (
              <div
                key={keyVal}
                draggable
                onDragStart={(e) => handleDragStart(index, e)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(index, e)}
                onDragEnd={handleDragEnd}
                ref={(el) => { itemRefs.current[keyVal] = el; }}
                className={`rounded-lg transition-all duration-200 ${dragIndex === index
                  ? 'opacity-50 scale-95'
                  : dragOverIndex === index && dragIndex !== null && dragIndex !== index
                    ? 'border-2 border-blue-500 shadow-lg'
                    : ''
                  }`}
                style={{ cursor: dragIndex === index ? 'grabbing' : 'grab' }}
              >
                <ComparableCard
                  comparable={comparable}
                  index={index}
                  type={type}
                  register={register}
                  errors={errors}
                  onRemove={removeComparable}
                  isExpanded={expandedCards.has(index)}
                  onToggleExpanded={() => toggleExpanded(index)}
                  reportId={watch('id') || 'temp'}
                  setValue={setValue}
                  watch={watch}
                />
              </div>
            );
          })}
        </div>
      )}

      {comparables.length > 0 && (
        <div className="text-center">
          <button
            type="button"
            onClick={addComparable}
            className="group inline-flex items-center px-6 py-3 text-sm font-bold rounded-xl text-gray-700 bg-white border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300 transform hover:scale-105"
          >
            <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            Add Another {type === 'sales' ? 'Sale' : 'Rental'}
          </button>
        </div>
      )}
    </div>
  );
};

export const ComparablesSection: React.FC<SectionProps> = (props) => {
  const { watch } = props;
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const [selectedSort, setSelectedSort] = useState('+distance');
  const [selectedDataType, setSelectedDataType] = useState<'sales' | 'rentals'>('sales');
  const [offset, setOffset] = useState(0);
  const [addedToSales, setAddedToSales] = useState<Set<string>>(new Set());
  const [addedToRentals, setAddedToRentals] = useState<Set<string>>(new Set());

  // Get existing rpIds from current comparables
  const existingSalesRpIds = new Set(
    (watch('comparables.sales') ?? [])
      .map((comp: any) => comp.rpId)
      .filter((rpId: string) => rpId && rpId.trim() !== '')
  );

  const existingRentalsRpIds = new Set(
    (watch('comparables.rentals') ?? [])
      .map((comp: any) => comp.rpId)
      .filter((rpId: string) => rpId && rpId.trim() !== '')
  );

  const [formState, setFormState] = useState<SearchFormState>(() => {
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);

    return {
      propertyType: [],
      radius: '2',
      targetSuburb: false,
      customDate: false,
      predefinedPeriod: '6',
      bedroomRange: [0, 6],
      bathroomRange: [0, 6],
      carSpacesRange: [0, 6],
      soldWithinStart: sixMonthsAgo.toISOString().split('T')[0],
      soldWithinEnd: today.toISOString().split('T')[0],
      landSizeMin: '',
      landSizeMax: '',
      priceMin: '',
      priceMax: ''
    };
  });

  const [appliedFilters, setAppliedFilters] = useState<SearchFormState>(() => {
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);

    return {
      propertyType: [],
      radius: '2',
      bedroomRange: [0, 6],
      bathroomRange: [0, 6],
      carSpacesRange: [0, 6],
      soldWithinStart: sixMonthsAgo.toISOString().split('T')[0],
      soldWithinEnd: today.toISOString().split('T')[0],
      landSizeMin: '',
      landSizeMax: '',
      priceMin: '',
      priceMax: '',
      targetSuburb: false,
      customDate: false,
      predefinedPeriod: '6'
    };
  });

  const calculateDateRange = (periodInMonths: number): { start: string, end: string } => {
    const end = new Date();
    const start = new Date();

    const currentDay = start.getDate();

    if (periodInMonths >= 12) {
      const years = Math.floor(periodInMonths / 12);
      const remainingMonths = periodInMonths % 12;
      start.setFullYear(start.getFullYear() - years);
      if (remainingMonths > 0) {
        start.setDate(1);
        start.setMonth(start.getMonth() - remainingMonths);
        const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
        start.setDate(Math.min(currentDay, daysInMonth));
      }
    } else {
      start.setDate(1);
      start.setMonth(start.getMonth() - periodInMonths);
      const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      start.setDate(Math.min(currentDay, daysInMonth));
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  const handleSearch = async (isLoadMore: boolean = false) => {
    if (formState.propertyType.length === 0) {
      alert('Please select at least one property type');
      return;
    }

    setIsSearching(true);

    const currentOffset = isLoadMore ? offset + 1 : 0;

    if (!isLoadMore) {
      setSearchResults([]);
      setOffset(0);
      setHasMoreResults(true);
      // Reset tracking sets for new search
      setAddedToSales(new Set());
      setAddedToRentals(new Set());
    } else {
      setOffset(currentOffset);
    }

    // Update applied filters
    let updatedStart = formState.soldWithinStart;
    let updatedEnd = formState.soldWithinEnd;

    if (!formState.customDate) {
      const periodInMonths = parseInt(formState.predefinedPeriod);
      const dateRange = calculateDateRange(periodInMonths);
      updatedStart = dateRange.start;
      updatedEnd = dateRange.end;
    }

    setAppliedFilters({
      propertyType: [...formState.propertyType],
      radius: formState.radius,
      bedroomRange: [...formState.bedroomRange],
      bathroomRange: [...formState.bathroomRange],
      carSpacesRange: [...formState.carSpacesRange],
      soldWithinStart: updatedStart,
      soldWithinEnd: updatedEnd,
      landSizeMin: formState.landSizeMin,
      landSizeMax: formState.landSizeMax,
      priceMin: formState.priceMin,
      priceMax: formState.priceMax,
      targetSuburb: formState.targetSuburb,
      customDate: formState.customDate,
      predefinedPeriod: formState.predefinedPeriod
    });

    try {
      // Get location details from form data
      const locationDetails = watch('locationDetails');
      const latitude = locationDetails?.latitude ? parseFloat(locationDetails.latitude) : undefined;
      const longitude = locationDetails?.longitude ? parseFloat(locationDetails.longitude) : undefined;

      // Use the API integration function
      const results = await searchComparablesAPI({
        ...formState,
        sort: selectedSort,
        offset: currentOffset,
        selectedDataType: selectedDataType,
        lat: latitude,
        lon: longitude
      });

      if (isLoadMore && results.length === 0) {
        setHasMoreResults(false);
      }

      setSearchResults(prev => isLoadMore ? [...prev, ...results] : results);
    } catch (error) {
      console.error('Error searching comparables:', error);
      if (!isLoadMore) {
        setSearchResults([]);
      }
      setHasMoreResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  const saveComparableToDatabase = async (comparable: Comparable, type: 'sales' | 'rentals') => {
    try {
      const reportId = props.watch('id');
      console.log('Saving comparable to database:', { reportId, type, comparable });

      if (!reportId) {
        console.error('No report ID found for saving comparable');
        return false;
      }

      // Get current comparables
      const currentComparables = props.watch(`comparables.${type}`) ?? [];
      const updatedComparables = [...currentComparables, comparable];

      // Prepare the update data
      const updateData = {
        comparables: {
          ...props.watch('comparables'),
          [type]: updatedComparables
        }
      };

      console.log('Update data:', updateData);

      // Call the API to save to database
      const response = await fetch(`${API_BASE_URL}/api/valuation-reports/${reportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to save comparable to database:', errorData);
        return false;
      }

      const responseData = await response.json();
      console.log('Comparable saved to database successfully:', responseData);
      return true;
    } catch (error) {
      console.error('Error saving comparable to database:', error);
      return false;
    }
  };

  const handleAddToSales = async (result: SearchResult) => {
    try {
      console.log('Adding to sales:', result);

      // Convert search result to comparable and add to sales
      const newComparable: Comparable = {
        id: result.id,
        fullAddress: result.fullAddress,
        saleLeasePrice: result.saleLeasePrice,
        imageUrl: result.imageUrl,
        bedrooms: result.bedrooms ? Number(result.bedrooms) : undefined,
        bathrooms: result.bathrooms ? Number(result.bathrooms) : undefined,
        carSpaces: result.carSpaces ? Number(result.carSpaces) : undefined,
        siteArea: result.siteArea ? Number(result.siteArea) : undefined,
        buildingArea: result.buildingArea ? Number(result.buildingArea) : undefined,
        buildYear: result.buildYear ? Number(result.buildYear) : undefined,
        daysOnMarket: result.daysOnMarket ? Number(result.daysOnMarket) : undefined,
        saleLeaseDate: result.saleLeaseDate,
        distance: result.distance,
        comparison: result.comparison,
        rpId: result.rpId,
        photoUrl: result.photoUrl,
        isComparable: result.isComparable
      };

      console.log('Created comparable:', newComparable);

      // Add to sales comparables in form state
      const currentSales = props.watch('comparables.sales') ?? [];
      console.log('Current sales:', currentSales);

      props.setValue('comparables.sales', [...currentSales, newComparable], {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true
      });

      console.log('Added to form state, saving to database...');

      // Save to database immediately
      const saved = await saveComparableToDatabase(newComparable, 'sales');
      if (!saved) {
        console.error('Failed to save to database, reverting form state');
        // If save failed, remove from form state
        props.setValue('comparables.sales', currentSales, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true
        });
        alert('Failed to save comparable to database. Please try again.');
        return;
      }

      console.log('Successfully saved to database');

      // Mark as added to sales
      setAddedToSales(prev => new Set([...prev, result.id]));

      console.log('Successfully added to sales');
    } catch (error) {
      console.error('Error adding to sales:', error);
      alert(`Error adding to sales: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAddToRentals = async (result: SearchResult) => {
    try {
      console.log('Adding to rentals:', result);

      // Convert search result to comparable and add to rentals
      const newComparable: Comparable = {
        id: result.id,
        fullAddress: result.fullAddress,
        saleLeasePrice: result.saleLeasePrice,
        imageUrl: result.imageUrl,
        bedrooms: result.bedrooms ? Number(result.bedrooms) : undefined,
        bathrooms: result.bathrooms ? Number(result.bathrooms) : undefined,
        carSpaces: result.carSpaces ? Number(result.carSpaces) : undefined,
        siteArea: result.siteArea ? Number(result.siteArea) : undefined,
        buildingArea: result.buildingArea ? Number(result.buildingArea) : undefined,
        buildYear: result.buildYear ? Number(result.buildYear) : undefined,
        daysOnMarket: result.daysOnMarket ? Number(result.daysOnMarket) : undefined,
        saleLeaseDate: result.saleLeaseDate,
        distance: result.distance,
        comparison: result.comparison,
        rpId: result.rpId,
        photoUrl: result.photoUrl,
        isComparable: result.isComparable
      };

      console.log('Created comparable:', newComparable);

      // Add to rentals comparables in form state
      const currentRentals = props.watch('comparables.rentals') ?? [];
      console.log('Current rentals:', currentRentals);

      props.setValue('comparables.rentals', [...currentRentals, newComparable], {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true
      });

      console.log('Added to form state, saving to database...');

      // Save to database immediately
      const saved = await saveComparableToDatabase(newComparable, 'rentals');
      if (!saved) {
        console.error('Failed to save to database, reverting form state');
        // If save failed, remove from form state
        props.setValue('comparables.rentals', currentRentals, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true
        });
        alert('Failed to save comparable to database. Please try again.');
        return;
      }

      console.log('Successfully saved to database');

      // Mark as added to rentals
      setAddedToRentals(prev => new Set([...prev, result.id]));

      console.log('Successfully added to rentals');
    } catch (error) {
      console.error('Error adding to rentals:', error);
      alert(`Error adding to rentals: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLoadMore = () => {
    handleSearch(true);
  };

  const handleSortChange = (sort: string) => {
    setSelectedSort(sort);
    setOffset(0);
    handleSearch(false);
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Comparables</h2>
          <p className="text-gray-600">Record sales and rental evidence supporting the valuation.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowSearchForm(!showSearchForm)}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
        >
          <Search className="w-4 h-4 mr-2" />
          {showSearchForm ? 'Hide Search' : 'Search Comparables'}
        </button>
      </div>

      {showSearchForm && (
        <>
          <SearchForm
            formState={formState}
            setFormState={setFormState}
            onSearch={() => handleSearch(false)}
            isSearching={isSearching}
            appliedFilters={appliedFilters}
            selectedDataType={selectedDataType}
            onDataTypeChange={setSelectedDataType}
          />

          {searchResults.length > 0 && (
            <SearchResults
              searchResults={searchResults}
              onSelectResult={handleAddToSales}
              onAddToSales={handleAddToSales}
              onAddToRentals={handleAddToRentals}
              isSearching={isSearching}
              hasMoreResults={hasMoreResults}
              onLoadMore={handleLoadMore}
              selectedSort={selectedSort}
              onSortChange={handleSortChange}
              addedToSales={addedToSales}
              addedToRentals={addedToRentals}
              existingSalesRpIds={existingSalesRpIds}
              existingRentalsRpIds={existingRentalsRpIds}
            />
          )}
        </>
      )}

      <ComparableGroup {...props} type="sales" title="Sales Comparables" />
      <ComparableGroup {...props} type="rentals" title="Rental Comparables" />

      {/* Rental Assessment */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Rental Assessment</h3>
          <p className="text-sm text-gray-500 mt-1">These values populate the Rental Assessment paragraph in the commercial report.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lowest Rental Rate ($/sqm)</label>
            <input
              type="number"
              step="0.01"
              {...props.register('valuationDetails.lowestRentalRate' as any, { valueAsNumber: true })}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Highest Rental Rate ($/sqm)</label>
            <input
              type="number"
              step="0.01"
              {...props.register('valuationDetails.highestRentalRate' as any, { valueAsNumber: true })}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lowest Building Area (sqm)</label>
            <input
              type="number"
              step="1"
              {...props.register('valuationDetails.lowestBuildingArea' as any, { valueAsNumber: true })}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Highest Building Area (sqm)</label>
            <input
              type="number"
              step="1"
              {...props.register('valuationDetails.highestBuildingArea' as any, { valueAsNumber: true })}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Property NLA (sqm)</label>
            <input
              type="number"
              step="1"
              {...props.register('valuationDetails.subjectNla' as any, { valueAsNumber: true })}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Property Rate ($/sqm)</label>
            <input
              type="number"
              step="0.01"
              {...props.register('valuationDetails.subjectRentalRate' as any, { valueAsNumber: true })}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Net Market Rent ($)</label>
            <input
              type="number"
              step="0.01"
              {...props.register('valuationDetails.netMarketRent' as any, { valueAsNumber: true })}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        {/* Live preview */}
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-1">
          <p className="font-medium text-gray-900">Preview (as it will appear in the report):</p>
          <p>The rentals identified above reflect a broad rate range in the order of ${props.watch('valuationDetails.lowestRentalRate' as any) || '0.00'} to ${props.watch('valuationDetails.highestRentalRate' as any) || '0.00'} per square metre per annum net plus GST with relevant floor sizes ranging from {props.watch('valuationDetails.lowestBuildingArea' as any) || 0} to {props.watch('valuationDetails.highestBuildingArea' as any) || 0} square metres.</p>
          <p>Subject Property NLA {props.watch('valuationDetails.subjectNla' as any) || 0} sqm @${props.watch('valuationDetails.subjectRentalRate' as any) || '0.00'}/sqm = ${props.watch('valuationDetails.netMarketRent' as any) || '0.00'} (Net Market Rent)</p>
        </div>
      </div>
    </div>

  );
};