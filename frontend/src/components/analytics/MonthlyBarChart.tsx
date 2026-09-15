import React, { useState } from 'react';
import {
  BarChart3,
  Sparkles,
  SunMedium,
  Moon,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import type { MonthlyBookingStats } from '@auditorium/shared';

interface MonthlyBarChartProps {
  monthlyStats: MonthlyBookingStats[];
  selectedMonth: number | null;
  onSelectMonth: (month: number | null) => void;
  peakMonthNumber?: number;
}

export const MonthlyBarChart: React.FC<MonthlyBarChartProps> = ({
  monthlyStats,
  selectedMonth,
  onSelectMonth,
  peakMonthNumber,
}) => {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  // Find maximum bookings in any single month to scale bar heights
  const maxMonthlyBookings = Math.max(...monthlyStats.map((m) => m.totalBookings), 1);
  const currentMonthNumber = new Date().getMonth() + 1;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Monthly Bookings Distribution
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Total bookings and session slots booked per calendar month
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-indigo-600 inline-block"></span>
            <span className="text-slate-600 font-medium">Total Bookings</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-400 inline-block"></span>
            <span className="text-slate-600 font-medium">Morning (11am-3pm)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-indigo-400 inline-block"></span>
            <span className="text-slate-600 font-medium">Evening (5pm-9pm)</span>
          </div>
        </div>
      </div>

      {/* Chart Visualization Container */}
      <div className="relative pt-6 pb-2">
        {/* Bars Container */}
        <div className="grid grid-cols-12 gap-1.5 sm:gap-3 items-end h-64 sm:h-72 border-b border-slate-200 px-1">
          {monthlyStats.map((stat) => {
            const isHovered = hoveredMonth === stat.month;
            const isSelected = selectedMonth === stat.month;
            const isPeak = stat.month === peakMonthNumber && stat.totalBookings > 0;
            const isCurrentMonth = stat.month === currentMonthNumber;

            // Height percentage based on maxMonthlyBookings (min 8% for visual aesthetics)
            const heightPercent = stat.totalBookings > 0
              ? Math.max(12, Math.round((stat.totalBookings / maxMonthlyBookings) * 100))
              : 4;

            return (
              <div
                key={stat.month}
                className="relative flex flex-col items-center h-full justify-end group cursor-pointer"
                onMouseEnter={() => setHoveredMonth(stat.month)}
                onMouseLeave={() => setHoveredMonth(null)}
                onClick={() => onSelectMonth(isSelected ? null : stat.month)}
              >
                {/* Peak Badge */}
                {isPeak && (
                  <div className="absolute -top-7 z-10 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-[10px] font-bold text-amber-800 shadow-sm animate-bounce">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Peak</span>
                  </div>
                )}

                {/* Floating Tooltip */}
                {(isHovered || isSelected) && (
                  <div className="absolute bottom-full mb-3 z-30 pointer-events-none w-48 sm:w-56 bg-slate-900/95 backdrop-blur-md text-white text-xs rounded-xl p-3 shadow-xl border border-slate-700/80 -translate-x-1/2 left-1/2 transition-all">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        {stat.monthName} {stat.year}
                      </span>
                      {isCurrentMonth && (
                        <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-semibold px-1.5 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-slate-300 text-[11px]">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Total Bookings:</span>
                        <span className="font-bold text-white text-xs">
                          {stat.totalBookings}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-emerald-400">Confirmed:</span>
                        <span className="font-medium text-slate-200">
                          {stat.confirmedBookings}
                        </span>
                      </div>
                      {stat.cancelledBookings > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-rose-400">Cancelled:</span>
                          <span className="font-medium text-slate-200">
                            {stat.cancelledBookings}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                        <span className="text-amber-400 flex items-center gap-1">
                          <SunMedium className="w-3 h-3" /> Morning:
                        </span>
                        <span className="font-medium text-slate-200">
                          {stat.morningSessions} slots
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-indigo-400 flex items-center gap-1">
                          <Moon className="w-3 h-3" /> Evening:
                        </span>
                        <span className="font-medium text-slate-200">
                          {stat.eveningSessions} slots
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                        <span className="text-slate-400">Est. Revenue:</span>
                        <span className="font-bold text-emerald-400">
                          ₹{stat.totalRevenue.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Count Pill above bar */}
                <div
                  className={`text-[10px] sm:text-xs font-bold mb-1 transition-all ${
                    stat.totalBookings > 0
                      ? isSelected || isHovered
                        ? 'text-indigo-600 scale-110'
                        : 'text-slate-700'
                      : 'text-slate-300 font-normal'
                  }`}
                >
                  {stat.totalBookings}
                </div>

                {/* Main Bar with Gradient and Session Split */}
                <div
                  className={`w-full max-w-[36px] rounded-t-lg transition-all duration-300 relative overflow-hidden flex flex-col justify-end ${
                    isSelected
                      ? 'ring-2 ring-indigo-600 ring-offset-2 shadow-lg'
                      : isHovered
                      ? 'shadow-md brightness-110 scale-[1.02]'
                      : ''
                  } ${
                    stat.totalBookings > 0
                      ? 'bg-gradient-to-t from-indigo-700 via-indigo-600 to-indigo-500'
                      : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                >
                  {/* Visual Session Stacks if sessions exist */}
                  {stat.totalSessions > 0 && (
                    <div className="w-full h-full flex flex-col justify-end opacity-90">
                      {stat.eveningSessions > 0 && (
                        <div
                          className="w-full bg-indigo-500/80 transition-all"
                          style={{
                            height: `${(stat.eveningSessions / stat.totalSessions) * 100}%`,
                          }}
                        />
                      )}
                      {stat.morningSessions > 0 && (
                        <div
                          className="w-full bg-amber-400/90 transition-all border-b border-white/20"
                          style={{
                            height: `${(stat.morningSessions / stat.totalSessions) * 100}%`,
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* X-Axis Month Label */}
                <div className="mt-2 text-center">
                  <span
                    className={`text-[11px] sm:text-xs font-semibold block transition-colors ${
                      isSelected
                        ? 'text-indigo-700 font-bold'
                        : isCurrentMonth
                        ? 'text-indigo-600 font-bold underline decoration-indigo-300 underline-offset-2'
                        : 'text-slate-600'
                    }`}
                  >
                    {stat.monthShort}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Helper Note */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          <span>
            Click on any month's bar to filter the breakdown table and inspect bookings.
          </span>
        </div>
        {selectedMonth !== null && (
          <button
            type="button"
            onClick={() => onSelectMonth(null)}
            className="text-indigo-600 font-semibold hover:text-indigo-800 underline cursor-pointer"
          >
            Clear Filter (Show All 12 Months)
          </button>
        )}
      </div>
    </div>
  );
};
