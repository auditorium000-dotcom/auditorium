import React, { useRef, useState } from 'react';
import {
  FileDown,
  Share2,
  X,
  Loader2,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { ConfirmationPDFDocument } from './ConfirmationPDFDocument';
import {
  generateBookingPDFBlob,
  downloadPDF,
  sharePDF,
  openPDFInNewTab,
} from '../../lib/pdf-generator';
import type { Booking } from '../../types/booking';
import type { Payment } from '../../types/payment';

interface BookingConfirmationPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  payments?: Payment[];
}

export const BookingConfirmationPDFModal: React.FC<BookingConfirmationPDFModalProps> = ({
  isOpen,
  onClose,
  booking,
  payments = [],
}) => {
  const documentRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  if (!isOpen) return null;

  const safeEventName = booking.eventName
    ? booking.eventName.replace(/[^a-zA-Z0-9_-]/g, '_')
    : 'Booking';
  const pdfFilename = `Oruma_Avenue_Confirmation_${safeEventName}.pdf`;

  const handleDownload = async () => {
    if (!documentRef.current) return;
    setIsGenerating(true);
    setFeedback(null);
    try {
      const { pdf } = await generateBookingPDFBlob(documentRef.current);
      downloadPDF(pdf, pdfFilename);
      setFeedback({ type: 'success', message: 'PDF downloaded successfully!' });
    } catch (err: unknown) {
      console.error('Failed to generate PDF:', err);
      setFeedback({
        type: 'error',
        message: 'Could not generate PDF. Please try again or use the Print button.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!documentRef.current) return;
    setIsGenerating(true);
    setFeedback(null);
    try {
      const { blob, pdf } = await generateBookingPDFBlob(documentRef.current);
      const shared = await sharePDF(
        blob,
        pdfFilename,
        'Oruma Avenue Booking Confirmation',
        `Official booking confirmation for ${booking.eventName} at Oruma Avenue Auditorium.`
      );

      if (shared) {
        setFeedback({ type: 'success', message: 'Shared successfully!' });
      } else {
        // If native share isn't supported or was canceled, download the PDF
        downloadPDF(pdf, pdfFilename);
        setFeedback({
          type: 'success',
          message: 'PDF downloaded. You can share this file via WhatsApp or Mail.',
        });
      }
    } catch (err: unknown) {
      console.error('Share failed:', err);
      setFeedback({
        type: 'error',
        message: 'Unable to share directly. Downloading file instead.',
      });
      handleDownload();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenInNewTab = async () => {
    if (!documentRef.current) return;
    setIsGenerating(true);
    setFeedback(null);
    try {
      const { dataUrl } = await generateBookingPDFBlob(documentRef.current);
      openPDFInNewTab(dataUrl);
    } catch (err: unknown) {
      console.error('Open tab failed:', err);
      setFeedback({ type: 'error', message: 'Unable to open PDF preview in a new tab.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-modal-title"
        className="relative w-full max-w-4xl bg-slate-100 border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
      >
        {/* Modal Top Action Bar */}
        <div className="bg-white px-4 sm:px-6 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 id="pdf-modal-title" className="text-sm sm:text-base font-bold text-slate-900">
                Official Booking Confirmation PDF
              </h2>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Oruma Avenue Auditorium • Ready for customer sharing
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert Bar */}
        {feedback && (
          <div
            className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 shrink-0 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : null}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Document Preview Scroll Area */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-2 sm:p-6 flex justify-center bg-slate-200/70">
          <div className="origin-top scale-[0.42] xs:scale-[0.52] sm:scale-[0.72] md:scale-[0.85] lg:scale-[0.95] transition-transform duration-200 shadow-xl rounded-sm shrink-0">
            <ConfirmationPDFDocument
              ref={documentRef}
              booking={booking}
              payments={payments}
            />
          </div>
        </div>

        {/* Modal Bottom Action Controls */}
        <div className="bg-white px-3.5 sm:px-6 py-3 sm:py-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <button
              id="open-pdf-tab-btn"
              type="button"
              onClick={handleOpenInNewTab}
              disabled={isGenerating}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Preview Tab</span>
            </button>

            <button
              id="close-pdf-modal-btn"
              type="button"
              onClick={onClose}
              className="sm:hidden px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              Close
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
            <button
              id="close-pdf-modal-desktop-btn"
              type="button"
              onClick={onClose}
              className="hidden sm:inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              Close
            </button>

            {canNativeShare && (
              <button
                id="share-confirmation-pdf-btn"
                type="button"
                onClick={handleShare}
                disabled={isGenerating}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4 text-amber-700" />
                )}
                <span>Share PDF</span>
              </button>
            )}

            <button
              id="download-confirmation-pdf-btn"
              type="button"
              onClick={handleDownload}
              disabled={isGenerating}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-600 border border-amber-700 transition-all cursor-pointer shadow-md shadow-amber-900/10 active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
