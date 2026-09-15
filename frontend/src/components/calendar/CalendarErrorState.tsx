import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface CalendarErrorStateProps {
  message: string;
  onRetry: () => void;
}

export const CalendarErrorState: React.FC<CalendarErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div className="w-full bg-white border border-rose-200 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-sm">
      <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <h3 className="text-lg font-bold text-slate-900 mb-1">
        Unable to load booking availability
      </h3>
      <p className="text-sm text-slate-600 max-w-md mb-6">
        {message || 'A network or server error occurred while retrieving auditorium schedules.'}
      </p>

      <button
        id="calendar-retry-btn"
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-100 cursor-pointer"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Try Again</span>
      </button>
    </div>
  );
};
