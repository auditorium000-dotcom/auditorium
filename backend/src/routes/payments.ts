import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { paymentController } from '../controllers/payments.js';

export const paymentRoutes: FastifyPluginAsync = async (fastify) => {
  // Enforce authentication on all payment routes
  fastify.addHook('preHandler', requireAuth);

  // GET /api/bookings/:id/payments - Get all payments for a booking
  fastify.get('/bookings/:id/payments', (req, reply) => paymentController.getPayments(req, reply));

  // POST /api/bookings/:id/payments - Record a payment for a booking
  fastify.post('/bookings/:id/payments', (req, reply) => paymentController.createPayment(req, reply));
};
