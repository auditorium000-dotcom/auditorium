import readline from 'node:readline';
import { Writable } from 'node:stream';
import { eq } from 'drizzle-orm';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '../db/schema/index.js';

neonConfig.webSocketConstructor = ws;

/**
 * Prompts the operator for text input via terminal
 */
function promptText(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Prompts the operator for password input without echoing characters to terminal
 */
function promptHiddenPassword(query: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(query);

    let password = '';
    const wasRaw = process.stdin.isRaw;

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      const onData = (char: string) => {
        if (char === '\n' || char === '\r' || char === '\u0004') {
          // Enter or EOF
          process.stdin.setRawMode(wasRaw || false);
          process.stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(password.trim());
        } else if (char === '\u0003') {
          // Ctrl+C
          process.stdin.setRawMode(wasRaw || false);
          process.stdout.write('\n');
          process.exit(1);
        } else if (char === '\u0008' || char === '\x7f') {
          // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          password += char;
          process.stdout.write('*');
        }
      };

      process.stdin.on('data', onData);
    } else {
      // Non-TTY fallback (e.g. piped input)
      const mutedStream = new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      });
      const rl = readline.createInterface({
        input: process.stdin,
        output: mutedStream,
        terminal: false,
      });
      rl.question('', (answer) => {
        process.stdout.write('\n');
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

async function main() {
  const isDryRun =
    process.argv.some((arg) => arg.includes('dry-run')) ||
    process.env.DRY_RUN === 'true' ||
    process.env.DRY_RUN === '1';

  console.log('================================================================');
  console.log(' AUDITORIUM PRODUCTION USER PROVISIONING UTILITY');
  console.log(` Mode: ${isDryRun ? '🔍 DRY RUN (Validation Only - No Users Created)' : '🚀 LIVE PROVISIONING'}`);
  console.log('================================================================\n');

  // 1. Strict Target Validation: PROD_DATABASE_URL MUST be explicitly provided
  const prodDatabaseUrl = process.env.PROD_DATABASE_URL;
  if (!prodDatabaseUrl || prodDatabaseUrl.trim().length === 0) {
    console.error('❌ FATAL ERROR: PROD_DATABASE_URL environment variable is required.');
    console.error('   This utility strictly refuses to use development DATABASE_URL.');
    console.error('   Usage: PROD_DATABASE_URL="<url>" BETTER_AUTH_SECRET="<secret>" npm run auth:provision-prod-users\n');
    process.exit(1);
  }

  // 2. Production Better Auth configuration validation
  const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
  if (!betterAuthSecret || betterAuthSecret.length < 16) {
    console.error('❌ FATAL ERROR: BETTER_AUTH_SECRET must be set and at least 16 characters.');
    process.exit(1);
  }

  const betterAuthUrl = process.env.BETTER_AUTH_URL || 'http://localhost:5000';

  // 3. Connect to target production database pool
  const pool = new Pool({ connectionString: prodDatabaseUrl });
  const db = drizzle({ client: pool, schema });

  try {
    const client = await pool.connect();
    let currentDbName = '';

    try {
      // 4. DATABASE GUARDRAIL: Verify current database name is strictly auditorium_production
      const dbRes = await client.query('SELECT current_database();');
      currentDbName = dbRes.rows[0]?.current_database || '';

      if (currentDbName !== 'auditorium_production') {
        console.error(`❌ GUARDRAIL TRIGGERED: Target database is "${currentDbName}", NOT "auditorium_production".`);
        console.error('   Aborting immediately to prevent writing production users to the wrong database.\n');
        process.exit(1);
      }

      console.log(`✅ Target Database Verified: "${currentDbName}"`);

      // 5. Verify required application tables exist in production
      const tablesRes = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public';
      `);
      const existingTables = tablesRes.rows.map((r: any) => r.table_name);
      const requiredTables = ['user', 'account', 'session', 'bookings'];
      const missingTables = requiredTables.filter((t) => !existingTables.includes(t));

      if (missingTables.length > 0) {
        console.error(`❌ SCHEMA ERROR: Production database is missing tables: ${missingTables.join(', ')}`);
        console.error('   Please ensure Drizzle migrations have been applied before provisioning users.\n');
        process.exit(1);
      }

      console.log(`✅ Production Schema Verified: All required authentication and application tables exist.\n`);
    } finally {
      client.release();
    }

    if (isDryRun) {
      console.log('🎉 DRY RUN COMPLETED SUCCESSFULLY:');
      console.log('   - PROD_DATABASE_URL is valid');
      console.log('   - Connected to "auditorium_production"');
      console.log('   - Production schema and Better Auth tables verified');
      console.log('   - No users were created.\n');
      return;
    }

    // 6. Initialize Server-Side Better Auth Instance
    const serverAuth = betterAuth({
      database: drizzleAdapter(db, { provider: 'pg', schema }),
      secret: betterAuthSecret,
      baseURL: betterAuthUrl,
      emailAndPassword: {
        enabled: true,
      },
    });

    // 7. Interactive Provisioning Loop
    console.log('Enter details for each authorized manager account.');
    console.log('Type "done" at the Name prompt when finished.\n');

    let createdCount = 0;
    let existingCount = 0;
    let failedCount = 0;
    let userIndex = 1;

    while (true) {
      console.log(`--- [ User #${userIndex} ] ---`);
      const name = await promptText('Manager Full Name (or "done" to finish): ');

      if (!name || name.toLowerCase() === 'done') {
        break;
      }

      const email = await promptText('Manager Email Address: ');
      if (!email || !email.includes('@')) {
        console.error('⚠️  Invalid email address. Skipping this entry.\n');
        continue;
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists
      const existing = await db
        .select()
        .from(schema.user)
        .where(eq(schema.user.email, normalizedEmail))
        .limit(1);

      if (existing.length > 0) {
        console.log(`ℹ️  User with email "${normalizedEmail}" already exists. Skipping.\n`);
        existingCount++;
        userIndex++;
        continue;
      }

      // Prompt for password with masked input
      let password = await promptHiddenPassword('Set Initial Password (min 8 characters): ');
      if (!password || password.length < 8) {
        console.error('⚠️  Password must be at least 8 characters. User not created.\n');
        failedCount++;
        userIndex++;
        continue;
      }

      try {
        const result = await serverAuth.api.signUpEmail({
          body: {
            name: name.trim(),
            email: normalizedEmail,
            password,
          },
        });

        if (!result || !result.user) {
          throw new Error('Better Auth did not return a created user object');
        }

        console.log(`✅ Successfully created user: ${name.trim()} (${normalizedEmail}) [ID: ${result.user.id.slice(0, 8)}...]\n`);
        createdCount++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`❌ Failed to create user "${normalizedEmail}": ${msg}\n`);
        failedCount++;
      } finally {
        // Clear password string reference from memory
        password = '';
      }

      userIndex++;
    }

    // 8. Provisioning Summary
    console.log('\n================================================================');
    console.log(' PRODUCTION USER PROVISIONING SUMMARY');
    console.log('================================================================');
    console.log(`   - Created:         ${createdCount}`);
    console.log(`   - Already Existed: ${existingCount}`);
    console.log(`   - Failed:          ${failedCount}`);
    console.log('================================================================\n');

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown connection error';
    console.error(`❌ Production Provisioning Error: ${msg}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
