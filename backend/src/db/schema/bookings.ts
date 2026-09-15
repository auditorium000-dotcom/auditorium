import { pgTable, uuid, text, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { bookingStatusEnum } from './enums.js';


export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventName: text('event_name').notNull(),
  contactName: text('contact_name').notNull(),
  contactPhone: text('contact_phone').notNull(),
  eventType: text('event_type').notNull(),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  status: bookingStatusEnum('status').notNull().default('CONFIRMED'),
  notes: text('notes'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  statusIdx: index('idx_bookings_status').on(table.status),
  contactPhoneIdx: index('idx_bookings_contact_phone').on(table.contactPhone),
  createdByIdx: index('idx_bookings_created_by').on(table.createdBy),
  createdAtIdx: index('idx_bookings_created_at').on(table.createdAt),
}));
