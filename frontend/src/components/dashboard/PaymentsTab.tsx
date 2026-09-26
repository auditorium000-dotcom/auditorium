import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CreditCard,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { useDateRange } from '../../context/DateRangeContext';
import { fetchGlobalPayments, downloadPaymentsExcel } from '../../services/api';
import { formatCurrency, formatDisplayDate } from '../../lib/dateRange';
import { useDebounce } from '../../hooks/useDebounce';
import type { PaginatedPaymentsResponse } from '../../types/dashboard';
import type { PaymentMethod } from '../../types/payment';
import { DateRangePicker } from './DateRangePicker';

interface PaymentsTabProps {
  onViewBooking?: (bookingId: string) => void;
}

const PAYMENT_METHODS: { value: PaymentMethod | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Methods' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
];

const SORT_OPTIONS: {
  value: string;
  label: string;
  sortBy: 'paymentDate' | 'amount' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}[] = [
  { value: 'date_desc', label: 'Newest First', sortBy: 'paymentDate', sortOrder: 'desc' },
  { value: 'date_asc', label: 'Oldest First', sortBy: 'paymentDate', sortOrder: 'asc' },
  { value: 'amount_desc', label: 'Highest Amount', sortBy: 'amount', sortOrder: 'desc' },
  { value: 'amount_asc', label: 'Lowest Amount', sortBy: 'amount', sortOrder: 'asc' },
];

