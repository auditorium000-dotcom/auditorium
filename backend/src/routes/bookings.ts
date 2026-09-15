import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { bookingController } from '../controllers/bookings.js';

export const bookingRoutes: FastifyPluginAsync = async (fastify) => {
  // Enforce authentication on all booking routes
  fastify.addHook('preHandler', requireAuth);

  // POST /api/bookings - Create a new booking
  fastify.post('/bookings', (req, reply) => bookingController.createBooking(req, reply));

  // GET /api/bookings - List bookings with optional filters
  fastify.get('/bookings', (req, reply) => bookingController.getBookings(req, reply));

  // GET /api/bookings/:id - Get single booking details
  fastify.get('/bookings/:id', (req, reply) => bookingController.getBookingById(req, reply));

  // PATCH /api/bookings/:id - Update booking basic details
  fastify.patch('/bookings/:id', (req, reply) => bookingController.updateBooking(req, reply));

  // POST /api/bookings/:id/cancel - Cancel a booking and release active sessions
  fastify.post('/bookings/:id/cancel', (req, reply) => bookingController.cancelBooking(req, reply));

  // POST /api/bookings/:id/sessions/:sessionId/cancel - Cancel a specific session timeslot
  fastify.post('/bookings/:id/sessions/:sessionId/cancel', (req, reply) =>
    bookingController.cancelBookingSession(req, reply)
  );
};
