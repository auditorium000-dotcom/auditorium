import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { bookingService } from '../services/bookings.js';
import {
  createBookingSchema,
  updateBookingSchema,
  queryBookingsSchema,
  bookingSessionIdParamSchema,
} from '../schemas/bookings.js';
import { AppError } from '../utils/errors.js';

const idParamSchema = z.object({
  id: z.string().uuid('Invalid booking UUID parameter'),
});

export class BookingController {
  /**
   * Handles POST /api/bookings
   */
  async createBooking(request: FastifyRequest, reply: FastifyReply) {
    try {
      const parsedBody = createBookingSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid booking data provided',
          details: parsedBody.error.flatten().fieldErrors,
        });
      }

      const userId = request.user!.id;
      const booking = await bookingService.createBooking(parsedBody.data, userId);

      return reply.code(201).send(booking);
    } catch (err: unknown) {
      return this.handleError(err, request, reply);
    }
  }

  /**
   * Handles GET /api/bookings
   */
  async getBookings(request: FastifyRequest, reply: FastifyReply) {
    try {
      const parsedQuery = queryBookingsSchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid query parameters provided',
          details: parsedQuery.error.flatten().fieldErrors,
        });
      }

      const bookings = await bookingService.getBookings(parsedQuery.data);
      return reply.code(200).send(bookings);
    } catch (err: unknown) {
      return this.handleError(err, request, reply);
    }
  }

  /**
   * Handles GET /api/bookings/:id
   */
  async getBookingById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const parsedParams = idParamSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid booking ID parameter',
          details: parsedParams.error.flatten().fieldErrors,
        });
      }

      const booking = await bookingService.getBookingById(parsedParams.data.id);
      return reply.code(200).send(booking);
    } catch (err: unknown) {
      return this.handleError(err, request, reply);
    }
  }

  /**
   * Handles PATCH /api/bookings/:id
   */
  async updateBooking(request: FastifyRequest, reply: FastifyReply) {
    try {
      const parsedParams = idParamSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid booking ID parameter',
          details: parsedParams.error.flatten().fieldErrors,
        });
      }

      const parsedBody = updateBookingSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid update data provided',
          details: parsedBody.error.flatten().fieldErrors,
        });
      }

      const userId = request.user!.id;
      const updated = await bookingService.updateBooking(
        parsedParams.data.id,
        parsedBody.data,
        userId
      );

      return reply.code(200).send(updated);
    } catch (err: unknown) {
      return this.handleError(err, request, reply);
    }
  }

  /**
   * Handles POST /api/bookings/:id/cancel
   */
  async cancelBooking(request: FastifyRequest, reply: FastifyReply) {
    try {
      const parsedParams = idParamSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid booking ID parameter',
          details: parsedParams.error.flatten().fieldErrors,
        });
      }

      const userId = request.user!.id;
      const cancelled = await bookingService.cancelBooking(parsedParams.data.id, userId);

      return reply.code(200).send(cancelled);
    } catch (err: unknown) {
      return this.handleError(err, request, reply);
    }
  }

  /**
   * Handles POST /api/bookings/:id/sessions/:sessionId/cancel
   */
  async cancelBookingSession(request: FastifyRequest, reply: FastifyReply) {
    try {
      const parsedParams = bookingSessionIdParamSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid booking or session ID parameter',
          details: parsedParams.error.flatten().fieldErrors,
        });
      }

      const userId = request.user!.id;
      const updated = await bookingService.cancelSession(
        parsedParams.data.id,
        parsedParams.data.sessionId,
        userId
      );

      return reply.code(200).send(updated);
    } catch (err: unknown) {
      return this.handleError(err, request, reply);
    }
  }

  /**
   * Centralized controller error handler
   */
  private handleError(err: unknown, request: FastifyRequest, reply: FastifyReply) {
    if (err instanceof AppError) {
      return reply.code(err.statusCode).send({
        error: err.code,
        message: err.message,
        details: err.details,
      });
    }

    request.log.error(err, 'Unhandled error in booking controller');
    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred while processing the request',
    });
  }
}

export const bookingController = new BookingController();
