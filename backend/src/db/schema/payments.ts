import { pgTable, uuid, numeric, timestamp, text, index } from 'drizzle-orm/pg-core';
import { bookings } from './bookings.js';
import { paymentMethodEnum } from './enums.js';


export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookingId: uuid('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  paymentDate: timestamp('payment_date', { withTimezone: true }).notNull().defaultNow(),
  receivedBy: text('received_by').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  bookingIdIdx: index('idx_payments_booking_id').on(table.bookingId),
  paymentDateIdx: index('idx_payments_payment_date').on(table.paymentDate),
}));
