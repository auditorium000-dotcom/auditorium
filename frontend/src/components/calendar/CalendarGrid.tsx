import React from 'react';
import type { CalendarDayInfo } from '../../types/booking';
import { WEEKDAY_HEADERS } from '../../lib/calendar';
import { CalendarDayCell } from './CalendarDayCell';

interface CalendarGridProps {
  days: CalendarDayInfo[];
  onSelectDate: (dateKey: string) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({ days, onSelectDate }) => {
  return (
    <div className="w-full bg-white border border-slate-200/80 rounded-2xl p-2 sm:p-5 shadow-sm">
      {/* 7-Column Weekday Headers (Monday -> Sunday) */}
      <div className="grid grid-cols-7 gap-1 sm:gap-3 mb-2 text-center">
        {WEEKDAY_HEADERS.map((header) => (
          <div
            key={header.short}
            className="py-1 sm:py-2 text-[11px] sm:text-xs font-bold tracking-wider text-slate-500 uppercase select-none"
            title={header.full}
          >
            <span className="hidden sm:inline">{header.full.slice(0, 3)}</span>
            <span className="sm:hidden">{header.short.slice(0, 2)}</span>
          </div>
        ))}
      </div>

      {/* 7-Column Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-3">
        {days.map((day) => (
          <CalendarDayCell key={day.date} day={day} onSelectDate={onSelectDate} />
        ))}
      </div>
    </div>
  );
};
