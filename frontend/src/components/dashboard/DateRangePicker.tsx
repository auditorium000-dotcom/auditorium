import React from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import { useDateRange } from '../../context/DateRangeContext';
import { PRESET_OPTIONS } from '../../lib/dateRange';
import type { DateRangePreset } from '../../types/dashboard';

interface DateRangePickerProps {
  onRefresh?: () => void;
  loading?: boolean;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  onRefresh,
  loading = false,
  className = '',
}) => {
  const { preset, startDate, endDate, setPreset, setCustomRange } = useDateRange();

  return (
    <div
      className={`flex flex-wrap items-center gap-2 sm:gap-2.5 bg-white p-1.5 sm:p-2.5 rounded-2xl border border-slate-200/80 shadow-xs ${className}`}
    >
      {/* Preset Selector */}
      <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200 grow sm:grow-0">
        <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5 shrink-0" />
        <select
          id="date-range-preset-select"
          value={preset}
          onChange={(e) => setPreset(e.target.value as DateRangePreset)}
          className="w-full sm:w-auto bg-white text-slate-800 text-xs font-bold py-1.5 sm:py-1.5 px-2.5 rounded-lg border border-slate-200 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          {PRESET_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Custom Range Date Pickers (visible if preset === 'CUSTOM' or compact on desktop) */}
      {preset === 'CUSTOM' ? (
        <div className="flex items-center gap-1.5 text-xs w-full sm:w-auto">
          <input
            id="custom-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setCustomRange(e.target.value, endDate)}
            className="flex-1 sm:flex-initial bg-white text-slate-900 text-xs font-semibold py-1.5 px-2 sm:px-2.5 rounded-xl border border-slate-200 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-0"
          />
          <span className="text-slate-400 font-medium shrink-0">to</span>
          <input
            id="custom-end-date"
            type="date"
            value={endDate}
            onChange={(e) => setCustomRange(startDate, e.target.value)}
            className="flex-1 sm:flex-initial bg-white text-slate-900 text-xs font-semibold py-1.5 px-2 sm:px-2.5 rounded-xl border border-slate-200 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-0"
          />
        </div>
      ) : (
        <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
          <span>{startDate}</span>
          <span>→</span>
          <span>{endDate}</span>
        </div>
      )}

      {/* Refresh Button */}
      {onRefresh && (
        <button
          id="refresh-dashboard-btn"
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200 transition-all cursor-pointer active:scale-95 disabled:opacity-50 ml-auto shrink-0"
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      )}
    </div>
  );
};
