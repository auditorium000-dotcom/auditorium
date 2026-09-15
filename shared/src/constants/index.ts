/**
 * Auditorium Session Definitions
 */
export const SESSIONS = {
  MORNING: {
    id: 'MORNING',
    label: 'Morning Session',
    startTime: '11:00 AM',
    endTime: '3:00 PM',
    timeRange: '11:00 AM – 3:00 PM',
  },
  EVENING: {
    id: 'EVENING',
    label: 'Evening Session',
    startTime: '5:00 PM',
    endTime: '9:00 PM',
    timeRange: '5:00 PM – 9:00 PM',
  },
} as const;

export type SessionType = keyof typeof SESSIONS;

/**
 * Booking Status Constants
 */
export const BOOKING_STATUS = {
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  PENDING: 'PENDING',
} as const;

export type BookingStatus = keyof typeof BOOKING_STATUS;

/**
 * Payment Status Constants
 */
export const PAYMENT_STATUS = {
  PAID: 'PAID',
  PARTIAL: 'PARTIAL',
  UNPAID: 'UNPAID',
} as const;

export type PaymentStatus = keyof typeof PAYMENT_STATUS;

/**
 * Common Event Types
 */
export const EVENT_TYPES = [
  'Wedding / Reception',
  'Corporate Conference',
  'Cultural Program',
  'Musical Concert',
  'Seminar / Workshop',
  'Exhibition',
  'Theatre / Play',
  'Other',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];
