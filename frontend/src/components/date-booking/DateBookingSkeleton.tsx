import React from 'react';

export const DateBookingSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 sm:space-y-6 animate-pulse">
      {/* Top Bar Skeleton */}
      <div className="h-16 bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div className="w-36 h-9 bg-slate-100 rounded-xl" />
        <div className="w-28 h-6 bg-slate-100 rounded-lg" />
      </div>

      {/* Date Overview Skeleton */}
      <div className="h-32 bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 space-y-3 shadow-sm">
        <div className="w-28 h-5 bg-slate-100 rounded-full" />
        <div className="w-64 h-8 bg-slate-100 rounded-lg" />
        <div className="w-96 h-4 bg-slate-100 rounded" />
      </div>

      {/* Two Session Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 min-h-[300px] flex flex-col justify-between shadow-sm"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100" />
                  <div className="space-y-1.5">
                    <div className="w-16 h-3 bg-slate-100 rounded" />
                    <div className="w-32 h-5 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="w-28 h-7 bg-slate-100 rounded-xl" />
              </div>

              <div className="w-28 h-6 bg-slate-100 rounded-full" />

              <div className="h-20 bg-slate-50 rounded-xl p-4" />
            </div>

            <div className="w-full h-11 bg-slate-100 rounded-xl mt-6" />
          </div>
        ))}
      </div>
    </div>
  );
};
