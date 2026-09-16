import React from 'react';
import { Sun, Moon, Clock, User, CalendarDays, ArrowRight, Eye, Ban } from 'lucide-react';
import type { Booking, SessionType } from '../../types/booking';

interface SessionCardProps {
  session: SessionType;
  booking?: Booking;
  isBooked: boolean;
  onBook: (session: SessionType) => void;
  onViewBooking: (bookingId: string) => void;
  onCancelSlot?: () => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  booking,
  isBooked,
  onBook,
  onViewBooking,
  onCancelSlot,
}) => {
  const isMorning = session === 'MORNING';

  const timeLabel = isMorning ? '11:00 AM – 3:00 PM' : '5:00 PM – 9:00 PM';
  const sessionName = isMorning ? 'Morning Session' : 'Evening Session';
  const bookButtonLabel = isMorning ? 'BOOK MORNING' : 'BOOK EVENING';

  return (
    <div
      className={`rounded-2xl border p-5 sm:p-7 flex flex-col justify-between transition-all duration-200 shadow-sm ${
        isBooked
          ? 'bg-white border-rose-200 shadow-rose-50'
          : 'bg-white border-slate-200/80 hover:border-emerald-300 hover:shadow-md'
      }`}
    >
      <div>
        {/* Card Header: Session Name, Icon & Time */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border shadow-sm ${
                isBooked
                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200'
              }`}
            >
              {isMorning ? <Sun className="w-5 h-5 sm:w-6 sm:h-6" /> : <Moon className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                {isMorning ? 'Slot 1' : 'Slot 2'}
              </span>
              <h3 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">
                {sessionName}
              </h3>
            </div>
          </div>

          {/* Time Badge */}
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] sm:text-xs font-semibold text-slate-700">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>{timeLabel}</span>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="mb-4">
          {isBooked ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>🔴 BOOKED</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>🟢 AVAILABLE</span>
            </div>
          )}
        </div>

        {/* Status Content Body */}
        {isBooked && booking ? (
          <div className="space-y-2.5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Event Name
              </span>
              <p className="text-base font-bold text-slate-900 mt-0.5">{booking.eventName}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Contact:</span>
                <p className="text-slate-800 font-semibold truncate mt-0.5">{booking.contactName}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Type:</span>
                <p className="text-slate-800 font-semibold truncate mt-0.5">{booking.eventType}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 text-xs flex items-center gap-1.5 text-slate-600">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              <span>Booked by: <strong className="text-slate-800">{booking.creator?.name || 'Authorized Manager'}</strong></span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm">
            <p className="text-slate-800 font-semibold">
              This session is available for booking.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Select this session to proceed to the booking details form.
            </p>
          </div>
        )}
      </div>

      {/* Action Button Footer */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        {isBooked && booking ? (
          <div className="flex items-center gap-2">
            <button
              id={`view-booking-${session.toLowerCase()}-btn`}
              type="button"
              onClick={() => onViewBooking(booking.id)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
            >
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>VIEW DETAILS</span>
            </button>

            {onCancelSlot && (
              <button
                id={`cancel-slot-${session.toLowerCase()}-btn`}
                type="button"
                onClick={onCancelSlot}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <Ban className="w-4 h-4" />
                <span>CANCEL SLOT</span>
              </button>
            )}
          </div>
        ) : (
          <button
            id={`book-${session.toLowerCase()}-btn`}
            type="button"
            onClick={() => onBook(session)}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-all cursor-pointer shadow-md shadow-emerald-100 active:scale-[0.98]"
          >
            <CalendarDays className="w-4 h-4" />
            <span>{bookButtonLabel}</span>
            <ArrowRight className="w-4 h-4 ml-1 opacity-90" />
          </button>
        )}
      </div>
    </div>
  );
};
