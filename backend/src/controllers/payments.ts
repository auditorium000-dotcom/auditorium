import type { FastifyRequest, FastifyReply } from 'fastify';
import { paymentService } from '../services/payments.js';
import { createPaymentSchema, bookingIdParamSchema } from '../schemas/payments.js';
import { AppError } from '../utils/errors.js';

export class PaymentController {
  /**
   * Handles POST /api/bookings/:id/payments
   */
  async createPayment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const parsedParams = bookingIdParamSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid booking ID parameter',
          details: parsedParams.error.flatten().fieldErrors,
        });
      }

      const parsedBody = createPaymentSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid payment data provided',
          details: parsedBody.error.flatten().fieldErrors,
        });
      }

      const userId = request.user!.id;
      const payment = await paymentService.createPayment(
        parsedParams.data.id,
        parsedBody.data,
        userId
      );

      return reply.code(201).send(payment);
    } catch (err: unknown) {
      return this.handleError(err, request, reply);
    }
  }

  /**
   * Handles GET /api/bookings/:id/payments
   */
  async getPayments(request: FastifyRequest, reply: FastifyReply) {
    try {
      const parsedParams = bookingIdParamSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid booking ID parameter',
          details: parsedParams.error.flatten().fieldErrors,
        });
      }

      const payments = await paymentService.getPaymentsByBookingId(parsedParams.data.id);
      return reply.code(200).send(payments);
    } catch (err: unknown) {
      return this.handleError(err, request, reply);
    }
  }

  /**
   * Centralized error handler
   */
  private handleError(err: unknown, request: FastifyRequest, reply: FastifyReply) {
    if (err instanceof AppError) {
      return reply.code(err.statusCode).send({
        error: err.code,
        message: err.message,
        details: err.details,
      });
    }

    request.log.error(err, 'Unhandled error in payment controller');
    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred while processing the payment',
    });
  }
}

export const paymentController = new PaymentController();
