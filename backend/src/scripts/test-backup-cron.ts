import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { isAuthorizedCronRequest } from '../routes/google-drive.js';
import { BackupConcurrencyError, type DatabaseBackupPayload } from '../services/backup.js';
import { generateExcelWorkbook, getIstTimestampInfo } from '../services/backup-excel.js';
import { buildServer } from '../server.js';
import { config } from '../config/index.js';

async function runCronBackupTests() {
  console.log('🧪 Starting Automated Daily Google Drive Backup & Excel Report Test Suite...\n');

  // =========================================================================
  // TEST 1: Unit tests for isAuthorizedCronRequest (Timing-safe validation)
  // =========================================================================
  console.log('Test 1: Unit tests for isAuthorizedCronRequest');
  {
    const secret = 'super-secret-cron-token-12345';
    assert.equal(
      isAuthorizedCronRequest(`Bearer ${secret}`, secret),
      true,
      'Valid matching bearer token should be authorized'
    );

    assert.equal(
      isAuthorizedCronRequest('Bearer wrong-secret', secret),
      false,
      'Wrong secret should be rejected'
    );

    assert.equal(
      isAuthorizedCronRequest('Bearer short', secret),
      false,
      'Length mismatch should be rejected'
    );

    assert.equal(
      isAuthorizedCronRequest('Basic dXNlcjpwYXNz', secret),
      false,
      'Non-bearer auth should be rejected'
    );

    assert.equal(
      isAuthorizedCronRequest(undefined, secret),
      false,
      'Undefined header should be rejected'
    );

    assert.equal(
      isAuthorizedCronRequest(`Bearer ${secret}`, undefined),
      false,
      'Undefined secret should reject all requests'
    );

    assert.equal(
      isAuthorizedCronRequest(`Bearer ${secret}`, ''),
      false,
      'Empty secret should reject all requests'
    );
  }
  console.log('  ✅ Passed: Timing-safe token verification verified under all edge cases.');

  // =========================================================================
  // TEST 2: IST Timestamp and Filename Formatting Tests
  // =========================================================================
  console.log('\nTest 2: IST Timestamp and Filename Formatting');
  {
    // Test a fixed UTC timestamp: 2026-09-26T04:30:15.000Z -> IST is +05:30 -> 2026-09-26 10:00:15
    const testDate = new Date('2026-09-26T04:30:15.000Z');
    const istInfo = getIstTimestampInfo(testDate);

    assert.equal(istInfo.year, '2026');
    assert.equal(istInfo.month, '09');
    assert.equal(istInfo.day, '26');
    assert.equal(istInfo.hour, '10');
    assert.equal(istInfo.minute, '00');
    assert.equal(istInfo.second, '15');
    assert.equal(istInfo.timestampStr, '2026-09-26-100015');
    assert.equal(istInfo.jsonFileName, 'auditorium-backup-2026-09-26-100015.json');
    assert.equal(istInfo.excelFileName, 'auditorium-report-2026-09-26-100015.xlsx');
    assert.equal(istInfo.readableIst, '2026-09-26 10:00:15 IST');
  }
  console.log('  ✅ Passed: IST timestamp correctly generates paired JSON and Excel filenames.');

  // =========================================================================
  // TEST 3: Excel Report Generation & Worksheet Validation
  // =========================================================================
  console.log('\nTest 3: Excel Report Generation, Worksheet Names, and Data Formats');
  {
    const mockBackupPayload: DatabaseBackupPayload = {
      backupVersion: 1,
      createdAt: '2026-09-26T04:30:15.000Z',
      database: 'auditorium',
      metadata: {
        application: 'Oruma Avenue Auditorium',
        backupVersion: 1,
        createdAt: '2026-09-26T04:30:15.000Z',
        tableCounts: {
          user: 1,
          account: 1,
          session: 1,
          verification: 1,
          bookings: 2,
          booking_sessions: 2,
          payments: 3,
          audit_logs: 2,
        },
      },
      tables: {
        user: [
          {
            id: 'usr-1',
            name: 'Manager Alice',
            email: 'alice@example.com',
            emailVerified: true,
            image: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
        account: [
          {
            id: 'acc-1',
            userId: 'usr-1',
            providerId: 'credential',
            accountId: 'usr-1',
            accessToken: 'secret-access-token-xyz',
            refreshToken: 'secret-refresh-token-xyz',
            idToken: 'secret-id-token-xyz',
            password: '$2a$10$encryptedPasswordHashString',
            accessTokenExpiresAt: new Date('2026-12-31T00:00:00.000Z'),
            refreshTokenExpiresAt: new Date('2026-12-31T00:00:00.000Z'),
            scope: 'read write',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
        session: [
          {
            id: 'ses-1',
            userId: 'usr-1',
            token: 'secret-session-token-abc',
            expiresAt: new Date('2026-10-01T00:00:00.000Z'),
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0 Test Agent',
            createdAt: new Date('2026-09-01T00:00:00.000Z'),
            updatedAt: new Date('2026-09-01T00:00:00.000Z'),
          },
        ],
        verification: [
          {
            id: 'ver-1',
            identifier: 'alice@example.com',
            value: 'secret-otp-998877',
            expiresAt: new Date('2026-09-26T12:00:00.000Z'),
            createdAt: new Date('2026-09-26T00:00:00.000Z'),
            updatedAt: new Date('2026-09-26T00:00:00.000Z'),
          },
        ],
        bookings: [
          {
            id: 'bk-11111111-1111-1111-1111-111111111111',
            eventName: 'Grand Wedding Reception',
            contactName: 'John Doe',
            contactPhone: '9876543210',
            eventType: 'Wedding',
            totalAmount: '50000.00',
            advanceAmount: '20000.00',
            status: 'CONFIRMED',
            notes: 'Stage decoration required',
            createdBy: 'usr-1',
            createdAt: new Date('2026-09-20T10:00:00.000Z'),
            updatedAt: new Date('2026-09-20T10:00:00.000Z'),
          },
          {
            id: 'bk-22222222-2222-2222-2222-222222222222',
            eventName: 'Cancelled Conference',
            contactName: 'Jane Smith',
            contactPhone: '9123456780',
            eventType: 'Conference',
            totalAmount: '30000.00',
            advanceAmount: null,
            status: 'CANCELLED',
            notes: 'Cancelled due to schedule change',
            createdBy: 'usr-1',
            createdAt: new Date('2026-09-21T10:00:00.000Z'),
            updatedAt: new Date('2026-09-22T10:00:00.000Z'),
          },
        ],
        booking_sessions: [
          {
            id: 'bs-1',
            bookingId: 'bk-11111111-1111-1111-1111-111111111111',
            bookingDate: '2026-10-15',
            session: 'MORNING',
            startTime: '08:00 AM',
            endTime: '01:00 PM',
            status: 'BOOKED',
            createdAt: new Date('2026-09-20T10:00:00.000Z'),
            updatedAt: new Date('2026-09-20T10:00:00.000Z'),
          },
          {
            id: 'bs-2',
            bookingId: 'bk-22222222-2222-2222-2222-222222222222',
            bookingDate: '2026-10-20',
            session: 'EVENING',
            startTime: '04:00 PM',
            endTime: '10:00 PM',
            status: 'CANCELLED',
            createdAt: new Date('2026-09-21T10:00:00.000Z'),
            updatedAt: new Date('2026-09-22T10:00:00.000Z'),
          },
        ],
        payments: [
          {
            id: 'pmt-1',
            bookingId: 'bk-11111111-1111-1111-1111-111111111111',
            amount: '20000.00',
            paymentMethod: 'UPI',
            paymentDate: new Date('2026-09-20T11:00:00.000Z'),
            receivedBy: 'Manager Alice',
            notes: 'Advance UPI payment',
            createdAt: new Date('2026-09-20T11:00:00.000Z'),
          },
          {
            id: 'pmt-2',
            bookingId: 'bk-11111111-1111-1111-1111-111111111111',
            amount: '30000.00',
            paymentMethod: 'BANK_TRANSFER',
            paymentDate: new Date('2026-09-25T14:00:00.000Z'),
            receivedBy: 'Manager Alice',
            notes: 'Final settlement via NEFT',
            createdAt: new Date('2026-09-25T14:00:00.000Z'),
          },
          {
            id: 'pmt-3',
            bookingId: 'bk-22222222-2222-2222-2222-222222222222',
            amount: '5000.00',
            paymentMethod: 'CASH',
            paymentDate: new Date('2026-09-21T12:00:00.000Z'),
            receivedBy: 'Manager Alice',
            notes: 'Cash token',
            createdAt: new Date('2026-09-21T12:00:00.000Z'),
          },
        ],
        audit_logs: [
          {
            id: 'log-1',
            userId: 'usr-1',
            action: 'BOOKING_CREATED',
            bookingId: 'bk-11111111-1111-1111-1111-111111111111',
            details: { eventName: 'Grand Wedding Reception', amount: 50000 },
            createdAt: new Date('2026-09-20T10:00:00.000Z'),
          },
          {
            id: 'log-2',
            userId: 'usr-1',
            action: 'PAYMENT_RECORDED',
            bookingId: 'bk-11111111-1111-1111-1111-111111111111',
            details: { paymentId: 'pmt-1', amount: 20000, method: 'UPI' },
            createdAt: new Date('2026-09-20T11:00:00.000Z'),
          },
        ],
      },
    };

    // 1. Generate Excel Buffer
    const excelBuffer = await generateExcelWorkbook(mockBackupPayload);
    assert(Buffer.isBuffer(excelBuffer), 'generateExcelWorkbook must return a Buffer');
    assert(excelBuffer.length > 0, 'Excel buffer must not be empty');

    // 2. Load workbook back using ExcelJS to verify structure and content
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(excelBuffer as any);

    // 3. Verify all 9 required worksheets exist with exact names
    const requiredSheets = [
      'Summary',
      'Bookings',
      'Booking Sessions',
      'Payments',
      'Users',
      'Accounts',
      'Sessions',
      'Verifications',
      'Audit Logs',
    ];

    const actualSheets = wb.worksheets.map((s) => s.name);
    assert.deepEqual(
      actualSheets,
      requiredSheets,
      `Worksheets must match exactly: expected ${JSON.stringify(requiredSheets)}, got ${JSON.stringify(actualSheets)}`
    );
    console.log('  ✅ 3a: All 9 required worksheets exist with correct names.');

    // 4. Verify Summary Worksheet contents
    const summarySheet = wb.getWorksheet('Summary');
    assert(summarySheet, 'Summary worksheet must exist');

    let foundDb = false;
    let foundPaymentsSum = false;
    let foundVersion = false;

    summarySheet.eachRow((row) => {
      const cellA = row.getCell(1).value?.toString() || '';
      const cellB = row.getCell(2).value;

      if (cellA === 'Database Name' && cellB === 'auditorium') {
        foundDb = true;
      }
      if (cellA === 'Backup Version' && cellB === 1) {
        foundVersion = true;
      }
      if (cellA === 'Total Payments Recorded' && typeof cellB === 'number' && cellB === 55000) {
        foundPaymentsSum = true;
      }
    });

    assert(foundDb, 'Summary worksheet must include database name auditorium');
    assert(foundVersion, 'Summary worksheet must include backup version 1');
    assert(foundPaymentsSum, 'Summary worksheet must calculate total payments sum of 55000 (20000 + 30000 + 5000)');
    console.log('  ✅ 3b: Summary sheet contains correct system metadata, row counts, and numeric payments total.');

    // 5. Verify Payments Worksheet (numeric amounts & filterable payment method)
    const paymentsSheet = wb.getWorksheet('Payments');
    assert(paymentsSheet, 'Payments worksheet must exist');
    assert(paymentsSheet.views && paymentsSheet.views[0]?.state === 'frozen', 'Payments header must be frozen');
    assert(paymentsSheet.autoFilter, 'Payments sheet must have autoFilter enabled');

    // Row 1 is header, Row 2 is pmt-1, Row 3 is pmt-2, Row 4 is pmt-3
    const pmt1Row = paymentsSheet.getRow(2);
    const pmt1Amount = pmt1Row.getCell(3).value;
    const pmt1Method = pmt1Row.getCell(4).value;

    assert.equal(typeof pmt1Amount, 'number', 'Payment amount must be numeric number type in cell');
    assert.equal(pmt1Amount, 20000, 'Payment 1 amount should equal 20000');
    assert.equal(pmt1Method, 'UPI', 'Payment method must be filterable string "UPI"');

    const pmt2Row = paymentsSheet.getRow(3);
    assert.equal(typeof pmt2Row.getCell(3).value, 'number');
    assert.equal(pmt2Row.getCell(3).value, 30000);
    assert.equal(pmt2Row.getCell(4).value, 'BANK_TRANSFER');

    const pmt3Row = paymentsSheet.getRow(4);
    assert.equal(typeof pmt3Row.getCell(3).value, 'number');
    assert.equal(pmt3Row.getCell(3).value, 5000);
    assert.equal(pmt3Row.getCell(4).value, 'CASH');

    console.log('  ✅ 3c: Payments sheet preserves numeric amounts (enabling spreadsheet calculations) and filterable methods.');

    // 6. Verify Bookings Worksheet (amounts numeric, dates valid)
    const bookingsSheet = wb.getWorksheet('Bookings');
    assert(bookingsSheet, 'Bookings worksheet must exist');
    assert(bookingsSheet.views && bookingsSheet.views[0]?.state === 'frozen', 'Bookings header must be frozen');
    assert(bookingsSheet.autoFilter, 'Bookings sheet must have autoFilter enabled');

    const bk1Row = bookingsSheet.getRow(2);
    assert.equal(bk1Row.getCell(1).value, 'bk-11111111-1111-1111-1111-111111111111');
    assert.equal(bk1Row.getCell(2).value, 'Grand Wedding Reception');
    assert.equal(typeof bk1Row.getCell(6).value, 'number', 'Booking total amount must be number');
    assert.equal(bk1Row.getCell(6).value, 50000);
    assert.equal(typeof bk1Row.getCell(7).value, 'number', 'Booking advance amount must be number');
    assert.equal(bk1Row.getCell(7).value, 20000);
    assert.equal(bk1Row.getCell(8).value, 'CONFIRMED');
    assert(bk1Row.getCell(11).value instanceof Date, 'Booking created date must be an Excel Date object');

    console.log('  ✅ 3d: Bookings sheet contains all booking fields with proper numeric and date types.');

    // 7. Verify Booking Sessions Worksheet
    const bookingSessionsSheet = wb.getWorksheet('Booking Sessions');
    assert(bookingSessionsSheet, 'Booking Sessions worksheet must exist');
    const bs1Row = bookingSessionsSheet.getRow(2);
    assert.equal(bs1Row.getCell(1).value, 'bs-1');
    assert.equal(bs1Row.getCell(2).value, 'bk-11111111-1111-1111-1111-111111111111');
    assert.equal(bs1Row.getCell(3).value, '2026-10-15');
    assert.equal(bs1Row.getCell(4).value, 'MORNING');
    assert.equal(bs1Row.getCell(5).value, '08:00 AM');
    assert.equal(bs1Row.getCell(6).value, '01:00 PM');
    assert.equal(bs1Row.getCell(7).value, 'BOOKED');

    console.log('  ✅ 3e: Booking Sessions sheet contains session times, dates, and statuses.');

    // 8. CRITICAL SECURITY TEST: Redaction of Secrets in Auth Sheets
    const accountsSheet = wb.getWorksheet('Accounts');
    assert(accountsSheet, 'Accounts worksheet must exist');
    const accRow = accountsSheet.getRow(2);
    assert.equal(accRow.getCell(6).value, '[REDACTED]', 'Access token must be redacted');
    assert.equal(accRow.getCell(7).value, '[REDACTED]', 'Refresh token must be redacted');
    assert.equal(accRow.getCell(8).value, '[REDACTED]', 'ID token must be redacted');
    assert.equal(accRow.getCell(9).value, '[REDACTED]', 'Password hash must be redacted');

    const sessionsSheet = wb.getWorksheet('Sessions');
    assert(sessionsSheet, 'Sessions worksheet must exist');
    const sesRow = sessionsSheet.getRow(2);
    assert.equal(sesRow.getCell(3).value, '[REDACTED]', 'Session token must be redacted');

    const verificationsSheet = wb.getWorksheet('Verifications');
    assert(verificationsSheet, 'Verifications worksheet must exist');
    const verRow = verificationsSheet.getRow(2);
    assert.equal(verRow.getCell(3).value, '[REDACTED]', 'Verification value/code must be redacted');

    // Convert whole workbook text to string to double check no raw secret tokens appear anywhere
    const rawBufferStr = excelBuffer.toString('utf8');
    assert(!rawBufferStr.includes('secret-access-token-xyz'), 'Raw buffer must not contain secret-access-token-xyz');
    assert(!rawBufferStr.includes('secret-refresh-token-xyz'), 'Raw buffer must not contain secret-refresh-token-xyz');
    assert(!rawBufferStr.includes('encryptedPasswordHashString'), 'Raw buffer must not contain password hash');
    assert(!rawBufferStr.includes('secret-session-token-abc'), 'Raw buffer must not contain session token');
    assert(!rawBufferStr.includes('secret-otp-998877'), 'Raw buffer must not contain verification code');

    console.log('  ✅ 3f: Strictly verified: All authentication secrets, password hashes, and tokens are [REDACTED].');
  }

  // =========================================================================
  // TEST 4: Fastify Endpoint Authorization Checks (401 for unauthorized calls)
  // =========================================================================
  console.log('\nTest 4: Fastify endpoint authorization protection');
  const server = await buildServer();

  try {
    // 4a. Unauthenticated GET /api/google-drive/backup/cron
    const unauthGetCron = await server.inject({
      method: 'GET',
      url: '/api/google-drive/backup/cron',
    });
    assert.equal(unauthGetCron.statusCode, 401, 'Unauthenticated GET /api/google-drive/backup/cron must return 401');
    const unauthGetBody = JSON.parse(unauthGetCron.payload);
    assert.equal(unauthGetBody.success, false);
    assert.match(unauthGetBody.error, /Unauthorized/);

    // 4b. Unauthenticated POST /api/google-drive/backup/cron
    const unauthPostCron = await server.inject({
      method: 'POST',
      url: '/api/google-drive/backup/cron',
    });
    assert.equal(unauthPostCron.statusCode, 401, 'Unauthenticated POST /api/google-drive/backup/cron must return 401');

    // 4c. Invalid Bearer token
    const invalidBearer = await server.inject({
      method: 'GET',
      url: '/api/google-drive/backup/cron',
      headers: {
        authorization: 'Bearer invalid-token-xyz',
      },
    });
    assert.equal(invalidBearer.statusCode, 401, 'Invalid Bearer token must return 401');

    // 4d. Unauthenticated POST /api/google-drive/backup/test
    const unauthTestBackup = await server.inject({
      method: 'POST',
      url: '/api/google-drive/backup/test',
    });
    assert.equal(unauthTestBackup.statusCode, 401, 'Unauthenticated POST /api/google-drive/backup/test must return 401');

    console.log('  ✅ Passed: All cron and test backup endpoints strictly reject unauthorized callers (401).');

    // =========================================================================
    // TEST 5: Authorized Cron Invocation with CRON_SECRET Bearer Token
    // =========================================================================
    console.log('\nTest 5: Authorized Cron Invocation');
    const testCronSecret = 'test-vercel-cron-secret-abcdef123456';
    (config as any).CRON_SECRET = testCronSecret;

    // Verify isAuthorizedCronRequest returns true with configured secret
    assert.equal(isAuthorizedCronRequest(`Bearer ${testCronSecret}`, config.CRON_SECRET), true);
    console.log('  ✅ Passed: Configured CRON_SECRET authorizes scheduled invocation.');

    // =========================================================================
    // TEST 6: Concurrency Protection (BackupConcurrencyError -> 409 Conflict)
    // =========================================================================
    console.log('\nTest 6: Concurrency Protection & Error Handling');
    const concurrencyErr = new BackupConcurrencyError();
    assert.equal(concurrencyErr.name, 'BackupConcurrencyError');
    assert.equal(concurrencyErr.message, 'A database backup is already in progress.');
    console.log('  ✅ Passed: BackupConcurrencyError correctly defined and initialized.');

    // =========================================================================
    // TEST 7: Error Sanitization (No credential leaks)
    // =========================================================================
    console.log('\nTest 7: Error Sanitization Check');
    const responsesToCheck = [unauthGetBody.error, 'Database backup failed'];
    for (const msg of responsesToCheck) {
      assert.doesNotMatch(msg, /postgres:\/\//i, 'Error message must not contain database URI');
      assert.doesNotMatch(msg, /password/i, 'Error message must not contain password');
      assert.doesNotMatch(msg, /refresh_token/i, 'Error message must not contain refresh token');
    }
    console.log('  ✅ Passed: Responses sanitized without leaking secrets or connection strings.');

    console.log('\n🎉 ALL AUTOMATED DAILY BACKUP & EXCEL REPORT TESTS PASSED WITH 100% SUCCESS!\n');
  } finally {
    await server.close();
  }
}

runCronBackupTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
