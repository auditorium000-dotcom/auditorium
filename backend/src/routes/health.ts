import type { FastifyPluginAsync } from 'fastify';
import { pingDatabase } from '../db/index.js';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // Server health endpoint
  fastify.get('/health', async (_request, _reply) => {
    return {
      status: 'ok',
      service: 'auditorium-booking-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // Database connectivity health endpoint (Neon PostgreSQL)
  fastify.get('/health/db', async (_request, reply) => {
    const result = await pingDatabase();
    if (result.ok) {
      return {
        status: 'ok',
        database: 'connected',
        latencyMs: result.latencyMs,
        timestamp: new Date().toISOString(),
      };
    } else {
      reply.status(503);
      return {
        status: 'error',
        database: 'disconnected',
        message: 'Unable to connect to database',
        timestamp: new Date().toISOString(),
      };
    }
  });
};
