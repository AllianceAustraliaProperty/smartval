'use client';

import React, { useEffect } from 'react';

export default function HomePage() {
  useEffect(() => {
    // Redirect to properties page on load
    window.location.href = '/valuation-reports';
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to Properties...</p>
      </div>
    </div>
  );
}
