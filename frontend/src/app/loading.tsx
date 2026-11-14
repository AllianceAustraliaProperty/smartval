import React from 'react';
import LoadingScreen from '@/components/ui/LoadingScreen';

// global root app router fallback
export default function RootLoading() {
  return <LoadingScreen message="Loading SMARTval..." fullScreen={true} />;
}
