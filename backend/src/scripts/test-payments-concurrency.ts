import { eq, inArray } from 'drizzle-orm';
import { db, pool } from '../db/index.js';
import * as schema from '../db/schema/index.js';
import { paymentService } from '../services/payments.js';
import { bookingService } from '../services/bookings.js';
import { ConflictError } from '../utils/errors.js';

async function runPaymentConcurrencyTest() {
  console.log('🧪 Starting Payment Concurrency & Overpayment Protection Test on Neon DB...\n');

  // Find user
  const [user] = await db.select().from(schema.user).limit(1);
  if (!user) {
    throw new Error('No user found in database');
  }

  const testDate = '2099-11-20';
  const createdBookingIds: string[] = [];

  try {
    // 1. Create a test booking with total ₹50,000
    const booking = await bookingService.createBooking(
      {
        eventName: 'Payment Race Condition Test',
        contactName: 'Payment Tester',
        contactPhone: '9888877777',
        eventType: 'Conference',
        totalAmount: 50000,
        sessions: [{ date: testDate, session: 'MORNING' }],
      },
      user.id
    );
    createdBookingIds.push(booking.id);
    console.log(`✅ Created test booking ${booking.id} with Total: ₹50,000`);

    // 2. Add an initial payment of ₹30,000
    const p1 = await paymentService.createPayment(
      booking.id,
      {
        amount: 30000,
        paymentMethod: 'UPI',
        notes: 'Initial deposit',
      },
      user.id
    );
    console.log(`✅ Recorded initial payment of ₹${p1.amount}. Outstanding balance is now ₹20,000.`);

    // 3. Launch TWO simultaneous payment requests of ₹20,000 each (Total would be ₹70,000 if both succeeded)
    console.log('\n⚡ Launching 2 simultaneous payment requests of ₹20,000 each for remaining balance ₹20,000...');

    const req1 = paymentService.createPayment(
      booking.id,
      {
        amount: 20000,
        paymentMethod: 'BANK_TRANSFER',
        notes: 'Concurrent payment A',
      },
      user.id
    );

    const req2 = paymentService.createPayment(
      booking.id,
      {
        amount: 20000,
        paymentMethod: 'CASH',
        notes: 'Concurrent payment B',
      },
      user.id
    );

    const results = await Promise.allSettled([req1, req2]);

    let successCount = 0;
    let conflictCount = 0;
    let otherErrors = 0;

    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      const name = i === 0 ? 'Payment Req 1' : 'Payment Req 2';
      if (res.status === 'fulfilled') {
        successCount++;
        console.log(`  ✅ ${name}: Succeeded (Recorded ₹${res.value.amount})`);
      } else {
        const error = res.reason;
        if (error instanceof ConflictError && error.code === 'EXCEEDS_BALANCE') {
          conflictCount++;
          console.log(`  🛡️ ${name}: Successfully Blocked by Row Lock (409 Conflict: ${error.message})`);
        } else {
          otherErrors++;
          console.error(`  ❌ ${name}: Unexpected error:`, error);
        }
      }
    }

    console.log('\n📊 Payment Concurrency Summary:');
    console.log(`  - Total Concurrent Requests: 2`);
    console.log(`  - Successful: ${successCount}`);
    console.log(`  - Blocked (Overpayment Prevention): ${conflictCount}`);
    console.log(`  - Unexpected Failures: ${otherErrors}`);

    if (successCount !== 1 || conflictCount !== 1 || otherErrors !== 0) {
      throw new Error(`Payment concurrency test failed! Expected 1 success and 1 blocked conflict.`);
    }

    // 4. Verify in database that total paid is EXACTLY ₹50,000 and NOT ₹70,000
    const allPayments = await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.bookingId, booking.id));

    const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    console.log(`🔍 Verified Total in DB: ₹${totalPaid.toFixed(2)} (Expected: ₹50000.00)`);
    if (totalPaid !== 50000) {
      throw new Error(`DB overpayment detected! Total paid was ₹${totalPaid}`);
    }

    // 5. Try adding another payment to a fully paid booking
    console.log('\nTesting payment on fully paid booking:');
    try {
      await paymentService.createPayment(
        booking.id,
        {
          amount: 500,
          paymentMethod: 'CASH',
        },
        user.id
      );
      throw new Error('Should have failed to pay on fully paid booking');
    } catch (err) {
      if (err instanceof ConflictError && err.code === 'EXCEEDS_BALANCE') {
        console.log('  ✅ Passed: Rejected payment on fully paid booking (409 EXCEEDS_BALANCE).');
      } else {
        throw err;
      }
    }

    // 6. Test payment on cancelled booking
    console.log('\nTesting payment on cancelled booking:');
    await bookingService.cancelBooking(booking.id, user.id);
    try {
      await paymentService.createPayment(
        booking.id,
        {
          amount: 1000,
          paymentMethod: 'CASH',
        },
        user.id
      );
      throw new Error('Should have failed to pay on cancelled booking');
    } catch (err) {
      if (err instanceof ConflictError && err.code === 'BOOKING_CANCELLED') {
        console.log('  ✅ Passed: Rejected payment on cancelled booking (409 BOOKING_CANCELLED).');
      } else {
        throw err;
      }
    }

    // 7. Verify Audit Logs for Payment
    const logs = await db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.bookingId, booking.id));
    const paymentLogs = logs.filter((l) => l.action === 'PAYMENT_RECORDED');
    console.log(`\nAudit Logs: Found ${paymentLogs.length} PAYMENT_RECORDED entries.`);
    if (paymentLogs.length !== 2) {
      throw new Error(`Expected 2 PAYMENT_RECORDED audit logs, found ${paymentLogs.length}`);
    }
    console.log('  ✅ Passed: All payments correctly logged in audit trail.');

    console.log('\n🎉 ALL PAYMENT CONCURRENCY & INTEGRITY TESTS PASSED 100%!\n');
  } finally {
    if (createdBookingIds.length > 0) {
      console.log('🧹 Cleaning up test bookings and payments...');
      await db.delete(schema.bookings).where(inArray(schema.bookings.id, createdBookingIds));
      console.log('✨ Cleanup complete.');
    }
    await pool.end();
  }
}

runPaymentConcurrencyTest().catch((err) => {
  console.error('❌ Payment test error:', err);
  process.exit(1);
});
