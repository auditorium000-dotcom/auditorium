import type { FastifyRequest, FastifyReply } from 'fastify';
import { analyticsService } from '../services/analytics.js';
import {
  dashboardAnalyticsQuerySchema,
  queryMonthlyAnalyticsSchema,
} from '../schemas/analytics.js';
import { AppError } from '../utils/errors.js';

export class AnalyticsController {
  /**
   * Handles GET /api/analytics/dashboard
   */
  async getDashboardAnalytics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const parsedQuery = dashboardAnalyticsQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid query parameters for dashboard analytics',
          details: parsedQuery.error.flatten().fieldErrors,
        });
      }

      const summary = await analyticsService.getDashboardAnalytics(parsedQuery.data);
      return reply.code(200).send(summary);
    } catch (err: unknown) {
      return this.handleError(err, request, reply);
    }
  }

  /**
   * Handles GET /api/analytics/monthly
   */
  async getMonthlyAnalytics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const parsedQuery = queryMonthlyAnalyticsSchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid query parameters for analytics',
          details: parsedQuery.error.flatten().fieldErrors,
        });
      }

      const year = parsedQuery.data.year || new Date().getFullYear();
      const stats = await analyticsService.getMonthlyAnalytics(year);

      return reply.code(200).send(stats);
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

    request.log.error(err, 'Unhandled error in analytics controller');
    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred while generating analytics',
    });
  }
}

export const analyticsController = new AnalyticsController();
