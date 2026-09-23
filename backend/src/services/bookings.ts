import { eq, and, or, ilike, inArray, gte, lte, desc, asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import * as schema from '../db/schema/index.js';
import type {
  CreateBookingInput,
  UpdateBookingInput,
  QueryBookingsInput,
} from '../schemas/bookings.js';
import { ConflictError, NotFoundError } from '../utils/errors.js';

import { formatTimeTo12Hour } from '../utils/time.js';

export interface BookingWithSessions {
  id: string;
  eventName: string;
  contactName: string;
  contactPhone: string;
  eventType: string;
  totalAmount: string;
  status: 'CONFIRMED' | 'CANCELLED';
  notes: string | null;
  createdBy: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  sessions: {
    id: string;
    bookingId: string;
    bookingDate: string;
    session: 'MORNING' | 'EVENING';
    status: 'BOOKED' | 'CANCELLED';
    startTime: string | null;
    endTime: string | null;
    createdAt: Date;
    updatedAt: Date;
  }[];
}

function isUniqueConstraintViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;

  // Direct error object checks
  if ('code' in err && (err as { code: string }).code === '23505') return true;
  if ('constraint' in err && (err as { constraint: string }).constraint === 'idx_booking_sessions_unique_active') return true;

  // Nested cause error checks (e.g. DrizzleQueryError.cause)
  if ('cause' in err && typeof (err as { cause: unknown }).cause === 'object' && (err as { cause: unknown }).cause !== null) {
    const cause = (err as { cause: Record<string, unknown> }).cause;
    if (cause.code === '23505') return true;
    if (cause.constraint === 'idx_booking_sessions_unique_active') return true;
    if (typeof cause.message === 'string') {
      const msg = cause.message;
      if (msg.includes('idx_booking_sessions_unique_active') || msg.includes('23505') || msg.includes('unique constraint') || msg.includes('duplicate key value')) {
        return true;
      }
    }
  }

  // Error message checks
  if ('message' in err && typeof (err as { message: string }).message === 'string') {
    const msg = (err as { message: string }).message;
    if (
      msg.includes('idx_booking_sessions_unique_active') ||
      msg.includes('23505') ||
      msg.includes('unique constraint') ||
      msg.includes('duplicate key value')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Service handling all booking operations with transaction safety
 */
export class BookingService {

  /**
   * Creates a booking with requested sessions inside an atomic PostgreSQL transaction.
   * Enforces database-level concurrency protection via idx_booking_sessions_unique_active.
   */
  async createBooking(data: CreateBookingInput, userId: string): Promise<BookingWithSessions> {
    try {
      return await db.transaction(async (tx) => {
        // 1. Insert core booking record
        const [newBooking] = await tx
          .insert(schema.bookings)
          .values({
            eventName: data.eventName,
            contactName: data.contactName,
            contactPhone: data.contactPhone,
            eventType: data.eventType,
            totalAmount: data.totalAmount.toFixed(2),
            status: 'CONFIRMED',
            notes: data.notes || null,
            createdBy: userId,
          })
          .returning();

        // 2. Insert all requested booking sessions with status 'BOOKED'
        const sessionsPayload = data.sessions.map((s) => ({
          bookingId: newBooking.id,
          bookingDate: s.date,
          session: s.session,
          status: 'BOOKED' as const,
          startTime: s.startTime ? formatTimeTo12Hour(s.startTime) : (s.session === 'MORNING' ? '11:00 AM' : '5:00 PM'),
          endTime: s.endTime ? formatTimeTo12Hour(s.endTime) : (s.session === 'MORNING' ? '3:00 PM' : '9:00 PM'),
        }));

        const insertedSessions = await tx
          .insert(schema.bookingSessions)
          .values(sessionsPayload)
          .returning();

        // 3. Insert audit log inside the same transaction
        await tx.insert(schema.auditLogs).values({
          userId,
          action: 'BOOKING_CREATED',
          bookingId: newBooking.id,
          details: {
            eventName: newBooking.eventName,
            contactName: newBooking.contactName,
            contactPhone: newBooking.contactPhone,
            eventType: newBooking.eventType,
            totalAmount: newBooking.totalAmount,
            sessionsCount: insertedSessions.length,
            requestedSlots: data.sessions,
          },
        });

        // 4. Retrieve creator user record
        let creator: { id: string; name: string; email: string } | null = null;
        const [creatorUser] = await tx
          .select({
            id: schema.user.id,
            name: schema.user.name,
            email: schema.user.email,
          })
          .from(schema.user)
          .where(eq(schema.user.id, userId))
          .limit(1);

        if (creatorUser) {
          creator = creatorUser;
        }

        return {
          ...newBooking,
          creator,
          sessions: insertedSessions,
        };
      });
    } catch (err: unknown) {
      // Check for PostgreSQL unique constraint violation (code 23505 / idx_booking_sessions_unique_active)
      const isUniqueConflict = isUniqueConstraintViolation(err);

      if (isUniqueConflict) {
        throw new ConflictError(
          'One or more requested auditorium sessions are already booked.',
          'BOOKING_CONFLICT'
        );
      }

      throw err;
    }
  }


  /**
   * Retrieves bookings with filters and their associated sessions.
   */
  async getBookings(filters: QueryBookingsInput): Promise<BookingWithSessions[]> {
    const conditions = [];

    // Filter by status if provided
    if (filters.status) {
      conditions.push(eq(schema.bookings.status, filters.status));
    }

    // Filter by search string across eventName, contactName, contactPhone
    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(schema.bookings.eventName, searchPattern),
          ilike(schema.bookings.contactName, searchPattern),
          ilike(schema.bookings.contactPhone, searchPattern)
        )
      );
    }

    // Fetch matching bookings
    const bookingsList = await db
      .select()
      .from(schema.bookings)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.bookings.createdAt));

    if (bookingsList.length === 0) {
      return [];
    }

    const bookingIds = bookingsList.map((b) => b.id);

    // Fetch all sessions for matching bookings
    const allSessions = await db
      .select()
      .from(schema.bookingSessions)
      .where(inArray(schema.bookingSessions.bookingId, bookingIds))
      .orderBy(asc(schema.bookingSessions.bookingDate), asc(schema.bookingSessions.session));

    // Group sessions by booking ID
    const sessionsByBookingId = new Map<string, typeof allSessions>();
    for (const session of allSessions) {
      const list = sessionsByBookingId.get(session.bookingId) || [];
      list.push(session);
      sessionsByBookingId.set(session.bookingId, list);
    }

    // Fetch creators for matching bookings
    const createdByUserIds = [...new Set(bookingsList.map((b) => b.createdBy).filter(Boolean))];
    const creatorsMap = new Map<string, { id: string; name: string; email: string }>();
    if (createdByUserIds.length > 0) {
      const creators = await db
        .select({
          id: schema.user.id,
          name: schema.user.name,
          email: schema.user.email,
        })
        .from(schema.user)
        .where(inArray(schema.user.id, createdByUserIds));
      for (const c of creators) {
        creatorsMap.set(c.id, c);
      }
    }

    // Assemble and optionally filter by date range
    let result: BookingWithSessions[] = bookingsList.map((b) => ({
      ...b,
      creator: creatorsMap.get(b.createdBy) || null,
      sessions: sessionsByBookingId.get(b.id) || [],
    }));

    if (filters.startDate || filters.endDate) {
      result = result.filter((b) =>
        b.sessions.some((s) => {
          if (filters.startDate && s.bookingDate < filters.startDate) return false;
          if (filters.endDate && s.bookingDate > filters.endDate) return false;
          return true;
        })
      );
    }

    return result;
  }

  /**
   * Retrieves a single booking by ID with all associated sessions.
   */
  async getBookingById(id: string): Promise<BookingWithSessions> {
    const [booking] = await db
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.id, id))
      .limit(1);

    if (!booking) {
      throw new NotFoundError(`Booking with ID '${id}' not found`, 'BOOKING_NOT_FOUND');
    }

    const sessions = await db
      .select()
      .from(schema.bookingSessions)
      .where(eq(schema.bookingSessions.bookingId, id))
      .orderBy(asc(schema.bookingSessions.bookingDate), asc(schema.bookingSessions.session));

    let creator: { id: string; name: string; email: string } | null = null;
    if (booking.createdBy) {
      const [userRecord] = await db
        .select({
          id: schema.user.id,
          name: schema.user.name,
          email: schema.user.email,
        })
        .from(schema.user)
        .where(eq(schema.user.id, booking.createdBy))
        .limit(1);
      if (userRecord) {
        creator = userRecord;
      }
    }

    return {
      ...booking,
      creator,
      sessions,
    };
  }

  /**
   * Updates booking details (and optionally replaces booking session slots) and records an audit log.
   * Enforces database-level concurrency protection via idx_booking_sessions_unique_active.
   */
  async updateBooking(
    id: string,
    data: UpdateBookingInput,
    userId: string
  ): Promise<BookingWithSessions> {
    try {
      return await db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(schema.bookings)
          .where(eq(schema.bookings.id, id))
          .limit(1);

        if (!existing) {
          throw new NotFoundError(`Booking with ID '${id}' not found`, 'BOOKING_NOT_FOUND');
        }

        if (existing.status === 'CANCELLED') {
          throw new ConflictError('Cannot edit a cancelled booking.', 'BOOKING_CANCELLED');
        }

        const updateData: Partial<typeof schema.bookings.$inferInsert> = {
          updatedAt: new Date(),
        };

        if (data.eventName !== undefined) updateData.eventName = data.eventName;
        if (data.contactName !== undefined) updateData.contactName = data.contactName;
        if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
        if (data.eventType !== undefined) updateData.eventType = data.eventType;
        if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount.toFixed(2);
        if (data.notes !== undefined) updateData.notes = data.notes;

        const [updated] = await tx
          .update(schema.bookings)
          .set(updateData)
          .where(eq(schema.bookings.id, id))
          .returning();

        // If sessions are provided, replace existing session slots atomically
        if (data.sessions !== undefined && data.sessions.length > 0) {
          // 1. Remove existing sessions for this booking
          await tx
            .delete(schema.bookingSessions)
            .where(eq(schema.bookingSessions.bookingId, id));

          // 2. Insert new requested sessions
          const sessionsPayload = data.sessions.map((s) => ({
            bookingId: id,
            bookingDate: s.date,
            session: s.session,
            status: 'BOOKED' as const,
            startTime: s.startTime
              ? formatTimeTo12Hour(s.startTime)
              : s.session === 'MORNING'
              ? '11:00 AM'
              : '5:00 PM',
            endTime: s.endTime
              ? formatTimeTo12Hour(s.endTime)
              : s.session === 'MORNING'
              ? '3:00 PM'
              : '9:00 PM',
          }));

          await tx.insert(schema.bookingSessions).values(sessionsPayload);
        }

        // Record audit log
        await tx.insert(schema.auditLogs).values({
          userId,
          action: 'BOOKING_UPDATED',
          bookingId: id,
          details: {
            updatedFields: Object.keys(data),
            changes: data,
          },
        });

        const sessions = await tx
          .select()
          .from(schema.bookingSessions)
          .where(eq(schema.bookingSessions.bookingId, id))
          .orderBy(asc(schema.bookingSessions.bookingDate), asc(schema.bookingSessions.session));

        // Query creator user info
        let creator: { id: string; name: string; email: string } | null = null;
        if (updated.createdBy) {
          const [creatorUser] = await tx
            .select({
              id: schema.user.id,
              name: schema.user.name,
              email: schema.user.email,
            })
            .from(schema.user)
            .where(eq(schema.user.id, updated.createdBy))
            .limit(1);

          if (creatorUser) {
            creator = creatorUser;
          }
        }

        return {
          ...updated,
          creator,
          sessions,
        };
      });
    } catch (err: unknown) {
      if (isUniqueConstraintViolation(err)) {
        throw new ConflictError(
          'One or more requested auditorium sessions are already booked.',
          'BOOKING_CONFLICT'
        );
      }
      throw err;
    }
  }

  /**
   * Cancels a booking and its active sessions atomically inside a transaction.
   * Releases booked session slots for future bookings while preserving historical records.
   */
  async cancelBooking(id: string, userId: string): Promise<BookingWithSessions> {
    return await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(schema.bookings)
        .where(eq(schema.bookings.id, id))
        .limit(1);

      if (!existing) {
        throw new NotFoundError(`Booking with ID '${id}' not found`, 'BOOKING_NOT_FOUND');
      }

      if (existing.status === 'CANCELLED') {
        throw new ConflictError(
          'Booking has already been cancelled.',
          'ALREADY_CANCELLED'
        );
      }

      const now = new Date();

      // 1. Update booking status to CANCELLED
      const [cancelledBooking] = await tx
        .update(schema.bookings)
        .set({
          status: 'CANCELLED',
          updatedAt: now,
        })
        .where(eq(schema.bookings.id, id))
        .returning();

      // 2. Update all active BOOKED sessions for this booking to CANCELLED
      await tx
        .update(schema.bookingSessions)
        .set({
          status: 'CANCELLED',
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.bookingSessions.bookingId, id),
            eq(schema.bookingSessions.status, 'BOOKED')
          )
        );

      // 3. Write audit log
      await tx.insert(schema.auditLogs).values({
        userId,
        action: 'BOOKING_CANCELLED',
        bookingId: id,
        details: {
          previousStatus: existing.status,
          cancelledAt: now.toISOString(),
        },
      });

      // 4. Retrieve full session history
      const sessions = await tx
        .select()
        .from(schema.bookingSessions)
        .where(eq(schema.bookingSessions.bookingId, id))
        .orderBy(asc(schema.bookingSessions.bookingDate), asc(schema.bookingSessions.session));

      // Query creator user info
      let creator: { id: string; name: string; email: string } | null = null;
      if (cancelledBooking.createdBy) {
        const [creatorUser] = await tx
          .select({
            id: schema.user.id,
            name: schema.user.name,
            email: schema.user.email,
          })
          .from(schema.user)
          .where(eq(schema.user.id, cancelledBooking.createdBy))
          .limit(1);

        if (creatorUser) {
          creator = creatorUser;
        }
      }

      return {
        ...cancelledBooking,
        creator,
        sessions,
      };
    });
  }

  /**
   * Cancels a specific session within a booking without cancelling the remaining sessions.
   * If all sessions in the booking become CANCELLED, the parent booking status transitions to CANCELLED.
   */
  async cancelSession(bookingId: string, sessionId: string, userId: string): Promise<BookingWithSessions> {
    return await db.transaction(async (tx) => {
      // 1. Fetch booking
      const [booking] = await tx
        .select()
        .from(schema.bookings)
        .where(eq(schema.bookings.id, bookingId))
        .limit(1);

      if (!booking) {
        throw new NotFoundError(`Booking with ID '${bookingId}' not found`, 'BOOKING_NOT_FOUND');
      }

      // 2. Fetch the session
      const [session] = await tx
        .select()
        .from(schema.bookingSessions)
        .where(
          and(
            eq(schema.bookingSessions.id, sessionId),
            eq(schema.bookingSessions.bookingId, bookingId)
          )
        )
        .limit(1);

      if (!session) {
        throw new NotFoundError(`Session with ID '${sessionId}' not found in booking`, 'SESSION_NOT_FOUND');
      }

      if (session.status === 'CANCELLED') {
        throw new ConflictError('Session has already been cancelled.', 'ALREADY_CANCELLED');
      }

      const now = new Date();

      // 3. Update this specific session status to CANCELLED
      await tx
        .update(schema.bookingSessions)
        .set({
          status: 'CANCELLED',
          updatedAt: now,
        })
        .where(eq(schema.bookingSessions.id, sessionId));

      // 4. Check if any active BOOKED sessions remain for this booking
      const activeSessions = await tx
        .select()
        .from(schema.bookingSessions)
        .where(
          and(
            eq(schema.bookingSessions.bookingId, bookingId),
            eq(schema.bookingSessions.status, 'BOOKED')
          )
        );

      let updatedBooking = booking;
      if (activeSessions.length === 0 && booking.status !== 'CANCELLED') {
        const [cancelledBooking] = await tx
          .update(schema.bookings)
          .set({
            status: 'CANCELLED',
            updatedAt: now,
          })
          .where(eq(schema.bookings.id, bookingId))
          .returning();
        updatedBooking = cancelledBooking;
      } else {
        const [touchedBooking] = await tx
          .update(schema.bookings)
          .set({
            updatedAt: now,
          })
          .where(eq(schema.bookings.id, bookingId))
          .returning();
        updatedBooking = touchedBooking;
      }

      // 5. Write audit log
      await tx.insert(schema.auditLogs).values({
        userId,
        action: 'SESSION_CANCELLED',
        bookingId,
        details: {
          sessionId,
          bookingDate: session.bookingDate,
          session: session.session,
          remainingActiveSessions: activeSessions.length,
          cancelledAt: now.toISOString(),
        },
      });

      // 6. Return full booking with updated sessions
      const allSessions = await tx
        .select()
        .from(schema.bookingSessions)
        .where(eq(schema.bookingSessions.bookingId, bookingId))
        .orderBy(asc(schema.bookingSessions.bookingDate), asc(schema.bookingSessions.session));

      // Query creator user info
      let creator: { id: string; name: string; email: string } | null = null;
      if (updatedBooking.createdBy) {
        const [creatorUser] = await tx
          .select({
            id: schema.user.id,
            name: schema.user.name,
            email: schema.user.email,
          })
          .from(schema.user)
          .where(eq(schema.user.id, updatedBooking.createdBy))
          .limit(1);

        if (creatorUser) {
          creator = creatorUser;
        }
      }

      return {
        ...updatedBooking,
        creator,
        sessions: allSessions,
      };
    });
  }
}

export const bookingService = new BookingService();
