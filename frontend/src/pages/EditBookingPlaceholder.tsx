import React from 'react';
import { ArrowLeft, Edit3, Sparkles } from 'lucide-react';

interface EditBookingPlaceholderProps {
  bookingId: string;
  onBack: () => void;
}

export const EditBookingPlaceholder: React.FC<EditBookingPlaceholderProps> = ({
  bookingId,
  onBack,
}) => {
  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-200">
      <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm">
        <button
          id="back-from-edit-placeholder-btn"
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Booking Details</span>
        </button>

        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
          Booking #{bookingId.slice(0, 8)}
        </span>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
          <Edit3 className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Edit Booking Workflow</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Booking Editing Placeholder
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto pt-1">
            The full interactive booking modification flow (updating event details, contact information, notes, and rescheduled slots) will be implemented in a subsequent step.
          </p>
        </div>

        <div className="pt-4">
          <button
            onClick={onBack}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs sm:text-sm font-semibold text-white transition-colors"
          >
            Return to Details
          </button>
        </div>
      </div>
    </div>
  );
};
