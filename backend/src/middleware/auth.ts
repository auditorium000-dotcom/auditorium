import type { FastifyRequest, FastifyReply } from 'fastify';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth/index.js';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
    session?: AuthSession;
  }
}

/**
 * Fastify preHandler hook to enforce authentication.
 * Returns HTTP 401 if no valid Better Auth session is present.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const sessionData = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!sessionData || !sessionData.user || !sessionData.session) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required to access this resource',
      });
      return;
    }

    request.user = sessionData.user as AuthUser;
    request.session = sessionData.session as AuthSession;
  } catch (err) {
    request.log.error(err, 'Authentication verification failed');
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired authentication session',
    });
  }
}

/**
 * Fastify preHandler hook for optional authentication.
 * Attaches user/session if present without rejecting unauthenticated requests.
 */
export async function optionalAuth(request: FastifyRequest): Promise<void> {
  try {
    const sessionData = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (sessionData && sessionData.user && sessionData.session) {
      request.user = sessionData.user as AuthUser;
      request.session = sessionData.session as AuthSession;
    }
  } catch {
    // Optional auth silently ignores invalid tokens
  }
}
