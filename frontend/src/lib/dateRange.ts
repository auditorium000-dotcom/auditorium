import type { DateRangePreset, DateRangeState } from '../types/dashboard';

/**
 * Returns the current date formatted as YYYY-MM-DD in IST (Asia/Kolkata, UTC+5:30).
 */
export function getIstTodayDateString(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Formats a Date instance as YYYY-MM-DD.
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculates start and end YYYY-MM-DD for a given preset in IST.
 */
export function computePresetRange(preset: DateRangePreset): { startDate: string; endDate: string } {
  const istTodayStr = getIstTodayDateString();
  const [yStr, mStr, dStr] = istTodayStr.split('-');
  const currentYear = parseInt(yStr, 10);
  const currentMonth = parseInt(mStr, 10); // 1-indexed
  const currentDay = parseInt(dStr, 10);

  switch (preset) {
    case 'TODAY': {
      return {
        startDate: istTodayStr,
        endDate: istTodayStr,
      };
    }

    case 'THIS_WEEK': {
      // IST current date as JS date (year, monthIndex, day)
      const istDate = new Date(currentYear, currentMonth - 1, currentDay);
      // Monday is day 1, Sunday is day 7 (or day 0 -> 7)
      const dayOfWeek = istDate.getDay() === 0 ? 7 : istDate.getDay();
      const diffToMonday = dayOfWeek - 1;
      const monday = new Date(currentYear, currentMonth - 1, currentDay - diffToMonday);
      const sunday = new Date(currentYear, currentMonth - 1, currentDay - diffToMonday + 6);
      return {
        startDate: formatDate(monday),
        endDate: formatDate(sunday),
      };
    }

    case 'THIS_MONTH': {
      const firstDay = `${yStr}-${mStr}-01`;
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const lastDay = `${yStr}-${mStr}-${String(daysInMonth).padStart(2, '0')}`;
      return {
        startDate: firstDay,
        endDate: lastDay,
      };
    }

    case 'LAST_MONTH': {
      let lastMonthYear = currentYear;
      let lastMonth = currentMonth - 1;
      if (lastMonth === 0) {
        lastMonth = 12;
        lastMonthYear -= 1;
      }
      const lastMonthStr = String(lastMonth).padStart(2, '0');
      const firstDay = `${lastMonthYear}-${lastMonthStr}-01`;
      const daysInMonth = new Date(lastMonthYear, lastMonth, 0).getDate();
      const lastDay = `${lastMonthYear}-${lastMonthStr}-${String(daysInMonth).padStart(2, '0')}`;
      return {
        startDate: firstDay,
        endDate: lastDay,
      };
    }

    case 'THIS_YEAR': {
      return {
        startDate: `${currentYear}-01-01`,
        endDate: `${currentYear}-12-31`,
      };
    }

    case 'CUSTOM':
    default: {
      return {
        startDate: `${yStr}-${mStr}-01`,
        endDate: istTodayStr,
      };
    }
  }
}

/**
 * Returns initial default DateRangeState (THIS_MONTH).
 */
export function getDefaultDateRange(): DateRangeState {
  const { startDate, endDate } = computePresetRange('THIS_MONTH');
  return {
    preset: 'THIS_MONTH',
    startDate,
    endDate,
  };
}

export const PRESET_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: 'TODAY', label: 'Today' },
  { value: 'THIS_WEEK', label: 'This Week' },
  { value: 'THIS_MONTH', label: 'This Month' },
  { value: 'LAST_MONTH', label: 'Last Month' },
  { value: 'THIS_YEAR', label: 'This Year' },
  { value: 'CUSTOM', label: 'Custom Range' },
];

/**
 * Formats a currency number in INR (e.g., ₹25,000.00).
 */
export function formatCurrency(amount: number | string | undefined | null): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (num === undefined || num === null || isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formats a short date string (e.g., "15 Sep 2026").
 */
export function formatDisplayDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, monthIndex, day);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
