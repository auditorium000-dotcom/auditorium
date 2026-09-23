import { forwardRef } from 'react';
import { MapPin, Phone as PhoneIcon, Globe } from 'lucide-react';
import type { Booking } from '../../types/booking';
import type { Payment } from '../../types/payment';

interface ConfirmationPDFDocumentProps {
  booking: Booking;
  payments?: Payment[];
}

/**
 * Formats ISO date "YYYY-MM-DD" into "D MMMM YYYY" (e.g., "25 September 2026")
 */
function formatPDFDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2].slice(0, 2), 10);
      const months = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day} ${months[monthIdx]} ${year}`;
      }
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export const ConfirmationPDFDocument = forwardRef<HTMLDivElement, ConfirmationPDFDocumentProps>(
  ({ booking }, ref) => {
    // Sort sessions chronologically
    const activeSessions = [...(booking.sessions || [])]
      .filter((s) => s.status === 'BOOKED' || !s.status)
      .sort((a, b) => {
        if (a.bookingDate !== b.bookingDate) {
          return a.bookingDate.localeCompare(b.bookingDate);
        }
        if (a.session === 'MORNING' && b.session === 'EVENING') return -1;
        if (a.session === 'EVENING' && b.session === 'MORNING') return 1;
        return 0;
      });

    const totalAmount = Number(booking.totalAmount) || 0;
    const advanceAmount = Number(booking.advanceAmount) || 0;

    // Unique dates
    const uniqueDates = Array.from(new Set(activeSessions.map((s) => s.bookingDate))).sort();

    // Compute clean, structured Date, Session, and Time strings
    let dateDisplay = '—';
    let sessionDisplay = 'Morning';
    let timeDisplay = '11:00 AM – 3:00 PM';

    if (activeSessions.length === 0) {
      dateDisplay = formatPDFDate(booking.createdAt || new Date().toISOString());
      sessionDisplay = 'Standard';
      timeDisplay = '11:00 AM – 3:00 PM';
    } else if (uniqueDates.length === 1) {
      // Single date
      dateDisplay = formatPDFDate(uniqueDates[0]);
      if (activeSessions.length === 1) {
        const s = activeSessions[0];
        sessionDisplay = s.session === 'MORNING' ? 'Morning' : 'Evening';
        timeDisplay =
          s.startTime && s.endTime
            ? `${s.startTime} – ${s.endTime}`
            : s.session === 'MORNING'
            ? '11:00 AM – 3:00 PM'
            : '5:00 PM – 9:00 PM';
      } else {
        // Both sessions on same day
        sessionDisplay = 'Full Day (Morning & Evening)';
        const mSlot = activeSessions.find((s) => s.session === 'MORNING');
        const eSlot = activeSessions.find((s) => s.session === 'EVENING');
        const mTime = mSlot?.startTime && mSlot?.endTime ? `${mSlot.startTime} – ${mSlot.endTime}` : '11:00 AM – 3:00 PM';
        const eTime = eSlot?.startTime && eSlot?.endTime ? `${eSlot.startTime} – ${eSlot.endTime}` : '5:00 PM – 9:00 PM';
        timeDisplay = `${mTime}, ${eTime}`;
      }
    } else {
      // Multiple days
      const startDateFormatted = formatPDFDate(uniqueDates[0]);
      const endDateFormatted = formatPDFDate(uniqueDates[uniqueDates.length - 1]);
      dateDisplay = `${startDateFormatted} – ${endDateFormatted} (${uniqueDates.length} Days)`;

      const hasMorning = activeSessions.some((s) => s.session === 'MORNING');
      const hasEvening = activeSessions.some((s) => s.session === 'EVENING');

      if (hasMorning && hasEvening) {
        sessionDisplay = `Morning & Evening (${activeSessions.length} Sessions)`;
      } else if (hasMorning) {
        sessionDisplay = `Morning (${activeSessions.length} Sessions)`;
      } else {
        sessionDisplay = `Evening (${activeSessions.length} Sessions)`;
      }

      const sampleMorning = activeSessions.find((s) => s.session === 'MORNING');
      const sampleEvening = activeSessions.find((s) => s.session === 'EVENING');
      const mTime = sampleMorning?.startTime && sampleMorning?.endTime ? `${sampleMorning.startTime} – ${sampleMorning.endTime}` : '11:00 AM – 3:00 PM';
      const eTime = sampleEvening?.startTime && sampleEvening?.endTime ? `${sampleEvening.startTime} – ${sampleEvening.endTime}` : '5:00 PM – 9:00 PM';

      if (hasMorning && hasEvening) {
        timeDisplay = `${mTime}, ${eTime}`;
      } else if (hasMorning) {
        timeDisplay = mTime;
      } else {
        timeDisplay = eTime;
      }
    }

    return (
      <div
        ref={ref}
        id="oruma-booking-confirmation-pdf-document"
        className="w-[794px] h-[1123px] min-h-[1123px] max-h-[1123px] bg-white text-slate-900 px-14 pt-9 pb-8 box-border relative flex flex-col justify-between select-none overflow-hidden"
        style={{
          width: '794px',
          height: '1123px',
          fontFamily: "'Plus Jakarta Sans', Arial, Helvetica, sans-serif",
          boxSizing: 'border-box',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {/* EMBEDDED STYLES FOR CONSISTENT FONT RENDERING AND KERNING IN CANVAS */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Playfair+Display:ital,wght@0,600;1,500;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          
          #oruma-booking-confirmation-pdf-document {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            letter-spacing: 0.01px;
            font-variant-ligatures: none;
            text-rendering: geometricPrecision;
            -webkit-font-smoothing: antialiased;
          }
          #oruma-booking-confirmation-pdf-document * {
            letter-spacing: 0.01px;
            word-spacing: normal;
          }
          .pdf-table-row td {
            padding: 5px 0;
            vertical-align: top;
            font-size: 15px;
            line-height: 1.55;
          }
          .pdf-label {
            width: 195px;
            font-weight: 700;
            color: #0f172a;
          }
          .pdf-colon {
            width: 28px;
            text-align: center;
            font-weight: 700;
            color: #0f172a;
          }
          .pdf-value {
            color: #1e293b;
            font-weight: 500;
          }
        `}</style>

        {/* TOP-LEFT CORNER GOLD RIBBON WAVE ACCENT */}
        <div className="absolute top-0 left-0 w-64 h-64 pointer-events-none z-0 overflow-hidden">
          <svg viewBox="0 0 250 250" className="w-full h-full" fill="none">
            <defs>
              <linearGradient id="goldTopLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7a5214" />
                <stop offset="25%" stopColor="#a8792b" />
                <stop offset="55%" stopColor="#f5e1b5" />
                <stop offset="80%" stopColor="#c59b27" />
                <stop offset="100%" stopColor="#8c6221" />
              </linearGradient>
              <linearGradient id="goldTopLeftSubtle" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#5a3d12" />
                <stop offset="50%" stopColor="#8c6221" />
                <stop offset="100%" stopColor="#c59b27" />
              </linearGradient>
            </defs>
            <path
              d="M0 0 L210 0 C160 70, 80 140, 0 210 Z"
              fill="url(#goldTopLeft)"
            />
            <path
              d="M0 0 L130 0 C100 60, 60 100, 0 130 Z"
              fill="url(#goldTopLeftSubtle)"
              fillOpacity="0.45"
            />
          </svg>
        </div>

        {/* BOTTOM-RIGHT CORNER GOLD RIBBON WAVE ACCENT */}
        <div className="absolute bottom-0 right-0 w-44 h-44 pointer-events-none z-0 overflow-hidden">
          <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
            <defs>
              <linearGradient id="goldBottomRight" x1="100%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#66440c" />
                <stop offset="25%" stopColor="#a8792b" />
                <stop offset="55%" stopColor="#f5e1b5" />
                <stop offset="80%" stopColor="#c59b27" />
                <stop offset="100%" stopColor="#8c6221" />
              </linearGradient>
              <linearGradient id="goldBottomRightSubtle" x1="100%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#4a310c" />
                <stop offset="100%" stopColor="#8c6221" />
              </linearGradient>
            </defs>
            <path
              d="M200 200 L110 200 C140 160, 160 140, 200 110 Z"
              fill="url(#goldBottomRight)"
            />
            <path
              d="M200 200 L150 200 C170 175, 175 170, 200 150 Z"
              fill="url(#goldBottomRightSubtle)"
              fillOpacity="0.45"
            />
          </svg>
        </div>

        {/* BACKGROUND WATERMARK EMBLEM (SCALED & POSITIONED ON RIGHT, FULLY CONTAINED) */}
        <div className="absolute right-4 top-[51%] -translate-y-1/2 pointer-events-none opacity-[0.065] z-0 select-none flex items-center justify-end">
          <img
            src="/oruma-avenue-emblem.png"
            alt=""
            className="w-[520px] h-[520px] object-contain"
          />
        </div>

        {/* 1. HEADER SECTION: Brand Logo & Title */}
        <div className="relative z-10 text-center pt-2 px-6">
          {/* Official Prominent Oruma Avenue Logo */}
          <div className="flex justify-center mb-3">
            <img
              src="/oruma-avenue-logo.png"
              alt="Oruma Avenue"
              className="h-[102px] w-auto object-contain max-w-[420px]"
            />
          </div>

          {/* Subheading: AUDITORIUM */}
          <h2
            className="text-[15px] font-bold uppercase mt-2.5"
            style={{
              fontFamily: "'Cinzel', 'Playfair Display', Georgia, serif",
              color: '#8c6221',
              letterSpacing: '5px',
            }}
          >
            AUDITORIUM
          </h2>

          {/* Title: BOOKING CONFIRMATION */}
          <h1
            className="text-[26px] font-extrabold uppercase mt-1"
            style={{
              fontFamily: "'Cinzel', 'Playfair Display', Georgia, serif",
              color: '#3d260c',
              letterSpacing: '3px',
            }}
          >
            BOOKING CONFIRMATION
          </h1>

          {/* Gold Header Divider Line */}
          <div
            className="w-full h-[1.5px] mt-5 mb-6 mx-auto"
            style={{
              backgroundColor: '#a8792b',
              opacity: 0.8,
            }}
          />
        </div>

        {/* 2. BODY SECTION: Structured Details Table */}
        <div className="relative z-10 px-8 py-1 flex-1">
          <table className="w-full border-collapse">
            <tbody>
              {/* Name */}
              <tr className="pdf-table-row">
                <td className="pdf-label">Name</td>
                <td className="pdf-colon">:</td>
                <td className="pdf-value font-semibold text-slate-900">{booking.eventName}</td>
              </tr>

              {/* Event Type */}
              <tr className="pdf-table-row">
                <td className="pdf-label">Event Type</td>
                <td className="pdf-colon">:</td>
                <td className="pdf-value font-medium text-slate-800">{booking.eventType}</td>
              </tr>

              {/* Spacer Row */}
              <tr>
                <td colSpan={3} className="h-5"></td>
              </tr>

              {/* Booking Date */}
              <tr className="pdf-table-row">
                <td className="pdf-label">Booking Date</td>
                <td className="pdf-colon">:</td>
                <td className="pdf-value font-medium text-slate-800">{dateDisplay}</td>
              </tr>

              {/* Session */}
              <tr className="pdf-table-row">
                <td className="pdf-label">Session</td>
                <td className="pdf-colon">:</td>
                <td className="pdf-value font-medium text-slate-800">{sessionDisplay}</td>
              </tr>

              {/* Time */}
              <tr className="pdf-table-row">
                <td className="pdf-label">Time</td>
                <td className="pdf-colon">:</td>
                <td className="pdf-value font-medium text-slate-800">{timeDisplay}</td>
              </tr>

              {/* Spacer Row */}
              <tr>
                <td colSpan={3} className="h-5"></td>
              </tr>

              {/* Contact */}
              <tr className="pdf-table-row">
                <td className="pdf-label">Contact</td>
                <td className="pdf-colon">:</td>
                <td className="pdf-value font-medium text-slate-800">{booking.contactName}</td>
              </tr>

              {/* Phone */}
              <tr className="pdf-table-row">
                <td className="pdf-label">Phone</td>
                <td className="pdf-colon">:</td>
                <td className="pdf-value font-medium text-slate-800 font-mono">{booking.contactPhone}</td>
              </tr>

              {/* Spacer Row */}
              <tr>
                <td colSpan={3} className="h-5"></td>
              </tr>

              {/* Total Amount */}
              <tr className="pdf-table-row">
                <td className="pdf-label">Total Amount</td>
                <td className="pdf-colon">:</td>
                <td className="pdf-value font-bold text-slate-900">
                  <div>₹{totalAmount.toLocaleString('en-IN')}</div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 400,
                      color: '#64748b',
                      marginTop: '2px',
                      letterSpacing: '0.01px',
                    }}
                  >
                    (AC and cleaning charges are not included.)
                  </div>
                </td>
              </tr>

              {/* Advance Amount (Conditionally displayed) */}
              {advanceAmount > 0 && (
                <>
                  {/* Spacer Row */}
                  <tr>
                    <td colSpan={3} className="h-5"></td>
                  </tr>

                  <tr className="pdf-table-row">
                    <td className="pdf-label">Advance Amount</td>
                    <td className="pdf-colon">:</td>
                    <td className="pdf-value font-bold text-slate-900">
                      ₹{advanceAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </>
              )}

              {/* Spacer Row */}
              <tr>
                <td colSpan={3} className="h-5"></td>
              </tr>

              {/* Status */}
              <tr className="pdf-table-row">
                <td className="pdf-label">Status</td>
                <td className="pdf-colon">:</td>
                <td className="pdf-value font-bold text-slate-900 tracking-wider">
                  {booking.status === 'CONFIRMED' ? 'CONFIRMED' : booking.status}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 3. FOOTER SECTION: Thank you message, Signature, and Contact bar */}
        <div className="relative z-10 px-8 pt-2 space-y-4">
          {/* Double Gold Line with Centered Thank You Message */}
          <div className="space-y-2">
            <div className="w-full h-[1.5px]" style={{ backgroundColor: '#a8792b', opacity: 0.8 }} />
            <div className="py-1.5 text-center">
              <p
                className="text-[15px] leading-relaxed"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontStyle: 'italic',
                  color: '#262626',
                  letterSpacing: '0.01px',
                }}
              >
                Thank you for choosing ORUMA AVENUE.
                <br />
                We look forward to making your event special.
              </p>
            </div>
            <div className="w-full h-[1.5px]" style={{ backgroundColor: '#a8792b', opacity: 0.8 }} />
          </div>

          {/* Signature Area (Date on left, Signature on right) with generous physical clearance */}
          <div className="pt-20 pb-4">
            <table className="w-full">
              <tbody>
                <tr>
                  <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'bottom' }}>
                    <div style={{ width: '190px', height: '1.5px', backgroundColor: '#64748b', margin: '0 auto' }} />
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#334155', marginTop: '8px', letterSpacing: '0.01px' }}>
                      Date
                    </p>
                  </td>
                  <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'bottom' }}>
                    <div style={{ width: '250px', height: '1.5px', backgroundColor: '#64748b', margin: '0 auto' }} />
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#334155', marginTop: '8px', letterSpacing: '0.01px' }}>
                      Signature of Authorized Person
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bottom Contact Information Bar (3 Columns) */}
          <div className="pt-3 pb-1 border-t border-amber-200/70">
            <table className="w-full">
              <tbody>
                <tr>
                  <td style={{ width: '35%', verticalAlign: 'middle', paddingRight: '10px', borderRight: '1px solid rgba(197, 155, 39, 0.6)' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#8c6221] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <MapPin className="w-3.5 h-3.5 fill-current text-white" />
                      </div>
                      <div className="leading-tight">
                        <p style={{ fontWeight: 700, color: '#0f172a', fontSize: '11px', letterSpacing: '0.01px' }}>Oruma Avenue</p>
                        <p style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.01px' }}>Kadungallur, Kizhisseri, Malappuram, Kerala</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ width: '36%', verticalAlign: 'middle', paddingLeft: '10px', paddingRight: '10px', borderRight: '1px solid rgba(197, 155, 39, 0.6)' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#8c6221] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <PhoneIcon className="w-3.5 h-3.5 fill-current text-white" />
                      </div>
                      <div className="leading-tight">
                        <p style={{ fontWeight: 700, color: '#0f172a', fontSize: '11px', fontFamily: 'monospace', letterSpacing: '0.01px' }}>+91 77369 19392</p>
                        <p style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.01px' }}>orumaavenue@gmail.com</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ width: '29%', verticalAlign: 'middle', paddingLeft: '10px' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#8c6221] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Globe className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="leading-tight">
                        <p style={{ fontWeight: 600, color: '#0f172a', fontSize: '11px', letterSpacing: '0.01px' }}>www.orumaavenue.com</p>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
);

ConfirmationPDFDocument.displayName = 'ConfirmationPDFDocument';
