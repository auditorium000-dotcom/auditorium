import type { SessionType, BookingStatus, PaymentStatus, EventType } from '../constants/index.js';

/**
 * System User Interface (Authorized Internal Manager)
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER';
  createdAt: string;
  updatedAt: string;
}

/**
 * Date + Session Slot Interface (Atomic unique resource: date + session)
 */
export interface SessionSlot {
  date: string; // YYYY-MM-DD
  session: SessionType; // MORNING | EVENING
  startTime?: string;
  endTime?: string;
}

/**
 * Payment Record Interface
 */
export interface PaymentRecord {
  id: string;
  bookingId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI' | 'CARD';
  referenceNumber?: string;
  notes?: string;
  recordedById: string;
  recordedByName?: string;
  createdAt: string;
}

/**
 * Core Booking Interface
 */
export interface Booking {
  id: string;
  eventName: string;
  contactName: string;
  contactPhone: string;
  eventType: EventType | string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  selectedSessions: SessionSlot[];
  totalAmount: number;
  advanceAmount: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  notes?: string;
  createdById: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Audit Log Trail Interface
 */
export interface AuditLog {
  id: string;
  action: 'CREATE_BOOKING' | 'UPDATE_BOOKING' | 'CANCEL_BOOKING' | 'RECORD_PAYMENT' | 'USER_LOGIN';
  entityId: string;
  entityType: 'BOOKING' | 'PAYMENT' | 'USER';
  userId: string;
  userName: string;
  details: Record<string, unknown>;
  createdAt: string;
}

/**
 * Monthly Booking Statistics Breakdown
 */
export interface MonthlyBookingStats {
  month: number; // 1-12
  monthName: string; // e.g., "January"
  monthShort: string; // e.g., "Jan"
  year: number;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  morningSessions: number;
  eveningSessions: number;
  totalSessions: number;
  totalRevenue: number;
  totalPaid: number;
  utilizationPercent: number;
  eventTypes: {
    eventType: string;
    count: number;
  }[];
}

/**
 * Yearly Analytics Summary Response
 */
export interface YearlyAnalyticsSummary {
  year: number;
  availableYears: number[];
  totalYearBookings: number;
  confirmedYearBookings: number;
  cancelledYearBookings: number;
  totalYearRevenue: number;
  totalYearPaid: number;
  totalYearSessions: number;
  morningSessionsTotal: number;
  eveningSessionsTotal: number;
  averageBookingsPerMonth: number;
  peakMonth: {
    month: number;
    monthName: string;
    totalBookings: number;
    totalRevenue: number;
  } | null;
  eventTypeDistribution: {
    eventType: string;
    count: number;
    percentage: number;
  }[];
  monthlyStats: MonthlyBookingStats[];
}

