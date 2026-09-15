import React from 'react';
import { AlertTriangle, Loader2, Sun, Moon } from 'lucide-react';
import { formatDisplayDate } from '../../lib/calendar';

interface CancelSessionModalProps {
  isOpen: boolean;
  isCancelling: boolean;
  dateKey: string;
  session: 'MORNING' | 'EVENING';
  eventName: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const CancelSessionModal: React.FC<CancelSessionModalProps> = ({
  isOpen,
  isCancelling,
  dateKey,
  session,
  eventName,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const isMorning = session === 'MORNING';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-session-modal-title"
        className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-slate-900/10 space-y-5 animate-in zoom-in-95 duration-150"
      >
        {/* Warning Icon & Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-sm">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 id="cancel-session-modal-title" className="text-lg font-bold text-slate-900 tracking-tight">
              Cancel this time slot?
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Event: <strong className="text-slate-800">{eventName}</strong>
            </p>
          </div>
        </div>

        {/* Selected Slot Badge */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3 text-xs">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center border shadow-xs ${
              isMorning
                ? 'bg-amber-50 text-amber-600 border-amber-200'
                : 'bg-indigo-50 text-indigo-600 border-indigo-200'
            }`}
          >
            {isMorning ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </div>
          <div>
            <p className="font-bold text-slate-900">{formatDisplayDate(dateKey)}</p>
            <p className="text-slate-500 font-medium">
              {isMorning ? 'Morning Slot (11:00 AM – 3:00 PM)' : 'Evening Slot (5:00 PM – 9:00 PM)'}
            </p>
          </div>
        </div>

        {/* Warning Description */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed font-medium">
          Only this specific session slot will be cancelled and released for new bookings. Other booked sessions in this event will not be affected. You will be redirected to the calendar.
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            id="cancel-session-modal-keep-btn"
            type="button"
            onClick={onClose}
            disabled={isCancelling}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
          >
            Keep Slot
          </button>

          <button
            id="cancel-session-modal-confirm-btn"
            type="button"
            onClick={onConfirm}
            disabled={isCancelling}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 border border-rose-600 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCancelling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Cancelling...</span>
              </>
            ) : (
              <span>Yes, Cancel Slot</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
