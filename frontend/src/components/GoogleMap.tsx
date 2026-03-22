'use client';

import React, { useState } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

interface GoogleMapProps {
  latitude?: string;
  longitude?: string;
  address?: string;
}

const containerStyle = {
  width: '100%',
  height: '600px'
};

export const GoogleMapDisplay: React.FC<GoogleMapProps> = ({ latitude, longitude, address }) => {
  const [showInfoWindow, setShowInfoWindow] = useState(true);
  
  // Parse coordinates
  const lat = latitude ? parseFloat(latitude) : null;
  const lng = longitude ? parseFloat(longitude) : null;
  
  // Default center (Sydney)
  const center = {
    lat: lat || -33.8688,
    lng: lng || 151.2093
  };
  
  // Don't render if no valid coordinates
  if (!lat || !lng) {
    return (
      <div className="w-full h-[400px] bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Enter coordinates to view map</p>
      </div>
    );
  }

  // Get API key from environment variable
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  
  if (!apiKey) {
    return (
      <div className="w-full h-[400px] bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Google Maps API key not configured</p>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      <LoadScript googleMapsApiKey={apiKey}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={18}
        >
          <Marker 
            position={center}
            title={address}
            onClick={() => setShowInfoWindow(true)}
          />
          {showInfoWindow && (
            <InfoWindow
              position={{
                lat: center.lat + 0.000005,
                lng: center.lng
              }}
              options={{
                disableAutoPan: false
              } as any}
            >
              <div className="p-2">
                <p className="text-sm font-bold text-gray-900">{address || 'No address provided'}</p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>
    </div>
  );
};

