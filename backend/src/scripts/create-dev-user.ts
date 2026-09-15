import { eq } from 'drizzle-orm';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db, pool } from '../db/index.js';
import * as schema from '../db/schema/index.js';
import { config } from '../config/index.js';

async function createDevUser() {
  const email = process.env.DEV_USER_EMAIL;
  const password = process.env.DEV_USER_PASSWORD;
  const name = process.env.DEV_USER_NAME || 'Auditorium Manager';

  if (!email || !password) {
    console.error('❌ Error: DEV_USER_EMAIL and DEV_USER_PASSWORD must be set in backend/.env');
    process.exit(1);
  }

  try {
    // 1. Check if user already exists
    const existingUsers = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, email.toLowerCase().trim()))
      .limit(1);

    if (existingUsers.length > 0) {
      console.log(`ℹ️ Development user already exists (${email.toLowerCase().trim()}). Skipping creation.`);
      await pool.end();
      process.exit(0);
    }

    // 2. Initialize server-side setup auth instance to hash password and create account
    const serverAuth = betterAuth({
      database: drizzleAdapter(db, { provider: 'pg', schema }),
      secret: config.BETTER_AUTH_SECRET,
      baseURL: config.BETTER_AUTH_URL,
      emailAndPassword: {
        enabled: true,
      },
    });

    const result = await serverAuth.api.signUpEmail({
      body: {
        email: email.toLowerCase().trim(),
        password,
        name: name.trim(),
      },
    });

    if (!result || !result.user) {
      throw new Error('Failed to create development user via Better Auth');
    }

    console.log(`✅ Development user successfully created! (ID: ${result.user.id}, Email: ${result.user.email})`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error creating development user';
    console.error(`❌ Error during development user setup: ${message}`);
    process.exit(1);
  } finally {
    try {
      await pool.end();
    } catch {
      // Ignore cleanup error on exit
    }
  }
}

createDevUser();
