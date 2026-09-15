import React from 'react';
import { Loader2 } from 'lucide-react';

export const CalendarLoadingSkeleton: React.FC = () => {
  return (
    <div className="w-full bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-5 shadow-sm">
      {/* Weekday Header Placeholders */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-3 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-6 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>

      {/* Grid Cell Placeholders (35 cells) */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col justify-between p-2 sm:p-3 min-h-[62px] sm:min-h-[105px] rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 animate-pulse"
          >
            <div className="flex justify-between items-center">
              <div className="w-5 h-5 bg-slate-200 rounded-full" />
              <div className="w-2.5 h-2.5 bg-slate-200 rounded-full" />
            </div>
            <div className="hidden sm:block space-y-1.5 mt-2">
              <div className="h-3 bg-slate-200/70 rounded" />
              <div className="h-3 bg-slate-200/70 rounded" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-500 font-medium">
        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
        <span>Loading auditorium booking schedules...</span>
      </div>
    </div>
  );
};
