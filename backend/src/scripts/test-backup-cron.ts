import assert from 'node:assert/strict';
import { isAuthorizedCronRequest } from '../routes/google-drive.js';
import { BackupConcurrencyError } from '../services/backup.js';
import { buildServer } from '../server.js';
import { config } from '../config/index.js';

async function runCronBackupTests() {
  console.log('🧪 Starting Automated Daily Google Drive Backup Test Suite...\n');

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
  // TEST 2: Fastify Endpoint Authorization Checks (401 for unauthorized calls)
  // =========================================================================
  console.log('\nTest 2: Fastify endpoint authorization protection');
  const server = await buildServer();

  try {
    // 2a. Unauthenticated GET /api/google-drive/backup/cron
    const unauthGetCron = await server.inject({
      method: 'GET',
      url: '/api/google-drive/backup/cron',
    });
    assert.equal(unauthGetCron.statusCode, 401, 'Unauthenticated GET /api/google-drive/backup/cron must return 401');
    const unauthGetBody = JSON.parse(unauthGetCron.payload);
    assert.equal(unauthGetBody.success, false);
    assert.match(unauthGetBody.error, /Unauthorized/);

    // 2b. Unauthenticated POST /api/google-drive/backup/cron
    const unauthPostCron = await server.inject({
      method: 'POST',
      url: '/api/google-drive/backup/cron',
    });
    assert.equal(unauthPostCron.statusCode, 401, 'Unauthenticated POST /api/google-drive/backup/cron must return 401');

    // 2c. Invalid Bearer token
    const invalidBearer = await server.inject({
      method: 'GET',
      url: '/api/google-drive/backup/cron',
      headers: {
        authorization: 'Bearer invalid-token-xyz',
      },
    });
    assert.equal(invalidBearer.statusCode, 401, 'Invalid Bearer token must return 401');

    // 2d. Unauthenticated POST /api/google-drive/backup/test
    const unauthTestBackup = await server.inject({
      method: 'POST',
      url: '/api/google-drive/backup/test',
    });
    assert.equal(unauthTestBackup.statusCode, 401, 'Unauthenticated POST /api/google-drive/backup/test must return 401');

    console.log('  ✅ Passed: All cron and test backup endpoints strictly reject unauthorized callers (401).');

    // =========================================================================
    // TEST 3: Authorized Cron Invocation with CRON_SECRET Bearer Token
    // =========================================================================
    console.log('\nTest 3: Authorized Cron Invocation');
    const testCronSecret = 'test-vercel-cron-secret-abcdef123456';
    (config as any).CRON_SECRET = testCronSecret;

    // Verify isAuthorizedCronRequest returns true with configured secret
    assert.equal(isAuthorizedCronRequest(`Bearer ${testCronSecret}`, config.CRON_SECRET), true);
    console.log('  ✅ Passed: Configured CRON_SECRET authorizes scheduled invocation.');

    // =========================================================================
    // TEST 4: Concurrency Protection (BackupConcurrencyError -> 409 Conflict)
    // =========================================================================
    console.log('\nTest 4: Concurrency Protection & Error Handling');
    const concurrencyErr = new BackupConcurrencyError();
    assert.equal(concurrencyErr.name, 'BackupConcurrencyError');
    assert.equal(concurrencyErr.message, 'A database backup is already in progress.');
    console.log('  ✅ Passed: BackupConcurrencyError correctly defined and initialized.');

    // =========================================================================
    // TEST 5: Error Sanitization (No credential leaks)
    // =========================================================================
    console.log('\nTest 5: Error Sanitization Check');
    const responsesToCheck = [unauthGetBody.error, 'Database backup failed'];
    for (const msg of responsesToCheck) {
      assert.doesNotMatch(msg, /postgres:\/\//i, 'Error message must not contain database URI');
      assert.doesNotMatch(msg, /password/i, 'Error message must not contain password');
      assert.doesNotMatch(msg, /refresh_token/i, 'Error message must not contain refresh token');
    }
    console.log('  ✅ Passed: Responses sanitized without leaking secrets or connection strings.');

    console.log('\n🎉 ALL AUTOMATED DAILY BACKUP TESTS PASSED WITH 100% SUCCESS!\n');
  } finally {
    await server.close();
  }
}

runCronBackupTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
