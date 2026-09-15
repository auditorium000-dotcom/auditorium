import { eq, inArray } from 'drizzle-orm';
import { db, pool } from '../db/index.js';
import * as schema from '../db/schema/index.js';
import { bookingService } from '../services/bookings.js';
import { ConflictError } from '../utils/errors.js';

async function runConcurrencyTest() {
  console.log('🧪 Starting Database Concurrency & Race Condition Test on Neon PostgreSQL...\n');

  // Find or use a test user
  const [testUser] = await db.select().from(schema.user).limit(1);
  if (!testUser) {
    console.error('❌ No user found in database. Run `npm run auth:create-dev-user` first.');
    process.exit(1);
  }

  const testDate = '2099-12-31';
  const testSession = 'MORNING' as const;
  const createdBookingIds: string[] = [];

  try {
    // 0. Clean up any leftover test slots from previous runs
    const existingSessions = await db
      .select({ bookingId: schema.bookingSessions.bookingId })
      .from(schema.bookingSessions)
      .where(eq(schema.bookingSessions.bookingDate, testDate));

    if (existingSessions.length > 0) {
      const idsToDelete = existingSessions.map((s) => s.bookingId);
      await db.delete(schema.bookings).where(inArray(schema.bookings.id, idsToDelete));
    }

    console.log(`📌 Target Race Slot: Date: ${testDate}, Session: ${testSession}`);
    console.log('⚡ Launching 2 simultaneous booking transactions for the EXACT same slot...');

    const requestA = bookingService.createBooking(
      {
        eventName: 'Concurrent Test A',
        contactName: 'Tester A',
        contactPhone: '9999911111',
        eventType: 'Concurrent Stress Test',
        totalAmount: 10000,
        sessions: [{ date: testDate, session: testSession }],
      },
      testUser.id
    );

    const requestB = bookingService.createBooking(
      {
        eventName: 'Concurrent Test B',
        contactName: 'Tester B',
        contactPhone: '9999922222',
        eventType: 'Concurrent Stress Test',
        totalAmount: 10000,
        sessions: [{ date: testDate, session: testSession }],
      },
      testUser.id
    );

    const results = await Promise.allSettled([requestA, requestB]);

    let successCount = 0;
    let conflictCount = 0;
    let otherErrorCount = 0;

    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      const reqName = i === 0 ? 'Request A' : 'Request B';
      if (res.status === 'fulfilled') {
        successCount++;
        createdBookingIds.push(res.value.id);
        console.log(`  ✅ ${reqName}: Succeeded (Booking ID: ${res.value.id})`);
      } else {
        const error = res.reason;
        if (error instanceof ConflictError && error.code === 'BOOKING_CONFLICT') {
          conflictCount++;
          console.log(`  🛡️ ${reqName}: Successfully Rejected by DB Unique Constraint (409 Conflict: ${error.message})`);
        } else {
          otherErrorCount++;
          console.error(`  ❌ ${reqName}: Unexpected Error:`, error);
        }
      }
    }

    console.log('\n📊 Concurrency Test Summary:');
    console.log(`  - Total Concurrent Requests: 2`);
    console.log(`  - Successful Bookings: ${successCount}`);
    console.log(`  - Blocked Conflicts: ${conflictCount}`);
    console.log(`  - Unexpected Failures: ${otherErrorCount}`);

    if (successCount === 1 && conflictCount === 1 && otherErrorCount === 0) {
      console.log('\n🎉 PASS: Database-level partial unique index (idx_booking_sessions_unique_active) perfectly prevented double-booking under race conditions!');
    } else {
      throw new Error(`Concurrency test failed! Expected 1 success and 1 conflict, got ${successCount} successes and ${conflictCount} conflicts.`);
    }

    // Verify exactly one active session row exists in the database
    const bookedSessions = await db
      .select()
      .from(schema.bookingSessions)
      .where(eq(schema.bookingSessions.bookingDate, testDate));

    console.log(`🔍 Database State: Found ${bookedSessions.length} active session row(s) for ${testDate}.`);
    if (bookedSessions.length !== 1) {
      throw new Error(`Database consistency violation: Expected exactly 1 session row, found ${bookedSessions.length}`);
    }

  } finally {
    // Clean up test data
    if (createdBookingIds.length > 0) {
      console.log('🧹 Cleaning up test bookings and session data...');
      await db.delete(schema.bookings).where(inArray(schema.bookings.id, createdBookingIds));
      console.log('✨ Cleanup complete.');
    }
    await pool.end();
  }
}

runConcurrencyTest().catch((err) => {
  console.error('❌ Concurrency Test Fatal Error:', err.message);
  process.exit(1);
});
