import React from 'react';

// email template settings skeleton loader
export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto p-8 animate-pulse">
        {/* header skeleton */}
        <div className="flex items-center space-x-4 mb-8">
          <div className="h-10 w-24 bg-white border border-slate-200 rounded-full" />
          <div className="space-y-2">
            <div className="h-7 w-32 bg-slate-200 rounded-lg" />
            <div className="h-4 w-48 bg-slate-100 rounded-lg" />
          </div>
        </div>

        {/* segmented tabs skeleton */}
        <div className="flex space-x-3 mb-6">
          <div className="h-10 w-36 bg-blue-100 rounded-full" />
          <div className="h-10 w-36 bg-slate-200 rounded-full" />
        </div>

        {/* main card container skeleton */}
        <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-8 space-y-6">
          {/* sender input skeleton */}
          <div className="space-y-2">
            <div className="h-4 w-28 bg-slate-200 rounded" />
            <div className="h-11 w-full bg-slate-100 rounded-xl border border-slate-200" />
          </div>

          {/* subject input skeleton */}
          <div className="space-y-2">
            <div className="h-4 w-20 bg-slate-200 rounded" />
            <div className="h-11 w-full bg-slate-100 rounded-xl border border-slate-200" />
          </div>

          {/* variable chips skeleton */}
          <div className="space-y-2">
            <div className="h-4 w-40 bg-slate-200 rounded" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-7 w-24 bg-slate-100 rounded-lg border border-slate-200" />
              ))}
            </div>
          </div>

          {/* editor body skeleton */}
          <div className="space-y-2">
            <div className="h-4 w-16 bg-slate-200 rounded" />
            <div className="h-64 w-full bg-slate-50 rounded-2xl border border-slate-200" />
          </div>

          {/* action bar skeleton */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="h-10 w-32 bg-slate-100 rounded-full" />
            <div className="flex items-center space-x-3">
              <div className="h-10 w-24 bg-blue-50 rounded-full" />
              <div className="h-10 w-32 bg-blue-200 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
