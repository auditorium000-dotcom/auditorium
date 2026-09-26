import dotenv from 'dotenv';
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

async function runDashboardReportingTestSuite() {
  console.log('🚀 Starting Phase 1 Dashboard & Reporting Integration Test Suite...\n');

  // Pre-cleanup any leftover test bookings
  const testSessions = await db
    .select({ bookingId: schema.bookingSessions.bookingId })
    .from(schema.bookingSessions)
    .where(gte(schema.bookingSessions.bookingDate, '2098-01-01'));
  if (testSessions.length > 0) {
    const ids = Array.from(new Set(testSessions.map((s) => s.bookingId)));
    await db.delete(schema.bookings).where(inArray(schema.bookings.id, ids));
  }

  try {
    // ==========================================
    // 1. AUTHENTICATION & UNAUTHORIZED CHECKS (401)
    // ==========================================
    console.log('--- 1. Unauthorized Access Checks (401) ---');
    const endpoints = [
      '/analytics/dashboard',
      '/payments',
      '/bookings/outstanding',
      '/backup/status',
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${BASE_URL}${ep}`);
      assert(res.status === 401, `GET ${ep} without auth should return 401, got ${res.status}`);
      console.log(`  ✅ Passed: GET ${ep} rejected with 401 Unauthorized.`);
    }

    // Authenticate manager session
    console.log('\nAuthenticating development user...');
    const loginRes = await fetch(`${BASE_URL}/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173',
      },
      body: JSON.stringify({ email, password }),
    });

    assert(loginRes.status === 200, `Login failed with status ${loginRes.status}`);
    const cookieHeaders =
      loginRes.headers.getSetCookie?.() || [loginRes.headers.get('set-cookie')].filter(Boolean);
    const sessionCookie = cookieHeaders.map((c) => (c ? c.split(';')[0] : '')).join('; ');
    const authHeaders = {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:5173',
      'Cookie': sessionCookie,
    };
    console.log('  ✅ Authenticated with valid manager session cookie.');

    // ==========================================
    // 2. VALIDATION REJECTION TESTS (400)
    // ==========================================
    console.log('\n--- 2. Validation Rejection Tests (400) ---');

    // Dashboard validation
    const invalidPreset = await fetch(`${BASE_URL}/analytics/dashboard?preset=INVALID_PRESET`, {
      headers: authHeaders,
    });
    assert(invalidPreset.status === 400, `Expected 400 for invalid preset, got ${invalidPreset.status}`);

    const missingCustomDates = await fetch(`${BASE_URL}/analytics/dashboard?preset=CUSTOM`, {
      headers: authHeaders,
    });
    assert(missingCustomDates.status === 400, `Expected 400 for CUSTOM without dates, got ${missingCustomDates.status}`);

    const invalidDateFormat = await fetch(`${BASE_URL}/analytics/dashboard?startDate=invalid-date`, {
      headers: authHeaders,
    });
    assert(invalidDateFormat.status === 400, `Expected 400 for invalid date format, got ${invalidDateFormat.status}`);

    // Payments validation
    const invalidMethod = await fetch(`${BASE_URL}/payments?paymentMethod=BITCOIN`, {
      headers: authHeaders,
    });
    assert(invalidMethod.status === 400, `Expected 400 for invalid paymentMethod, got ${invalidMethod.status}`);

    const invalidMinAmount = await fetch(`${BASE_URL}/payments?minAmount=-50`, {
      headers: authHeaders,
    });
    assert(invalidMinAmount.status === 400, `Expected 400 for negative minAmount, got ${invalidMinAmount.status}`);

    const invalidSortBy = await fetch(`${BASE_URL}/payments?sortBy=hackerField`, {
      headers: authHeaders,
    });
    assert(invalidSortBy.status === 400, `Expected 400 for invalid sortBy, got ${invalidSortBy.status}`);

    const invalidSortOrder = await fetch(`${BASE_URL}/payments?sortOrder=sideways`, {
      headers: authHeaders,
    });
    assert(invalidSortOrder.status === 400, `Expected 400 for invalid sortOrder, got ${invalidSortOrder.status}`);

    const invalidPage = await fetch(`${BASE_URL}/payments?page=0`, {
      headers: authHeaders,
    });
    assert(invalidPage.status === 400, `Expected 400 for page=0, got ${invalidPage.status}`);

    const invalidLimit = await fetch(`${BASE_URL}/payments?limit=500`, {
      headers: authHeaders,
    });
    assert(invalidLimit.status === 400, `Expected 400 for limit=500, got ${invalidLimit.status}`);

    // Outstanding bookings validation
    const invalidOutSort = await fetch(`${BASE_URL}/bookings/outstanding?sortBy=invalidColumn`, {
      headers: authHeaders,
    });
    assert(invalidOutSort.status === 400, `Expected 400 for invalid outstanding sortBy, got ${invalidOutSort.status}`);

    console.log('  ✅ Passed: All malformed query parameters correctly rejected with 400 VALIDATION_ERROR.');

    // ==========================================
    // 3. SEED TEST DATA FOR CONTROLLED VERIFICATION
    // ==========================================
    console.log('\n--- 3. Seeding Test Bookings & Payments ---');

    // Test Booking 1: Partially Paid (Confirmed, Total: 10000, Paid: 4000 via UPI + CASH, Outstanding: 6000)
    const b1Res = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        eventName: 'Test Alpha Reception',
        contactName: 'Alpha Customer',
        contactPhone: '9876500001',
        eventType: 'Wedding Reception',
        totalAmount: 10000,
        notes: 'Test booking for dashboard validation',
        sessions: [
          { date: '2098-06-15', session: 'MORNING' },
          { date: '2098-06-15', session: 'EVENING' },
        ],
      }),
    });
    assert(b1Res.status === 201, `Failed to create Booking 1, got ${b1Res.status}`);
    const b1 = await b1Res.json();
    testBookingIds.push(b1.id);

    // Payment 1 for Booking 1: ₹2500 via UPI
    const p1Res = await fetch(`${BASE_URL}/bookings/${b1.id}/payments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        amount: 2500,
        paymentMethod: 'UPI',
        paymentDate: '2098-06-10',
        notes: 'Alpha UPI advance',
      }),
    });
    assert(p1Res.status === 201, `Failed to add payment 1 to Booking 1, got ${p1Res.status}`);

    // Payment 2 for Booking 1: ₹1500 via CASH
    const p2Res = await fetch(`${BASE_URL}/bookings/${b1.id}/payments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        amount: 1500,
        paymentMethod: 'CASH',
        paymentDate: '2098-06-12',
        notes: 'Alpha Cash partial',
      }),
    });
    assert(p2Res.status === 201, `Failed to add payment 2 to Booking 1, got ${p2Res.status}`);

    // Test Booking 2: Fully Paid (Confirmed, Total: 5000, Paid: 5000 via BANK_TRANSFER, Outstanding: 0)
    const b2Res = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        eventName: 'Test Beta Corporate Seminar',
        contactName: 'Beta Customer',
        contactPhone: '9876500002',
        eventType: 'Corporate',
        totalAmount: 5000,
        sessions: [{ date: '2098-06-20', session: 'MORNING' }],
      }),
    });
    assert(b2Res.status === 201, `Failed to create Booking 2, got ${b2Res.status}`);
    const b2 = await b2Res.json();
    testBookingIds.push(b2.id);

    const p3Res = await fetch(`${BASE_URL}/bookings/${b2.id}/payments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        amount: 5000,
        paymentMethod: 'BANK_TRANSFER',
        paymentDate: '2098-06-18',
        notes: 'Beta Bank Transfer full payment',
      }),
    });
    assert(p3Res.status === 201, `Failed to add payment to Booking 2, got ${p3Res.status}`);

    // Test Booking 3: Cancelled Booking (Total: 8000, Cancelled, Paid: 0)
    const b3Res = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        eventName: 'Test Gamma Birthday (Cancelled)',
        contactName: 'Gamma Customer',
        contactPhone: '9876500003',
        eventType: 'Birthday Party',
        totalAmount: 8000,
        sessions: [{ date: '2098-06-25', session: 'EVENING' }],
      }),
    });
    assert(b3Res.status === 201, `Failed to create Booking 3, got ${b3Res.status}`);
    const b3 = await b3Res.json();
    testBookingIds.push(b3.id);

    const cancelRes = await fetch(`${BASE_URL}/bookings/${b3.id}/cancel`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert(cancelRes.status === 200, `Failed to cancel Booking 3, got ${cancelRes.status}`);

    console.log('  ✅ Seeded test bookings:');
    console.log(`     - Booking 1 (${b1.id}): Confirmed, Total ₹10000, Paid ₹4000 (UPI ₹2500 + CASH ₹1500), Outstanding ₹6000`);
    console.log(`     - Booking 2 (${b2.id}): Confirmed, Total ₹5000, Paid ₹5000 (BANK_TRANSFER), Outstanding ₹0`);
    console.log(`     - Booking 3 (${b3.id}): Cancelled, Total ₹8000`);

    // ==========================================
    // 4. DASHBOARD ANALYTICS ENDPOINT TESTS (GET /api/analytics/dashboard)
    // ==========================================
    console.log('\n--- 4. Dashboard Analytics Endpoint (GET /api/analytics/dashboard) ---');

    // 4.1 Default date range (THIS_MONTH)
    const defaultDash = await fetch(`${BASE_URL}/analytics/dashboard`, {
      headers: authHeaders,
    });
    assert(defaultDash.status === 200, `Default dashboard failed, got ${defaultDash.status}`);
    const defaultData = await defaultDash.json();
    assert(defaultData.period.preset === 'THIS_MONTH', `Expected THIS_MONTH preset, got ${defaultData.period.preset}`);
    assert(typeof defaultData.totalBookings === 'number', 'totalBookings must be a number');
    assert(typeof defaultData.confirmedBookings === 'number', 'confirmedBookings must be a number');
    assert(typeof defaultData.cancelledBookings === 'number', 'cancelledBookings must be a number');
    assert(typeof defaultData.totalBookingValue === 'number', 'totalBookingValue must be a number');
    assert(typeof defaultData.totalAmountCollected === 'number', 'totalAmountCollected must be a number');
    assert(typeof defaultData.outstandingAmount === 'number', 'outstandingAmount must be a number');
    assert(typeof defaultData.todayBookingsCount === 'number', 'todayBookingsCount must be a number');
    assert(typeof defaultData.periodRevenue === 'number', 'periodRevenue must be a number');
    assert(Array.isArray(defaultData.paymentMethodBreakdown), 'paymentMethodBreakdown must be an array');
    assert(typeof defaultData.sessionCounts.morning === 'number', 'sessionCounts.morning must be a number');
    assert(typeof defaultData.sessionCounts.evening === 'number', 'sessionCounts.evening must be a number');
    assert(typeof defaultData.sessionCounts.total === 'number', 'sessionCounts.total must be a number');
    console.log('  ✅ Passed: Default dashboard (THIS_MONTH) returns all required KPIs and breakdowns.');

    // 4.2 Test all presets: TODAY, THIS_WEEK, THIS_MONTH, LAST_MONTH, THIS_YEAR, CUSTOM
    const presets = ['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'LAST_MONTH', 'THIS_YEAR'];
    for (const preset of presets) {
      const pRes = await fetch(`${BASE_URL}/analytics/dashboard?preset=${preset}`, {
        headers: authHeaders,
      });
      assert(pRes.status === 200, `Dashboard preset ${preset} returned ${pRes.status}`);
      const pData = await pRes.json();
      assert(pData.period.preset === preset, `Expected preset ${preset}, got ${pData.period.preset}`);
      console.log(`  ✅ Passed: Preset ${preset} resolved valid date range: ${pData.period.startDate} to ${pData.period.endDate}`);
    }

    // 4.3 Custom date range covering test seed data (2098-06-01 to 2098-06-30)
    const customDash = await fetch(
      `${BASE_URL}/analytics/dashboard?preset=CUSTOM&startDate=2098-06-01&endDate=2098-06-30`,
      { headers: authHeaders }
    );
    assert(customDash.status === 200, `Custom dashboard failed, got ${customDash.status}`);
    const customData = await customDash.json();
    console.log('  Custom range (2098-06-01 to 2098-06-30) metrics:');
    console.log(`     Total Bookings: ${customData.totalBookings} (Confirmed: ${customData.confirmedBookings}, Cancelled: ${customData.cancelledBookings})`);
    console.log(`     Total Booking Value: ₹${customData.totalBookingValue}`);
    console.log(`     Total Amount Collected: ₹${customData.totalAmountCollected}`);
    console.log(`     Outstanding Amount: ₹${customData.outstandingAmount}`);
    console.log(`     Session Counts: Morning ${customData.sessionCounts.morning}, Evening ${customData.sessionCounts.evening}, Total ${customData.sessionCounts.total}`);

    assert(customData.totalBookings === 3, `Expected 3 total bookings, got ${customData.totalBookings}`);
    assert(customData.confirmedBookings === 2, `Expected 2 confirmed bookings, got ${customData.confirmedBookings}`);
    assert(customData.cancelledBookings === 1, `Expected 1 cancelled booking, got ${customData.cancelledBookings}`);
    assert(customData.totalBookingValue === 15000, `Expected ₹15000 total booking value, got ${customData.totalBookingValue}`);
    assert(customData.totalAmountCollected === 9000, `Expected ₹9000 total collected, got ${customData.totalAmountCollected}`);
    assert(customData.outstandingAmount === 6000, `Expected ₹6000 outstanding amount, got ${customData.outstandingAmount}`);
    assert(customData.sessionCounts.morning === 2, `Expected 2 morning sessions, got ${customData.sessionCounts.morning}`);
    assert(customData.sessionCounts.evening === 1, `Expected 1 evening session (active), got ${customData.sessionCounts.evening}`);

    // Verify payment method breakdown
    const upiBreakdown = customData.paymentMethodBreakdown.find((b: any) => b.method === 'UPI');
    const cashBreakdown = customData.paymentMethodBreakdown.find((b: any) => b.method === 'CASH');
    const bankBreakdown = customData.paymentMethodBreakdown.find((b: any) => b.method === 'BANK_TRANSFER');
    assert(upiBreakdown?.amount === 2500, `Expected UPI ₹2500, got ${upiBreakdown?.amount}`);
    assert(cashBreakdown?.amount === 1500, `Expected CASH ₹1500, got ${cashBreakdown?.amount}`);
    assert(bankBreakdown?.amount === 5000, `Expected BANK_TRANSFER ₹5000, got ${bankBreakdown?.amount}`);
    console.log('  ✅ Passed: Dashboard aggregation matches exact SQL values for test period.');

    // ==========================================
    // 5. GLOBAL PAYMENTS ENDPOINT (GET /api/payments)
    // ==========================================
    console.log('\n--- 5. Global Payments Endpoint (GET /api/payments) ---');

    // 5.1 UPI Filtering
    const upiRes = await fetch(`${BASE_URL}/payments?paymentMethod=UPI&startDate=2098-06-01&endDate=2098-06-30`, {
      headers: authHeaders,
    });
    assert(upiRes.status === 200, `UPI filter failed, got ${upiRes.status}`);
    const upiData = await upiRes.json();
    assert(upiData.payments.every((p: any) => p.paymentMethod === 'UPI'), 'All payments must be UPI');
    assert(upiData.summary.totalAmount === 2500, `Expected ₹2500 UPI total, got ${upiData.summary.totalAmount}`);
    console.log(`  ✅ Passed: UPI filtering returned ${upiData.payments.length} items totaling ₹${upiData.summary.totalAmount}.`);

    // 5.2 CASH Filtering
    const cashRes = await fetch(`${BASE_URL}/payments?paymentMethod=CASH&startDate=2098-06-01&endDate=2098-06-30`, {
      headers: authHeaders,
    });
    assert(cashRes.status === 200, `CASH filter failed, got ${cashRes.status}`);
    const cashData = await cashRes.json();
    assert(cashData.payments.every((p: any) => p.paymentMethod === 'CASH'), 'All payments must be CASH');
    assert(cashData.summary.totalAmount === 1500, `Expected ₹1500 CASH total, got ${cashData.summary.totalAmount}`);
    console.log(`  ✅ Passed: CASH filtering returned ${cashData.payments.length} items totaling ₹${cashData.summary.totalAmount}.`);

    // 5.3 Amount Range Filtering (minAmount=2000, maxAmount=6000)
    const amountRangeRes = await fetch(
      `${BASE_URL}/payments?minAmount=2000&maxAmount=6000&startDate=2098-06-01&endDate=2098-06-30`,
      { headers: authHeaders }
    );
    assert(amountRangeRes.status === 200, `Amount range filter failed, got ${amountRangeRes.status}`);
    const amountRangeData = await amountRangeRes.json();
    assert(
      amountRangeData.payments.every((p: any) => parseFloat(p.amount) >= 2000 && parseFloat(p.amount) <= 6000),
      'All payments must be in amount range 2000-6000'
    );
    assert(amountRangeData.payments.length === 2, `Expected 2 payments (₹2500 and ₹5000), got ${amountRangeData.payments.length}`);
    console.log(`  ✅ Passed: Amount range filtering returned ${amountRangeData.payments.length} matching payments.`);

    // 5.4 Search by Contact Name / Event Name / Notes
    const searchRes = await fetch(`${BASE_URL}/payments?search=Beta%20Customer`, {
      headers: authHeaders,
    });
    assert(searchRes.status === 200, `Search failed, got ${searchRes.status}`);
    const searchData = await searchRes.json();
    assert(searchData.payments.length >= 1, 'Search should find Beta Customer payment');
    assert(searchData.payments[0].booking.contactName === 'Beta Customer', 'Search matched correct booking');
    console.log(`  ✅ Passed: Search by customer name matched payment for "${searchData.payments[0].booking.contactName}".`);

    // 5.5 Sorting: amount asc vs desc
    const sortAscRes = await fetch(
      `${BASE_URL}/payments?startDate=2098-06-01&endDate=2098-06-30&sortBy=amount&sortOrder=asc`,
      { headers: authHeaders }
    );
    const sortAscData = await sortAscRes.json();
    const amountsAsc = sortAscData.payments.map((p: any) => parseFloat(p.amount));
    assert(amountsAsc[0] <= amountsAsc[amountsAsc.length - 1], 'Amounts must be ascending');

    const sortDescRes = await fetch(
      `${BASE_URL}/payments?startDate=2098-06-01&endDate=2098-06-30&sortBy=amount&sortOrder=desc`,
      { headers: authHeaders }
    );
    const sortDescData = await sortDescRes.json();
    const amountsDesc = sortDescData.payments.map((p: any) => parseFloat(p.amount));
    assert(amountsDesc[0] >= amountsDesc[amountsDesc.length - 1], 'Amounts must be descending');
    console.log('  ✅ Passed: Server-side sorting (asc and desc) verified on amount.');

    // 5.6 Pagination
    const page1Res = await fetch(
      `${BASE_URL}/payments?startDate=2098-06-01&endDate=2098-06-30&page=1&limit=2`,
      { headers: authHeaders }
    );
    const page1Data = await page1Res.json();
    assert(page1Data.payments.length === 2, `Expected 2 payments on page 1, got ${page1Data.payments.length}`);
    assert(page1Data.pagination.page === 1, 'Page should be 1');
    assert(page1Data.pagination.limit === 2, 'Limit should be 2');
    assert(page1Data.pagination.totalItems === 3, 'Total items should be 3');
    assert(page1Data.pagination.totalPages === 2, 'Total pages should be 2');
    assert(page1Data.pagination.hasNextPage === true, 'hasNextPage should be true');
    assert(page1Data.pagination.hasPrevPage === false, 'hasPrevPage should be false');

    const page2Res = await fetch(
      `${BASE_URL}/payments?startDate=2098-06-01&endDate=2098-06-30&page=2&limit=2`,
      { headers: authHeaders }
    );
    const page2Data = await page2Res.json();
    assert(page2Data.payments.length === 1, `Expected 1 payment on page 2, got ${page2Data.payments.length}`);
    assert(page2Data.pagination.page === 2, 'Page should be 2');
    assert(page2Data.pagination.hasNextPage === false, 'hasNextPage should be false');
    assert(page2Data.pagination.hasPrevPage === true, 'hasPrevPage should be true');
    console.log('  ✅ Passed: Pagination metadata, offset, and page limits verified.');

    // ==========================================
    // 6. OUTSTANDING BOOKINGS ENDPOINT (GET /api/bookings/outstanding)
    // ==========================================
    console.log('\n--- 6. Outstanding Bookings Endpoint (GET /api/bookings/outstanding) ---');

    // 6.1 Unpaid balance calculation & fully paid exclusion
    const outRes = await fetch(
      `${BASE_URL}/bookings/outstanding?startDate=2098-06-01&endDate=2098-06-30`,
      { headers: authHeaders }
    );
    assert(outRes.status === 200, `Outstanding bookings query failed, got ${outRes.status}`);
    const outData = await outRes.json();

    // Must include Booking 1 (total 10000, paid 4000, balance 6000)
    const outB1 = outData.bookings.find((b: any) => b.id === b1.id);
    assert(outB1 !== undefined, 'Booking 1 must be present in outstanding list');
    assert(outB1.status === 'CONFIRMED', 'Only confirmed bookings must be returned');
    assert(parseFloat(outB1.totalAmount) === 10000, `Expected total ₹10000, got ${outB1.totalAmount}`);
    assert(parseFloat(outB1.amountPaid) === 4000, `Expected paid ₹4000, got ${outB1.amountPaid}`);
    assert(parseFloat(outB1.outstandingBalance) === 6000, `Expected balance ₹6000, got ${outB1.outstandingBalance}`);
    assert(outB1.bookingDate === '2098-06-15', `Expected bookingDate 2098-06-15, got ${outB1.bookingDate}`);

    // Must EXCLUDE Booking 2 (fully paid, balance 0)
    const outB2 = outData.bookings.find((b: any) => b.id === b2.id);
    assert(outB2 === undefined, 'Fully paid Booking 2 must NOT be in outstanding list');

    // Must EXCLUDE Booking 3 (cancelled)
    const outB3 = outData.bookings.find((b: any) => b.id === b3.id);
    assert(outB3 === undefined, 'Cancelled Booking 3 must NOT be in outstanding list');

    console.log(`  ✅ Passed: Only confirmed bookings with unpaid balances returned. Fully paid & cancelled excluded.`);
    console.log(`     - Found Booking 1: Total ₹${outB1.totalAmount}, Paid ₹${outB1.amountPaid}, Outstanding Balance ₹${outB1.outstandingBalance}`);

    // 6.2 Search outstanding bookings
    const outSearchRes = await fetch(`${BASE_URL}/bookings/outstanding?search=Alpha%20Customer`, {
      headers: authHeaders,
    });
    const outSearchData = await outSearchRes.json();
    assert(outSearchData.bookings.length === 1, 'Search should find Alpha Customer');
    assert(outSearchData.bookings[0].id === b1.id, 'Search should match Booking 1');
    console.log('  ✅ Passed: Search filter on outstanding bookings verified.');

    // 6.3 Pagination on outstanding bookings
    assert(outData.pagination.totalItems >= 1, 'totalItems should be >= 1');
    assert(typeof outData.summary.totalOutstanding === 'number', 'summary.totalOutstanding must be number');
    assert(typeof outData.summary.totalBookingValue === 'number', 'summary.totalBookingValue must be number');
    assert(typeof outData.summary.totalPaid === 'number', 'summary.totalPaid must be number');
    console.log(`  ✅ Passed: Outstanding summary totals: Booking Value ₹${outData.summary.totalBookingValue}, Paid ₹${outData.summary.totalPaid}, Outstanding ₹${outData.summary.totalOutstanding}`);

    // ==========================================
    // 7. BACKUP STATUS ENDPOINT (GET /api/backup/status)
    // ==========================================
    console.log('\n--- 7. Backup Status Endpoint (GET /api/backup/status) ---');

    const backupStatusRes = await fetch(`${BASE_URL}/backup/status`, {
      headers: authHeaders,
    });
    assert(backupStatusRes.status === 200, `Backup status failed, got ${backupStatusRes.status}`);
    const backupStatus = await backupStatusRes.json();

    assert(backupStatus.success === true, 'success should be true');
    assert(typeof backupStatus.googleDriveConnected === 'boolean', 'googleDriveConnected must be boolean');
    assert(backupStatus.cronSchedule === '30 20 * * *', 'cronSchedule must be 30 20 * * *');
    assert(typeof backupStatus.nextScheduledBackupIst === 'string', 'nextScheduledBackupIst must be string');
    assert(backupStatus.nextScheduledBackupIst.includes('02:00 AM IST'), 'nextScheduledBackupIst should mention 02:00 AM IST');

    console.log('  Backup Status Response:');
    console.log(`     Google Drive Connected: ${backupStatus.googleDriveConnected}`);
    console.log(`     Cron Schedule: ${backupStatus.cronSchedule} (${backupStatus.cronScheduleDescription})`);
    console.log(`     Next Scheduled Backup: ${backupStatus.nextScheduledBackupIst}`);
    if (backupStatus.latestBackup) {
      console.log(`     Latest Backup Created At: ${backupStatus.latestBackup.createdAt} (${backupStatus.latestBackup.createdAtIst})`);
      if (backupStatus.latestBackup.jsonFile) {
        console.log(`     JSON Backup: ${backupStatus.latestBackup.jsonFile.fileName} (${backupStatus.latestBackup.jsonFile.sizeBytes} bytes)`);
      }
      if (backupStatus.latestBackup.excelFile) {
        console.log(`     Excel Report: ${backupStatus.latestBackup.excelFile.fileName} (${backupStatus.latestBackup.excelFile.sizeBytes} bytes)`);
      }
    }

    // 7.2 Strict Sanitization & Secret Leakage Inspection
    const stringifiedResponse = JSON.stringify(backupStatus).toLowerCase();
    const sensitiveTokens = [
      'cron_secret',
      'google_refresh_token',
      'google_client_secret',
      'better_auth_secret',
      'database_url',
      'postgres://',
      'postgresql://',
      'password',
      'refresh_token',
      'client_secret',
    ];

    for (const secretToken of sensitiveTokens) {
      assert(
        !stringifiedResponse.includes(secretToken),
        `CRITICAL SECURITY VIOLATION: Sanitized backup status contains sensitive token '${secretToken}'!`
      );
    }
    console.log('  ✅ Passed: Strict sanitization confirmed — 0 secrets, credentials, or connection strings exposed.');

    // Also test alias route GET /api/google-drive/backup/status
    const aliasRes = await fetch(`${BASE_URL}/google-drive/backup/status`, {
      headers: authHeaders,
    });
    assert(aliasRes.status === 200, `Alias route /api/google-drive/backup/status failed, got ${aliasRes.status}`);
    console.log('  ✅ Passed: Alias route /api/google-drive/backup/status also operational.');

    console.log('\n🎉 ALL PHASE 1 BACKEND API TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
  } finally {
    // Cleanup seeded test bookings
    if (testBookingIds.length > 0) {
      console.log(`Cleaning up ${testBookingIds.length} test bookings...`);
      await db.delete(schema.bookings).where(inArray(schema.bookings.id, testBookingIds));
      console.log('Cleanup completed.');
    }
    await pool.end();
  }
}

runDashboardReportingTestSuite();
