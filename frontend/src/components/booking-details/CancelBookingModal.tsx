import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface CancelBookingModalProps {
  isOpen: boolean;
  isCancelling: boolean;
  eventName: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  isOpen,
  isCancelling,
  eventName,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-modal-title"
        className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-4 sm:p-7 shadow-2xl shadow-slate-900/10 space-y-4 sm:space-y-5 animate-in zoom-in-95 duration-150"
      >
        {/* Warning Icon & Title */}
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-sm">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h3 id="cancel-modal-title" className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Cancel this booking?
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Event: <strong className="text-slate-800">{eventName}</strong>
            </p>
          </div>
        </div>

        {/* Warning Description */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 leading-relaxed font-medium">
          This action is destructive and will cancel all booked sessions for this event, releasing them for future bookings. You will be redirected to the calendar.
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 pt-2">
          <button
            id="cancel-modal-keep-btn"
            type="button"
            onClick={onClose}
            disabled={isCancelling}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
          >
            Keep Booking
          </button>

          <button
            id="cancel-modal-confirm-btn"
            type="button"
            onClick={onConfirm}
            disabled={isCancelling}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 border border-rose-600 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCancelling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Cancelling...</span>
              </>
            ) : (
              <span>Yes, Cancel Booking</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
