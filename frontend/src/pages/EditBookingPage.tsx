import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
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
  Edit3,
} from 'lucide-react';
import { formatDisplayDate, getDatesInRange } from '../lib/calendar';
import {
  parseTimeToMinutes,
  isEndTimeAfterStartTime,
  formatTimeTo12Hour,
} from '../lib/time';
import { fetchBookings, getBookingById, updateBooking, type UpdateBookingPayload } from '../services/api';
import { BookingSummaryModal } from '../components/booking-form/BookingSummaryModal';
import type { Booking, SessionType } from '../types/booking';

interface EditBookingPageProps {
  bookingId: string;
  onCancel: () => void;
  onSuccess: () => void;
}

const EVENT_TYPE_OPTIONS = [
  'Wedding Ceremony',
  'Nikkah',
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

export const EditBookingPage: React.FC<EditBookingPageProps> = ({
  bookingId,
  onCancel,
  onSuccess,
}) => {
  // Initial Loading & Fetch State
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [originalBooking, setOriginalBooking] = useState<Booking | null>(null);

  // Form State
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState(EVENT_TYPE_OPTIONS[0]);
  const [customEventType, setCustomEventType] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalAmount, setTotalAmount] = useState<string>('0');
  const [notes, setNotes] = useState('');

  // Per-date sessions map: { [dateKey]: { morning: boolean, evening: boolean } }
  const [selectedSessions, setSelectedSessions] = useState<
    Record<string, { morning: boolean; evening: boolean }>
  >({});

  // Per-slot custom times map: { [`${dateKey}_${session}`]: { startTime: string, endTime: string } }
  const [sessionCustomTimes, setSessionCustomTimes] = useState<
    Record<string, { startTime: string; endTime: string }>
  >({});

  // Async & Error State
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  // 1. Fetch initial booking details on mount
  useEffect(() => {
    let isMounted = true;
    const loadOriginal = async () => {
      setInitialLoading(true);
      setInitialError(null);
      try {
        const data = await getBookingById(bookingId);
        if (!isMounted) return;

        setOriginalBooking(data);
        setEventName(data.eventName || '');
        setContactName(data.contactName || '');
        setContactPhone(data.contactPhone || '');
        setTotalAmount(data.totalAmount ? String(Number(data.totalAmount)) : '0');
        setNotes(data.notes || '');

        // Prepopulate event type
        if (EVENT_TYPE_OPTIONS.includes(data.eventType)) {
          setEventType(data.eventType);
          setCustomEventType('');
        } else {
          setEventType('Other Event');
          setCustomEventType(data.eventType || '');
        }

        // Prepopulate sessions & dates
        const activeSessions = data.sessions.filter((s) => s.status === 'BOOKED');
        const targetSessions = activeSessions.length > 0 ? activeSessions : data.sessions;
        const sessionDates = targetSessions.map((s) => s.bookingDate).sort();

        const minDate = sessionDates[0] || new Date().toISOString().slice(0, 10);
        const maxDate = sessionDates[sessionDates.length - 1] || minDate;

        setStartDate(minDate);
        setEndDate(maxDate);

        const initialSelectedMap: Record<string, { morning: boolean; evening: boolean }> = {};
        const initialCustomTimesMap: Record<string, { startTime: string; endTime: string }> = {};

        for (const s of targetSessions) {
          if (!initialSelectedMap[s.bookingDate]) {
            initialSelectedMap[s.bookingDate] = { morning: false, evening: false };
          }
          if (s.session === 'MORNING') {
            initialSelectedMap[s.bookingDate].morning = true;
          } else if (s.session === 'EVENING') {
            initialSelectedMap[s.bookingDate].evening = true;
          }

          const defaultStart = s.session === 'MORNING' ? '11:00 AM' : '5:00 PM';
          const defaultEnd = s.session === 'MORNING' ? '3:00 PM' : '9:00 PM';

          initialCustomTimesMap[`${s.bookingDate}_${s.session}`] = {
            startTime: s.startTime ? formatTimeTo12Hour(s.startTime) || s.startTime : defaultStart,
            endTime: s.endTime ? formatTimeTo12Hour(s.endTime) || s.endTime : defaultEnd,
          };
        }

        setSelectedSessions(initialSelectedMap);
        setSessionCustomTimes(initialCustomTimesMap);
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Unable to load booking details for editing.';
        setInitialError(msg);
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    };

    loadOriginal();
    return () => {
      isMounted = false;
    };
  }, [bookingId]);

  // Generate list of dates between start and end
  const dateList = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return [];
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

  // Check if a specific session is already booked on a date by ANOTHER booking
  const isSessionOccupied = useCallback(
    (dateKey: string, session: SessionType): boolean => {
      for (const b of existingBookings) {
        // Skip current booking so manager can keep or toggle its own slots freely
        if (b.id === bookingId) continue;
        if (b.status !== 'CONFIRMED') continue;
        for (const s of b.sessions) {
          if (s.bookingDate === dateKey && s.session === session && s.status === 'BOOKED') {
            return true;
          }
        }
      }
      return false;
    },
    [existingBookings, bookingId]
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

  // Helper to retrieve times for a given date and session slot
  const getSlotTimes = useCallback(
    (d: string, session: SessionType) => {
      const key = `${d}_${session}`;
      const custom = sessionCustomTimes[key];
      if (custom) return custom;
      return session === 'MORNING'
        ? { startTime: '11:00 AM', endTime: '3:00 PM' }
        : { startTime: '5:00 PM', endTime: '9:00 PM' };
    },
    [sessionCustomTimes]
  );

  // Handle custom time input changes per slot
  const handleTimeChange = (
    d: string,
    session: SessionType,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    const key = `${d}_${session}`;
    const current = getSlotTimes(d, session);
    const updated = {
      ...current,
      [field]: value,
    };
    setSessionCustomTimes((prev) => ({
      ...prev,
      [key]: updated,
    }));

    if (formErrors[`time_${d}_${session}`]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[`time_${d}_${session}`];
        return next;
      });
    }
  };

  // Compile active selected sessions array with actual start & end times
  const activeSelectedSessions = useMemo(() => {
    const list: {
      date: string;
      session: SessionType;
      startTime: string;
      endTime: string;
    }[] = [];
    for (const d of dateList) {
      const entry = selectedSessions[d];
      if (entry?.morning && !isSessionOccupied(d, 'MORNING')) {
        const times = getSlotTimes(d, 'MORNING');
        list.push({
          date: d,
          session: 'MORNING',
          startTime: formatTimeTo12Hour(times.startTime) || times.startTime,
          endTime: formatTimeTo12Hour(times.endTime) || times.endTime,
        });
      }
      if (entry?.evening && !isSessionOccupied(d, 'EVENING')) {
        const times = getSlotTimes(d, 'EVENING');
        list.push({
          date: d,
          session: 'EVENING',
          startTime: formatTimeTo12Hour(times.startTime) || times.startTime,
          endTime: formatTimeTo12Hour(times.endTime) || times.endTime,
        });
      }
    }
    return list;
  }, [dateList, selectedSessions, getSlotTimes, isSessionOccupied]);

  // Client-side Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!eventName.trim()) {
      errors.eventName = 'Name is required.';
    }

    if (!eventType.trim()) {
      errors.eventType = 'Event Type is required.';
    } else if (eventType === 'Other Event' && !customEventType.trim()) {
      errors.customEventType = 'Custom Event Type is required.';
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

    // Validate manual times for each active session
    for (const s of activeSelectedSessions) {
      const times = getSlotTimes(s.date, s.session);
      const startTrim = times.startTime?.trim();
      const endTrim = times.endTime?.trim();

      if (!startTrim) {
        errors[`time_${s.date}_${s.session}`] = 'Start time is required.';
      } else if (!endTrim) {
        errors[`time_${s.date}_${s.session}`] = 'End time is required.';
      } else if (isNaN(parseTimeToMinutes(startTrim))) {
        errors[`time_${s.date}_${s.session}`] = 'Invalid start time format (e.g. 11:00 AM).';
      } else if (isNaN(parseTimeToMinutes(endTrim))) {
        errors[`time_${s.date}_${s.session}`] = 'Invalid end time format (e.g. 3:00 PM).';
      } else if (!isEndTimeAfterStartTime(startTrim, endTrim)) {
        errors[`time_${s.date}_${s.session}`] = 'End time must be later than start time.';
      }
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
  const handleConfirmSave = async () => {
    setServerError(null);
    setSubmitting(true);
    try {
      const finalEventType = eventType === 'Other Event' ? customEventType.trim() : eventType.trim();

      const payload: UpdateBookingPayload = {
        eventName: eventName.trim(),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        eventType: finalEventType,
        totalAmount: Number(totalAmount) || 0,
        notes: notes.trim() || null,
        sessions: activeSelectedSessions,
      };

      await updateBooking(bookingId, payload);

      setIsSummaryModalOpen(false);
      setSuccessMessage('✓ Booking updated successfully!');
      setTimeout(() => {
        onSuccess();
      }, 600);
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      const code = (err as { code?: string }).code;

      let message = 'Unable to update booking. Please try again.';
      if (status === 409 || code === 'BOOKING_CONFLICT') {
        message =
          'One or more selected sessions are already booked by another event. Please review your selection and try again.';
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

  if (initialLoading) {
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

  if (initialError || !originalBooking) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-8 animate-in fade-in">
        <div className="p-8 sm:p-10 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              {initialError || 'Booking not found'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              The booking record could not be loaded for editing.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs sm:text-sm font-semibold text-white transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Booking Details</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Top Bar with Cancel Button */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-5 shadow-sm">
        <button
          id="cancel-edit-booking-top-btn"
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Booking Details</span>
        </button>

        <span className="text-xs font-mono text-indigo-700 bg-indigo-50 px-2.5 sm:px-3 py-1.5 rounded-lg border border-indigo-200 font-semibold flex items-center gap-1.5">
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit Booking</span>
        </span>
      </div>

      {/* Hero Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Booking Modification</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Edit Booking
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Update event specifications, customer contacts, schedule dates, or session timeslots.
            </p>
          </div>

          {/* Original Event Info Pill */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1 w-full sm:w-auto">
            <span className="text-slate-500 font-medium">Original Event:</span>
            <p className="font-bold text-slate-800 line-clamp-1">{originalBooking.eventName}</p>
            <span className="text-slate-500 font-mono text-[11px] block">{originalBooking.id}</span>
          </div>
        </div>
      </div>

      {/* Error & Success Feedback Banners */}
      {serverError && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-slate-900">Update Error</p>
            <p className="text-xs sm:text-sm text-rose-700">{serverError}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="font-bold text-slate-900">{successMessage}</p>
        </div>
      )}

      {/* Main Interactive Form */}
      <form onSubmit={handleInitiateReview} className="space-y-5 sm:space-y-8" autoComplete="off">
        {/* SECTION 1: Event Information */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-7 space-y-4 sm:space-y-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Event Information</h2>
            <p className="text-xs text-slate-500">Essential contact and event specifications</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Name */}
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="event-name" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="event-name"
                  name="eventName"
                  type="text"
                  autoComplete="off"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g. Annual Tech Symposium & Gala / Wedding Ceremony"
                  className={`w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-50 border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all ${
                    formErrors.eventName ? 'border-rose-400 ring-1 ring-rose-400' : 'border-slate-200'
                  }`}
                />
              </div>
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
                  name="contactPerson"
                  type="text"
                  autoComplete="new-password"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Muhammed"
                  className={`w-full pl-10 pr-3.5 sm:pr-4 py-2.5 rounded-xl bg-slate-50 border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all ${
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
                  name="contactPhone"
                  type="tel"
                  autoComplete="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className={`w-full pl-10 pr-3.5 sm:pr-4 py-2.5 rounded-xl bg-slate-50 border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all ${
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
                  name="eventType"
                  autoComplete="off"
                  value={eventType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEventType(val);
                    if (val !== 'Other Event') {
                      setCustomEventType('');
                      if (formErrors.customEventType) {
                        setFormErrors((prev) => {
                          const next = { ...prev };
                          delete next.customEventType;
                          return next;
                        });
                      }
                    }
                  }}
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

            {/* Custom Event Type */}
            {eventType === 'Other Event' && (
              <div className="space-y-1.5 sm:col-span-2 animate-in fade-in duration-150">
                <label htmlFor="custom-event-type" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Custom Event Type <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="custom-event-type"
                    name="customEventType"
                    type="text"
                    autoComplete="off"
                    value={customEventType}
                    onChange={(e) => {
                      setCustomEventType(e.target.value);
                      if (formErrors.customEventType) {
                        setFormErrors((prev) => {
                          const next = { ...prev };
                          delete next.customEventType;
                          return next;
                        });
                      }
                    }}
                    placeholder="e.g. Birthday Celebration, Community Gathering, Photo Shoot"
                    className={`w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-50 border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all ${
                      formErrors.customEventType ? 'border-rose-400 ring-1 ring-rose-400' : 'border-slate-200'
                    }`}
                  />
                </div>
                {formErrors.customEventType && (
                  <p className="text-xs text-rose-600 font-medium">{formErrors.customEventType}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: Booking Dates */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-7 space-y-4 sm:space-y-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Booking Dates</h2>
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
                  name="startDate"
                  type="date"
                  autoComplete="off"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value > endDate) {
                      setEndDate(e.target.value);
                    }
                  }}
                  className={`w-full pl-10 pr-3.5 sm:pr-4 py-2.5 rounded-xl bg-slate-50 border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all ${
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
                  name="endDate"
                  type="date"
                  min={startDate}
                  autoComplete="off"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full pl-10 pr-3.5 sm:pr-4 py-2.5 rounded-xl bg-slate-50 border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all ${
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
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-7 space-y-4 sm:space-y-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Session Selection</h2>
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
          <div className="space-y-3.5 sm:space-y-4">
            {dateList.map((d) => {
              const morningOccupied = isSessionOccupied(d, 'MORNING');
              const eveningOccupied = isSessionOccupied(d, 'EVENING');
              const isMorningChecked = !morningOccupied && !!selectedSessions[d]?.morning;
              const isEveningChecked = !eveningOccupied && !!selectedSessions[d]?.evening;

              return (
                <div
                  key={d}
                  className="p-3.5 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs sm:text-sm font-bold text-slate-900">{formatDisplayDate(d)}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">{d}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Morning Session Option */}
                    <div
                      className={`p-3 sm:p-3.5 rounded-xl border transition-all ${
                        morningOccupied
                          ? 'bg-rose-50/60 border-rose-200 opacity-70 cursor-not-allowed'
                          : isMorningChecked
                          ? 'bg-indigo-50/80 border-indigo-300 text-slate-900 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div
                        className="flex flex-wrap items-center justify-between gap-2 cursor-pointer select-none"
                        onClick={() => !morningOccupied && !submitting && handleToggleSession(d, 'MORNING')}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3">
                          <input
                            id={`session-morning-${d}`}
                            type="checkbox"
                            disabled={morningOccupied || submitting}
                            checked={isMorningChecked}
                            onChange={() => handleToggleSession(d, 'MORNING')}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-white border-slate-300 cursor-pointer disabled:cursor-not-allowed shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                              <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span>Morning Session</span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {isMorningChecked
                                ? `${getSlotTimes(d, 'MORNING').startTime} – ${getSlotTimes(d, 'MORNING').endTime}`
                                : 'Default: 11:00 AM – 3:00 PM'}
                            </span>
                          </div>
                        </div>

                        <div>
                          {morningOccupied ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                              🔴 BOOKED (OTHER EVENT)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              🟢 AVAILABLE
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Editable Start/End Time Inputs when Morning is Selected */}
                      {isMorningChecked && (
                        <div className="mt-3 pt-3 border-t border-indigo-200/60 grid grid-cols-2 gap-2 text-xs animate-in fade-in duration-150">
                          <div>
                            <label htmlFor={`morning-start-${d}`} className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                              Start Time <span className="text-rose-500">*</span>
                            </label>
                            <input
                              id={`morning-start-${d}`}
                              type="text"
                              value={getSlotTimes(d, 'MORNING').startTime}
                              onChange={(e) => handleTimeChange(d, 'MORNING', 'startTime', e.target.value)}
                              placeholder="11:00 AM"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                            />
                          </div>
                          <div>
                            <label htmlFor={`morning-end-${d}`} className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                              End Time <span className="text-rose-500">*</span>
                            </label>
                            <input
                              id={`morning-end-${d}`}
                              type="text"
                              value={getSlotTimes(d, 'MORNING').endTime}
                              onChange={(e) => handleTimeChange(d, 'MORNING', 'endTime', e.target.value)}
                              placeholder="3:00 PM"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                            />
                          </div>
                          {formErrors[`time_${d}_MORNING`] && (
                            <p className="col-span-2 text-[11px] text-rose-600 font-medium mt-0.5">
                              {formErrors[`time_${d}_MORNING`]}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Evening Session Option */}
                    <div
                      className={`p-3 sm:p-3.5 rounded-xl border transition-all ${
                        eveningOccupied
                          ? 'bg-rose-50/60 border-rose-200 opacity-70 cursor-not-allowed'
                          : isEveningChecked
                          ? 'bg-indigo-50/80 border-indigo-300 text-slate-900 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div
                        className="flex flex-wrap items-center justify-between gap-2 cursor-pointer select-none"
                        onClick={() => !eveningOccupied && !submitting && handleToggleSession(d, 'EVENING')}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3">
                          <input
                            id={`session-evening-${d}`}
                            type="checkbox"
                            disabled={eveningOccupied || submitting}
                            checked={isEveningChecked}
                            onChange={() => handleToggleSession(d, 'EVENING')}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-white border-slate-300 cursor-pointer disabled:cursor-not-allowed shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                              <Moon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span>Evening Session</span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {isEveningChecked
                                ? `${getSlotTimes(d, 'EVENING').startTime} – ${getSlotTimes(d, 'EVENING').endTime}`
                                : 'Default: 5:00 PM – 9:00 PM'}
                            </span>
                          </div>
                        </div>

                        <div>
                          {eveningOccupied ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                              🔴 BOOKED (OTHER EVENT)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              🟢 AVAILABLE
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Editable Start/End Time Inputs when Evening is Selected */}
                      {isEveningChecked && (
                        <div className="mt-3 pt-3 border-t border-indigo-200/60 grid grid-cols-2 gap-2 text-xs animate-in fade-in duration-150">
                          <div>
                            <label htmlFor={`evening-start-${d}`} className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                              Start Time <span className="text-rose-500">*</span>
                            </label>
                            <input
                              id={`evening-start-${d}`}
                              type="text"
                              value={getSlotTimes(d, 'EVENING').startTime}
                              onChange={(e) => handleTimeChange(d, 'EVENING', 'startTime', e.target.value)}
                              placeholder="5:00 PM"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                            />
                          </div>
                          <div>
                            <label htmlFor={`evening-end-${d}`} className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                              End Time <span className="text-rose-500">*</span>
                            </label>
                            <input
                              id={`evening-end-${d}`}
                              type="text"
                              value={getSlotTimes(d, 'EVENING').endTime}
                              onChange={(e) => handleTimeChange(d, 'EVENING', 'endTime', e.target.value)}
                              placeholder="9:00 PM"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                            />
                          </div>
                          {formErrors[`time_${d}_EVENING`] && (
                            <p className="col-span-2 text-[11px] text-rose-600 font-medium mt-0.5">
                              {formErrors[`time_${d}_EVENING`]}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 4: Financial & Additional Notes */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-7 space-y-4 sm:space-y-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Financial & Notes</h2>
            <p className="text-xs text-slate-500">Booking charge rate and special requirements</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Total Amount */}
            <div className="space-y-1.5">
              <label htmlFor="total-amount" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Total Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="total-amount"
                  name="totalAmount"
                  type="number"
                  min="0"
                  step="any"
                  autoComplete="off"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                  className={`w-full pl-10 pr-3.5 sm:pr-4 py-2.5 rounded-xl bg-slate-50 border text-sm text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all ${
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
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="booking-notes" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Notes / Special Requirements
              </label>
              <div className="relative">
                <textarea
                  id="booking-notes"
                  name="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. VIP dining arrangement, generator backup requested, stage lighting needs..."
                  className="w-full pl-10 pr-3.5 sm:pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all"
                />
                <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
          <button
            id="cancel-edit-booking-bottom-btn"
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancel</span>
          </button>

          <button
            id="submit-edit-booking-btn"
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-all cursor-pointer shadow-md shadow-indigo-200 active:scale-95 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Confirmation & Summary Modal */}
      <BookingSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        onConfirm={handleConfirmSave}
        isSubmitting={submitting}
        error={serverError}
        eventName={eventName}
        eventType={eventType === 'Other Event' ? customEventType : eventType}
        contactName={contactName}
        contactPhone={contactPhone}
        startDate={startDate}
        endDate={endDate}
        totalAmount={Number(totalAmount) || 0}
        notes={notes}
        sessions={activeSelectedSessions}
        title="Save Booking Changes"
        subtitle="Please review your updated details before saving"
        confirmButtonText="Save Changes"
        submittingButtonText="Saving Changes..."
      />
    </div>
  );
};
