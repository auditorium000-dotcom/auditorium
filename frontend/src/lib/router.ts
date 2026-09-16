import type { SessionType } from '../types/booking';

export type ActiveView =
  | { type: 'CALENDAR'; initialYear?: number; initialMonthIndex?: number }
  | { type: 'MONTHLY_ANALYTICS' }
  | { type: 'DATE_BOOKING'; dateKey: string }
  | { type: 'BOOKING_FORM'; dateKey: string; session: SessionType }
  | { type: 'BOOKING_DETAILS'; bookingId: string; returnDateKey?: string }
  | { type: 'EDIT_BOOKING'; bookingId: string; returnDateKey?: string };

export interface HistoryState {
  idx: number;
  view: ActiveView;
}

/**
 * Converts an in-app view state to a canonical browser URL path + query string.
 */
export function viewToPath(view: ActiveView): string {
  switch (view.type) {
    case 'CALENDAR': {
      if (view.initialYear !== undefined && view.initialMonthIndex !== undefined) {
        return `/calendar?year=${view.initialYear}&month=${view.initialMonthIndex}`;
      }
      return '/';
    }
    case 'MONTHLY_ANALYTICS':
      return '/analytics';
    case 'DATE_BOOKING':
      return `/date/${encodeURIComponent(view.dateKey)}`;
    case 'BOOKING_FORM':
      return `/book/${encodeURIComponent(view.dateKey)}/${encodeURIComponent(view.session)}`;
    case 'BOOKING_DETAILS': {
      const search = view.returnDateKey ? `?returnDateKey=${encodeURIComponent(view.returnDateKey)}` : '';
      return `/bookings/${encodeURIComponent(view.bookingId)}${search}`;
    }
    case 'EDIT_BOOKING': {
      const search = view.returnDateKey ? `?returnDateKey=${encodeURIComponent(view.returnDateKey)}` : '';
      return `/bookings/${encodeURIComponent(view.bookingId)}/edit${search}`;
    }
  }
}

/**
 * Parses the current browser pathname and query string into an ActiveView.
 */
export function pathToView(pathname: string, search: string): ActiveView {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(search);

  // 1. / or /calendar
  if (normalizedPath === '/' || normalizedPath === '/calendar') {
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    const initialYear = yearParam ? parseInt(yearParam, 10) : undefined;
    const initialMonthIndex = monthParam ? parseInt(monthParam, 10) : undefined;

    if (
      initialYear !== undefined &&
      !isNaN(initialYear) &&
      initialMonthIndex !== undefined &&
      !isNaN(initialMonthIndex) &&
      initialMonthIndex >= 0 &&
      initialMonthIndex <= 11
    ) {
      return { type: 'CALENDAR', initialYear, initialMonthIndex };
    }
    return { type: 'CALENDAR' };
  }

  // 2. /analytics
  if (normalizedPath === '/analytics') {
    return { type: 'MONTHLY_ANALYTICS' };
  }

  // 3. /date/:dateKey (e.g. /date/2026-09-16)
  const dateMatch = normalizedPath.match(/^\/date\/(\d{4}-\d{2}-\d{2})$/);
  if (dateMatch) {
    return { type: 'DATE_BOOKING', dateKey: dateMatch[1] };
  }

  // 4. /book/:dateKey/:session (e.g. /book/2026-09-16/MORNING)
  const bookMatch = normalizedPath.match(/^\/book\/(\d{4}-\d{2}-\d{2})\/(MORNING|EVENING)$/);
  if (bookMatch) {
    return {
      type: 'BOOKING_FORM',
      dateKey: bookMatch[1],
      session: bookMatch[2] as SessionType,
    };
  }

  // 5. /bookings/:id/edit
  const editMatch = normalizedPath.match(/^\/bookings\/([^/]+)\/edit$/);
  if (editMatch) {
    const returnDateKey = searchParams.get('returnDateKey') || undefined;
    return {
      type: 'EDIT_BOOKING',
      bookingId: decodeURIComponent(editMatch[1]),
      returnDateKey: returnDateKey && /^\d{4}-\d{2}-\d{2}$/.test(returnDateKey) ? returnDateKey : undefined,
    };
  }

  // 6. /bookings/:id
  const bookingMatch = normalizedPath.match(/^\/bookings\/([^/]+)$/);
  if (bookingMatch) {
    const returnDateKey = searchParams.get('returnDateKey') || undefined;
    return {
      type: 'BOOKING_DETAILS',
      bookingId: decodeURIComponent(bookingMatch[1]),
      returnDateKey: returnDateKey && /^\d{4}-\d{2}-\d{2}$/.test(returnDateKey) ? returnDateKey : undefined,
    };
  }

  // Fallback for any unknown route
  return { type: 'CALENDAR' };
}

/**
 * Checks deep equality of two ActiveView objects to avoid duplicate history pushes.
 */
export function isSameView(a: ActiveView, b: ActiveView): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case 'CALENDAR': {
      const bCal = b as Extract<ActiveView, { type: 'CALENDAR' }>;
      return a.initialYear === bCal.initialYear && a.initialMonthIndex === bCal.initialMonthIndex;
    }
    case 'MONTHLY_ANALYTICS':
      return true;
    case 'DATE_BOOKING': {
      const bDate = b as Extract<ActiveView, { type: 'DATE_BOOKING' }>;
      return a.dateKey === bDate.dateKey;
    }
    case 'BOOKING_FORM': {
      const bForm = b as Extract<ActiveView, { type: 'BOOKING_FORM' }>;
      return a.dateKey === bForm.dateKey && a.session === bForm.session;
    }
    case 'BOOKING_DETAILS': {
      const bDetails = b as Extract<ActiveView, { type: 'BOOKING_DETAILS' }>;
      return a.bookingId === bDetails.bookingId && a.returnDateKey === bDetails.returnDateKey;
    }
    case 'EDIT_BOOKING': {
      const bEdit = b as Extract<ActiveView, { type: 'EDIT_BOOKING' }>;
      return a.bookingId === bEdit.bookingId && a.returnDateKey === bEdit.returnDateKey;
    }
  }
}
