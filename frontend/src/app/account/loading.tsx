import React from 'react';

// account settings skeleton loader
export default function AccountLoading() {
  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      <div className="max-w-3xl mx-auto p-8 animate-pulse">
        {/* back button skeleton */}
        <div className="h-6 w-36 bg-blue-100 rounded-full mb-8" />

        {/* card container skeleton */}
        <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-8 space-y-8">
          {/* header skeleton */}
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl" />
            <div className="space-y-2">
              <div className="h-7 w-48 bg-slate-200 rounded-lg" />
              <div className="h-4 w-36 bg-slate-100 rounded-lg" />
            </div>
          </div>

          {/* email input skeleton */}
          <div className="space-y-2">
            <div className="h-4 w-16 bg-slate-200 rounded" />
            <div className="h-11 w-full bg-slate-100 rounded-full border border-slate-200" />
          </div>

          {/* location input skeleton */}
          <div className="space-y-2">
            <div className="h-4 w-44 bg-slate-200 rounded" />
            <div className="h-11 w-full bg-slate-100 rounded-full border border-slate-200" />
          </div>

          {/* password section skeletons */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="h-5 w-36 bg-slate-200 rounded" />
            <div className="space-y-2">
              <div className="h-4 w-28 bg-slate-200 rounded" />
              <div className="h-11 w-full bg-slate-100 rounded-full border border-slate-200" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-4 w-24 bg-slate-200 rounded" />
                <div className="h-11 w-full bg-slate-100 rounded-full border border-slate-200" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="h-11 w-full bg-slate-100 rounded-full border border-slate-200" />
              </div>
            </div>
            <div className="h-11 w-40 bg-blue-200 rounded-full mt-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
