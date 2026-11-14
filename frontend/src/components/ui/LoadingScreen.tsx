import React from 'react';

export interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export function LoadingScreen({
  message = 'Loading SMARTval...',
  fullScreen = true,
  className = '',
}: LoadingScreenProps) {
  // accessible container with royal blue pulse spinner
  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/75 backdrop-blur-sm'
    : 'flex flex-col items-center justify-center p-12 w-full';

  return (
    <div
      className={`${containerClasses} ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative flex items-center justify-center">
        {/* outer spinning track with royal blue active arc */}
        <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-[#006ABE] animate-spin" />
        {/* inner gentle pulse */}
        <div className="absolute w-5 h-5 rounded-full bg-[#006ABE]/15 animate-ping" />
      </div>

      {message && (
        <p className="mt-4 text-sm font-semibold text-slate-700 tracking-wide animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}

export default LoadingScreen;
