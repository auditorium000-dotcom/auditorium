import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Receipt,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  PlusCircle,
  Calendar,
} from 'lucide-react';
import { useDateRange } from '../../context/DateRangeContext';
import { fetchOutstandingBookings } from '../../services/api';
import { formatCurrency, formatDisplayDate } from '../../lib/dateRange';
import { useDebounce } from '../../hooks/useDebounce';
import type { OutstandingBookingItem, PaginatedOutstandingResponse } from '../../types/dashboard';
import { AddPaymentModal } from '../booking-details/AddPaymentModal';
import { DateRangePicker } from './DateRangePicker';

interface OutstandingTabProps {
  onViewBooking?: (bookingId: string) => void;
}

const SORT_OPTIONS: {
  value: string;
  label: string;
  sortBy: 'outstandingBalance' | 'totalAmount' | 'amountPaid' | 'createdAt' | 'eventName';
  sortOrder: 'asc' | 'desc';
}[] = [
  { value: 'balance_desc', label: 'Highest Outstanding', sortBy: 'outstandingBalance', sortOrder: 'desc' },
  { value: 'balance_asc', label: 'Lowest Outstanding', sortBy: 'outstandingBalance', sortOrder: 'asc' },
  { value: 'created_desc', label: 'Newest First', sortBy: 'createdAt', sortOrder: 'desc' },
  { value: 'created_asc', label: 'Oldest First', sortBy: 'createdAt', sortOrder: 'asc' },
];

export const OutstandingTab: React.FC<OutstandingTabProps> = ({ onViewBooking }) => {
  const { preset, startDate, endDate } = useDateRange();

  // Filters State
  const [searchInput, setSearchInput] = useState<string>('');
  const debouncedSearch = useDebounce(searchInput, 300);

  const [sortKey, setSortKey] = useState<string>('balance_desc');
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  // Modal State for Recording Payment
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<OutstandingBookingItem | null>(null);

  // Data State
  const [response, setResponse] = useState<PaginatedOutstandingResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const currentSort = useMemo(() => {
    return SORT_OPTIONS.find((s) => s.value === sortKey) || SORT_OPTIONS[0];
  }, [sortKey]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [preset, startDate, endDate, debouncedSearch, sortKey]);

  const loadOutstanding = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOutstandingBookings({
        startDate: preset === 'CUSTOM' || preset === 'THIS_MONTH' ? startDate : undefined,
        endDate: preset === 'CUSTOM' || preset === 'THIS_MONTH' ? endDate : undefined,
        search: debouncedSearch.trim() || undefined,
        sortBy: currentSort.sortBy,
        sortOrder: currentSort.sortOrder,
        page,
        limit,
      });

      setResponse(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch outstanding bookings';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [preset, startDate, endDate, debouncedSearch, currentSort, page, limit]);

  useEffect(() => {
    loadOutstanding();
  }, [loadOutstanding]);

  const handleOpenPaymentModal = (e: React.MouseEvent, item: OutstandingBookingItem) => {
    e.stopPropagation(); // Avoid triggering row navigation
    setSelectedBookingForPayment(item);
  };

  const handlePaymentSuccess = () => {
    setSelectedBookingForPayment(null);
    loadOutstanding();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-600" />
            Outstanding Balances
          </h2>
          <p className="text-xs text-slate-500">
            Confirmed bookings with unpaid balances and quick payment collection
          </p>
        </div>
        <DateRangePicker onRefresh={loadOutstanding} loading={loading} />
      </div>

      {/* Filter Row */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-8 relative">
            <input
              id="outstanding-search-input"
              type="text"
              placeholder="Search by event name, customer name, contact phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Sort Selector */}
          <div className="lg:col-span-4">
            <select
              id="outstanding-sort-select"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Bar */}
        {response && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Pending Bookings</span>
              <p className="text-sm font-black text-slate-900 font-mono mt-0.5">
                {response.summary.count}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Value</span>
              <p className="text-sm font-black text-slate-800 font-mono mt-0.5">
                {formatCurrency(response.summary.totalBookingValue)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">Amount Paid</span>
              <p className="text-sm font-black text-emerald-700 font-mono mt-0.5">
                {formatCurrency(response.summary.totalPaid)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200">
              <span className="text-[10px] font-bold uppercase text-amber-800 block">Total Outstanding</span>
              <p className="text-sm font-black text-amber-700 font-mono mt-0.5">
                {formatCurrency(response.summary.totalOutstanding)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm">Failed to load outstanding bookings</h4>
            <p className="mt-0.5 text-rose-700">{error}</p>
            <button
              type="button"
              onClick={loadOutstanding}
              className="mt-2 px-3 py-1 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Table & Results Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading && !response ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto" />
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              Loading Outstanding Balances...
            </p>
          </div>
        ) : response?.bookings.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Outstanding Balances</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All confirmed bookings in this period are fully paid or no matches were found.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Date(s)</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-right">Outstanding</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {response?.bookings.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => onViewBooking?.(item.id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Event */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {item.eventName}
                        </p>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                          {item.eventType}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{item.contactName}</p>
                        <p className="text-[10px] text-slate-500">{item.contactPhone}</p>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDisplayDate(item.bookingDate || item.sessions[0]?.bookingDate)}</span>
                        </div>
                        {item.sessions.length > 1 && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            +{item.sessions.length - 1} more session(s)
                          </span>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3 px-4 text-right font-mono text-slate-800 whitespace-nowrap">
                        {formatCurrency(item.totalAmount)}
                      </td>

                      {/* Amount Paid */}
                      <td className="py-3 px-4 text-right font-mono text-emerald-600 font-semibold whitespace-nowrap">
                        {formatCurrency(item.amountPaid)}
                      </td>

                      {/* Outstanding Balance */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-600 text-sm whitespace-nowrap">
                        {formatCurrency(item.outstandingBalance)}
                      </td>

                      {/* Action: Record Payment */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => handleOpenPaymentModal(e, item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-2xs transition-all cursor-pointer active:scale-95"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Record Payment</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {response && response.pagination.totalPages > 1 && (
              <div className="p-3 sm:p-4 bg-slate-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <span>Showing page</span>
                  <span className="font-bold text-slate-800">{response.pagination.page}</span>
                  <span>of</span>
                  <span className="font-bold text-slate-800">{response.pagination.totalPages}</span>
                  <span>({response.pagination.totalItems} total bookings)</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!response.pagination.hasPrevPage || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    <span className="font-mono font-bold text-slate-800 px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-md text-xs">
                      {page}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={!response.pagination.hasNextPage || loading}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Reuse Existing AddPaymentModal */}
      {selectedBookingForPayment && (
        <AddPaymentModal
          isOpen={true}
          onClose={() => setSelectedBookingForPayment(null)}
          onSuccess={handlePaymentSuccess}
          bookingId={selectedBookingForPayment.id}
          totalAmount={parseFloat(selectedBookingForPayment.totalAmount)}
          totalPaid={parseFloat(selectedBookingForPayment.amountPaid)}
          balance={parseFloat(selectedBookingForPayment.outstandingBalance)}
        />
      )}
    </div>
  );
};
