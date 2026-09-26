import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarCheck,
  Search,
  CheckCircle2,
  XCircle,
  Calendar,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useDateRange } from '../../context/DateRangeContext';
import { fetchBookings } from '../../services/api';
import { formatCurrency, formatDisplayDate } from '../../lib/dateRange';
import { useDebounce } from '../../hooks/useDebounce';
import type { Booking, BookingStatus, SessionType } from '../../types/booking';
import { DateRangePicker } from './DateRangePicker';

interface BookingsTabProps {
  onViewBooking?: (bookingId: string) => void;
  onCreateBooking?: () => void;
}

const SORT_OPTIONS = [
  { value: 'created_desc', label: 'Newest First' },
  { value: 'created_asc', label: 'Oldest First' },
  { value: 'name_asc', label: 'Event Name (A–Z)' },
  { value: 'name_desc', label: 'Event Name (Z–A)' },
  { value: 'amount_desc', label: 'Amount (High to Low)' },
  { value: 'amount_asc', label: 'Amount (Low to High)' },
];

export const BookingsTab: React.FC<BookingsTabProps> = ({ onViewBooking, onCreateBooking }) => {
  const { preset, startDate, endDate } = useDateRange();

  // Filter States
  const [statusFilter, setStatusFilter] = useState<'ALL' | BookingStatus>('ALL');
  const [sessionFilter, setSessionFilter] = useState<'ALL' | SessionType>('ALL');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('ALL');
  const [searchInput, setSearchInput] = useState<string>('');
  const debouncedSearch = useDebounce(searchInput, 300);
  const [sortKey, setSortKey] = useState<string>('created_desc');

  // Data State
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchBookings({
        startDate: preset === 'CUSTOM' || preset === 'THIS_MONTH' ? startDate : undefined,
        endDate: preset === 'CUSTOM' || preset === 'THIS_MONTH' ? endDate : undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: debouncedSearch.trim() || undefined,
      });
      setBookings(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch bookings';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [preset, startDate, endDate, statusFilter, debouncedSearch]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Extract unique event types for filtering
  const availableEventTypes = useMemo(() => {
    const types = new Set<string>();
    bookings.forEach((b) => {
      if (b.eventType) types.add(b.eventType);
    });
    return Array.from(types).sort();
  }, [bookings]);

  // Client-side filtering & sorting on the fetched bookings
  const filteredBookings = useMemo(() => {
    let list = [...bookings];

    // Event Type Filter
    if (eventTypeFilter !== 'ALL') {
      list = list.filter((b) => b.eventType === eventTypeFilter);
    }

    // Session Filter
    if (sessionFilter !== 'ALL') {
      list = list.filter((b) =>
        b.sessions.some((s) => s.session === sessionFilter && s.status === 'BOOKED')
      );
    }

    // Sorting
    list.sort((a, b) => {
      switch (sortKey) {
        case 'created_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name_asc':
          return a.eventName.localeCompare(b.eventName);
        case 'name_desc':
          return b.eventName.localeCompare(a.eventName);
        case 'amount_desc':
          return parseFloat(b.totalAmount || '0') - parseFloat(a.totalAmount || '0');
        case 'amount_asc':
          return parseFloat(a.totalAmount || '0') - parseFloat(b.totalAmount || '0');
        case 'created_desc':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return list;
  }, [bookings, eventTypeFilter, sessionFilter, sortKey]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-indigo-600" />
            Bookings Directory
          </h2>
          <p className="text-xs text-slate-500">
            View, search, and manage confirmed and cancelled auditorium reservations
          </p>
        </div>
        <DateRangePicker onRefresh={loadBookings} loading={loading} />
      </div>

      {/* Filter Controls Row */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-4 relative">
            <input
              id="booking-search-input"
              type="text"
              placeholder="Search event, customer, phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <select
              id="booking-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | BookingStatus)}
              className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed Only</option>
              <option value="CANCELLED">Cancelled Only</option>
            </select>
          </div>

          {/* Event Type Filter */}
          <div className="lg:col-span-2">
            <select
              id="booking-event-type-select"
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Event Types</option>
              {availableEventTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Session Filter */}
          <div className="lg:col-span-2">
            <select
              id="booking-session-select"
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value as 'ALL' | SessionType)}
              className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Sessions</option>
              <option value="MORNING">Morning Only</option>
              <option value="EVENING">Evening Only</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div className="lg:col-span-2">
            <select
              id="booking-sort-select"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Count Summary */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">
            Showing {filteredBookings.length} booking{filteredBookings.length === 1 ? '' : 's'}
          </span>
          {onCreateBooking && (
            <button
              type="button"
              onClick={onCreateBooking}
              className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors cursor-pointer text-xs"
            >
              + New Reservation
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm">Failed to load bookings</h4>
            <p className="mt-0.5 text-rose-700">{error}</p>
            <button
              type="button"
              onClick={loadBookings}
              className="mt-2 px-3 py-1 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Table & Results Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading && bookings.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              Loading Bookings...
            </p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Bookings Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No reservation records match the selected date period or filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Event Name</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Scheduled Dates / Slots</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => onViewBooking?.(b.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Event Name */}
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {b.eventName}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        #{b.id.slice(0, 8)}
                      </p>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{b.contactName}</p>
                      <p className="text-[10px] text-slate-500">{b.contactPhone}</p>
                    </td>

                    {/* Type */}
                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                        {b.eventType}
                      </span>
                    </td>

                    {/* Sessions / Dates */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {b.sessions.slice(0, 2).map((s) => (
                          <div key={s.id} className="flex items-center gap-1.5 text-[11px] text-slate-700">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{formatDisplayDate(s.bookingDate)}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                s.session === 'MORNING'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              }`}
                            >
                              {s.session}
                            </span>
                          </div>
                        ))}
                        {b.sessions.length > 2 && (
                          <p className="text-[10px] text-slate-400 font-semibold">
                            +{b.sessions.length - 2} more session(s)
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Total Amount */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(b.totalAmount)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {b.status === 'CONFIRMED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Confirmed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          Cancelled
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
