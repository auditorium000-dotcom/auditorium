import React, { useState, useEffect } from 'react';
import {
  IndianRupee,
  CreditCard,
  Calendar,
  FileText,
  AlertCircle,
  Loader2,
  X,
  PlusCircle,
} from 'lucide-react';
import { createPayment } from '../../services/api';
import { getTodayDateKey } from '../../lib/calendar';
import type { PaymentMethod } from '../../types/payment';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bookingId: string;
  totalAmount: number;
  totalPaid: number;
  balance: number;
}

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'UPI', label: 'UPI' },
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
];

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  bookingId,
  totalAmount,
  totalPaid,
  balance,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [paymentDate, setPaymentDate] = useState<string>(getTodayDateKey());
  const [notes, setNotes] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount(balance > 0 ? String(balance) : '');
      setPaymentMethod('UPI');
      setPaymentDate(getTodayDateKey());
      setNotes('');
      setError(null);
      setFieldErrors({});
    }
  }, [isOpen, balance]);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const numAmount = Number(amount);

    if (!amount.trim() || isNaN(numAmount) || numAmount <= 0) {
      errors.amount = 'Please enter a valid payment amount greater than ₹0.';
    } else if (numAmount > balance + 0.001) {
      errors.amount = `Payment cannot exceed the outstanding balance of ₹${balance.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
      })}.`;
    }

    if (!paymentDate) {
      errors.paymentDate = 'Payment date is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await createPayment(bookingId, {
        amount: Number(amount),
        paymentMethod,
        paymentDate,
        notes: notes.trim() || null,
      });

      onSuccess();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const message =
        code === 'EXCEEDS_BALANCE'
          ? 'Payment could not be recorded because the amount exceeds the remaining balance.'
          : code === 'BOOKING_CANCELLED'
          ? 'Payments cannot be added to a cancelled booking.'
          : err instanceof Error
          ? err.message
          : 'Unable to record payment. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-payment-modal-title"
        className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-4 sm:p-7 shadow-2xl shadow-slate-900/10 space-y-4 sm:space-y-6 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-sm">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="add-payment-modal-title" className="text-lg font-bold text-slate-900 tracking-tight">
                Add Payment
              </h3>
              <p className="text-xs text-slate-500">Record a payment transaction for this booking</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance Overview Card */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-3 gap-2 sm:gap-3 text-center">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
              Total
            </span>
            <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">
              ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="border-x border-slate-200 px-1 sm:px-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
              Paid
            </span>
            <p className="text-xs sm:text-sm font-bold text-emerald-600 mt-0.5">
              ₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
              Balance
            </span>
            <p className="text-xs sm:text-sm font-bold text-amber-600 mt-0.5">
              ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Field */}
          <div className="space-y-1.5">
            <label htmlFor="payment-amount" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="payment-amount"
                type="number"
                min="0.01"
                step="any"
                max={balance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono ${
                  fieldErrors.amount ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-200'
                }`}
              />
              <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
            {fieldErrors.amount && (
              <p className="text-xs text-rose-600 font-medium">{fieldErrors.amount}</p>
            )}
          </div>

          {/* Payment Method Field */}
          <div className="space-y-1.5">
            <label htmlFor="payment-method" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Payment Method <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                id="payment-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer"
              >
                {PAYMENT_METHOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-white text-slate-900">
                    {opt.label}
                  </option>
                ))}
              </select>
              <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Payment Date Field */}
          <div className="space-y-1.5">
            <label htmlFor="payment-date" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Payment Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all ${
                  fieldErrors.paymentDate ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-200'
                }`}
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
            {fieldErrors.paymentDate && (
              <p className="text-xs text-rose-600 font-medium">{fieldErrors.paymentDate}</p>
            )}
          </div>

          {/* Notes Field */}
          <div className="space-y-1.5">
            <label htmlFor="payment-notes" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Notes (Optional)
            </label>
            <div className="relative">
              <textarea
                id="payment-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Transaction UTR #, Cheque number, deposit slip reference..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
              />
              <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
            <button
              id="cancel-payment-btn"
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              id="submit-payment-btn"
              type="submit"
              disabled={submitting || balance <= 0}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-600 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recording payment...</span>
                </>
              ) : (
                <span>Record Payment</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
