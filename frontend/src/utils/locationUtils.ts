import { getApiUrl } from '@/lib/api-config';
// Australian CBD coordinates for accurate distance calculation
export const CBD_COORDINATES: Record<string, { lat: number; lng: number; name: string }> = {
  'NSW': { lat: -33.8688, lng: 151.2093, name: 'Sydney CBD' },
  'VIC': { lat: -37.8136, lng: 144.9631, name: 'Melbourne CBD' },
  'QLD': { lat: -27.4698, lng: 153.0251, name: 'Brisbane CBD' },
  'WA': { lat: -31.9505, lng: 115.8605, name: 'Perth CBD' },
  'SA': { lat: -34.9285, lng: 138.6007, name: 'Adelaide CBD' },
  'ACT': { lat: -35.2809, lng: 149.1300, name: 'Canberra CBD' },
  'NT': { lat: -12.4634, lng: 130.8456, name: 'Darwin CBD' },
  'TAS': { lat: -42.8821, lng: 147.3272, name: 'Hobart CBD' }
};

// Enhanced transport type mapping from Google Places types
export const TRANSPORT_TYPE_MAPPING: Record<string, string> = {
  'bus_station': 'bus_stop',
  'subway_station': 'metro_station',
  'train_station': 'train_station',
  'light_rail_station': 'tram_stop',
  'transit_station': 'train_station',
  'airport': 'airport',
  'establishment': 'train_station' // Fallback for transit establishments
};

// Enhanced shop type mapping from Google Places types
export const SHOP_TYPE_MAPPING: Record<string, string> = {
  'shopping_mall': 'shopping_center',
  'supermarket': 'supermarket',
  'convenience_store': 'convenience_store',
  'department_store': 'department_store',
  'store': 'retail_strip',
  'establishment': 'shopping_center' // Fallback for shop establishments
};

// Calculate distance using Haversine formula (more accurate for Australian coordinates)
export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
};

// Helper function to convert degrees to radians
const toRadians = (degrees: number): number => degrees * (Math.PI / 180);

// Get optimal unit for distance display
export const getOptimalUnit = (distanceKm: number): { distance: number; unit: string } => {
  if (distanceKm < 1) {
    return { distance: Math.round(distanceKm * 1000), unit: 'm' };
  } else {
    return { distance: Math.round(distanceKm * 10) / 10, unit: 'km' };
  }
};

// Enhanced transport type detection with better Australian context
export const detectTransportType = (place: any): string => {
  if (!place) return 'train_station';
  
  const name = place.name?.toLowerCase() || '';
  const types = place.types || [];
  
  console.log(`🔍 Detecting transport type for: ${place.name}`);
  console.log(`🔍 Types: ${types.join(', ')}`);
  console.log(`🔍 Name: ${name}`);
  
  // Bus detection - most specific first
  if (types.includes('bus_station') || 
      name.includes('bus stop') || 
      name.includes('bus station') ||
      name.includes('bus interchange')) {
    console.log(`🚌 Detected as: bus_stop`);
    return 'bus_stop';
  }
  
  // Metro/Subway detection
  if (types.includes('subway_station') || 
      name.includes('metro') || 
      name.includes('subway')) {
    console.log(`🚇 Detected as: metro_station`);
    return 'metro_station';
  }
  
  // Light rail detection
  if (types.includes('light_rail_station') || 
      name.includes('light rail') ||
      name.includes('tram')) {
    console.log(`🚋 Detected as: tram_stop`);
    return 'tram_stop';
  }
  
  // Ferry detection
  if (name.includes('ferry') || 
      name.includes('wharf') ||
      name.includes('pier')) {
    console.log(`⛴️ Detected as: ferry_terminal`);
    return 'ferry_terminal';
  }
  
  // Airport detection
  if (types.includes('airport') || 
      name.includes('airport') ||
      name.includes('airfield')) {
    console.log(`✈️ Detected as: airport`);
    return 'airport';
  }
  
  // Train station (default for railway/train)
  if (types.includes('train_station') || 
      types.includes('transit_station') ||
      name.includes('train') || 
      name.includes('railway') ||
      name.includes('station')) {
    console.log(`🚆 Detected as: train_station`);
    return 'train_station';
  }
  
  // Default fallback
  console.log(`❓ Defaulting to: train_station`);
  return 'train_station';
};

