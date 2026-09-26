import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  IndianRupee,
  Receipt,
  Clock,
  Sun,
  Moon,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { useDateRange } from '../../context/DateRangeContext';
import { fetchDashboardAnalytics } from '../../services/api';
import { formatCurrency } from '../../lib/dateRange';
import type { DashboardAnalytics } from '../../types/dashboard';
import { DateRangePicker } from './DateRangePicker';
import { BackupStatusCard } from './BackupStatusCard';

interface OverviewTabProps {
  onNavigateToTab?: (tab: 'bookings' | 'payments' | 'outstanding' | 'analytics') => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ onNavigateToTab }) => {
  const { preset, startDate, endDate } = useDateRange();
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDashboardAnalytics({
        preset,
        startDate: preset === 'CUSTOM' ? startDate : undefined,
        endDate: preset === 'CUSTOM' ? endDate : undefined,
      });
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load dashboard metrics';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [preset, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Date Range Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Dashboard Overview
          </h2>
          <p className="text-xs text-slate-500">
            Real-time KPIs, collections, outstanding balances, and session slots
          </p>
        </div>
        <DateRangePicker onRefresh={loadData} loading={loading} />
      </div>

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs animate-pulse space-y-3"
            >
              <div className="h-4 bg-slate-100 rounded-md w-24" />
              <div className="h-7 bg-slate-200 rounded-md w-36" />
              <div className="h-3 bg-slate-100 rounded-md w-20" />
            </div>
          ))}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm">Failed to load overview data</h4>
            <p className="mt-0.5 text-rose-700">{error}</p>
            <button
              type="button"
              onClick={loadData}
              className="mt-2 px-3 py-1 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Main KPI Cards Grid */}
      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* Card 1: Total Bookings */}
            <div
              onClick={() => onNavigateToTab?.('bookings')}
              className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Bookings
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                  <CalendarDays className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-mono">
                {data.totalBookings}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2.5 text-[11px] font-semibold">
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  {data.confirmedBookings} Confirmed
                </span>
                {data.cancelledBookings > 0 && (
                  <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
                    {data.cancelledBookings} Cancelled
                  </span>
                )}
              </div>
            </div>

            {/* Card 2: Total Booking Value */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Booking Value
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 mt-2 font-mono break-words">
                {formatCurrency(data.totalBookingValue)}
              </p>
              <p className="text-[11px] text-slate-500 mt-2.5">
                Confirmed bookings scheduled in period
              </p>
            </div>

            {/* Card 3: Amount Collected / Period Revenue */}
            <div
              onClick={() => onNavigateToTab?.('payments')}
              className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Amount Collected
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-600 mt-2 font-mono break-words">
                {formatCurrency(data.totalAmountCollected)}
              </p>
              <p className="text-[11px] text-slate-500 mt-2.5">
                Payments received within selected period
              </p>
            </div>

            {/* Card 4: Outstanding Amount */}
            <div
              onClick={() => onNavigateToTab?.('outstanding')}
              className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Outstanding Balance
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <p
                className={`text-xl sm:text-2xl lg:text-3xl font-black mt-2 font-mono break-words ${
                  data.outstandingAmount > 0 ? 'text-amber-600' : 'text-slate-800'
                }`}
              >
                {formatCurrency(data.outstandingAmount)}
              </p>
              <p className="text-[11px] text-slate-500 mt-2.5">
                Unpaid balance on period bookings
              </p>
            </div>
          </div>

          {/* Secondary Stats & Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Payment Method Breakdown Card (Takes 2 cols on lg) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Payment Method Breakdown
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Collections distributed by payment channel
                  </p>
                </div>
                <span className="text-xs font-bold font-mono text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 self-start sm:self-auto">
                  Total: {formatCurrency(data.totalAmountCollected)}
                </span>
              </div>

              {data.paymentMethodBreakdown.length === 0 || data.totalAmountCollected === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No payments recorded for this period.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.paymentMethodBreakdown.map((item) => (
                    <div key={item.method} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-semibold text-slate-700 flex items-center gap-2 truncate">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                          <span className="truncate">{item.method.replace('_', ' ')}</span>
                        </span>
                        <div className="flex items-center gap-2 sm:gap-3 font-mono shrink-0">
                          <span className="text-slate-500 text-[11px] hidden sm:inline">{item.count} txns</span>
                          <span className="font-bold text-slate-900">
                            {formatCurrency(item.amount)}
                          </span>
                          <span className="text-slate-400 w-10 sm:w-12 text-right text-[11px]">
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                      {/* Visual Bar */}
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Session Capacity & Today's Schedule Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Session Utilization
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Booked slots across period
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mt-4">
                  {/* Morning Slots */}
                  <div className="p-3 sm:p-3.5 rounded-xl bg-amber-50/60 border border-amber-100 text-center">
                    <Sun className="w-4 h-4 text-amber-500 mx-auto" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mt-1 block">
                      Morning
                    </span>
                    <p className="text-lg font-black text-slate-900 font-mono mt-0.5">
                      {data.sessionCounts.morning}
                    </p>
                    <span className="text-[10px] text-slate-500 block">11:00 AM – 03:00 PM</span>
                  </div>

                  {/* Evening Slots */}
                  <div className="p-3 sm:p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-center">
                    <Moon className="w-4 h-4 text-indigo-500 mx-auto" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 mt-1 block">
                      Evening
                    </span>
                    <p className="text-lg font-black text-slate-900 font-mono mt-0.5">
                      {data.sessionCounts.evening}
                    </p>
                    <span className="text-[10px] text-slate-500 block">05:00 PM – 09:00 PM</span>
                  </div>
                </div>

                {/* Today's Active Bookings */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span className="font-semibold text-slate-700">Today's Active Bookings</span>
                  </div>
                  <span className="font-bold text-slate-900 font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    {data.todayBookingsCount}
                  </span>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 text-center border-t border-slate-100">
                Total Session Slots Booked: <strong className="text-slate-700">{data.sessionCounts.total}</strong>
              </div>
            </div>
          </div>

          {/* Backup Health & System Card */}
          <BackupStatusCard />
        </>
      )}
    </div>
  );
};
