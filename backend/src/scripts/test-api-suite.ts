import dotenv from 'dotenv';
import { eq, inArray, gte } from 'drizzle-orm';
import { db, pool } from '../db/index.js';
import * as schema from '../db/schema/index.js';

dotenv.config({ path: 'c:/Users/RUFAID/OneDrive/Desktop/auditorium/backend/.env' });
const email = process.env.DEV_USER_EMAIL || 'admin@auditorium.local';
const password = process.env.DEV_USER_PASSWORD || '';

const BASE_URL = 'http://127.0.0.1:5000/api';
const createdBookingIds: string[] = [];

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log('🚀 Starting Full Booking API Integration Test Suite...\n');

  // Pre-cleanup any leftover test sessions from previous runs
  const testSessions = await db
    .select({ bookingId: schema.bookingSessions.bookingId })
    .from(schema.bookingSessions)
    .where(gte(schema.bookingSessions.bookingDate, '2099-01-01'));
  if (testSessions.length > 0) {
    const ids = Array.from(new Set(testSessions.map((s) => s.bookingId)));
    await db.delete(schema.bookings).where(inArray(schema.bookings.id, ids));
  }

  try {

    // ==========================================
    // TEST 1: Unauthenticated Requests (401)
    // ==========================================
    console.log('Test 1: Unauthenticated GET /api/bookings & POST /api/bookings');
    const unauthGet = await fetch(`${BASE_URL}/bookings`);
    assert(unauthGet.status === 401, `GET /api/bookings without auth should be 401, got ${unauthGet.status}`);

    const unauthPost = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName: 'Test' }),
    });
    assert(unauthPost.status === 401, `POST /api/bookings without auth should be 401, got ${unauthPost.status}`);
    console.log('  ✅ Passed: Both endpoints return 401 Unauthorized.');

    // ==========================================
    // AUTHENTICATE FOR SUBSEQUENT TESTS
    // ==========================================
    console.log('\nAuthenticating development user...');
    const loginRes = await fetch(`${BASE_URL}/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173',
      },
      body: JSON.stringify({ email, password }),
    });
    if (loginRes.status !== 200) {
      const errBody = await loginRes.text();
      console.error('Login failed body:', errBody, 'credentials:', { email, passwordLength: password.length });
    }
    assert(loginRes.status === 200, `Login should succeed, got ${loginRes.status}`);
    const cookieHeaders = loginRes.headers.getSetCookie?.() || [loginRes.headers.get('set-cookie')].filter(Boolean);
    const sessionCookie = cookieHeaders.map((c) => c.split(';')[0]).join('; ');
    const authHeaders = {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:5173',
      'Cookie': sessionCookie,
    };
    console.log('  ✅ Authenticated with valid session cookie.');

    // ==========================================
    // TEST 2: Validation Errors (400)
    // ==========================================
    console.log('\nTest 2: Validation - Duplicate slots in same payload');
    const dupSlotRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        eventName: 'Duplicate Test',
        contactName: 'Alice',
        contactPhone: '9876543210',
        eventType: 'Seminar',
        totalAmount: 5000,
        sessions: [
          { date: '2099-05-10', session: 'MORNING' },
          { date: '2099-05-10', session: 'MORNING' },
        ],
      }),
    });
    assert(dupSlotRes.status === 400, `Expected 400 for duplicate slots, got ${dupSlotRes.status}`);
    const dupSlotBody = await dupSlotRes.json();
    assert(dupSlotBody.error === 'VALIDATION_ERROR', `Expected VALIDATION_ERROR code, got ${dupSlotBody.error}`);
    console.log('  ✅ Passed: Duplicate slots in request rejected with 400 VALIDATION_ERROR.');

    console.log('\nTest 3: Validation - Empty sessions / invalid amounts');
    const invalidRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        eventName: 'Invalid Test',
        contactName: 'Bob',
        contactPhone: '1234', // too short
        eventType: 'Meeting',
        totalAmount: -100, // negative amount
        sessions: [], // empty sessions
      }),
    });
    assert(invalidRes.status === 400, `Expected 400 for invalid data, got ${invalidRes.status}`);
    console.log('  ✅ Passed: Invalid inputs rejected with 400.');

    // ==========================================
    // TEST 4: Successful Multi-Session Booking (201)
    // ==========================================
    console.log('\nTest 4: Create Valid Multi-Session Booking (201)');
    const createRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        eventName: 'Annual Tech Summit 2099',
        contactName: 'Sarah Connor',
        contactPhone: '9876543210',
        eventType: 'Conference',
        totalAmount: 35000,
        notes: 'VIP setup required in main hall',
        sessions: [
          { date: '2099-06-01', session: 'MORNING' },
          { date: '2099-06-01', session: 'EVENING' },
        ],
      }),
    });
    assert(createRes.status === 201, `Expected 201 Created, got ${createRes.status}`);
    const booking1 = await createRes.json();
    createdBookingIds.push(booking1.id);
    assert(booking1.id && booking1.sessions?.length === 2, 'Expected booking with 2 sessions');
    assert(booking1.status === 'CONFIRMED', 'Expected status CONFIRMED');
    assert(booking1.createdBy, 'Expected createdBy to be set automatically');
    console.log(`  ✅ Passed: Booking created with ID ${booking1.id} and 2 confirmed sessions.`);

    // ==========================================
    // TEST 5: Direct Slot Conflict (409)
    // ==========================================
    console.log('\nTest 5: Reject Booking for Already Booked Slot (409 Conflict)');
    const conflictRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        eventName: 'Clashing Event',
        contactName: 'John Smith',
        contactPhone: '9112233445',
        eventType: 'Wedding',
        totalAmount: 20000,
        sessions: [{ date: '2099-06-01', session: 'MORNING' }],
      }),
    });
    assert(conflictRes.status === 409, `Expected 409 Conflict, got ${conflictRes.status}`);
    const conflictBody = await conflictRes.json();
    assert(conflictBody.error === 'BOOKING_CONFLICT', `Expected BOOKING_CONFLICT code, got ${conflictBody.error}`);
    console.log('  ✅ Passed: Conflicting booking rejected with 409 BOOKING_CONFLICT.');

    // ==========================================
    // TEST 6: Atomic Transaction Rollback on Partial Conflict
    // ==========================================
    console.log('\nTest 6: Atomic Rollback when only 1 out of multiple slots conflicts');
    const partialConflictRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        eventName: 'Multi-Day Partial Clash',
        contactName: 'Agent Smith',
        contactPhone: '9000090000',
        eventType: 'Workshop',
        totalAmount: 50000,
        sessions: [
          { date: '2099-06-01', session: 'EVENING' }, // CONFLICT!
          { date: '2099-06-02', session: 'MORNING' }, // FREE slot
        ],
      }),
    });
    assert(partialConflictRes.status === 409, `Expected 409 Conflict, got ${partialConflictRes.status}`);

    // Verify free slot 2099-06-02 MORNING was rolled back and NOT created
    const checkFreeSlot = await db
      .select()
      .from(schema.bookingSessions)
      .where(eq(schema.bookingSessions.bookingDate, '2099-06-02'));
    assert(checkFreeSlot.length === 0, `Free slot must NOT be created due to transaction rollback! Found: ${checkFreeSlot.length}`);
    console.log('  ✅ Passed: Entire transaction rolled back atomically (0 rows created for free slots).');

    // ==========================================
    // TEST 7: List Bookings & Filters (200)
    // ==========================================
    console.log('\nTest 7: GET /api/bookings with search filter');
    const searchRes = await fetch(`${BASE_URL}/bookings?search=Tech+Summit`, { headers: authHeaders });
    assert(searchRes.status === 200, `Expected 200, got ${searchRes.status}`);
    const searchResults = await searchRes.json();
    assert(searchResults.length > 0 && searchResults.some((b: any) => b.id === booking1.id), 'Search must return created booking');
    console.log(`  ✅ Passed: Found ${searchResults.length} matching booking(s).`);

    // ==========================================
    // TEST 8: Get Booking by ID (200 & 404)
    // ==========================================
    console.log('\nTest 8: GET /api/bookings/:id');
    const getSingleRes = await fetch(`${BASE_URL}/bookings/${booking1.id}`, { headers: authHeaders });
    assert(getSingleRes.status === 200, `Expected 200, got ${getSingleRes.status}`);
    const singleData = await getSingleRes.json();
    assert(singleData.id === booking1.id, 'Expected matching booking ID');

    const notFoundRes = await fetch(`${BASE_URL}/bookings/00000000-0000-0000-0000-000000000000`, { headers: authHeaders });
    assert(notFoundRes.status === 404, `Expected 404 for missing booking, got ${notFoundRes.status}`);
    console.log('  ✅ Passed: Retrieved single booking and verified 404 for missing ID.');

    // ==========================================
    // TEST 9: Update Booking (200)
    // ==========================================
    console.log('\nTest 9: PATCH /api/bookings/:id');
    const updateRes = await fetch(`${BASE_URL}/bookings/${booking1.id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        eventName: 'Annual Tech Summit 2099 (Updated)',
        totalAmount: 40000,
        notes: 'Updated notes: extra microphones added',
      }),
    });
    assert(updateRes.status === 200, `Expected 200 on update, got ${updateRes.status}`);
    const updatedData = await updateRes.json();
    assert(updatedData.eventName === 'Annual Tech Summit 2099 (Updated)', 'Expected updated eventName');
    assert(updatedData.totalAmount === '40000.00', 'Expected updated totalAmount');
    console.log('  ✅ Passed: Booking updated successfully.');

    // ==========================================
    // TEST 10: Cancel Booking & Release Slots (200)
    // ==========================================
    console.log('\nTest 10: POST /api/bookings/:id/cancel');
    const cancelRes = await fetch(`${BASE_URL}/bookings/${booking1.id}/cancel`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({}),
    });
    assert(cancelRes.status === 200, `Expected 200 on cancel, got ${cancelRes.status}`);
    const cancelledData = await cancelRes.json();
    assert(cancelledData.status === 'CANCELLED', 'Expected status CANCELLED');
    assert(cancelledData.sessions.every((s: any) => s.status === 'CANCELLED'), 'All sessions must be CANCELLED');
    console.log('  ✅ Passed: Booking and its sessions cancelled atomically.');

    // ==========================================
    // TEST 11: Second Cancellation Rejection (409)
    // ==========================================
    console.log('\nTest 11: Attempt Second Cancellation on already cancelled booking');
    const secondCancelRes = await fetch(`${BASE_URL}/bookings/${booking1.id}/cancel`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({}),
    });
    assert(secondCancelRes.status === 409, `Expected 409 on second cancel, got ${secondCancelRes.status}`);
    const secondCancelBody = await secondCancelRes.json();
    assert(secondCancelBody.error === 'ALREADY_CANCELLED', `Expected ALREADY_CANCELLED error, got ${secondCancelBody.error}`);
    console.log('  ✅ Passed: Second cancellation rejected with 409 ALREADY_CANCELLED.');


    // ==========================================
    // TEST 12: Cancelled Slot is Re-Bookable (201)
    // ==========================================
    console.log('\nTest 12: Re-book Previously Cancelled Slot');
    const rebookRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        eventName: 'New Customer for Cancelled Slot',
        contactName: 'Emma Watson',
        contactPhone: '9112233445',
        eventType: 'Drama Play',
        totalAmount: 18000,
        sessions: [{ date: '2099-06-01', session: 'MORNING' }],
      }),
    });
    assert(rebookRes.status === 201, `Expected 201 on re-booking released slot, got ${rebookRes.status}`);
    const booking2 = await rebookRes.json();
    createdBookingIds.push(booking2.id);
    console.log(`  ✅ Passed: Cancelled slot successfully booked by new booking ID ${booking2.id}.`);

    // ==========================================
    // TEST 13: Audit Logs Verification
    // ==========================================
    console.log('\nTest 13: Audit Logs Trail Verification');
    const auditEntries = await db
      .select()
      .from(schema.auditLogs)
      .where(inArray(schema.auditLogs.bookingId, createdBookingIds));

    const actions = auditEntries.map((a) => a.action);
    console.log('  Found Audit Log Actions:', actions);
    assert(actions.includes('BOOKING_CREATED'), 'Expected BOOKING_CREATED audit log');
    assert(actions.includes('BOOKING_UPDATED'), 'Expected BOOKING_UPDATED audit log');
    assert(actions.includes('BOOKING_CANCELLED'), 'Expected BOOKING_CANCELLED audit log');
    console.log('  ✅ Passed: All audit logs recorded accurately in transaction.');

    // ==========================================
    // TEST 14: Nikkah Event Type
    // ==========================================
    console.log('\nTest 14: Create Booking with "Nikkah" Event Type');
    const nikkahRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        eventName: 'Zayd & Fatima Nikkah Ceremony',
        contactName: 'Zayd Ahmed',
        contactPhone: '9876500001',
        eventType: 'Nikkah',
        totalAmount: 25000,
        sessions: [{ date: '2099-06-02', session: 'MORNING' }],
      }),
    });
    assert(nikkahRes.status === 201, `Expected 201 for Nikkah booking, got ${nikkahRes.status}`);
    const nikkahBooking = await nikkahRes.json();
    createdBookingIds.push(nikkahBooking.id);
    assert(nikkahBooking.eventType === 'Nikkah', `Expected eventType to be Nikkah, got ${nikkahBooking.eventType}`);
    console.log('  ✅ Passed: Nikkah event type persisted and returned correctly.');

    // ==========================================
    // TEST 15: Custom Event Type ("Other Event")
    // ==========================================
    console.log('\nTest 15: Create Booking with Custom Event Type');
    const customTypeRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        eventName: 'Global Robotics Championship',
        contactName: 'Sarah Connor',
        contactPhone: '9876500002',
        eventType: 'Robotics Expo & Hackathon',
        totalAmount: 40000,
        sessions: [{ date: '2099-06-02', session: 'EVENING' }],
      }),
    });
    assert(customTypeRes.status === 201, `Expected 201 for custom event type booking, got ${customTypeRes.status}`);
    const customTypeBooking = await customTypeRes.json();
    createdBookingIds.push(customTypeBooking.id);
    assert(
      customTypeBooking.eventType === 'Robotics Expo & Hackathon',
      `Expected custom eventType, got ${customTypeBooking.eventType}`
    );
    console.log('  ✅ Passed: Custom event type persisted and returned correctly.');

    // ==========================================
    // TEST 16: Custom Start & End Times
    // ==========================================
    console.log('\nTest 16: Create Booking with Custom Start & End Times');
    const customTimeRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        eventName: 'Morning Executive Breakfast',
        contactName: 'Bruce Wayne',
        contactPhone: '9876500003',
        eventType: 'Corporate Seminar',
        totalAmount: 30000,
        sessions: [
          {
            date: '2099-06-03',
            session: 'MORNING',
            startTime: '10:30 AM',
            endTime: '2:30 PM',
          },
        ],
      }),
    });
    assert(customTimeRes.status === 201, `Expected 201 for custom times booking, got ${customTimeRes.status}`);
    const customTimeBooking = await customTimeRes.json();
    createdBookingIds.push(customTimeBooking.id);
    const sessionSlot = customTimeBooking.sessions[0];
    assert(sessionSlot.startTime === '10:30 AM', `Expected startTime '10:30 AM', got ${sessionSlot.startTime}`);
    assert(sessionSlot.endTime === '2:30 PM', `Expected endTime '2:30 PM', got ${sessionSlot.endTime}`);
    console.log('  ✅ Passed: Custom start time and end time persisted and retrieved accurately.');

    // ==========================================
    // TEST 17: Time Validation - End Time <= Start Time
    // ==========================================
    console.log('\nTest 17: Validation Error when End Time <= Start Time');
    const invalidTimeRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        eventName: 'Time Paradox Meeting',
        contactName: 'Doc Brown',
        contactPhone: '9876500004',
        eventType: 'Conference',
        totalAmount: 15000,
        sessions: [
          {
            date: '2099-06-04',
            session: 'MORNING',
            startTime: '3:00 PM',
            endTime: '11:00 AM',
          },
        ],
      }),
    });
    assert(invalidTimeRes.status === 400, `Expected 400 for invalid time range, got ${invalidTimeRes.status}`);
    const invalidTimeBody = await invalidTimeRes.json();
    assert(
      invalidTimeBody.error === 'VALIDATION_ERROR',
      `Expected VALIDATION_ERROR code, got ${invalidTimeBody.error}`
    );
    // ==========================================
    // TEST 18: Update Booking with Sessions & Custom Times
    // ==========================================
    console.log('\nTest 18: Edit Booking with Sessions & Custom Times (PATCH)');
    const editBookingRes = await fetch(`${BASE_URL}/bookings/${customTimeBooking.id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        eventName: 'Morning Executive Breakfast (Rescheduled)',
        contactName: 'Bruce Thomas Wayne',
        contactPhone: '9876599999',
        eventType: 'Other Event - Executive Gala',
        totalAmount: 45000,
        notes: 'Rescheduled to evening slot with custom times',
        sessions: [
          {
            date: '2099-06-05',
            session: 'EVENING',
            startTime: '6:00 PM',
            endTime: '10:30 PM',
          },
        ],
      }),
    });
    assert(editBookingRes.status === 200, `Expected 200 on edit booking with sessions, got ${editBookingRes.status}`);
    const editedBooking = await editBookingRes.json();
    assert(editedBooking.eventName === 'Morning Executive Breakfast (Rescheduled)', 'Expected updated eventName');
    assert(editedBooking.contactName === 'Bruce Thomas Wayne', 'Expected updated contactName');
    assert(editedBooking.contactPhone === '9876599999', 'Expected updated contactPhone');
    assert(editedBooking.eventType === 'Other Event - Executive Gala', 'Expected updated eventType');
    assert(editedBooking.totalAmount === '45000.00', 'Expected updated totalAmount');
    assert(editedBooking.notes === 'Rescheduled to evening slot with custom times', 'Expected updated notes');
    assert(editedBooking.sessions.length === 1, 'Expected 1 active session');
    assert(editedBooking.sessions[0].bookingDate === '2099-06-05', 'Expected session date 2099-06-05');
    assert(editedBooking.sessions[0].session === 'EVENING', 'Expected session EVENING');
    assert(editedBooking.sessions[0].startTime === '6:00 PM', 'Expected startTime 6:00 PM');
    assert(editedBooking.sessions[0].endTime === '10:30 PM', 'Expected endTime 10:30 PM');
    console.log('  ✅ Passed: Booking details and sessions updated and persisted accurately.');

    // ==========================================
    // TEST 19: Edit Booking Slot Conflict Prevention & Rollback
    // ==========================================
    console.log('\nTest 19: Edit Booking Slot Conflict (Attempt reschedule to occupied slot)');
    // customTimeBooking is on 2099-06-05 EVENING. Create another booking on 2099-06-06 MORNING.
    const anotherBookingRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        eventName: 'Existing Occupant Booking',
        contactName: 'Clark Kent',
        contactPhone: '9876500005',
        eventType: 'Exhibition / Expo',
        totalAmount: 25000,
        sessions: [
          {
            date: '2099-06-06',
            session: 'MORNING',
          },
        ],
      }),
    });
    assert(anotherBookingRes.status === 201, `Expected 201 for another booking, got ${anotherBookingRes.status}`);
    const anotherBooking = await anotherBookingRes.json();
    createdBookingIds.push(anotherBooking.id);

    // Try to update customTimeBooking to also book 2099-06-06 MORNING (conflict!)
    const conflictEditRes = await fetch(`${BASE_URL}/bookings/${customTimeBooking.id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        sessions: [
          {
            date: '2099-06-06',
            session: 'MORNING',
          },
        ],
      }),
    });
    assert(conflictEditRes.status === 409, `Expected 409 on conflicting session edit, got ${conflictEditRes.status}`);
    const editConflictBody = await conflictEditRes.json();
    assert(editConflictBody.error === 'BOOKING_CONFLICT', `Expected BOOKING_CONFLICT error, got ${editConflictBody.error}`);

    // Verify customTimeBooking sessions were NOT corrupted/lost
    const verifyBookingRes = await fetch(`${BASE_URL}/bookings/${customTimeBooking.id}`, { headers: authHeaders });
    const verifyBookingData = await verifyBookingRes.json();
    assert(verifyBookingData.sessions.length === 1, 'Original session must be preserved intact');
    assert(verifyBookingData.sessions[0].bookingDate === '2099-06-05', 'Original session date 2099-06-05 preserved');
    console.log('  ✅ Passed: Edit conflict rejected with 409 and original booking sessions preserved intact.');

    // ==========================================
    // TEST 20: Advance Amount Creation, Retrieval & Update
    // ==========================================
    console.log('\nTest 20: Advance Amount (Create, Validation, Update, Clear)');
    // 20a. Reject negative advance amount
    const negAdvanceRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        eventName: 'Negative Advance Test',
        contactName: 'Tester',
        contactPhone: '9876500009',
        eventType: 'Seminar',
        totalAmount: 10000,
        advanceAmount: -500,
        sessions: [{ date: '2099-06-20', session: 'MORNING' }],
      }),
    });
    assert(negAdvanceRes.status === 400, `Expected 400 for negative advance amount, got ${negAdvanceRes.status}`);

    // 20b. Create with advance amount
    const advBookingRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        eventName: 'Advance Amount Gala',
        contactName: 'Arthur Dent',
        contactPhone: '9876543219',
        eventType: 'Private Gathering',
        totalAmount: 50000,
        advanceAmount: 15000.5,
        sessions: [{ date: '2099-06-20', session: 'MORNING' }],
      }),
    });
    assert(advBookingRes.status === 201, `Expected 201 on advance amount booking creation, got ${advBookingRes.status}`);
    const advBooking = await advBookingRes.json();
    createdBookingIds.push(advBooking.id);
    assert(advBooking.advanceAmount === '15000.50', `Expected advanceAmount '15000.50', got ${advBooking.advanceAmount}`);

    // 20c. Update advance amount to different value
    const updateAdvRes = await fetch(`${BASE_URL}/bookings/${advBooking.id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        advanceAmount: 20000,
      }),
    });
    assert(updateAdvRes.status === 200, `Expected 200 on advance amount update, got ${updateAdvRes.status}`);
    const updatedAdvBooking = await updateAdvRes.json();
    assert(updatedAdvBooking.advanceAmount === '20000.00', `Expected advanceAmount '20000.00', got ${updatedAdvBooking.advanceAmount}`);

    // 20d. Clear advance amount to null
    const clearAdvRes = await fetch(`${BASE_URL}/bookings/${advBooking.id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        advanceAmount: null,
      }),
    });
    assert(clearAdvRes.status === 200, `Expected 200 on advance amount clear, got ${clearAdvRes.status}`);
    const clearedAdvBooking = await clearAdvRes.json();
    assert(clearedAdvBooking.advanceAmount === null, `Expected advanceAmount null, got ${clearedAdvBooking.advanceAmount}`);
    console.log('  ✅ Passed: Advance amount creation, rejection of negative values, updating, and clearing verified.');

    console.log('\n🏆 ALL INTEGRATION TESTS PASSED WITH 100% SUCCESS!\n');
  } finally {
    // Clean up test data
    if (createdBookingIds.length > 0) {
      console.log('🧹 Cleaning up test bookings...');
      await db.delete(schema.bookings).where(inArray(schema.bookings.id, createdBookingIds));
      console.log('✨ Cleaned up test records.');
    }
    await pool.end();
  }
}

runTestSuite().catch((err) => {
  console.error('❌ Test Suite Fatal Error:', err.message);
  process.exit(1);
});
