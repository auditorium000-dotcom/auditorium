import React from 'react';
import type { CalendarDayInfo } from '../../types/booking';
import { clsx } from 'clsx';
import { Sun, Moon } from 'lucide-react';

interface CalendarDayCellProps {
  day: CalendarDayInfo;
  onSelectDate: (dateKey: string) => void;
}

export const CalendarDayCell: React.FC<CalendarDayCellProps> = ({ day, onSelectDate }) => {
  const { isCurrentMonth, isToday, dayNumber, date, availability } = day;
  const { status, isMorningBooked, isEveningBooked } = availability;

  // Visual status config (Light Mode + Pastels)
  const statusConfig = {
    AVAILABLE: {
      dotColor: 'bg-emerald-500 ring-2 ring-emerald-100',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      label: 'Available',
      ariaText: `${date}: Available, both Morning and Evening sessions are open`,
      cardHoverBorder: 'hover:border-emerald-400',
      mornDot: 'bg-emerald-500',
      eveDot: 'bg-emerald-500',
    },
    PARTIAL: {
      dotColor: 'bg-amber-400 ring-2 ring-amber-100',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
      label: 'Partial',
      ariaText: `${date}: Partially booked, 1 session available`,
      cardHoverBorder: 'hover:border-amber-400',
      mornDot: isMorningBooked ? 'bg-rose-500' : 'bg-emerald-500',
      eveDot: isEveningBooked ? 'bg-rose-500' : 'bg-emerald-500',
    },
    FULL: {
      dotColor: 'bg-rose-500 ring-2 ring-rose-100',
      badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
      label: 'Booked',
      ariaText: `${date}: Fully booked, no sessions available`,
      cardHoverBorder: 'hover:border-rose-400',
      mornDot: 'bg-rose-500',
      eveDot: 'bg-rose-500',
    },
  }[status];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectDate(date)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectDate(date);
        }
      }}
      aria-label={statusConfig.ariaText}
      title={statusConfig.ariaText}
      data-date={date}
      className={clsx(
        'group relative flex flex-col justify-between p-1.5 sm:p-2.5 min-h-[62px] sm:min-h-[105px] md:min-h-[115px] rounded-xl sm:rounded-2xl transition-all duration-200 border cursor-pointer outline-none select-none',
        // Background & Border in Light Mode
        isCurrentMonth
          ? 'bg-white border-slate-200 hover:bg-slate-50/90 shadow-sm'
          : 'bg-slate-50/50 border-slate-100 text-slate-400 opacity-40 hover:opacity-75',
        // Today Ring
        isToday && 'ring-2 ring-indigo-500 bg-indigo-50/40 border-indigo-300',
        // Hover highlight based on status
        statusConfig.cardHoverBorder,
        'active:scale-[0.98]'
      )}
    >
      {/* Cell Header: Date Number & Status Dot */}
      <div className="flex items-center justify-between gap-1 w-full">
        {/* Day Number */}
        <span
          className={clsx(
            'inline-flex items-center justify-center text-xs sm:text-base font-bold transition-colors',
            isToday
              ? 'w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-indigo-600 text-white shadow-sm'
              : isCurrentMonth
              ? 'text-slate-800 group-hover:text-slate-900'
              : 'text-slate-400'
          )}
        >
          {dayNumber}
        </span>

        {/* Visual Status Indicator Dot */}
        <span
          className={clsx(
            'w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-transform group-hover:scale-110 flex-shrink-0',
            statusConfig.dotColor
          )}
        />
      </div>

      {/* MOBILE ONLY VIEW: Compact Minimal Indicators (No text overlap) */}
      <div className="sm:hidden flex items-center justify-center gap-1.5 mt-1">
        <div
          title={isMorningBooked ? 'Morning: Booked' : 'Morning: Open'}
          className={clsx(
            'w-2 h-2 rounded-full',
            isMorningBooked ? 'bg-rose-500' : 'bg-emerald-500'
          )}
        />
        <div
          title={isEveningBooked ? 'Evening: Booked' : 'Evening: Open'}
          className={clsx(
            'w-2 h-2 rounded-full',
            isEveningBooked ? 'bg-rose-500' : 'bg-emerald-500'
          )}
        />
      </div>

      {/* DESKTOP VIEW: Full Session Slot Badges */}
      <div className="hidden sm:block mt-1.5 space-y-1 w-full">
        {/* Morning Session Tag */}
        <div
          className={clsx(
            'flex items-center justify-between px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-medium border',
            isMorningBooked
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          )}
        >
          <div className="flex items-center gap-1">
            <Sun className="w-2.5 h-2.5 sm:w-3 sm:h-3 opacity-80" />
            <span>Morn</span>
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold">
            {isMorningBooked ? 'Booked' : 'Open'}
          </span>
        </div>

        {/* Evening Session Tag */}
        <div
          className={clsx(
            'flex items-center justify-between px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-medium border',
            isEveningBooked
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          )}
        >
          <div className="flex items-center gap-1">
            <Moon className="w-2.5 h-2.5 sm:w-3 sm:h-3 opacity-80" />
            <span>Eve</span>
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold">
            {isEveningBooked ? 'Booked' : 'Open'}
          </span>
        </div>
      </div>

      {/* Status Label at Bottom (Desktop only) */}
      <div className="hidden sm:flex mt-1 pt-1 border-t border-slate-100 items-center justify-between text-[10px]">
        <span
          className={clsx(
            'truncate font-semibold px-1 py-0.5 rounded border text-[10px]',
            statusConfig.badgeBg
          )}
        >
          {statusConfig.label}
        </span>
      </div>
    </div>
  );
};

