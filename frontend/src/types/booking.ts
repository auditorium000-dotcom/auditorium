export type SessionType = 'MORNING' | 'EVENING';
export type BookingStatus = 'CONFIRMED' | 'CANCELLED';
export type BookingSessionStatus = 'BOOKED' | 'CANCELLED';

export interface BookingSession {
  id: string;
  bookingId: string;
  bookingDate: string; // YYYY-MM-DD
  session: SessionType;
  status: BookingSessionStatus;
  startTime?: string | null;
  endTime?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  eventName: string;
  contactName: string;
  contactPhone: string;
  eventType: string;
  totalAmount: string;
  status: BookingStatus;
  notes: string | null;
  createdBy: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  sessions: BookingSession[];
}

export type DayAvailabilityStatus = 'AVAILABLE' | 'PARTIAL' | 'FULL';

export interface DaySessionState {
  isMorningBooked: boolean;
  isEveningBooked: boolean;
  morningBooking?: Booking;
  eveningBooking?: Booking;
  status: DayAvailabilityStatus;
  bookedCount: number;
}

export interface CalendarDayInfo {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  dayOfWeek: number; // 0=Mon..6=Sun
  availability: DaySessionState;
}
