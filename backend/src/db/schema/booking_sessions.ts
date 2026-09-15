import { pgTable, uuid, date, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { bookings } from './bookings.js';
import { bookingSessionEnum, bookingSessionStatusEnum } from './enums.js';


export const bookingSessions = pgTable('booking_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookingId: uuid('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  bookingDate: date('booking_date').notNull(),
  session: bookingSessionEnum('session').notNull(),
  status: bookingSessionStatusEnum('status').notNull().default('BOOKED'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  bookingIdIdx: index('idx_booking_sessions_booking_id').on(table.bookingId),
  bookingDateIdx: index('idx_booking_sessions_booking_date').on(table.bookingDate),
  sessionIdx: index('idx_booking_sessions_session').on(table.session),
  
  // CRITICAL CONCURRENCY REQUIREMENT: Partial Unique Index
  // Ensures that for a given date and session, only ONE record can have status = 'BOOKED'
  uniqueActiveSession: uniqueIndex('idx_booking_sessions_unique_active')
    .on(table.bookingDate, table.session)
    .where(sql`${table.status} = 'BOOKED'`),
}));
