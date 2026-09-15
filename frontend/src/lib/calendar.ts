import type { Booking, CalendarDayInfo, DaySessionState } from '../types/booking';

export const MONTH_NAMES = [
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

export const WEEKDAY_HEADERS = [
  { short: 'MON', full: 'Monday' },
  { short: 'TUE', full: 'Tuesday' },
  { short: 'WED', full: 'Wednesday' },
  { short: 'THU', full: 'Thursday' },
  { short: 'FRI', full: 'Friday' },
  { short: 'SAT', full: 'Saturday' },
  { short: 'SUN', full: 'Sunday' },
];

/**
 * Returns date string formatted strictly in local calendar format: YYYY-MM-DD
 * Avoids UTC timezone conversion shifts.
 */
export function formatDateKey(year: number, monthIndex: number, day: number): string {
  const y = String(year);
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns today's date in YYYY-MM-DD local format
 */
export function getTodayDateKey(): string {
  const now = new Date();
  return formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Formats YYYY-MM-DD into a human-readable title (e.g. "Sunday, September 20, 2026")
 */
export function formatDisplayDate(dateKey: string): string {
  const [yStr, mStr, dStr] = dateKey.split('-');
  const year = parseInt(yStr, 10);
  const monthIndex = parseInt(mStr, 10) - 1;
  const day = parseInt(dStr, 10);

  const dateObj = new Date(year, monthIndex, day);
  const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const monthName = MONTH_NAMES[monthIndex];

  return `${weekday}, ${monthName} ${day}, ${year}`;
}

/**
 * Computes booking status for a specific date from active bookings list.
 * 🟢 GREEN (AVAILABLE): 0 booked sessions
 * 🟡 YELLOW (PARTIAL): 1 booked session (Morning or Evening)
 * 🔴 RED (FULL): 2 booked sessions (Morning and Evening)
 */
export function calculateDayAvailability(dateKey: string, bookings: Booking[]): DaySessionState {
  // Only confirmed bookings and active booked sessions count
  let isMorningBooked = false;
  let isEveningBooked = false;
  let morningBooking: Booking | undefined;
  let eveningBooking: Booking | undefined;

  for (const booking of bookings) {
    if (booking.status !== 'CONFIRMED') continue;

    for (const session of booking.sessions) {
      if (session.bookingDate === dateKey && session.status === 'BOOKED') {
        if (session.session === 'MORNING') {
          isMorningBooked = true;
          morningBooking = booking;
        } else if (session.session === 'EVENING') {
          isEveningBooked = true;
          eveningBooking = booking;
        }
      }
    }
  }

  const bookedCount = (isMorningBooked ? 1 : 0) + (isEveningBooked ? 1 : 0);

  let status: DaySessionState['status'] = 'AVAILABLE';
  if (bookedCount === 2) {
    status = 'FULL';
  } else if (bookedCount === 1) {
    status = 'PARTIAL';
  }

  return {
    isMorningBooked,
    isEveningBooked,
    morningBooking,
    eveningBooking,
    status,
    bookedCount,
  };
}

/**
 * Builds the 7-column calendar grid matrix for a given month and year.
 * Includes previous/next month overflow days to ensure complete weekly rows (Mon-Sun).
 */
export function getMonthMatrix(
  year: number,
  monthIndex: number,
  bookings: Booking[]
): CalendarDayInfo[] {
  const todayKey = getTodayDateKey();

  // First day of target month
  const firstDay = new Date(year, monthIndex, 1);
  // Monday-based weekday index (0=Mon, 1=Tue, ..., 6=Sun)
  const firstDayWeekday = (firstDay.getDay() + 6) % 7;

  // Total days in current, previous, and next months
  const daysInCurrentMonth = new Date(year, monthIndex + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();

  const prevMonthYear = monthIndex === 0 ? year - 1 : year;
  const prevMonthIndex = monthIndex === 0 ? 11 : monthIndex - 1;

  const nextMonthYear = monthIndex === 11 ? year + 1 : year;
  const nextMonthIndex = monthIndex === 11 ? 0 : monthIndex + 1;

  const grid: CalendarDayInfo[] = [];

  // 1. Previous month overflow days
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const dateKey = formatDateKey(prevMonthYear, prevMonthIndex, dayNum);
    const dayOfWeek = (grid.length) % 7;
    const isPast = dateKey < todayKey;

    grid.push({
      date: dateKey,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateKey === todayKey,
      isPast,
      dayOfWeek,
      availability: calculateDayAvailability(dateKey, bookings),
    });
  }

  // 2. Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateKey = formatDateKey(year, monthIndex, d);
    const dayOfWeek = (grid.length) % 7;
    const isPast = dateKey < todayKey;

    grid.push({
      date: dateKey,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateKey === todayKey,
      isPast,
      dayOfWeek,
      availability: calculateDayAvailability(dateKey, bookings),
    });
  }

  // 3. Next month overflow days to fill the final 7-day row
  const remainingCells = (7 - (grid.length % 7)) % 7;
  for (let d = 1; d <= remainingCells; d++) {
    const dateKey = formatDateKey(nextMonthYear, nextMonthIndex, d);
    const dayOfWeek = (grid.length) % 7;
    const isPast = dateKey < todayKey;

    grid.push({
      date: dateKey,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: dateKey === todayKey,
      isPast,
      dayOfWeek,
      availability: calculateDayAvailability(dateKey, bookings),
    });
  }

  return grid;
}

/**
 * Returns all calendar dates inclusively between start and end (YYYY-MM-DD).
 * Avoids UTC timezone conversion shifts.
 */
export function getDatesInRange(startDateKey: string, endDateKey: string): string[] {
  if (!startDateKey || !endDateKey || endDateKey < startDateKey) return [];

  const [startY, startM, startD] = startDateKey.split('-').map(Number);
  const [endY, endM, endD] = endDateKey.split('-').map(Number);

  const startObj = new Date(startY, startM - 1, startD);
  const endObj = new Date(endY, endM - 1, endD);

  const dates: string[] = [];
  const curr = new Date(startObj);

  // Safety limit: max 60 consecutive days
  let count = 0;
  while (curr <= endObj && count < 60) {
    dates.push(formatDateKey(curr.getFullYear(), curr.getMonth(), curr.getDate()));
    curr.setDate(curr.getDate() + 1);
    count++;
  }

  return dates;
}

/**
 * Formats YYYY-MM-DD into short display (e.g. "23 Sep 2026")
 */
export function formatShortDate(dateKey: string): string {
  const [yStr, mStr, dStr] = dateKey.split('-');
  const year = parseInt(yStr, 10);
  const monthIndex = parseInt(mStr, 10) - 1;
  const day = parseInt(dStr, 10);

  const monthShort = MONTH_NAMES[monthIndex]?.slice(0, 3) || '';
  return `${day} ${monthShort} ${year}`;
}
