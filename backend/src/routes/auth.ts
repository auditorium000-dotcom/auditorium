import type { FastifyPluginAsync } from 'fastify';
import { auth } from '../auth/index.js';
import { requireAuth } from '../middleware/auth.js';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Protected endpoint to retrieve the current authenticated user's public info
  fastify.get('/auth/me', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    return reply.code(200).send({
      id: user.id,
      name: user.name,
      email: user.email,
    });
  });

  // Catch-all route for Better Auth endpoints (/api/auth/*)
  fastify.all('/auth/*', async (request, reply) => {
    const url = new URL(request.url, `${request.protocol}://${request.hostname}`);
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          for (const v of value) headers.append(key, v);
        } else {
          headers.set(key, value);
        }
      }
    }

    const reqInit: RequestInit = {
      method: request.method,
      headers,
    };

    if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
      reqInit.body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
    }

    const req = new Request(url.toString(), reqInit);
    const response = await auth.handler(req);

    reply.status(response.status);

    // Forward Set-Cookie headers properly
    if (typeof response.headers.getSetCookie === 'function') {
      const setCookies = response.headers.getSetCookie();
      if (setCookies.length > 0) {
        reply.header('Set-Cookie', setCookies);
      }
    }

    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'set-cookie') {
        reply.header(key, value);
      }
    });

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const json = await response.json();
      return reply.send(json);
    } else {
      const text = await response.text();
      return reply.send(text);
    }
  });
};
