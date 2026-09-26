import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { paymentController } from '../controllers/payments.js';

export const paymentRoutes: FastifyPluginAsync = async (fastify) => {
  // Enforce authentication on all payment routes
  fastify.addHook('preHandler', requireAuth);

  // GET /api/payments/export - Export filtered payments to formatted Excel XLSX workbook
  fastify.get('/payments/export', (req, reply) => paymentController.exportPayments(req, reply));

  // GET /api/payments - Global search, filter, sort, and pagination for payments
  fastify.get('/payments', (req, reply) => paymentController.getGlobalPayments(req, reply));

  // GET /api/bookings/:id/payments - Get all payments for a booking
  fastify.get('/bookings/:id/payments', (req, reply) => paymentController.getPayments(req, reply));

  // POST /api/bookings/:id/payments - Record a payment for a booking
  fastify.post('/bookings/:id/payments', (req, reply) => paymentController.createPayment(req, reply));
};
