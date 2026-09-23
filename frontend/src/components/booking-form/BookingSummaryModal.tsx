import React from 'react';
import {
  Calendar,
  Clock,
  Sun,
  Moon,
  User,
  Phone,
  Tag,
  IndianRupee,
  FileText,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
  Edit3,
  CheckCircle2,
} from 'lucide-react';
import { formatDisplayDate, formatShortDate } from '../../lib/calendar';
import type { SessionType } from '../../types/booking';

interface BookingSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  error: string | null;
  eventName: string;
  eventType: string;
  contactName: string;
  contactPhone: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  advanceAmount?: number | null;
  notes: string;
  sessions: Array<{ date: string; session: SessionType; startTime?: string; endTime?: string }>;
  title?: string;
  subtitle?: string;
  confirmButtonText?: string;
  submittingButtonText?: string;
}

export const BookingSummaryModal: React.FC<BookingSummaryModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  error,
  eventName,
  eventType,
  contactName,
  contactPhone,
  startDate,
  endDate,
  totalAmount,
  advanceAmount,
  notes,
  sessions,
  title = 'Booking Summary',
  subtitle = 'Please review before confirming this booking',
  confirmButtonText = 'Confirm Booking',
  submittingButtonText = 'Confirming Booking...',
}) => {
  if (!isOpen) return null;

  // Sort sessions chronologically
  const sortedSessions = [...sessions].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.session === 'MORNING' && b.session === 'EVENING') return -1;
    if (a.session === 'EVENING' && b.session === 'MORNING') return 1;
    return 0;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        id="booking-summary-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-summary-modal-title"
        className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-4 sm:p-7 shadow-2xl shadow-slate-900/10 space-y-4 sm:space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 id="booking-summary-modal-title" className="text-lg font-bold text-slate-900 tracking-tight">
                {title}
              </h3>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close summary"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Server Error Alert (if conflict or API failure) */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {/* Section 1: Event & Contact Info */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 font-medium flex items-center gap-1.5 mb-0.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                Name
              </span>
              <p className="text-sm font-bold text-slate-900">{eventName || '—'}</p>
            </div>

            <div>
              <span className="text-slate-500 font-medium flex items-center gap-1.5 mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Event Type
              </span>
              <p className="text-sm font-semibold text-slate-800">{eventType || '—'}</p>
            </div>

            <div>
              <span className="text-slate-500 font-medium flex items-center gap-1.5 mb-0.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                Contact Name
              </span>
              <p className="text-sm font-bold text-slate-900">{contactName || '—'}</p>
            </div>

            <div>
              <span className="text-slate-500 font-medium flex items-center gap-1.5 mb-0.5">
                <Phone className="w-3.5 h-3.5 text-indigo-600" />
                Contact Phone
              </span>
              <p className="text-sm font-semibold text-indigo-700 font-mono">{contactPhone || '—'}</p>
            </div>
          </div>
        </div>

        {/* Section 2: Selected Dates & Reserved Sessions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Reserved Sessions ({sortedSessions.length})</span>
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              {startDate === endDate ? formatDisplayDate(startDate) : `${formatShortDate(startDate)} – ${formatShortDate(endDate)}`}
            </span>
          </div>

          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {sortedSessions.map((s, idx) => {
              const isMorning = s.session === 'MORNING';
              const timeDisplay = s.startTime && s.endTime
                ? `${s.startTime} – ${s.endTime}`
                : isMorning
                ? '11:00 AM – 3:00 PM'
                : '5:00 PM – 9:00 PM';
              return (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center border shadow-xs ${
                        isMorning
                          ? 'bg-amber-50 text-amber-600 border-amber-200'
                          : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                      }`}
                    >
                      {isMorning ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{formatDisplayDate(s.date)}</p>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{isMorning ? `Morning Slot (${timeDisplay})` : `Evening Slot (${timeDisplay})`}</span>
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                    RESERVED
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Pricing & Notes */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50/60 to-slate-50 border border-emerald-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                Total Payable Amount
              </span>
              <span className="text-xs text-slate-500">Fixed rate calculation</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-700 font-mono flex items-center">
              <IndianRupee className="w-5 h-5 inline mr-0.5" />
              <span>{Number(totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </p>
          </div>

          {advanceAmount != null && Number(advanceAmount) > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-emerald-200/60 text-xs">
              <span className="text-slate-600 font-medium">
                Advance Amount
              </span>
              <span className="font-bold text-slate-800 font-mono">
                ₹{Number(advanceAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        {/* Notes (if any) */}
        {notes.trim() && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Notes / Special Instructions:
            </span>
            <p className="text-slate-700 italic pl-4 whitespace-pre-wrap">{notes}</p>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            id="modify-booking-btn"
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Edit3 className="w-4 h-4 text-slate-500" />
            <span>Modify Details</span>
          </button>

          <button
            id="confirm-booking-final-btn"
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-all cursor-pointer shadow-md shadow-indigo-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{submittingButtonText}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{confirmButtonText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