// Enhanced shop type detection with Australian retail context
export const detectShopType = (place: any): string => {
  // Check place types for shop type detection
  for (const type of place.types || []) {
    if (SHOP_TYPE_MAPPING[type]) {
      return SHOP_TYPE_MAPPING[type];
    }
  }
  
  // Enhanced name-based detection for Australian retail
  const name = place.name?.toLowerCase() || '';
  
  // Shopping centers (Australian terms)
  if (name.includes('mall') || name.includes('center') || name.includes('centre') || 
      name.includes('plaza') || name.includes('westfield')) return 'shopping_center';
  
  // Supermarkets (Australian chains)
  if (name.includes('supermarket') || name.includes('grocery') || 
      name.includes('coles') || name.includes('woolworths') || 
      name.includes('iga') || name.includes('aldi')) return 'supermarket';
  
  // Convenience stores
  if (name.includes('convenience') || name.includes('7-eleven') || 
      name.includes('night owl')) return 'convenience_store';
  
  // Department stores
  if (name.includes('department') || name.includes('myer') || 
      name.includes('david jones') || name.includes('target') || 
      name.includes('kmart') || name.includes('big w')) return 'department_store';
  
  return 'shopping_center'; // Default fallback
};

// Calculate CBD distance (keeping for backward compatibility)
export const getCBDDistance = (lat: number, lng: number, state: string): { distance: number; unit: string; name: string } => {
  const stateUpper = state?.toUpperCase();
  const cbdData = CBD_COORDINATES[stateUpper] || CBD_COORDINATES.NSW; // Default to Sydney
  
  const distance = calculateDistance(lat, lng, cbdData.lat, cbdData.lng);
  const unitData = getOptimalUnit(distance);
  
  return {
    distance: unitData.distance,
    unit: unitData.unit,
    name: cbdData.name
  };
};

// Enhanced CBD travel time calculation with better error handling
export const getCBDTravelTime = async (lat: number, lng: number, state: string): Promise<{ distance: number; unit: string; name: string; travelTime: string }> => {
  const stateUpper = state?.toUpperCase();
  const cbdData = CBD_COORDINATES[stateUpper] || CBD_COORDINATES.NSW; // Default to Sydney
  
  const distance = calculateDistance(lat, lng, cbdData.lat, cbdData.lng);
  const unitData = getOptimalUnit(distance);
  
  try {
    // Calculate travel time using Distance Matrix API
    const origins = `${lat},${lng}`;
    const destinations = `${cbdData.lat},${cbdData.lng}`;
    const url = getApiUrl(`/google-maps/distance-matrix?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destinations)}&mode=driving`);
    
    const data = await makeApiRequest(url);
    
    let travelTime = 'N/A';
    if (data.status === 'OK' && data.rows?.[0]?.elements?.[0]?.status === 'OK') {
      travelTime = data.rows[0].elements[0].duration.text;
    } else {
      console.warn('Distance Matrix API response:', data);
      // Estimate travel time based on distance (rough calculation)
      const estimatedMinutes = Math.round(unitData.distance * (unitData.unit === 'km' ? 1.5 : 0.0015));
      travelTime = `~${estimatedMinutes} mins (estimated)`;
    }
    
    return {
      distance: unitData.distance,
      unit: unitData.unit,
      name: cbdData.name,
      travelTime: travelTime
    };
  } catch (err) {
    console.warn('Failed to calculate travel time to CBD:', err);
    // Provide estimated travel time based on distance
    const estimatedMinutes = Math.round(unitData.distance * (unitData.unit === 'km' ? 1.5 : 0.0015));
    return {
      distance: unitData.distance,
      unit: unitData.unit,
      name: cbdData.name,
      travelTime: `~${estimatedMinutes} mins (estimated)`
    };
  }
};

