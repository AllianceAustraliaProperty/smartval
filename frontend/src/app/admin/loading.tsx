import React from 'react';

// admin console skeleton loader
export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* header skeleton */}
      <header className="bg-white border-b border-blue-100 shadow-sm sticky top-0 z-50 px-8 py-4">
        <div className="flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="w-11 h-11 bg-blue-100 rounded-xl" />
            <div>
              <div className="h-7 w-56 bg-slate-200 rounded-lg" />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="h-9 w-28 bg-slate-100 rounded-full" />
            <div className="h-9 w-24 bg-slate-100 rounded-full" />
          </div>
        </div>
      </header>

      {/* main content skeleton */}
      <div className="max-w-7xl mx-auto p-8 animate-pulse space-y-8">
        {/* navigation tabs skeleton */}
        <div className="flex space-x-2 border-b border-slate-200 pb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-32 bg-slate-200 rounded-xl" />
          ))}
        </div>

        {/* 4 metric cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-slate-100 rounded" />
                <div className="w-10 h-10 bg-blue-50 rounded-xl" />
              </div>
              <div className="h-8 w-20 bg-slate-200 rounded-lg" />
              <div className="h-3 w-32 bg-slate-100 rounded" />
            </div>
          ))}
        </div>

        {/* main table / events card skeleton */}
        <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-8 space-y-6">
          <div className="h-6 w-48 bg-slate-200 rounded" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 w-full bg-slate-50 rounded-2xl border border-slate-100 flex items-center px-6 justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-40 bg-slate-200 rounded" />
                    <div className="h-3 w-28 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-4 w-24 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
