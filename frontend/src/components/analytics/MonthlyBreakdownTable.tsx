import React from 'react';
import {
  Calendar,
  SunMedium,
  Moon,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import type { MonthlyBookingStats } from '@auditorium/shared';

interface MonthlyBreakdownTableProps {
  monthlyStats: MonthlyBookingStats[];
  selectedMonth: number | null;
  onSelectMonth: (month: number | null) => void;
  onNavigateToCalendarMonth: (year: number, monthIndex: number) => void;
  peakMonthNumber?: number;
}

export const MonthlyBreakdownTable: React.FC<MonthlyBreakdownTableProps> = ({
  monthlyStats,
  selectedMonth,
  onSelectMonth,
  onNavigateToCalendarMonth,
  peakMonthNumber,
}) => {
  const currentMonthNumber = new Date().getMonth() + 1;

  // Filter stats if a specific month is selected
  const displayedStats = selectedMonth !== null
    ? monthlyStats.filter((m) => m.month === selectedMonth)
    : monthlyStats;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Table Header / Action Bar */}
      <div className="p-4 sm:p-6 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-lg font-bold text-slate-900">
            Monthly Breakdown & Slot Utilization
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Detailed booking volume, session slots, and revenue metrics month by month
          </p>
        </div>

        {selectedMonth !== null && (
          <div className="flex items-center gap-2">
            <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-lg border border-indigo-200 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              Showing Month {selectedMonth}
            </span>
            <button
              type="button"
              onClick={() => onSelectMonth(null)}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* Responsive Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-4 sm:px-6">Month</th>
              <th className="py-3.5 px-3 text-center">Total Bookings</th>
              <th className="py-3.5 px-3 text-center">Sessions (M / E)</th>
              <th className="py-3.5 px-3 text-right">Revenue (₹)</th>
              <th className="py-3.5 px-3">Slot Utilization</th>
              <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedStats.map((stat) => {
              const isCurrent = stat.month === currentMonthNumber;
              const isPeak = stat.month === peakMonthNumber && stat.totalBookings > 0;
              const isSelected = selectedMonth === stat.month;

              return (
                <tr
                  key={stat.month}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    isSelected
                      ? 'bg-indigo-50/40 font-medium'
                      : isCurrent
                      ? 'bg-slate-50/40'
                      : ''
                  }`}
                >
                  {/* Month column */}
                  <td className="py-4 px-4 sm:px-6">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center font-bold leading-none ${
                          isCurrent
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : isPeak
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-semibold">
                          {stat.monthShort}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-sm">
                            {stat.monthName}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                              Current
                            </span>
                          )}
                          {isPeak && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              👑 Peak
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {stat.eventTypes.length > 0
                            ? stat.eventTypes.map((e) => e.eventType).slice(0, 2).join(', ')
                            : 'No events scheduled'}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Total Bookings */}
                  <td className="py-4 px-4 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className="text-base font-extrabold text-slate-900">
                        {stat.totalBookings}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                        <span className="text-emerald-700 font-semibold">
                          {stat.confirmedBookings} conf.
                        </span>
                        {stat.cancelledBookings > 0 && (
                          <span className="text-rose-600">
                            • {stat.cancelledBookings} canc.
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Sessions (Morning / Evening) */}
                  <td className="py-4 px-4 text-center">
                    <div className="inline-flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                        <SunMedium className="w-3 h-3 text-amber-600" />
                        {stat.morningSessions}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-indigo-800 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-200">
                        <Moon className="w-3 h-3 text-indigo-600" />
                        {stat.eveningSessions}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Total: {stat.totalSessions} slots
                    </p>
                  </td>

                  {/* Revenue */}
                  <td className="py-4 px-4 text-right">
                    <div className="font-bold text-slate-900 text-sm">
                      ₹{stat.totalRevenue.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                      Paid: ₹{stat.totalPaid.toLocaleString('en-IN')}
                    </div>
                  </td>

                  {/* Slot Utilization */}
                  <td className="py-4 px-4">
                    <div className="w-36 sm:w-44">
                      <div className="flex justify-between items-center text-[11px] mb-1">
                        <span className="text-slate-500 font-medium">Utilization</span>
                        <span className="font-bold text-slate-800">
                          {stat.utilizationPercent}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            stat.utilizationPercent > 50
                              ? 'bg-emerald-500'
                              : stat.utilizationPercent > 20
                              ? 'bg-indigo-500'
                              : stat.utilizationPercent > 0
                              ? 'bg-amber-400'
                              : 'bg-slate-200'
                          }`}
                          style={{ width: `${Math.max(stat.utilizationPercent, 2)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="py-4 px-4 sm:px-6 text-right">
                    <button
                      type="button"
                      onClick={() => onNavigateToCalendarMonth(stat.year, stat.month - 1)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 text-xs"
                      title={`Open ${stat.monthName} ${stat.year} in Calendar`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>View Calendar</span>
                      <ArrowUpRight className="w-3 h-3 ml-0.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
