import type { SessionType } from '../types/booking';

/**
 * Time utility functions for parsing, validating, and formatting booking session times.
 */

export const DEFAULT_SESSION_TIMES: Record<
  SessionType,
  { startTime: string; endTime: string; start24: string; end24: string }
> = {
  MORNING: {
    startTime: '11:00 AM',
    endTime: '3:00 PM',
    start24: '11:00',
    end24: '15:00',
  },
  EVENING: {
    startTime: '5:00 PM',
    endTime: '9:00 PM',
    start24: '17:00',
    end24: '21:00',
  },
};

/**
 * Parses a time string (in 12-hr AM/PM or 24-hr format) to total minutes from midnight.
 * Returns NaN if the time format is invalid.
 */
export function parseTimeToMinutes(timeStr?: string | null): number {
  if (!timeStr) return NaN;
  const clean = timeStr.trim().toUpperCase();

  // 12-hour AM/PM format e.g. "11:00 AM", "3:30 PM", "12:00 PM"
  const ampmMatch = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const period = ampmMatch[3];

    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
      return NaN;
    }

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // 24-hour format e.g. "11:00", "15:00", "09:30", "0:00"
  const h24Match = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match) {
    const hours = parseInt(h24Match[1], 10);
    const minutes = parseInt(h24Match[2], 10);

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return NaN;
    }

    return hours * 60 + minutes;
  }

  return NaN;
}

/**
 * Validates that an end time is strictly after a start time.
 */
export function isEndTimeAfterStartTime(startTime?: string | null, endTime?: string | null): boolean {
  if (!startTime || !endTime) return false;
  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);
  if (isNaN(startMin) || isNaN(endMin)) return false;
  return endMin > startMin;
}

/**
 * Formats any valid time string into standard 12-hour AM/PM format (e.g. "11:00 AM", "3:00 PM").
 */
export function formatTimeTo12Hour(timeStr?: string | null): string {
  if (!timeStr) return '';
  const minutes = parseTimeToMinutes(timeStr);
  if (isNaN(minutes)) return timeStr;

  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mStr = m.toString().padStart(2, '0');

  return `${h12}:${mStr} ${period}`;
}

/**
 * Formats any valid time string into standard 24-hour HH:mm format (e.g. "11:00", "15:00").
 */
export function formatTimeTo24Hour(timeStr?: string | null): string {
  if (!timeStr) return '';
  const minutes = parseTimeToMinutes(timeStr);
  if (isNaN(minutes)) return timeStr;

  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');

  return `${h}:${m}`;
}
