import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
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
  CheckCircle2,
  Loader2,
  Sparkles,
  CalendarDays,
} from 'lucide-react';
import { formatDisplayDate, formatShortDate, getDatesInRange } from '../lib/calendar';
import { fetchBookings, createBooking } from '../services/api';
import { BookingSummaryModal } from '../components/booking-form/BookingSummaryModal';
import type { Booking, SessionType } from '../types/booking';

interface BookingFormPageProps {
  initialDateKey: string;
  initialSession: SessionType;
  onCancel: () => void;
  onSuccess: (bookingId: string) => void;
}

const EVENT_TYPE_OPTIONS = [
  'Wedding Ceremony',
  'Wedding Reception',
  'Conference',
  'Corporate Seminar',
  'Cultural Program',
  'Music Concert',
  'Exhibition / Expo',
  'Award Function',
  'Private Gathering',
  'Other Event',
];

export const BookingFormPage: React.FC<BookingFormPageProps> = ({
  initialDateKey,
  initialSession,
  onCancel,
  onSuccess,
}) => {
  // Form State
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState(EVENT_TYPE_OPTIONS[0]);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [startDate, setStartDate] = useState(initialDateKey);
  const [endDate, setEndDate] = useState(initialDateKey);
  const [totalAmount, setTotalAmount] = useState<string>('0');
  const [notes, setNotes] = useState('');

  // Per-date sessions map: { [dateKey]: { morning: boolean, evening: boolean } }
  const [selectedSessions, setSelectedSessions] = useState<
    Record<string, { morning: boolean; evening: boolean }>
  >({
    [initialDateKey]: {
      morning: initialSession === 'MORNING',
      evening: initialSession === 'EVENING',
    },
  });

  // Async & Error State
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  // Generate list of dates between start and end
  const dateList = useMemo(() => {
    return getDatesInRange(startDate, endDate);
  }, [startDate, endDate]);

  // Fetch availability for the active date range
  const loadRangeAvailability = useCallback(async () => {
    if (!startDate || !endDate || endDate < startDate) return;
    setLoadingAvailability(true);
    try {
      const data = await fetchBookings({
        startDate,
        endDate,
        status: 'CONFIRMED',
      });
      setExistingBookings(data);
    } catch {
      // Ignore background availability fetch errors
    } finally {
      setLoadingAvailability(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadRangeAvailability();
  }, [loadRangeAvailability]);

  // Check if a specific session is already booked on a date
  const isSessionOccupied = useCallback(
    (dateKey: string, session: SessionType): boolean => {
      for (const b of existingBookings) {
        if (b.status !== 'CONFIRMED') continue;
        for (const s of b.sessions) {
          if (s.bookingDate === dateKey && s.session === session && s.status === 'BOOKED') {
            return true;
          }
        }
      }
      return false;
    },
    [existingBookings]
  );

  // Handle session checkbox toggle
  const handleToggleSession = (dateKey: string, session: SessionType) => {
    setSelectedSessions((prev) => {
      const current = prev[dateKey] || { morning: false, evening: false };
      return {
        ...prev,
        [dateKey]: {
          ...current,
          [session === 'MORNING' ? 'morning' : 'evening']:
            !current[session === 'MORNING' ? 'morning' : 'evening'],
        },
      };
    });

    // Clear session validation error on interaction
    if (formErrors.sessions) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.sessions;
        return next;
      });
    }
  };

  // Compile active selected sessions array
  const activeSelectedSessions = useMemo(() => {
    const list: { date: string; session: SessionType }[] = [];
    for (const d of dateList) {
      const entry = selectedSessions[d];
      if (entry?.morning && !isSessionOccupied(d, 'MORNING')) {
        list.push({ date: d, session: 'MORNING' });
      }
      if (entry?.evening && !isSessionOccupied(d, 'EVENING')) {
        list.push({ date: d, session: 'EVENING' });
      }
    }
    return list;
  }, [dateList, selectedSessions, isSessionOccupied]);

  // Client-side Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!eventName.trim()) {
      errors.eventName = 'Event Name is required.';
    }

    if (!eventType.trim()) {
      errors.eventType = 'Event Type is required.';
    }

    if (!contactName.trim()) {
      errors.contactName = 'Contact Name is required.';
    }

    if (!contactPhone.trim()) {
      errors.contactPhone = 'Contact Phone is required.';
    } else if (contactPhone.trim().length < 5 || contactPhone.trim().length > 20) {
      errors.contactPhone = 'Contact phone must be between 5 and 20 digits.';
    }

    if (!startDate) {
      errors.startDate = 'Start Date is required.';
    }

    if (!endDate) {
      errors.endDate = 'End Date is required.';
    } else if (startDate && endDate < startDate) {
      errors.endDate = 'End Date cannot be before Start Date.';
    }

    if (activeSelectedSessions.length === 0) {
      errors.sessions = 'Please select at least one available session.';
    }

    const numAmount = Number(totalAmount);
    if (isNaN(numAmount) || numAmount < 0) {
      errors.totalAmount = 'Total amount must be a non-negative number.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Trigger Booking Summary Confirmation Modal
  const handleInitiateReview = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) {
      return;
    }

    setIsSummaryModalOpen(true);
  };

  // Final Confirmation Execution
  const handleConfirmBooking = async () => {
    setServerError(null);
    setSubmitting(true);
    try {
      const payload = {
        eventName: eventName.trim(),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        eventType: eventType.trim(),
        totalAmount: Number(totalAmount) || 0,
        notes: notes.trim() || null,
        sessions: activeSelectedSessions,
      };

      const newBooking = await createBooking(payload);

      setIsSummaryModalOpen(false);
      setSuccessMessage('✓ Booking created successfully!');
      setTimeout(() => {
        onSuccess(newBooking.id);
      }, 600);
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      const code = (err as { code?: string }).code;

      let message = 'Unable to create booking. Please try again.';
      if (status === 409 || code === 'BOOKING_CONFLICT') {
        message =
          'One or more selected sessions are no longer available. Please review your selection and try again.';
        // Refresh availability to display updated conflicts
        loadRangeAvailability();
      } else if (status === 401) {
        message = 'Your session has expired. Please sign in again.';
      } else if (err instanceof Error) {
        message = err.message || message;
      }
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Top Bar with Cancel Button */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-5 shadow-sm">
        <button
          id="cancel-booking-top-btn"
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Cancel</span>
        </button>

        <span className="text-xs font-mono text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
          New Booking Entry
        </span>
      </div>

      {/* Hero Selected Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Booking Entry</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              New Booking
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Complete event information and select required session slots.
            </p>
          </div>

          {/* Selected Session Pill */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <span className="text-slate-500 font-medium">Initial Selected Date:</span>
            <p className="font-bold text-slate-800">{formatDisplayDate(initialDateKey)}</p>
            <div className="flex items-center gap-1.5 text-indigo-600 font-semibold pt-0.5">
              {initialSession === 'MORNING' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{initialSession === 'MORNING' ? 'Morning — 11:00 AM to 3:00 PM' : 'Evening — 5:00 PM to 9:00 PM'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error & Success Feedback Banners */}
      {serverError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-slate-900">Booking Error</p>
            <p className="text-xs sm:text-sm text-rose-700">{serverError}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="font-bold text-slate-900">{successMessage}</p>
        </div>
      )}

      {/* Main Interactive Form */}
      <form onSubmit={handleInitiateReview} className="space-y-6 sm:space-y-8">
        {/* SECTION 1: Event Information */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 space-y-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Event Information</h2>
            <p className="text-xs text-slate-500">Essential contact and event specifications</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Event Name */}
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="event-name" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Event Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="event-name"
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. Annual Tech Symposium & Gala"
                className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all ${
                  formErrors.eventName ? 'border-rose-400 ring-1 ring-rose-400' : 'border-slate-200'
                }`}
              />
              {formErrors.eventName && (
                <p className="text-xs text-rose-600 font-medium">{formErrors.eventName}</p>
              )}
            </div>

            {/* Contact Name */}
            <div className="space-y-1.5">
              <label htmlFor="contact-name" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Contact Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="contact-name"
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Muhammed"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all ${
                    formErrors.contactName ? 'border-rose-400 ring-1 ring-rose-400' : 'border-slate-200'
                  }`}
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
              {formErrors.contactName && (
                <p className="text-xs text-rose-600 font-medium">{formErrors.contactName}</p>
              )}
            </div>

            {/* Contact Phone */}
            <div className="space-y-1.5">
              <label htmlFor="contact-phone" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Contact Phone <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="contact-phone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all ${
                    formErrors.contactPhone ? 'border-rose-400 ring-1 ring-rose-400' : 'border-slate-200'
                  }`}
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
              {formErrors.contactPhone && (
                <p className="text-xs text-rose-600 font-medium">{formErrors.contactPhone}</p>
              )}
            </div>

            {/* Event Type */}
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="event-type" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Event Type <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="event-type"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all appearance-none cursor-pointer ${
                    formErrors.eventType ? 'border-rose-400 ring-1 ring-rose-400' : 'border-slate-200'
                  }`}
                >
                  {EVENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-white text-slate-900">
                      {opt}
                    </option>
                  ))}
                </select>
                <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              </div>
              {formErrors.eventType && (
                <p className="text-xs text-rose-600 font-medium">{formErrors.eventType}</p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: Booking Dates */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 space-y-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Booking Dates</h2>
              <p className="text-xs text-slate-500">Single or consecutive multi-day booking range</p>
            </div>
            {dateList.length > 1 && (
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                {dateList.length} Days Selected
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Start Date */}
            <div className="space-y-1.5">
              <label htmlFor="start-date" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value > endDate) {
                      setEndDate(e.target.value);
                    }
                  }}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all ${
                    formErrors.startDate ? 'border-rose-400 ring-1 ring-rose-400' : 'border-slate-200'
                  }`}
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
              {formErrors.startDate && (
                <p className="text-xs text-rose-600 font-medium">{formErrors.startDate}</p>
              )}
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <label htmlFor="end-date" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                End Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all ${
                    formErrors.endDate ? 'border-rose-400 ring-1 ring-rose-400' : 'border-slate-200'
                  }`}
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
              {formErrors.endDate && (
                <p className="text-xs text-rose-600 font-medium">{formErrors.endDate}</p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: Per-Date Session Selection */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 space-y-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Session Selection</h2>
              <p className="text-xs text-slate-500">Choose Morning and/or Evening sessions for each date</p>
            </div>
            {loadingAvailability && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>Checking availability...</span>
              </div>
            )}
          </div>

          {formErrors.sessions && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {formErrors.sessions}
            </div>
          )}

          {/* Date by Date Session Cards */}
          <div className="space-y-4">
            {dateList.map((d) => {
              const morningOccupied = isSessionOccupied(d, 'MORNING');
              const eveningOccupied = isSessionOccupied(d, 'EVENING');
              const isMorningChecked = !morningOccupied && !!selectedSessions[d]?.morning;
              const isEveningChecked = !eveningOccupied && !!selectedSessions[d]?.evening;

              return (
                <div
                  key={d}
                  className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-bold text-slate-900">{formatDisplayDate(d)}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">{d}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Morning Session Checkbox Option */}
                    <label
                      htmlFor={`session-morning-${d}`}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        morningOccupied
                          ? 'bg-rose-50/60 border-rose-200 opacity-70 cursor-not-allowed'
                          : isMorningChecked
                          ? 'bg-indigo-50/80 border-indigo-300 text-slate-900 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          id={`session-morning-${d}`}
                          type="checkbox"
                          disabled={morningOccupied || submitting}
                          checked={isMorningChecked}
                          onChange={() => handleToggleSession(d, 'MORNING')}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-white border-slate-300 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                            <Sun className="w-3.5 h-3.5 text-amber-500" />
                            <span>Morning Session</span>
                          </div>
                          <span className="text-[11px] text-slate-500">11:00 AM – 3:00 PM</span>
                        </div>
                      </div>

                      <div>
                        {morningOccupied ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            🔴 BOOKED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            🟢 AVAILABLE
                          </span>
                        )}
                      </div>
                    </label>

                    {/* Evening Session Checkbox Option */}
                    <label
                      htmlFor={`session-evening-${d}`}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        eveningOccupied
                          ? 'bg-rose-50/60 border-rose-200 opacity-70 cursor-not-allowed'
                          : isEveningChecked
                          ? 'bg-indigo-50/80 border-indigo-300 text-slate-900 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          id={`session-evening-${d}`}
                          type="checkbox"
                          disabled={eveningOccupied || submitting}
                          checked={isEveningChecked}
                          onChange={() => handleToggleSession(d, 'EVENING')}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-white border-slate-300 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                            <Moon className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Evening Session</span>
                          </div>
                          <span className="text-[11px] text-slate-500">5:00 PM – 9:00 PM</span>
                        </div>
                      </div>

                      <div>
                        {eveningOccupied ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            🔴 BOOKED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            🟢 AVAILABLE
                          </span>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 4: Amount & Notes */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 space-y-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Amount & Notes</h2>
            <p className="text-xs text-slate-500">Pricing and special auditorium requirements</p>
          </div>

          <div className="space-y-4 sm:space-y-5">
            {/* Total Amount (₹) */}
            <div className="space-y-1.5">
              <label htmlFor="total-amount" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Total Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="total-amount"
                  type="number"
                  min="0"
                  step="any"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all font-mono ${
                    formErrors.totalAmount ? 'border-rose-400 ring-1 ring-rose-400' : 'border-slate-200'
                  }`}
                />
                <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
              {formErrors.totalAmount && (
                <p className="text-xs text-rose-600 font-medium">{formErrors.totalAmount}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label htmlFor="notes" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Notes / Special Requirements (Optional)
              </label>
              <div className="relative">
                <textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Stage lighting requirements, mic setup, additional seating..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all resize-none"
                />
                <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5: Booking Summary Card */}
        <div className="bg-indigo-50/50 border border-indigo-200 rounded-2xl p-5 sm:p-7 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Booking Summary</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">Review prior to submission</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 font-medium">Event:</span>
              <p className="text-sm font-bold text-slate-900 truncate mt-0.5">
                {eventName || '(Untitled Event)'}
              </p>
            </div>

            <div>
              <span className="text-slate-500 font-medium">Contact:</span>
              <p className="text-sm font-bold text-slate-900 truncate mt-0.5">
                {contactName || '(No contact specified)'} {contactPhone ? `(${contactPhone})` : ''}
              </p>
            </div>

            <div>
              <span className="text-slate-500 font-medium">Date Range:</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {formatShortDate(startDate)} {startDate !== endDate ? `– ${formatShortDate(endDate)}` : ''}
              </p>
            </div>

            <div>
              <span className="text-slate-500 font-medium">Total Amount:</span>
              <p className="text-sm font-bold text-emerald-700 font-mono mt-0.5">
                ₹{Number(totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Reserved Sessions List in Summary */}
          <div className="pt-3 border-t border-indigo-100">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">
              Reserved Sessions ({activeSelectedSessions.length})
            </span>
            {activeSelectedSessions.length === 0 ? (
              <p className="text-xs text-rose-600 italic font-medium">No sessions currently selected.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {activeSelectedSessions.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs shadow-xs"
                  >
                    <span className="font-semibold text-slate-800">{formatShortDate(s.date)}</span>
                    <div className="flex items-center gap-1.5 text-indigo-700 font-medium">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{s.session === 'MORNING' ? 'Morning' : 'Evening'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 6: Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            id="cancel-booking-btn"
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
          >
            CANCEL
          </button>

          <button
            id="create-booking-submit-btn"
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-all cursor-pointer shadow-md shadow-indigo-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>CREATE BOOKING</span>
          </button>
        </div>
      </form>

      {/* Booking Summary & Confirmation Modal */}
      <BookingSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        onConfirm={handleConfirmBooking}
        isSubmitting={submitting}
        error={serverError}
        eventName={eventName}
        eventType={eventType}
        contactName={contactName}
        contactPhone={contactPhone}
        startDate={startDate}
        endDate={endDate}
        totalAmount={Number(totalAmount) || 0}
        notes={notes}
        sessions={activeSelectedSessions}
      />
    </div>
  );
};
