import React from 'react';

export const CalendarLegend: React.FC = () => {
  return (
    <div className="flex flex-wrap items-center justify-start gap-2.5 sm:gap-6 py-2.5 px-3.5 sm:px-4 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-700 shadow-sm">
      <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] sm:text-[11px] mr-1">
        Status Legend:
      </span>

      {/* Available */}
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 shadow-sm" />
        <span className="font-semibold text-slate-800">Available</span>
        <span className="text-slate-500 hidden md:inline">(No bookings)</span>
      </div>

      {/* Partially Booked */}
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400 shadow-sm" />
        <span className="font-semibold text-slate-800">Partially Booked</span>
        <span className="text-slate-500 hidden md:inline">(1 session booked)</span>
      </div>

      {/* Fully Booked */}
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-rose-500 shadow-sm" />
        <span className="font-semibold text-slate-800">Fully Booked</span>
        <span className="text-slate-500 hidden md:inline">(Both sessions booked)</span>
      </div>
    </div>
  );
};
