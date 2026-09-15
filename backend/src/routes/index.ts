import type { FastifyPluginAsync } from 'fastify';
import { healthRoutes } from './health.js';
import { authRoutes } from './auth.js';
import { bookingRoutes } from './bookings.js';
import { paymentRoutes } from './payments.js';
import { analyticsRoutes } from './analytics.js';

export const appRoutes: FastifyPluginAsync = async (fastify) => {
  // API prefix routes (/api/*)
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(bookingRoutes);
  await fastify.register(paymentRoutes);
  await fastify.register(analyticsRoutes);
};



