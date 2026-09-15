import React from 'react';
import {
  CalendarDays,
  SunMedium,
  Moon,
  DollarSign,
  Award,
  Layers,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { YearlyAnalyticsSummary } from '@auditorium/shared';

interface AnalyticsKpiCardsProps {
  data: YearlyAnalyticsSummary;
}

export const AnalyticsKpiCards: React.FC<AnalyticsKpiCardsProps> = ({ data }) => {
  const currentMonthNumber = new Date().getMonth() + 1;
  const currentMonthData = data.monthlyStats.find((m) => m.month === currentMonthNumber);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Year Bookings */}
      <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Bookings ({data.year})
          </span>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {data.totalYearBookings}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            events scheduled
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2 pt-3 border-t border-slate-100 text-xs">
          <span className="inline-flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            {data.confirmedYearBookings} Confirmed
          </span>
          {data.cancelledYearBookings > 0 && (
            <span className="inline-flex items-center gap-1 font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
              <XCircle className="w-3 h-3" />
              {data.cancelledYearBookings} Cancelled
            </span>
          )}
        </div>
      </div>

      {/* 2. Peak Month */}
      <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Peak Booking Month
          </span>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shadow-inner">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {data.peakMonth?.monthName || 'None'}
          </span>
          {data.peakMonth && data.peakMonth.totalBookings > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              👑 {data.peakMonth.totalBookings} Bookings
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
          <span>Avg. {data.averageBookingsPerMonth} bookings/mo</span>
          <span className="font-semibold text-indigo-600">
            This month: {currentMonthData?.totalBookings || 0}
          </span>
        </div>
      </div>

      {/* 3. Session Slots Booked */}
      <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Sessions Booked
          </span>
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center shadow-inner">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {data.totalYearSessions}
          </span>
          <span className="text-xs text-slate-500 font-medium">slots booked</span>
        </div>

        <div className="mt-3 flex items-center gap-2 pt-3 border-t border-slate-100 text-xs">
          <span className="inline-flex items-center gap-1 font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
            <SunMedium className="w-3 h-3 text-amber-500" />
            {data.morningSessionsTotal} Morning
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
            <Moon className="w-3 h-3 text-indigo-500" />
            {data.eveningSessionsTotal} Evening
          </span>
        </div>
      </div>

      {/* 4. Total Financials */}
      <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Annual Total Revenue
          </span>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
            ₹{data.totalYearRevenue.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
          <span className="text-slate-500">Collected:</span>
          <span className="font-semibold text-emerald-700">
            ₹{data.totalYearPaid.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
};
