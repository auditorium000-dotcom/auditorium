import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { bookings } from './bookings.js';


export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  action: text('action').notNull(),
  bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
  details: jsonb('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  bookingIdIdx: index('idx_audit_logs_booking_id').on(table.bookingId),
  userIdIdx: index('idx_audit_logs_user_id').on(table.userId),
  createdAtIdx: index('idx_audit_logs_created_at').on(table.createdAt),
}));
