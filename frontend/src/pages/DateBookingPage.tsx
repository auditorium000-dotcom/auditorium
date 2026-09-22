import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Calendar as CalendarIcon, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { formatDisplayDate } from '../lib/calendar';
import { fetchBookings, cancelBookingSession } from '../services/api';
import { SessionCard } from '../components/date-booking/SessionCard';
import { DateBookingSkeleton } from '../components/date-booking/DateBookingSkeleton';
import { CancelSessionModal } from '../components/booking-details/CancelSessionModal';
import type { Booking, BookingSession, SessionType } from '../types/booking';

interface DateBookingPageProps {
  dateKey: string;
  onBackToCalendar: () => void;
  onBookSession: (dateKey: string, session: SessionType) => void;
  onViewBooking: (bookingId: string) => void;
}

export const DateBookingPage: React.FC<DateBookingPageProps> = ({
  dateKey,
  onBackToCalendar,
  onBookSession,
  onViewBooking,
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation modal state for a specific session slot
  const [sessionToCancel, setSessionToCancel] = useState<{
    session: BookingSession;
    booking: Booking;
  } | null>(null);
  const [isCancellingSession, setIsCancellingSession] = useState(false);

  const loadDateBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBookings({
        startDate: dateKey,
        endDate: dateKey,
        status: 'CONFIRMED',
      });
      setBookings(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load booking information.');
    } finally {
      setLoading(false);
    }
  }, [dateKey]);

  useEffect(() => {
    loadDateBookings();
  }, [loadDateBookings]);

  // Handle slot-level cancellation and redirect to calendar
  const handleConfirmCancelSlot = async () => {
    if (!sessionToCancel) return;
    setIsCancellingSession(true);
    try {
      await cancelBookingSession(sessionToCancel.booking.id, sessionToCancel.session.id);
      setSessionToCancel(null);
      // As requested: redirect to calendar page upon cancellation confirmation
      onBackToCalendar();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel slot.';
      setError(message);
      setSessionToCancel(null);
      loadDateBookings();
    } finally {
      setIsCancellingSession(false);
    }
  };

  const formattedDate = formatDisplayDate(dateKey);

  // Extract active BOOKED morning session
  const morningSession = bookings
    .flatMap((b) => b.sessions)
    .find((s) => s.bookingDate === dateKey && s.session === 'MORNING' && s.status === 'BOOKED');
  const morningBooking = bookings.find((b) => b.sessions.some((s) => s.id === morningSession?.id));

  // Extract active BOOKED evening session
  const eveningSession = bookings
    .flatMap((b) => b.sessions)
    .find((s) => s.bookingDate === dateKey && s.session === 'EVENING' && s.status === 'BOOKED');
  const eveningBooking = bookings.find((b) => b.sessions.some((s) => s.id === eveningSession?.id));

  const isMorningBooked = !!morningSession;
  const isEveningBooked = !!eveningSession;
  const bookedCount = (isMorningBooked ? 1 : 0) + (isEveningBooked ? 1 : 0);

  if (loading) {
    return <DateBookingSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-5 shadow-sm">
          <button
            id="back-to-calendar-btn"
            type="button"
            onClick={onBackToCalendar}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Calendar</span>
          </button>
        </div>

        <div className="p-6 sm:p-12 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">Unable to load booking information.</h3>
            <p className="text-xs sm:text-sm text-slate-600">{error}</p>
          </div>
          <button
            id="retry-date-booking-btn"
            type="button"
            onClick={loadDateBookings}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between gap-2 bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            id="back-to-calendar-btn"
            type="button"
            onClick={onBackToCalendar}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Calendar</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-600 font-medium shrink-0">
          <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
          <span className="font-mono text-slate-800 font-semibold">{dateKey}</span>
        </div>
      </div>

      {/* Date Overview Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-8 relative overflow-hidden shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auditorium Availability</span>
            </div>
            <h2 id="selected-date-title" className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {formattedDate}
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Showing session availability and booking actions for this date.
            </p>
          </div>

          {/* Daily Status Summary Pill */}
          <div className="self-start md:self-auto">
            {bookedCount === 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] sm:text-xs font-bold uppercase tracking-wider shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>2 SESSIONS AVAILABLE</span>
              </span>
            )}
            {bookedCount === 1 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] sm:text-xs font-bold uppercase tracking-wider shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>1 SESSION AVAILABLE</span>
              </span>
            )}
            {bookedCount === 2 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[11px] sm:text-xs font-bold uppercase tracking-wider shadow-sm">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>FULLY BOOKED</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Auditorium Sessions Grid (Morning & Evening) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Morning Session Card */}
        <SessionCard
          session="MORNING"
          booking={morningBooking}
          bookedSession={morningSession}
          isBooked={isMorningBooked}
          onBook={(session) => onBookSession(dateKey, session)}
          onViewBooking={onViewBooking}
          onCancelSlot={
            morningSession && morningBooking
              ? () => setSessionToCancel({ session: morningSession, booking: morningBooking })
              : undefined
          }
        />

        {/* Evening Session Card */}
        <SessionCard
          session="EVENING"
          booking={eveningBooking}
          bookedSession={eveningSession}
          isBooked={isEveningBooked}
          onBook={(session) => onBookSession(dateKey, session)}
          onViewBooking={onViewBooking}
          onCancelSlot={
            eveningSession && eveningBooking
              ? () => setSessionToCancel({ session: eveningSession, booking: eveningBooking })
              : undefined
          }
        />
      </div>

      {/* Cancellation Modal for Slot */}
      {sessionToCancel && (
        <CancelSessionModal
          isOpen={!!sessionToCancel}
          isCancelling={isCancellingSession}
          dateKey={dateKey}
          session={sessionToCancel.session.session}
          startTime={sessionToCancel.session.startTime}
          endTime={sessionToCancel.session.endTime}
          eventName={sessionToCancel.booking.eventName}
          onConfirm={handleConfirmCancelSlot}
          onClose={() => setSessionToCancel(null)}
        />
      )}
    </div>
  );
};
