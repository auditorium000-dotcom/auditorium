import './utils/dns-fallback.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { config } from './config/index.js';
import { appRoutes } from './routes/index.js';

export async function buildServer(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: config.NODE_ENV === 'development' ? 'info' : 'warn',
    },
  });

  // Parse allowed CORS origins (support comma-separated list)
  const rawOrigins = [
    config.CLIENT_ORIGIN,
    config.CLIENT_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].filter(Boolean) as string[];
  const allowedOrigins = Array.from(
    new Set(
      rawOrigins.flatMap((o) => o.split(',').map((s) => s.trim())).filter((s) => s.length > 0)
    )
  );

  // Register CORS
  await fastify.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Safely support empty JSON bodies without throwing FST_ERR_CTP_EMPTY_JSON_BODY
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    try {
      const json = typeof body === 'string' && body.trim().length > 0 ? JSON.parse(body) : {};
      done(null, json);
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  // Global Error Handler to sanitize 500 responses in production
  fastify.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
    request.log.error(error);
    const statusCode = error.statusCode || 500;
    if (statusCode < 500) {
      return reply.status(statusCode).send({
        error: error.name || 'CLIENT_ERROR',
        message: error.message,
      });
    }
    return reply.status(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message:
        config.NODE_ENV === 'production'
          ? 'An unexpected error occurred while processing the request'
          : error.message || 'Internal Server Error',
    });
  });

  // Register API Routes
  await fastify.register(appRoutes, { prefix: '/api' });

  return fastify;
}

// Cached Fastify instance promise for serverless cold-start efficiency
let appPromise: Promise<FastifyInstance> | null = null;

export async function getApp(): Promise<FastifyInstance> {
  if (!appPromise) {
    appPromise = (async () => {
      const server = await buildServer();
      await server.ready();
      return server;
    })();
  }
  return appPromise;
}

// Default export handler for Vercel Serverless Function invocation
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const server = await getApp();
  server.server.emit('request', req, res);
}

async function start() {
  const server = await buildServer();

  try {
    await server.listen({ port: config.PORT, host: config.HOST });
    server.log.info(`🚀 Auditorium Booking Backend running at http://${config.HOST}:${config.PORT}`);
    server.log.info(`🩺 Health check available at http://${config.HOST}:${config.PORT}/api/health`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const signals = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      server.log.info(`Received ${signal}, shutting down gracefully...`);
      await server.close();
      process.exit(0);
    });
  }
}

// Only start the server if executed directly as the main process and NOT running under Vercel serverless
const isDirectExecution =
  typeof process.argv[1] === 'string' &&
  (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/')) ||
    process.argv[1].replace(/\\/g, '/').endsWith('src/server.ts') ||
    process.argv[1].replace(/\\/g, '/').endsWith('dist/server.js'));

if (isDirectExecution && !process.env.VERCEL) {
  start();
}
