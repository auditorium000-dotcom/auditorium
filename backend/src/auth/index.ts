import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/index.js';
import * as schema from '../db/schema/index.js';
import { config } from '../config/index.js';

const rawOrigins = [
  config.CLIENT_ORIGIN,
  config.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean) as string[];

const trustedOrigins = Array.from(
  new Set(
    rawOrigins.flatMap((o) => o.split(',').map((s) => s.trim())).filter((s) => s.length > 0)
  )
);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  secret: config.BETTER_AUTH_SECRET,
  baseURL: config.BETTER_AUTH_URL,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // PUBLIC SIGN-UP IS EXPLICITLY DISABLED
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
});

export type Auth = typeof auth;
