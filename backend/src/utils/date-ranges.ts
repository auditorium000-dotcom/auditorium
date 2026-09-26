/**
 * Date range preset utilities respecting the Asia/Kolkata (IST) timezone.
 */

export type DateRangePreset =
  | 'TODAY'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_YEAR'
  | 'CUSTOM';

export interface ComputedDateRange {
  preset: DateRangePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  startDateTimeUtc: Date;
  endDateTimeUtc: Date;
}

/**
 * Returns current IST date parts { year, month, day, dayOfWeek }
 */
export function getCurrentIstDate(refDate = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(refDate);
  const find = (type: string) => parts.find((p) => p.type === type)?.value || '';

  const year = parseInt(find('year'), 10);
  const month = parseInt(find('month'), 10); // 1-12
  const day = parseInt(find('day'), 10);

  // Day of week in IST
  const dUtc = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = dUtc.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  return { year, month, day, dayOfWeek, formattedDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
}

/**
 * Converts a YYYY-MM-DD date string to UTC Date boundaries in IST.
 */
export function getIstDayBoundaries(dateStr: string): { startUtc: Date; endUtc: Date } {
  const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
  // IST is UTC+5:30. 00:00:00 IST is previous day 18:30:00 UTC
  const startUtc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - (5 * 60 + 30) * 60 * 1000);
  const endUtc = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - (5 * 60 + 30) * 60 * 1000);
  return { startUtc, endUtc };
}

/**
 * Resolves a date preset or custom date range into YYYY-MM-DD strings and UTC Date boundaries.
 */
export function resolveDateRange(
  preset?: DateRangePreset,
  customStartDate?: string,
  customEndDate?: string,
  refDate = new Date()
): ComputedDateRange {
  const ist = getCurrentIstDate(refDate);
  const pad = (n: number) => String(n).padStart(2, '0');

  let activePreset: DateRangePreset = preset || 'THIS_MONTH';
  let startDate = '';
  let endDate = '';

  if (customStartDate && customEndDate) {
    activePreset = 'CUSTOM';
    startDate = customStartDate;
    endDate = customEndDate;
  } else {
    switch (activePreset) {
      case 'TODAY': {
        startDate = ist.formattedDate;
        endDate = ist.formattedDate;
        break;
      }
      case 'THIS_WEEK': {
        // Monday is start of week, Sunday is end
        const diffToMonday = (ist.dayOfWeek === 0 ? -6 : 1) - ist.dayOfWeek;
        const mondayUtc = new Date(Date.UTC(ist.year, ist.month - 1, ist.day + diffToMonday));
        const sundayUtc = new Date(Date.UTC(ist.year, ist.month - 1, ist.day + diffToMonday + 6));

        startDate = `${mondayUtc.getUTCFullYear()}-${pad(mondayUtc.getUTCMonth() + 1)}-${pad(mondayUtc.getUTCDate())}`;
        endDate = `${sundayUtc.getUTCFullYear()}-${pad(sundayUtc.getUTCMonth() + 1)}-${pad(sundayUtc.getUTCDate())}`;
        break;
      }
      case 'THIS_MONTH': {
        const lastDay = new Date(Date.UTC(ist.year, ist.month, 0)).getUTCDate();
        startDate = `${ist.year}-${pad(ist.month)}-01`;
        endDate = `${ist.year}-${pad(ist.month)}-${pad(lastDay)}`;
        break;
      }
      case 'LAST_MONTH': {
        let prevYear = ist.year;
        let prevMonth = ist.month - 1;
        if (prevMonth === 0) {
          prevMonth = 12;
          prevYear -= 1;
        }
        const lastDay = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
        startDate = `${prevYear}-${pad(prevMonth)}-01`;
        endDate = `${prevYear}-${pad(prevMonth)}-${pad(lastDay)}`;
        break;
      }
      case 'THIS_YEAR': {
        startDate = `${ist.year}-01-01`;
        endDate = `${ist.year}-12-31`;
        break;
      }
      case 'CUSTOM': {
        if (customStartDate && customEndDate) {
          startDate = customStartDate;
          endDate = customEndDate;
        } else {
          // Fallback to this month if custom dates not provided
          const lastDay = new Date(Date.UTC(ist.year, ist.month, 0)).getUTCDate();
          startDate = `${ist.year}-${pad(ist.month)}-01`;
          endDate = `${ist.year}-${pad(ist.month)}-${pad(lastDay)}`;
        }
        break;
      }
      default: {
        const lastDay = new Date(Date.UTC(ist.year, ist.month, 0)).getUTCDate();
        startDate = `${ist.year}-${pad(ist.month)}-01`;
        endDate = `${ist.year}-${pad(ist.month)}-${pad(lastDay)}`;
        activePreset = 'THIS_MONTH';
      }
    }
  }

  const { startUtc: startDateTimeUtc } = getIstDayBoundaries(startDate);
  const { endUtc: endDateTimeUtc } = getIstDayBoundaries(endDate);

  return {
    preset: activePreset,
    startDate,
    endDate,
    startDateTimeUtc,
    endDateTimeUtc,
  };
}
