import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Sun,
  Moon,
  User,
  Phone,
  Tag,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Edit3,
  Ban,
  ShieldCheck,
  History,
  Sparkles,
  CreditCard,
  PlusCircle,
  Receipt,
} from 'lucide-react';
import { getBookingById, cancelBooking, cancelBookingSession, getBookingPayments } from '../services/api';
import { formatDisplayDate, formatShortDate } from '../lib/calendar';
import { CancelBookingModal } from '../components/booking-details/CancelBookingModal';
import { CancelSessionModal } from '../components/booking-details/CancelSessionModal';
import { AddPaymentModal } from '../components/booking-details/AddPaymentModal';
import type { Booking, BookingSession } from '../types/booking';
import type { Payment, PaymentSummary } from '../types/payment';

interface BookingDetailsPageProps {
  bookingId: string;
  onBack: () => void;
  onEditBooking: (bookingId: string) => void;
  onBackToCalendar?: () => void;
}

export const BookingDetailsPage: React.FC<BookingDetailsPageProps> = ({
  bookingId,
  onBack,
  onEditBooking,
  onBackToCalendar,
}) => {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);

  // Entire Booking Cancellation modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationNotice, setCancellationNotice] = useState<string | null>(null);

  // Individual Session Slot Cancellation modal state
  const [selectedSessionToCancel, setSelectedSessionToCancel] = useState<BookingSession | null>(null);
  const [isCancellingSession, setIsCancellingSession] = useState(false);

  // Add Payment modal state
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingData, paymentsData] = await Promise.all([
        getBookingById(bookingId),
        getBookingPayments(bookingId).catch(() => []),
      ]);
      setBooking(bookingData);
      setPayments(paymentsData);
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      const message =
        status === 404
          ? 'Booking not found.'
          : status === 401
          ? 'Your session has expired. Please sign in again.'
          : err instanceof Error
          ? err.message
          : 'Unable to load booking details. Please try again.';
      setError({ status, message });
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sort sessions chronologically by date ascending, then MORNING before EVENING
  const sortedSessions = useMemo(() => {
    if (!booking) return [];
    return [...booking.sessions].sort((a, b) => {
      if (a.bookingDate !== b.bookingDate) {
        return a.bookingDate.localeCompare(b.bookingDate);
      }
      if (a.session === 'MORNING' && b.session === 'EVENING') return -1;
      if (a.session === 'EVENING' && b.session === 'MORNING') return 1;
      return 0;
    });
  }, [booking]);

  // Calculate payment summary
  const paymentSummary: PaymentSummary = useMemo(() => {
    const totalAmount = booking ? Number(booking.totalAmount) : 0;
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const isBookingCancelled = booking?.status === 'CANCELLED';
    const balance = isBookingCancelled ? 0 : Math.max(totalAmount - totalPaid, 0);

    let status: PaymentSummary['status'] = 'UNPAID';
    if (isBookingCancelled) {
      status = 'CANCELLED';
    } else if (totalAmount === 0 || totalPaid >= totalAmount - 0.001) {
      status = 'PAID';
    } else if (totalPaid > 0) {
      status = 'PARTIALLY_PAID';
    }

    return {
      totalAmount,
      totalPaid,
      balance,
      status,
    };
  }, [booking, payments]);

  // Format timestamp (e.g. "23 September 2026, 10:32 AM")
  const formatDateTime = (dateStr?: string | Date) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Handle cancellation execution (Entire Booking)
  const handleConfirmCancel = async () => {
    if (!booking) return;
    setIsCancelling(true);
    setCancellationNotice(null);

    try {
      await cancelBooking(booking.id);
      setIsCancelModalOpen(false);
      // Redirect directly to calendar
      if (onBackToCalendar) {
        onBackToCalendar();
      } else {
        onBack();
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const message =
        code === 'ALREADY_CANCELLED'
          ? 'Booking has already been cancelled.'
          : err instanceof Error
          ? err.message
          : 'Failed to cancel booking. Please try again.';
      setCancellationNotice(`! ${message}`);
      setIsCancelModalOpen(false);
      loadData();
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle cancellation execution (Individual Session Slot)
  const handleConfirmCancelSession = async () => {
    if (!booking || !selectedSessionToCancel) return;
    setIsCancellingSession(true);
    setCancellationNotice(null);

    try {
      await cancelBookingSession(booking.id, selectedSessionToCancel.id);
      setSelectedSessionToCancel(null);
      // Redirect directly to calendar
      if (onBackToCalendar) {
        onBackToCalendar();
      } else {
        onBack();
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const message =
        code === 'ALREADY_CANCELLED'
          ? 'Session has already been cancelled.'
          : err instanceof Error
          ? err.message
          : 'Failed to cancel session slot. Please try again.';
      setCancellationNotice(`! ${message}`);
      setSelectedSessionToCancel(null);
      loadData();
    } finally {
      setIsCancellingSession(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto animate-pulse">
        <div className="h-16 bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="w-28 h-8 bg-slate-100 rounded-xl" />
          <div className="w-24 h-6 bg-slate-100 rounded-lg" />
        </div>
        <div className="h-40 bg-white border border-slate-200/80 rounded-2xl p-8 space-y-3 shadow-sm">
          <div className="w-24 h-5 bg-slate-100 rounded-full" />
          <div className="w-64 h-8 bg-slate-100 rounded-lg" />
          <div className="w-48 h-4 bg-slate-100 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-white border border-slate-200/80 rounded-2xl shadow-sm" />
          <div className="h-48 bg-white border border-slate-200/80 rounded-2xl shadow-sm" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-8 animate-in fade-in">
        <div className="p-8 sm:p-10 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">{error.message}</h3>
            <p className="text-xs sm:text-sm text-slate-600">
              {error.status === 404
                ? 'The requested booking ID does not exist or has been removed.'
                : 'Please check your connection or return to the main calendar.'}
            </p>
          </div>
          <div className="pt-2">
            <button
              id="error-back-to-calendar-btn"
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs sm:text-sm font-semibold text-white transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Calendar</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const isConfirmed = booking.status === 'CONFIRMED';
  const isCancelled = booking.status === 'CANCELLED';
  const creatorDisplay = booking.creator?.name || 'Auditorium Staff';

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200 pb-8">
      {/* Top Navigation & Status Bar */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm">
        <button
          id="back-from-details-btn"
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 hidden sm:inline">
            #{booking.id.slice(0, 8)}
          </span>

          {/* Booking Status Badge */}
          {isConfirmed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wider shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>🟢 CONFIRMED</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold uppercase tracking-wider shadow-sm">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>🔴 CANCELLED</span>
            </span>
          )}
        </div>
      </div>

      {/* Cancellation Notice Alert */}
      {cancellationNotice && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm animate-in fade-in shadow-sm ${
            cancellationNotice.startsWith('✓')
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {cancellationNotice.startsWith('✓') ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <p className="font-semibold">{cancellationNotice}</p>
        </div>
      )}

      {/* Main Details Container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-8 shadow-sm space-y-8">
        {/* Header Title Section */}
        <div className="border-b border-slate-100 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md mb-2 border border-indigo-100">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Booking Record</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {booking.eventName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Booking ID: <span className="font-mono text-slate-700 font-medium">{booking.id}</span>
            </p>
          </div>

          <div className="sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Booking Amount
            </span>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-700 font-mono mt-0.5">
              ₹{paymentSummary.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* SECTION 1: Event & Contact Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Event Information Card */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200/60 pb-2">
              <Tag className="w-4 h-4 text-indigo-600" />
              <span>EVENT INFORMATION</span>
            </div>
            <div className="space-y-2 text-xs sm:text-sm">
              <div>
                <span className="text-slate-500 font-medium">Event Name:</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{booking.eventName}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Event Type:</span>
                <p className="text-sm font-semibold text-slate-700 mt-0.5">{booking.eventType}</p>
              </div>
            </div>
          </div>

          {/* Contact Information Card */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200/60 pb-2">
              <User className="w-4 h-4 text-indigo-600" />
              <span>CONTACT INFORMATION</span>
            </div>
            <div className="space-y-2 text-xs sm:text-sm">
              <div>
                <span className="text-slate-500 font-medium">Contact Name:</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{booking.contactName}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Contact Phone:</span>
                <p className="text-sm font-bold text-indigo-700 font-mono mt-0.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>{booking.contactPhone}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Booked Sessions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>BOOKED SESSIONS ({sortedSessions.length})</span>
            </div>
            <span className="text-[11px] text-slate-500">Chronological Order</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sortedSessions.map((session: BookingSession) => {
              const isMorning = session.session === 'MORNING';
              const isSessionBooked = session.status === 'BOOKED';

              return (
                <div
                  key={session.id}
                  className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                    isSessionBooked
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-rose-50/50 border-rose-200 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${
                        isSessionBooked
                          ? 'bg-emerald-100/60 text-emerald-700 border-emerald-200'
                          : 'bg-rose-100/60 text-rose-700 border-rose-200'
                      }`}
                    >
                      {isMorning ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-500" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {formatDisplayDate(session.bookingDate)}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-semibold text-slate-700">
                          {isMorning ? 'Morning' : 'Evening'}
                        </span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{isMorning ? '11:00 AM – 3:00 PM' : '5:00 PM – 9:00 PM'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    {isSessionBooked ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>BOOKED</span>
                        </span>
                        {isConfirmed && (
                          <button
                            id={`cancel-session-${session.id}-btn`}
                            type="button"
                            onClick={() => setSelectedSessionToCancel(session)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer shadow-xs active:scale-95"
                          >
                            Cancel Slot
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-bold">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        <span>CANCELLED</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: Notes (If provided) */}
        {booking.notes && (
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>NOTES / SPECIAL REQUIREMENTS</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {booking.notes}
            </p>
          </div>
        )}

        {/* SECTION 4: PAYMENT SUMMARY & RECORDING */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-indigo-50/40 to-slate-50 border border-indigo-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>PAYMENT SUMMARY</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Billing & Collections
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Payment Status Badge */}
              {paymentSummary.status === 'PAID' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wider shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>🟢 PAID</span>
                </span>
              )}
              {paymentSummary.status === 'PARTIALLY_PAID' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold uppercase tracking-wider shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>🟡 PARTIALLY PAID</span>
                </span>
              )}
              {paymentSummary.status === 'UNPAID' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold uppercase tracking-wider shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>🔴 UNPAID</span>
                </span>
              )}
              {paymentSummary.status === 'CANCELLED' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold uppercase tracking-wider shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>🔴 VOID / CANCELLED</span>
                </span>
              )}

              {/* Add Payment Button */}
              {isConfirmed && paymentSummary.balance > 0 && (
                <button
                  id="open-add-payment-btn"
                  type="button"
                  onClick={() => setIsAddPaymentModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-600 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ ADD PAYMENT</span>
                </button>
              )}
            </div>
          </div>

          {/* Payment Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-1 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Total Amount
              </span>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
                ₹{paymentSummary.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              {isCancelled && (
                <span className="text-[10px] text-slate-400 font-medium block">Original Booked Value</span>
              )}
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-1 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Total Paid
              </span>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600 font-mono">
                ₹{paymentSummary.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              {isCancelled && (
                <span className="text-[10px] text-slate-400 font-medium block">Amount Collected</span>
              )}
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-1 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Outstanding Balance
              </span>
              {isCancelled ? (
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-400 font-mono">
                    ₹0.00
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium block">Voided (Booking Cancelled)</span>
                </div>
              ) : (
                <p className="text-xl sm:text-2xl font-bold text-amber-600 font-mono">
                  ₹{paymentSummary.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
          </div>

          {/* Helper notice for cancelled / completed payments */}
          {isCancelled && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
              Payments cannot be added to a cancelled booking.
            </div>
          )}

          {isConfirmed && paymentSummary.balance <= 0 && paymentSummary.totalAmount > 0 && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Payment completed. No outstanding balance remaining.</span>
            </div>
          )}

          {/* Payment History List */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>PAYMENT HISTORY ({payments.length})</span>
            </h4>

            {payments.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 rounded-xl bg-white border border-slate-200/80 text-center shadow-sm">
                No payments recorded yet for this booking.
              </p>
            ) : (
              <div className="space-y-2.5">
                {payments.map((p) => {
                  const receiverName = p.receiver?.name || 'Auditorium Staff';
                  return (
                    <div
                      key={p.id}
                      className="p-4 rounded-xl bg-white border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-slate-900">
                            {formatShortDate(p.paymentDate.slice(0, 10))}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase">
                            {p.paymentMethod}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Received by: <strong className="text-slate-800">{receiverName}</strong>
                        </p>
                        {p.notes && (
                          <p className="text-xs text-slate-600 italic pt-0.5">
                            "{p.notes}"
                          </p>
                        )}
                      </div>

                      <div className="sm:text-right">
                        <span className="text-base sm:text-lg font-bold text-emerald-700 font-mono">
                          ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 5: Booking Metadata & Audit Info */}
        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200/60 pb-2">
            <History className="w-4 h-4 text-indigo-600" />
            <span>BOOKING INFORMATION</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-500 font-medium">Booked By:</span>
              <p className="text-xs font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>{creatorDisplay}</span>
              </p>
              {booking.creator?.email && (
                <p className="text-[10px] text-slate-500">{booking.creator.email}</p>
              )}
            </div>

            <div>
              <span className="text-slate-500 font-medium">Created:</span>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">
                {formatDateTime(booking.createdAt)}
              </p>
            </div>

            <div>
              <span className="text-slate-500 font-medium">Last Updated:</span>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">
                {formatDateTime(booking.updatedAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
          {isConfirmed && (
            <button
              id="cancel-booking-btn"
              type="button"
              onClick={() => setIsCancelModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Ban className="w-4 h-4" />
              <span>
                {sortedSessions.filter((s) => s.status === 'BOOKED').length > 1
                  ? 'CANCEL ALL SLOTS (ENTIRE EVENT)'
                  : 'CANCEL BOOKING'}
              </span>
            </button>
          )}

          <button
            id="edit-booking-btn"
            type="button"
            onClick={() => onEditBooking(booking.id)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-600 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Edit3 className="w-4 h-4" />
            <span>EDIT BOOKING</span>
          </button>
        </div>
      </div>

      {/* Cancellation Confirmation Dialog Modal (Entire Booking) */}
      <CancelBookingModal
        isOpen={isCancelModalOpen}
        isCancelling={isCancelling}
        eventName={booking.eventName}
        onConfirm={handleConfirmCancel}
        onClose={() => setIsCancelModalOpen(false)}
      />

      {/* Cancellation Confirmation Dialog Modal (Individual Session Slot) */}
      {selectedSessionToCancel && (
        <CancelSessionModal
          isOpen={!!selectedSessionToCancel}
          isCancelling={isCancellingSession}
          dateKey={selectedSessionToCancel.bookingDate}
          session={selectedSessionToCancel.session}
          eventName={booking.eventName}
          onConfirm={handleConfirmCancelSession}
          onClose={() => setSelectedSessionToCancel(null)}
        />
      )}

      {/* Add Payment Modal Dialog */}
      <AddPaymentModal
        isOpen={isAddPaymentModalOpen}
        onClose={() => setIsAddPaymentModalOpen(false)}
        onSuccess={() => {
          setIsAddPaymentModalOpen(false);
          loadData();
        }}
        bookingId={booking.id}
        totalAmount={paymentSummary.totalAmount}
        totalPaid={paymentSummary.totalPaid}
        balance={paymentSummary.balance}
      />
    </div>
  );
};
