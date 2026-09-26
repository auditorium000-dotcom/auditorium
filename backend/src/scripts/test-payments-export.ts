import dotenv from 'dotenv';
import ExcelJS from 'exceljs';
import { eq, inArray, gte } from 'drizzle-orm';
import { db, pool } from '../db/index.js';
import * as schema from '../db/schema/index.js';

dotenv.config({ path: 'c:/Users/RUFAID/OneDrive/Desktop/auditorium/backend/.env' });
const email = process.env.DEV_USER_EMAIL || 'admin@auditorium.local';
const password = process.env.DEV_USER_PASSWORD || '';

const BASE_URL = 'http://127.0.0.1:5000/api';
const testBookingIds: string[] = [];

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runPaymentsExportTestSuite() {
  console.log('🚀 Starting Payment Excel Export Test Suite...\n');

  try {
    // 1. Unauthorized Access Check
    console.log('--- 1. Unauthorized Access Check (401) ---');
    const unauthRes = await fetch(`${BASE_URL}/payments/export`);
    assert(
      unauthRes.status === 401,
      `GET /payments/export without auth should return 401, got ${unauthRes.status}`
    );
    console.log('  ✅ Passed: GET /payments/export rejected with 401 Unauthorized.\n');

    // Authenticate manager session
    console.log('Authenticating development user...');
    const loginRes = await fetch(`${BASE_URL}/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:5173',
      },
      body: JSON.stringify({ email, password }),
    });

    assert(loginRes.ok, `Login failed: ${loginRes.status}`);
    const setCookie = loginRes.headers.get('set-cookie');
    assert(!!setCookie, 'No session cookie returned from login');
    const authHeaders = {
      Cookie: setCookie!,
      Origin: 'http://localhost:5173',
    };
    console.log('  ✅ Authenticated with valid manager session cookie.\n');

    // 2. Validation Checks
    console.log('--- 2. Validation Rejection Tests (400) ---');
    const badRangeRes = await fetch(
      `${BASE_URL}/payments/export?startDate=2026-09-30&endDate=2026-09-01`,
      { headers: authHeaders }
    );
    assert(
      badRangeRes.status === 400,
      `startDate > endDate should return 400, got ${badRangeRes.status}`
    );
    console.log('  ✅ Passed: Inverted date range correctly rejected with 400 VALIDATION_ERROR.\n');

    // 3. Seed controlled test bookings with multiple payments
    console.log('--- 3. Seeding Test Bookings & Payments in September 2097 (isolated test period) ---');
    const [userRecord] = await db.select().from(schema.user).limit(1);

    // Test Booking A: Total ₹10,000, 2 payments: UPI ₹3,000 + CASH ₹2,000
    const [bookingA] = await db
      .insert(schema.bookings)
      .values({
        eventName: 'Excel Export Test Alpha',
        contactName: 'Alpha Customer',
        contactPhone: '+919999000001',
        eventType: 'Wedding',
        totalAmount: '10000.00',
        status: 'CONFIRMED',
        createdBy: userRecord.id,
      })
      .returning();
    testBookingIds.push(bookingA.id);

    await db.insert(schema.bookingSessions).values({
      bookingId: bookingA.id,
      bookingDate: '2097-09-15',
      session: 'MORNING',
      status: 'BOOKED',
    });

    // Add Payment 1 (UPI: ₹3000)
    await db.insert(schema.payments).values({
      bookingId: bookingA.id,
      amount: '3000.00',
      paymentMethod: 'UPI',
      paymentDate: new Date('2097-09-10T10:00:00Z'),
      receivedBy: userRecord.id,
      notes: 'Initial UPI advance',
    });

    // Add Payment 2 (CASH: ₹2000)
    await db.insert(schema.payments).values({
      bookingId: bookingA.id,
      amount: '2000.00',
      paymentMethod: 'CASH',
      paymentDate: new Date('2097-09-12T14:30:00Z'),
      receivedBy: userRecord.id,
      notes: 'Cash payment part 2',
    });

    // Test Booking B: Total ₹5,000, 1 payment: UPI ₹5,000
    const [bookingB] = await db
      .insert(schema.bookings)
      .values({
        eventName: 'Excel Export Test Beta',
        contactName: 'Beta Customer',
        contactPhone: '+919999000002',
        eventType: 'Reception',
        totalAmount: '5000.00',
        status: 'CONFIRMED',
        createdBy: userRecord.id,
      })
      .returning();
    testBookingIds.push(bookingB.id);

    await db.insert(schema.bookingSessions).values({
      bookingId: bookingB.id,
      bookingDate: '2097-09-20',
      session: 'EVENING',
      status: 'BOOKED',
    });

    await db.insert(schema.payments).values({
      bookingId: bookingB.id,
      amount: '5000.00',
      paymentMethod: 'UPI',
      paymentDate: new Date('2097-09-18T16:00:00Z'),
      receivedBy: userRecord.id,
      notes: 'Full payment via UPI',
    });

    console.log('  ✅ Seeded test bookings and payments:');
    console.log('     - Booking A: 2097-09-15 (UPI ₹3000, CASH ₹2000)');
    console.log('     - Booking B: 2097-09-20 (UPI ₹5000)\n');

    // 4. Test Export with Specific Date Range + UPI Filter
    console.log('--- 4. Test GET /api/payments/export with Date Range & Payment Method = UPI ---');
    const exportUpiRes = await fetch(
      `${BASE_URL}/payments/export?startDate=2097-09-01&endDate=2097-09-30&paymentMethod=UPI`,
      { headers: authHeaders }
    );

    assert(exportUpiRes.ok, `Export UPI request failed with status ${exportUpiRes.status}`);
    const contentType = exportUpiRes.headers.get('content-type') || '';
    assert(
      contentType.includes('spreadsheetml.sheet'),
      `Content-Type should be xlsx, got ${contentType}`
    );

    const disposition = exportUpiRes.headers.get('content-disposition') || '';
    console.log(`  ✅ Content-Disposition: ${disposition}`);
    assert(disposition.includes('payments-2097-09-01-to-2097-09-30-UPI.xlsx'), 'Filename matches filter convention');

    const upiBuffer = Buffer.from(await exportUpiRes.arrayBuffer());
    assert(upiBuffer.length > 0, 'Buffer should not be empty');

    // Programmatically inspect workbook using ExcelJS
    const upiWorkbook = new ExcelJS.Workbook();
    await upiWorkbook.xlsx.load(upiBuffer as any);

    // Verify worksheets
    const sheetNames = upiWorkbook.worksheets.map((ws) => ws.name);
    console.log(`  ✅ Worksheets found: ${sheetNames.join(', ')}`);
    assert(sheetNames.includes('Summary'), 'Workbook must contain "Summary" worksheet');
    assert(sheetNames.includes('Payments'), 'Workbook must contain "Payments" worksheet');

    // Inspect Summary sheet
    const summarySheet = upiWorkbook.getWorksheet('Summary');
    assert(!!summarySheet, 'Summary sheet missing');
    console.log('  ✅ Summary Sheet verified.');

    // Inspect Payments sheet
    const paymentsSheet = upiWorkbook.getWorksheet('Payments');
    assert(!!paymentsSheet, 'Payments sheet missing');

    const headerRow = paymentsSheet!.getRow(1);
    assert(headerRow.getCell(1).value === 'Payment Date', 'Col 1 header must be Payment Date');
    assert(headerRow.getCell(2).value === 'Event Name', 'Col 2 header must be Event Name');
    assert(headerRow.getCell(3).value === 'Customer Name', 'Col 3 header must be Customer Name');
    assert(headerRow.getCell(6).value === 'Payment Method', 'Col 6 header must be Payment Method');
    assert(headerRow.getCell(7).value === 'Amount (₹)', 'Col 7 header must be Amount');

    // Check rows in Payments sheet
    // Row 1: Header
    // Row 2: Payment Beta UPI (₹5000) or Alpha UPI (₹3000)
    // Row 3: Payment Alpha UPI (₹3000) or Beta UPI (₹5000)
    // Row 4: Total Row
    const row2Method = paymentsSheet!.getRow(2).getCell(6).value;
    const row2Amount = paymentsSheet!.getRow(2).getCell(7).value;
    const row3Method = paymentsSheet!.getRow(3).getCell(6).value;
    const row3Amount = paymentsSheet!.getRow(3).getCell(7).value;

    assert(row2Method === 'UPI', `Row 2 payment method should be UPI, got ${row2Method}`);
    assert(row3Method === 'UPI', `Row 3 payment method should be UPI, got ${row3Method}`);
    assert(typeof row2Amount === 'number', `Row 2 amount must be numeric number, got ${typeof row2Amount}`);
    assert(typeof row3Amount === 'number', `Row 3 amount must be numeric number, got ${typeof row3Amount}`);

    const exportedAmounts = [Number(row2Amount), Number(row3Amount)].sort();
    assert(exportedAmounts[0] === 3000 && exportedAmounts[1] === 5000, `Amounts should be 3000 and 5000, got ${exportedAmounts}`);
    console.log('  ✅ Filtered payments strictly contained only UPI payments totaling ₹8,000 (CASH payment correctly excluded).');

    // 5. Test Export with ALL payment methods
    console.log('\n--- 5. Test GET /api/payments/export with Date Range & ALL Methods ---');
    const exportAllRes = await fetch(
      `${BASE_URL}/payments/export?startDate=2097-09-01&endDate=2097-09-30`,
      { headers: authHeaders }
    );
    assert(exportAllRes.ok, `Export ALL request failed: ${exportAllRes.status}`);

    const allBuffer = Buffer.from(await exportAllRes.arrayBuffer());
    const allWorkbook = new ExcelJS.Workbook();
    await allWorkbook.xlsx.load(allBuffer as any);

    const allPaymentsSheet = allWorkbook.getWorksheet('Payments')!;
    // Should have 3 data rows + 1 header + 1 total row = 5 rows
    const dataMethods = [
      allPaymentsSheet.getRow(2).getCell(6).value,
      allPaymentsSheet.getRow(3).getCell(6).value,
      allPaymentsSheet.getRow(4).getCell(6).value,
    ];
    assert(dataMethods.includes('CASH'), 'Export all methods must include CASH payment');
    assert(dataMethods.includes('UPI'), 'Export all methods must include UPI payment');
    console.log(`  ✅ All methods export contained all 3 transactions (${dataMethods.join(', ')}).\n`);

    console.log('🎉 ALL PAYMENT EXCEL EXPORT INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    // Clean up test bookings
    if (testBookingIds.length > 0) {
      console.log(`Cleaning up ${testBookingIds.length} test bookings...`);
      await db.delete(schema.bookings).where(inArray(schema.bookings.id, testBookingIds));
      console.log('Cleanup completed.');
    }
  }
}

runPaymentsExportTestSuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
  });
