import { eq, inArray, asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import * as schema from '../db/schema/index.js';
import type { YearlyAnalyticsSummary, MonthlyBookingStats } from '@auditorium/shared';

const MONTH_NAMES = [
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

const MONTH_SHORTS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export class AnalyticsService {
  /**
   * Computes comprehensive monthly booking statistics and yearly analytics summary
   */
  async getMonthlyAnalytics(targetYear: number): Promise<YearlyAnalyticsSummary> {
    const year = Number.isInteger(targetYear) && targetYear > 2000 && targetYear < 2100
      ? targetYear
      : new Date().getFullYear();

    // 1. Fetch all bookings
    const allBookings = await db
      .select()
      .from(schema.bookings);

    const bookingMap = new Map<string, typeof allBookings[0]>();
    for (const b of allBookings) {
      bookingMap.set(b.id, b);
    }

    // 2. Fetch all booking sessions
    const allSessions = await db
      .select()
      .from(schema.bookingSessions)
      .orderBy(asc(schema.bookingSessions.bookingDate));

    // 3. Fetch all payments
    const allPayments = await db
      .select()
      .from(schema.payments);

    const paymentsByBookingId = new Map<string, number>();
    for (const p of allPayments) {
      const current = paymentsByBookingId.get(p.bookingId) || 0;
      paymentsByBookingId.set(p.bookingId, current + parseFloat(p.amount || '0'));
    }

    // 4. Determine available years from sessions and bookings
    const detectedYears = new Set<number>();
    detectedYears.add(new Date().getFullYear());
    detectedYears.add(year);

    for (const s of allSessions) {
      if (s.bookingDate) {
        const y = parseInt(s.bookingDate.split('-')[0], 10);
        if (!isNaN(y)) detectedYears.add(y);
      }
    }

    for (const b of allBookings) {
      if (b.createdAt) {
        detectedYears.add(new Date(b.createdAt).getFullYear());
      }
    }

    const availableYears = Array.from(detectedYears).sort((a, b) => a - b);

    // 5. Initialize 12 months structure
    const monthlyStats: MonthlyBookingStats[] = Array.from({ length: 12 }, (_, index) => {
      const monthNumber = index + 1;
      return {
        month: monthNumber,
        monthName: MONTH_NAMES[index],
        monthShort: MONTH_SHORTS[index],
        year,
        totalBookings: 0,
        confirmedBookings: 0,
        cancelledBookings: 0,
        morningSessions: 0,
        eveningSessions: 0,
        totalSessions: 0,
        totalRevenue: 0,
        totalPaid: 0,
        utilizationPercent: 0,
        eventTypes: [],
      };
    });

    // Helper data structures for monthly grouping
    const monthBookingsMap = new Map<number, Set<string>>();
    const monthEventTypesMap = new Map<number, Map<string, number>>();

    for (let m = 1; m <= 12; m++) {
      monthBookingsMap.set(m, new Set<string>());
      monthEventTypesMap.set(m, new Map<string, number>());
    }

    // Process sessions for the target year
    for (const session of allSessions) {
      if (!session.bookingDate) continue;
      const parts = session.bookingDate.split('-');
      const sessionYear = parseInt(parts[0], 10);
      const sessionMonth = parseInt(parts[1], 10);

      if (sessionYear !== year || sessionMonth < 1 || sessionMonth > 12) {
        continue;
      }

      const monthStat = monthlyStats[sessionMonth - 1];
      const booking = bookingMap.get(sessionBookingId(session.bookingId));

      // Record session count
      if (session.status === 'BOOKED') {
        if (session.session === 'MORNING') {
          monthStat.morningSessions += 1;
        } else if (session.session === 'EVENING') {
          monthStat.eveningSessions += 1;
        }
        monthStat.totalSessions += 1;
      }

      // Associate booking with this month
      if (booking) {
        monthBookingsMap.get(sessionMonth)!.add(booking.id);
      }
    }

    // Function to safely get string id
    function sessionBookingId(id: string): string {
      return id;
    }

    // If there are bookings without sessions, or for bookings associated with each month, tally totals
    const yearlyEventTypesMap = new Map<string, number>();
    let totalYearRevenue = 0;
    let totalYearPaid = 0;
    let confirmedYearBookings = 0;
    let cancelledYearBookings = 0;
    const yearUniqueBookingIds = new Set<string>();

    for (let m = 1; m <= 12; m++) {
      const monthStat = monthlyStats[m - 1];
      const bookingIdsInMonth = monthBookingsMap.get(m)!;
      const daysInMonth = getDaysInMonth(year, m - 1);
      const totalPossibleSlots = daysInMonth * 2; // 2 sessions per day

      let monthRevenue = 0;
      let monthPaid = 0;
      let confirmedCount = 0;
      let cancelledCount = 0;

      for (const bId of bookingIdsInMonth) {
        const booking = bookingMap.get(bId);
        if (!booking) continue;

        yearUniqueBookingIds.add(bId);

        if (booking.status === 'CONFIRMED') {
          confirmedCount += 1;
        } else if (booking.status === 'CANCELLED') {
          cancelledCount += 1;
        }

        const bRev = parseFloat(booking.totalAmount || '0');
        monthRevenue += bRev;

        const bPaid = paymentsByBookingId.get(bId) || 0;
        monthPaid += bPaid;

        // Tally event type
        const evType = booking.eventType || 'Other';
        const mEventMap = monthEventTypesMap.get(m)!;
        mEventMap.set(evType, (mEventMap.get(evType) || 0) + 1);

        yearlyEventTypesMap.set(evType, (yearlyEventTypesMap.get(evType) || 0) + 1);
      }

      monthStat.totalBookings = bookingIdsInMonth.size;
      monthStat.confirmedBookings = confirmedCount;
      monthStat.cancelledBookings = cancelledCount;
      monthStat.totalRevenue = Math.round(monthRevenue * 100) / 100;
      monthStat.totalPaid = Math.round(monthPaid * 100) / 100;
      monthStat.utilizationPercent = totalPossibleSlots > 0
        ? Math.min(100, Math.round((monthStat.totalSessions / totalPossibleSlots) * 1000) / 10)
        : 0;

      // Convert month event types map to sorted array
      const mEventArray = Array.from(monthEventTypesMap.get(m)!.entries()).map(
        ([eventType, count]) => ({ eventType, count })
      );
      mEventArray.sort((a, b) => b.count - a.count);
      monthStat.eventTypes = mEventArray;

      totalYearRevenue += monthRevenue;
      totalYearPaid += monthPaid;
      confirmedYearBookings += confirmedCount;
      cancelledYearBookings += cancelledCount;
    }

    // Yearly Totals
    const totalYearBookings = yearUniqueBookingIds.size;
    const morningSessionsTotal = monthlyStats.reduce((sum, m) => sum + m.morningSessions, 0);
    const eveningSessionsTotal = monthlyStats.reduce((sum, m) => sum + m.eveningSessions, 0);
    const totalYearSessions = morningSessionsTotal + eveningSessionsTotal;

    // Peak Month
    let peakMonth: { month: number; monthName: string; totalBookings: number; totalRevenue: number } | null = null;
    let maxBookings = -1;

    for (const m of monthlyStats) {
      if (m.totalBookings > maxBookings && m.totalBookings > 0) {
        maxBookings = m.totalBookings;
        peakMonth = {
          month: m.month,
          monthName: m.monthName,
          totalBookings: m.totalBookings,
          totalRevenue: m.totalRevenue,
        };
      }
    }

    // Fallback peak month to month with highest session or month 1
    if (!peakMonth && monthlyStats.length > 0) {
      peakMonth = {
        month: 1,
        monthName: monthlyStats[0].monthName,
        totalBookings: 0,
        totalRevenue: 0,
      };
    }

    // Event Type Distribution for the whole year
    const totalEventCount = Array.from(yearlyEventTypesMap.values()).reduce((a, b) => a + b, 0);
    const eventTypeDistribution = Array.from(yearlyEventTypesMap.entries())
      .map(([eventType, count]) => ({
        eventType,
        count,
        percentage: totalEventCount > 0 ? Math.round((count / totalEventCount) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      year,
      availableYears,
      totalYearBookings,
      confirmedYearBookings,
      cancelledYearBookings,
      totalYearRevenue: Math.round(totalYearRevenue * 100) / 100,
      totalYearPaid: Math.round(totalYearPaid * 100) / 100,
      totalYearSessions,
      morningSessionsTotal,
      eveningSessionsTotal,
      averageBookingsPerMonth: Math.round((totalYearBookings / 12) * 10) / 10,
      peakMonth,
      eventTypeDistribution,
      monthlyStats,
    };
  }
}

export const analyticsService = new AnalyticsService();
