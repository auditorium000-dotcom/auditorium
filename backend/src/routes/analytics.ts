import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { analyticsController } from '../controllers/analytics.js';

export const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  // Enforce authentication on all analytics routes
  fastify.addHook('preHandler', requireAuth);

  // GET /api/analytics/dashboard - Get aggregated KPI summary for selected period preset / date range
  fastify.get('/analytics/dashboard', (req, reply) =>
    analyticsController.getDashboardAnalytics(req, reply)
  );

  // GET /api/analytics/monthly - Get monthly booking breakdown and summary stats
  fastify.get('/analytics/monthly', (req, reply) =>
    analyticsController.getMonthlyAnalytics(req, reply)
  );
};