export const PaymentsTab: React.FC<PaymentsTabProps> = ({ onViewBooking }) => {
  const { preset, startDate, endDate } = useDateRange();

  // Filters State
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | 'ALL'>('ALL');
  const [searchInput, setSearchInput] = useState<string>('');
  const debouncedSearch = useDebounce(searchInput, 300);

  const [minAmountInput, setMinAmountInput] = useState<string>('');
  const [maxAmountInput, setMaxAmountInput] = useState<string>('');
  const debouncedMinAmount = useDebounce(minAmountInput, 350);
  const debouncedMaxAmount = useDebounce(maxAmountInput, 350);

  const [sortKey, setSortKey] = useState<string>('date_desc');
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  // Data State
  const [response, setResponse] = useState<PaginatedPaymentsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const currentSort = useMemo(() => {
    return SORT_OPTIONS.find((s) => s.value === sortKey) || SORT_OPTIONS[0];
  }, [sortKey]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [preset, startDate, endDate, selectedMethod, debouncedSearch, debouncedMinAmount, debouncedMaxAmount, sortKey]);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const minAmt = debouncedMinAmount ? parseFloat(debouncedMinAmount) : undefined;
      const maxAmt = debouncedMaxAmount ? parseFloat(debouncedMaxAmount) : undefined;

      const res = await fetchGlobalPayments({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        paymentMethod: selectedMethod === 'ALL' ? undefined : selectedMethod,
        minAmount: minAmt && !isNaN(minAmt) ? minAmt : undefined,
        maxAmount: maxAmt && !isNaN(maxAmt) ? maxAmt : undefined,
        search: debouncedSearch.trim() || undefined,
        sortBy: currentSort.sortBy,
        sortOrder: currentSort.sortOrder,
        page,
        limit,
      });

      setResponse(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch payments';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [
    startDate,
    endDate,
    selectedMethod,
    debouncedSearch,
    debouncedMinAmount,
    debouncedMaxAmount,
    currentSort,
    page,
    limit,
  ]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const minAmt = debouncedMinAmount ? parseFloat(debouncedMinAmount) : undefined;
      const maxAmt = debouncedMaxAmount ? parseFloat(debouncedMaxAmount) : undefined;

      await downloadPaymentsExcel({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        paymentMethod: selectedMethod === 'ALL' ? undefined : selectedMethod,
        minAmount: minAmt && !isNaN(minAmt) ? minAmt : undefined,
        maxAmount: maxAmt && !isNaN(maxAmt) ? maxAmt : undefined,
        search: debouncedSearch.trim() || undefined,
        sortBy: currentSort.sortBy,
        sortOrder: currentSort.sortOrder,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to export payments';
      alert(msg);
    } finally {
      setExporting(false);
    }
  };

  const getMethodBadgeStyle = (method: PaymentMethod) => {
    switch (method) {
      case 'UPI':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'CASH':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'BANK_TRANSFER':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'CHEQUE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'OTHER':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Filter & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            Global Payments Ledger
          </h2>
          <p className="text-xs text-slate-500">
            Search, filter, and audit payment transactions across all bookings
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <DateRangePicker onRefresh={loadPayments} loading={loading} />
          <button
            id="export-payments-excel-btn"
            type="button"
            onClick={handleExport}
            disabled={exporting || loading || (response?.pagination.totalItems === 0)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-300 transition-all cursor-pointer active:scale-95 disabled:opacity-50 shadow-xs shrink-0"
            title="Export filtered payments to Excel (.xlsx)"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>{exporting ? 'Exporting...' : 'Export Excel'}</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Row */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-4 relative">
            <input
              id="payment-search-input"
              type="text"
              placeholder="Search by event, customer, phone, notes..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Payment Method Filter */}
          <div className="lg:col-span-3">
            <select
              id="payment-method-select"
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value as PaymentMethod | 'ALL')}
              className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Amount Range Filter */}
          <div className="lg:col-span-3 flex items-center gap-1.5">
            <input
              id="payment-min-amount"
              type="number"
              placeholder="Min ₹"
              min="0"
              value={minAmountInput}
              onChange={(e) => setMinAmountInput(e.target.value)}
              className="w-1/2 py-2 px-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input
              id="payment-max-amount"
              type="number"
              placeholder="Max ₹"
              min="0"
              value={maxAmountInput}
              onChange={(e) => setMaxAmountInput(e.target.value)}
              className="w-1/2 py-2 px-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Sort Selector */}
          <div className="lg:col-span-2">
            <select
              id="payment-sort-select"
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

        {/* Active Filter Summary Bar */}
        {response && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">
                Found {response.pagination.totalItems} payment{response.pagination.totalItems === 1 ? '' : 's'}
              </span>
              {selectedMethod !== 'ALL' && (
                <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-indigo-100">
                  Method: {selectedMethod}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-slate-500 font-sans">Total Collected:</span>
              <span className="font-black text-emerald-600 text-sm">
                {formatCurrency(response.summary.totalAmount)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm">Failed to load payments</h4>
            <p className="mt-0.5 text-rose-700">{error}</p>
            <button
              type="button"
              onClick={loadPayments}
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
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              Loading Payments Ledger...
            </p>
          </div>
        ) : response?.payments.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Payments Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No payment transactions match the selected filters or date period.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop / Responsive Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Event & Booking</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Method</th>
                    <th className="py-3 px-4">Received By</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {response?.payments.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => onViewBooking?.(p.booking.id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Date */}
                      <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                        {formatDisplayDate(p.paymentDate)}
                      </td>

                      {/* Event */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {p.booking.eventName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          #{p.booking.id.slice(0, 8)}
                        </p>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{p.booking.contactName}</p>
                        <p className="text-[10px] text-slate-500">{p.booking.contactPhone}</p>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono text-sm whitespace-nowrap">
                        {formatCurrency(p.amount)}
                      </td>

                      {/* Method */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getMethodBadgeStyle(
                            p.paymentMethod
                          )}`}
                        >
                          {p.paymentMethod.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Received By */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[120px]" title={p.receiver?.name || p.receivedBy}>
                            {p.receiver?.name || 'Manager'}
                          </span>
                        </div>
                      </td>

                      {/* Notes */}
                      <td className="py-3 px-4 text-slate-500 max-w-[160px] truncate" title={p.notes || ''}>
                        {p.notes || <span className="text-slate-300">-</span>}
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
                  <span>({response.pagination.totalItems} total records)</span>
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
                    <span className="font-mono font-bold text-slate-800 px-2 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md text-xs">
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
    </div>
  );
};
