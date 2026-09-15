import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CalendarHeader } from '../components/calendar/CalendarHeader';
import { CalendarLegend } from '../components/calendar/CalendarLegend';
import { CalendarGrid } from '../components/calendar/CalendarGrid';
import { CalendarLoadingSkeleton } from '../components/calendar/CalendarLoadingSkeleton';
import { CalendarErrorState } from '../components/calendar/CalendarErrorState';
import { getMonthMatrix, formatDateKey } from '../lib/calendar';
import { fetchBookings } from '../services/api';
import type { Booking } from '../types/booking';

interface CalendarPageProps {
  onSelectDate: (dateKey: string) => void;
  initialYear?: number;
  initialMonthIndex?: number;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({
  onSelectDate,
  initialYear,
  initialMonthIndex,
}) => {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(initialYear ?? today.getFullYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(
    initialMonthIndex ?? today.getMonth()
  );


  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Compute date range for current visible month grid
  const { startDate, endDate } = useMemo(() => {
    const prevMonthYear = currentMonthIndex === 0 ? currentYear - 1 : currentYear;
    const prevMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1;
    const nextMonthYear = currentMonthIndex === 11 ? currentYear + 1 : currentYear;
    const nextMonthIndex = currentMonthIndex === 11 ? 0 : currentMonthIndex + 1;

    const start = formatDateKey(prevMonthYear, prevMonthIndex, 1);
    const lastDayOfNextMonth = new Date(nextMonthYear, nextMonthIndex + 1, 0).getDate();
    const end = formatDateKey(nextMonthYear, nextMonthIndex, lastDayOfNextMonth);

    return { startDate: start, endDate: end };
  }, [currentYear, currentMonthIndex]);

  // Fetch real booking data from backend API
  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBookings({
        startDate,
        endDate,
        status: 'CONFIRMED',
      });
      setBookings(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load booking schedules';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonthIndex((m) => m + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonthIndex(now.getMonth());
  };

  // Generate 7-column calendar grid days
  const calendarDays = useMemo(() => {
    return getMonthMatrix(currentYear, currentMonthIndex, bookings);
  }, [currentYear, currentMonthIndex, bookings]);

  return (
    <div className="space-y-3.5 sm:space-y-6">
      {/* Calendar Header with Title & Navigation Controls */}
      <CalendarHeader
        year={currentYear}
        monthIndex={currentMonthIndex}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
      />

      {/* Availability Status Legend */}
      <CalendarLegend />

      {/* Main Grid or Loading/Error States */}
      {loading ? (
        <CalendarLoadingSkeleton />
      ) : error ? (
        <CalendarErrorState message={error} onRetry={loadBookings} />
      ) : (
        <CalendarGrid days={calendarDays} onSelectDate={onSelectDate} />
      )}
    </div>
  );
};
