import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { fetchMonthlyAnalytics } from '../services/api';
import type { YearlyAnalyticsSummary } from '@auditorium/shared';
import {
  AnalyticsKpiCards,
  MonthlyBarChart,
  MonthlyBreakdownTable,
  EventTypeDistribution,
} from '../components/analytics';

interface MonthlyAnalyticsPageProps {
  onNavigateToCalendarMonth: (year: number, monthIndex: number) => void;
}

export const MonthlyAnalyticsPage: React.FC<MonthlyAnalyticsPageProps> = ({
  onNavigateToCalendarMonth,
}) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const [summary, setSummary] = useState<YearlyAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async (year: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMonthlyAnalytics(year);
      setSummary(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load analytics data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics(selectedYear);
  }, [selectedYear, loadAnalytics]);

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setSelectedMonth(null);
  };

  const handleRefresh = () => {
    loadAnalytics(selectedYear);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                Monthly Booking Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Aggregated booking statistics, session slot capacity, and monthly revenue metrics
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Year Switcher & Refresh Button */}
        <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto">
          {/* Year Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-100/90 p-1 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 pl-1.5 sm:pl-2">Year:</span>
            {summary?.availableYears && summary.availableYears.length > 0 ? (
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
                className="bg-white text-slate-800 text-xs font-bold py-1.5 px-2.5 sm:px-3 rounded-lg border border-slate-200 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {summary.availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-1">
                {[currentYear - 1, currentYear, currentYear + 1].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => handleYearChange(yr)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedYear === yr
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 bg-white/70 hover:bg-white'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && !summary && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
            Aggregating Monthly Booking Metrics...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-800 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-sm">Failed to load analytics</h3>
            <p className="text-xs text-rose-700 mt-1">{error}</p>
            <button
              type="button"
              onClick={handleRefresh}
              className="mt-3 px-3.5 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Analytics Main View */}
      {summary && (
        <div className="space-y-6">
          {/* 1. KPI Cards */}
          <AnalyticsKpiCards data={summary} />

          {/* 2. Interactive 12-Month Bar Chart */}
          <MonthlyBarChart
            monthlyStats={summary.monthlyStats}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            peakMonthNumber={summary.peakMonth?.month}
          />

          {/* 3. Event Types & Session Distribution */}
          <EventTypeDistribution summary={summary} />

          {/* 4. Detailed Monthly Table */}
          <MonthlyBreakdownTable
            monthlyStats={summary.monthlyStats}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            onNavigateToCalendarMonth={onNavigateToCalendarMonth}
            peakMonthNumber={summary.peakMonth?.month}
          />
        </div>
      )}
    </div>
  );
};
