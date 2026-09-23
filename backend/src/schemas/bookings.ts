import { z } from 'zod';
import { isEndTimeAfterStartTime, parseTimeToMinutes } from '../utils/time.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates a single booking date + session item with optional custom start and end times
 */
export const bookingSessionItemSchema = z
  .object({
    date: z
      .string()
      .trim()
      .regex(DATE_REGEX, 'Date must be formatted as YYYY-MM-DD')
      .refine((val) => !isNaN(Date.parse(val)), 'Date must be a valid calendar date'),
    session: z.enum(['MORNING', 'EVENING'], {
      errorMap: () => ({ message: "Session must be either 'MORNING' or 'EVENING'" }),
    }),
    startTime: z.string().trim().optional(),
    endTime: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startTime) {
      if (isNaN(parseTimeToMinutes(data.startTime))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid start time format',
          path: ['startTime'],
        });
      }
    }
    if (data.endTime) {
      if (isNaN(parseTimeToMinutes(data.endTime))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid end time format',
          path: ['endTime'],
        });
      }
    }
    if (data.startTime && data.endTime) {
      if (!isEndTimeAfterStartTime(data.startTime, data.endTime)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `End time (${data.endTime}) must be later than start time (${data.startTime})`,
          path: ['endTime'],
        });
      }
    }
  });

/**
 * Validates payload for creating a new booking
 */
export const createBookingSchema = z.object({
  eventName: z.string().trim().min(1, 'Event name is required'),
  contactName: z.string().trim().min(1, 'Contact name is required'),
  contactPhone: z
    .string()
    .trim()
    .min(5, 'Contact phone number must be at least 5 digits')
    .max(20, 'Contact phone number cannot exceed 20 characters'),
  eventType: z.string().trim().min(1, 'Event type is required'),
  totalAmount: z.coerce.number().min(0, 'Total amount must be non-negative').default(0),
  notes: z.string().trim().nullable().optional(),
  sessions: z
    .array(bookingSessionItemSchema)
    .min(1, 'At least one booking session is required')
    .superRefine((sessions, ctx) => {
      const seenSlots = new Set<string>();
      for (let i = 0; i < sessions.length; i++) {
        const slotKey = `${sessions[i].date}_${sessions[i].session}`;
        if (seenSlots.has(slotKey)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate slot found in request: ${sessions[i].date} (${sessions[i].session})`,
            path: [i],
          });
        }
        seenSlots.add(slotKey);
      }
    }),
});

/**
 * Validates payload for updating booking details and session slots
 */
export const updateBookingSchema = z
  .object({
    eventName: z.string().trim().min(1, 'Event name cannot be empty').optional(),
    contactName: z.string().trim().min(1, 'Contact name cannot be empty').optional(),
    contactPhone: z
      .string()
      .trim()
      .min(5, 'Contact phone number must be at least 5 digits')
      .max(20, 'Contact phone number cannot exceed 20 characters')
      .optional(),
    eventType: z.string().trim().min(1, 'Event type cannot be empty').optional(),
    totalAmount: z.coerce.number().min(0, 'Total amount must be non-negative').optional(),
    notes: z.string().trim().nullable().optional(),
    sessions: z
      .array(bookingSessionItemSchema)
      .min(1, 'At least one booking session is required')
      .superRefine((sessions, ctx) => {
        const seenSlots = new Set<string>();
        for (let i = 0; i < sessions.length; i++) {
          const slotKey = `${sessions[i].date}_${sessions[i].session}`;
          if (seenSlots.has(slotKey)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Duplicate slot found in request: ${sessions[i].date} (${sessions[i].session})`,
              path: [i],
            });
          }
          seenSlots.add(slotKey);
        }
      })
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    'At least one field must be provided for update'
  );

/**
 * Validates query parameters for listing bookings
 */
export const queryBookingsSchema = z.object({
  startDate: z.string().trim().regex(DATE_REGEX, 'startDate must be YYYY-MM-DD').optional(),
  endDate: z.string().trim().regex(DATE_REGEX, 'endDate must be YYYY-MM-DD').optional(),
  status: z.enum(['CONFIRMED', 'CANCELLED']).optional(),
  search: z.string().trim().optional(),
});

export const bookingSessionIdParamSchema = z.object({
  id: z.string().uuid('Invalid booking ID format'),
  sessionId: z.string().uuid('Invalid session ID format'),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type QueryBookingsInput = z.infer<typeof queryBookingsSchema>;
export type BookingSessionItemInput = z.infer<typeof bookingSessionItemSchema>;
