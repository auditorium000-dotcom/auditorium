import { pgEnum } from 'drizzle-orm/pg-core';

export const bookingStatusEnum = pgEnum('booking_status', ['CONFIRMED', 'CANCELLED']);
export const bookingSessionEnum = pgEnum('booking_session', ['MORNING', 'EVENING']);
export const bookingSessionStatusEnum = pgEnum('booking_session_status', ['BOOKED', 'CANCELLED']);
export const paymentMethodEnum = pgEnum('payment_method', ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER']);