// Enhanced API request handler with better error handling and retry logic
export const makeApiRequest = async (url: string, retries = 3): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      console.log(`🌐 Making API request (attempt ${i + 1}/${retries}):`, url);
      
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        throw new Error('API requests must be made from the browser');
      }
      
      // Check network connectivity
      if (!navigator.onLine) {
        throw new Error('No internet connection detected');
      }
      
      const response = await fetch(url, {
        signal: controller.signal,
        method: 'GET',
        // Avoid custom headers on simple GETs to prevent CORS preflight failures
        credentials: 'same-origin'
      });
      
      clearTimeout(timeoutId);
      
      console.log(`🌐 Response received: status ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        let errorDetails = '';
        try {
          const errorText = await response.text();
          errorDetails = errorText ? ` - ${errorText}` : '';
          console.error(`🌐 HTTP error response body:`, errorText);
        } catch (parseErr) {
          console.warn('🌐 Could not read error response body');
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorDetails}`);
      }
      
      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        console.error('🌐 Failed to parse JSON response:', parseErr);
        throw new Error('Invalid JSON response from server');
      }
      
      console.log(`🌐 API response status:`, data.status || 'no status field');
      
      if (data.error) {
        console.error('🌐 API returned error:', data.error);
        throw new Error(data.error);
      }
      
      // Handle Google API specific error statuses
      if (data.status === 'OVER_QUERY_LIMIT') {
        throw new Error('Google API quota exceeded. Please try again later.');
      }
      
      if (data.status === 'REQUEST_DENIED') {
        console.error('🌐 Google API request denied - check API key configuration');
        throw new Error('Google API request denied. Please check your API key.');
      }
      
      if (data.status === 'ZERO_RESULTS') {
        console.warn('🌐 No results found for request:', url);
        return { results: [], status: 'ZERO_RESULTS' };
      }
      
      console.log('🌐 API request successful');
      return data;
      
    } catch (err: any) {
      console.error(`🌐 API request attempt ${i + 1} failed:`, {
        error: err.message,
        name: err.name,
        stack: err.stack?.substring(0, 200),
        url: url
      });
      
      // Specific error handling
      if (err.name === 'AbortError') {
        console.error('🌐 Request timed out after 30 seconds');
        if (i === retries - 1) {
          throw new Error('Request timeout - API took too long to respond');
        }
      } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
        console.error('🌐 Network error - check internet connection');
        if (i === retries - 1) {
          throw new Error('Network error - unable to connect to server. Please check your internet connection.');
        }
      } else {
        // For other errors, fail immediately on last retry
        if (i === retries - 1) throw err;
      }
      
      // Progressive backoff: wait longer between retries
      const waitTime = Math.min(Math.pow(2, i) * 1000, 10000); // Max 10 seconds
      console.log(`🌐 Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};

// Enhanced nearby places search with multiple strategies
export const searchNearbyPlaces = async (lat: number, lng: number, type: string, keyword?: string): Promise<any[]> => {
  try {
    console.log(`Searching for ${type} near ${lat}, ${lng}${keyword ? ` with keyword: ${keyword}` : ''}`);
    
    let url = getApiUrl(`/google-maps/places?lat=${lat}&lng=${lng}&type=${type}`);
    if (keyword) {
      url += `&keyword=${encodeURIComponent(keyword)}`;
    }
    
    const data = await makeApiRequest(url);
    
    let results = data.results || [];
    console.log(`Found ${results.length} results for ${type}`);
    
    // Filter out any invalid results
    results = results.filter((place: any) => 
      place.geometry && 
      place.geometry.location && 
      place.name &&
      place.place_id
    );
    
    // If we have very few results, try a broader search
    if (results.length < 2 && !keyword) {
      console.log(`Few results found for ${type}, trying broader search...`);
      
      // Try alternative type searches for better coverage
      let alternativeTypes: string[] = [];
      
      if (type === 'train_station') {
        alternativeTypes = ['transit_station', 'subway_station'];
      } else if (type === 'school') {
        alternativeTypes = ['primary_school', 'secondary_school'];
      } else if (type === 'supermarket') {
        alternativeTypes = ['grocery_or_supermarket', 'store'];
      } else if (type === 'shopping_mall') {
        alternativeTypes = ['shopping_mall', 'store'];
      }
      
      for (const altType of alternativeTypes) {
        try {
          const altUrl = getApiUrl(`/google-maps/places?lat=${lat}&lng=${lng}&type=${altType}`);
          const altData = await makeApiRequest(altUrl);
          const altResults = (altData.results || []).filter((place: any) => 
            place.geometry && place.geometry.location && place.name && place.place_id
          );
          
          // Merge results, avoiding duplicates
          const existingIds = new Set(results.map((r: any) => r.place_id));
          const newResults = altResults.filter((r: any) => !existingIds.has(r.place_id));
          results = [...results, ...newResults];
          
          console.log(`Alternative search for ${altType} found ${altResults.length} additional results`);
        } catch (err) {
          console.warn(`Alternative search for ${altType} failed:`, err);
        }
      }
    }
    
    // Sort by actual distance and return top 5
    const sortedResults = results
      .map((place: any) => ({
        ...place,
        calculatedDistance: calculateDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng)
      }))
      .sort((a: any, b: any) => a.calculatedDistance - b.calculatedDistance)
      .slice(0, 5);
    
    console.log(`Returning ${sortedResults.length} sorted results for ${type}`);
    return sortedResults;
    
  } catch (err) {
    console.error(`Failed to search ${type}:`, err);
    return [];
  }
};

// Enhanced geocoding with better error handling
export const geocodeAddress = async (address: string): Promise<any> => {
  try {
    console.log('Geocoding address:', address);
    const url = getApiUrl(`/google-maps/geocode?address=${encodeURIComponent(address)}`);
    const data = await makeApiRequest(url);
    
    if (data.status !== 'OK') {
      console.warn('Geocoding failed with status:', data.status);
      if (data.status === 'ZERO_RESULTS') {
        throw new Error('Address not found. Please check the spelling and try again.');
      }
      throw new Error(`Geocoding failed: ${data.status}`);
    }
    
    console.log('Geocoding successful');
    return data;
  } catch (err) {
    console.error('Geocoding error:', err);
    throw err;
  }
};

// Helper function to validate coordinates
export const isValidCoordinate = (lat: number, lng: number): boolean => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

// Helper function to format place name for display
export const formatPlaceName = (place: any): string => {
  if (!place || !place.name) return 'Unknown';
  
  let name = place.name.trim();
  
  // Handle specific patterns for transport stations
  const transportPatterns = [
    / Station$/i,
    / Railway Station$/i,
    / Train Station$/i,
    / Metro Station$/i,
    / Bus Station$/i,
    / Bus Stop$/i,
    / Interchange$/i,
    / Terminal$/i
  ];
  
  // For transport-related places, keep important identifiers but clean up redundancy
  const isTransport = place.types?.some((type: string) => 
    type.includes('station') || 
    type.includes('transit') || 
    type.includes('bus') ||
    type.includes('train')
  );
  
  if (isTransport) {
    // Remove common redundant suffixes but keep the type if it's important
    for (const pattern of transportPatterns) {
      if (pattern.test(name)) {
        // Only remove "Station" if the name already clearly indicates it's a station
        if (pattern.source.includes('Station') && 
            (name.toLowerCase().includes('railway') || 
             name.toLowerCase().includes('train') ||
             name.toLowerCase().includes('metro') ||
             name.toLowerCase().includes('bus'))) {
          name = name.replace(pattern, '').trim();
        }
        break;
      }
    }
  } else {
    // For non-transport places, remove common suffixes
    const suffixesToRemove = [
      / Shopping Centre$/i,
      / Shopping Center$/i,
      / Shopping Mall$/i,
      / School$/i,
      / Primary School$/i,
      / High School$/i,
      / Supermarket$/i,
      / Store$/i
    ];
    
    for (const suffix of suffixesToRemove) {
      if (suffix.test(name)) {
        name = name.replace(suffix, '').trim();
        break;
      }
    }
  }
  
  // Clean up any remaining double spaces
  name = name.replace(/\s+/g, ' ').trim();
  
  // Ensure we don't return an empty string
  if (!name || name.length === 0) {
    return place.name; // Return original name if cleaning resulted in empty string
  }
  
  return name;
}; 

// High-level helper to build a single string address for geocoding
export const buildFullAddress = (address: {
  fullAddress?: string;
  unitNumber?: string;
  streetName?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
}): string => {
  if (address.fullAddress && address.fullAddress.trim().length > 0) {
    return address.fullAddress.trim();
  }
  const parts = [
    address.unitNumber && address.unitNumber.trim(),
    address.streetName && address.streetName.trim(),
    address.suburb && address.suburb.trim(),
    address.state && address.state.trim(),
    address.postcode && address.postcode.trim(),
  ].filter(Boolean) as string[];
  return parts.join(', ');
};

export interface NearestItemResult {
  name: string;
  type?: string;
  distance: number;
  unit: string;
}

export interface LocationAutofillResult {
  latitude: string;
  longitude: string;
  mapPhotoUrl: string;
  mapSource: string;
  nearestTransportation?: NearestItemResult;
  nearestShop?: NearestItemResult;
  nearestPrimarySchool?: NearestItemResult;
  nearestSecondarySchool?: NearestItemResult;
  nearestCBD?: NearestItemResult;
  nearestConnectingStreet?: NearestItemResult;
}

// Main function: given address + state, compute all location details using Google APIs
export const autofillLocationDetailsFromGoogle = async (
  fullAddress: string,
  state: string
): Promise<LocationAutofillResult> => {
  // 1) Geocode to get coordinates
  const geo = await geocodeAddress(fullAddress);
  const best = geo.results?.[0];
  if (!best) throw new Error('Unable to geocode the property address');
  const lat = best.geometry.location.lat;
  const lng = best.geometry.location.lng;

  // 2) Map image URL via server-side custom map endpoint (no API key leakage)
  const mapPhotoUrl = getApiUrl(`/google-maps/custom-map?address=${encodeURIComponent(fullAddress)}`);

  // Prepare parallel requests for nearby items
  const transportPromise = searchNearbyPlaces(lat, lng, 'train_station');
  const shopSuperPromise = searchNearbyPlaces(lat, lng, 'supermarket');
  const shopMallPromise = searchNearbyPlaces(lat, lng, 'shopping_mall');
  const primarySchoolPromise = searchNearbyPlaces(lat, lng, 'primary_school');
  const secondarySchoolPromise = searchNearbyPlaces(lat, lng, 'secondary_school');

  // Reverse geocode for nearest connecting street
  const reverseGeocodePromise = makeApiRequest(
    getApiUrl(`/google-maps/reverse-geocode?lat=${lat}&lng=${lng}`)
  );

  const [
    transportResults,
    shopSuperResults,
    shopMallResults,
    primarySchoolResults,
    secondarySchoolResults,
    reverseGeocodeData
  ] = await Promise.all([
    transportPromise,
    shopSuperPromise,
    shopMallPromise,
    primarySchoolPromise,
    secondarySchoolPromise,
    reverseGeocodePromise
  ]);

  // Pick nearest transport
  const transport = transportResults?.[0];
  const nearestTransportation: NearestItemResult | undefined = transport
    ? (() => {
        const km = calculateDistance(lat, lng, transport.geometry.location.lat, transport.geometry.location.lng);
        const { distance, unit } = getOptimalUnit(km);
        // Get raw types from Google Places API
        const rawTypes = transport.types || [];
        // For transport: take first type and replace underscores with spaces
        const transportType = rawTypes.length > 0 
          ? rawTypes[0].replace(/_/g, ' ')
          : detectTransportType(transport);
        
        return {
          name: formatPlaceName(transport),
          type: transportType,
          distance,
          unit
        };
      })()
    : undefined;

  // Pick nearest shop from both lists
  const allShops = [...(shopSuperResults || []), ...(shopMallResults || [])];
  const nearestShopPlace = allShops
    .map((place: any) => ({
      place,
      dist: calculateDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng)
    }))
    .sort((a, b) => a.dist - b.dist)[0]?.place;

  const nearestShop: NearestItemResult | undefined = nearestShopPlace
    ? (() => {
        const km = calculateDistance(lat, lng, nearestShopPlace.geometry.location.lat, nearestShopPlace.geometry.location.lng);
        const { distance, unit } = getOptimalUnit(km);
        // Get raw types from Google Places API and use first item
        const rawTypes = nearestShopPlace.types || [];
        const shopType = rawTypes.length > 0
          ? rawTypes[0]
          : detectShopType(nearestShopPlace);
        
        return {
          name: formatPlaceName(nearestShopPlace),
          type: shopType,
          distance,
          unit
        };
      })()
    : undefined;

  // Primary school
  const primary = primarySchoolResults?.[0];
  const nearestPrimarySchool: NearestItemResult | undefined = primary
    ? (() => {
        const km = calculateDistance(lat, lng, primary.geometry.location.lat, primary.geometry.location.lng);
        const { distance, unit } = getOptimalUnit(km);
        // Get raw types from Google Places API and join with comma
        const rawTypes = primary.types || [];
        const primaryType = rawTypes.length > 0
          ? rawTypes.join(', ')
          : 'primary_school';
        
        return { name: formatPlaceName(primary), type: primaryType, distance, unit };
      })()
    : undefined;

  // Secondary school
  const secondary = secondarySchoolResults?.[0];
  const nearestSecondarySchool: NearestItemResult | undefined = secondary
    ? (() => {
        const km = calculateDistance(lat, lng, secondary.geometry.location.lat, secondary.geometry.location.lng);
        const { distance, unit } = getOptimalUnit(km);
        // Get raw types from Google Places API and join with comma
        const rawTypes = secondary.types || [];
        const secondaryType = rawTypes.length > 0
          ? rawTypes.join(', ')
          : 'secondary_school';
        
        return { name: formatPlaceName(secondary), type: secondaryType, distance, unit };
      })()
    : undefined;

  // CBD distance
  const cbd = getCBDDistance(lat, lng, state);
  const nearestCBD: NearestItemResult = { name: cbd.name, distance: cbd.distance, unit: cbd.unit, type: 'cbd' };

  // Connecting street via reverse geocode (result_type=route)
  let nearestConnectingStreet: NearestItemResult | undefined;
  try {
    const routeResult = (reverseGeocodeData.results || []).find((r: any) => (r.types || []).includes('route')) || reverseGeocodeData.results?.[0];
    if (routeResult) {
      const routeNameComp = routeResult.address_components?.find((c: any) => (c.types || []).includes('route'));
      const name = routeNameComp?.long_name || routeResult.formatted_address || 'Nearby Street';
      const rlat = routeResult.geometry?.location?.lat ?? lat;
      const rlng = routeResult.geometry?.location?.lng ?? lng;
      const km = calculateDistance(lat, lng, rlat, rlng);
      const { distance, unit } = getOptimalUnit(km);
      nearestConnectingStreet = { name, type: 'street', distance, unit };
    }
  } catch (e) {
    // ignore
  }

  return {
    latitude: String(lat),
    longitude: String(lng),
    mapPhotoUrl,
    mapSource: 'Google Maps',
    nearestTransportation,
    nearestShop,
    nearestPrimarySchool,
    nearestSecondarySchool,
    nearestCBD,
    nearestConnectingStreet
  };
};
export const fetchSuburbDescriptionFromWikipedia = async (
  suburbName: string,
  stateName?: string
): Promise<string | null> => {
  const params = new URLSearchParams({ suburb: suburbName });
  if (stateName) {
    params.append("state", stateName);
  }

  const endpoint = `/api/wiki-summary?${params.toString()}`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('Failed to fetch from backend proxy');

    const data = await response.json();
    return data.extract || null;
  } catch (error) {
    console.error(`Wikipedia fetch failed for ${suburbName}:`, error);
    return null;
  }
};
