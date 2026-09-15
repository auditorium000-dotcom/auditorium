import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { MONTH_NAMES } from '../../lib/calendar';

interface CalendarHeaderProps {
  year: number;
  monthIndex: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  year,
  monthIndex,
  onPrevMonth,
  onNextMonth,
  onToday,
}) => {
  const monthName = MONTH_NAMES[monthIndex];

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-5 shadow-sm">
      {/* Month & Year Title */}
      <div className="flex items-center gap-3 self-start sm:self-auto">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm">
          <CalendarIcon className="w-5 h-5" />
        </div>
        <div>
          <h2 id="current-month-year" className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900">
            {monthName} {year}
          </h2>
          <p className="text-xs text-slate-500 font-medium">Monthly Booking Availability</p>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
        <button
          id="prev-month-btn"
          onClick={onPrevMonth}
          aria-label="Previous Month"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <button
          id="today-btn"
          onClick={onToday}
          aria-label="Go to Current Month"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <span>Today</span>
        </button>

        <button
          id="next-month-btn"
          onClick={onNextMonth}
          aria-label="Next Month"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
