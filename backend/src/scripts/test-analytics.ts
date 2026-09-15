import fs from 'fs';
import { pool } from '../db/index.js';

// Parse credentials from backend/.env safely
const envPath = 'c:/Users/RUFAID/OneDrive/Desktop/auditorium/backend/.env';
const envContent = fs.readFileSync(envPath, 'utf8');
let email = '', password = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('DEV_USER_EMAIL=')) email = line.split('=')[1].trim().replace(/['"]/g, '');
  if (line.startsWith('DEV_USER_PASSWORD=')) password = line.split('=')[1].trim().replace(/['"]/g, '');
}

const BASE_URL = 'http://127.0.0.1:5000/api';

async function testAnalytics() {
  console.log('🧪 Testing Monthly Analytics API Endpoint...\n');

  try {
    // 1. Authenticate
    const loginRes = await fetch(`${BASE_URL}/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!loginRes.ok) {
      throw new Error(`Authentication failed with status ${loginRes.status}`);
    }

    const cookieHeaders = loginRes.headers.getSetCookie?.() || [loginRes.headers.get('set-cookie')].filter(Boolean);
    const sessionCookie = cookieHeaders.map((c) => (c ? c.split(';')[0] : '')).join('; ');

    const authHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:5173',
      'Cookie': sessionCookie,
    };

    // 2. Fetch Monthly Analytics for 2026
    const res = await fetch(`${BASE_URL}/analytics/monthly?year=2026`, {
      headers: authHeaders,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Analytics API returned ${res.status}: ${err}`);
    }

    const data = await res.json();
    console.log('✅ Received Analytics Response:');
    console.log(`   Year: ${data.year}`);
    console.log(`   Available Years: ${JSON.stringify(data.availableYears)}`);
    console.log(`   Total Bookings: ${data.totalYearBookings}`);
    console.log(`   Total Revenue: ₹${data.totalYearRevenue}`);
    console.log(`   Total Sessions: ${data.totalYearSessions} (Morning: ${data.morningSessionsTotal}, Evening: ${data.eveningSessionsTotal})`);
    console.log(`   Monthly Breakdown count: ${data.monthlyStats?.length} months`);

    if (data.monthlyStats?.length !== 12) {
      throw new Error(`Expected 12 months, got ${data.monthlyStats?.length}`);
    }

    console.log('\n📊 Monthly Breakdown:');
    for (const m of data.monthlyStats) {
      console.log(`   ${m.monthShort} (${m.monthName}): ${m.totalBookings} bookings, ${m.totalSessions} sessions (${m.morningSessions} M / ${m.eveningSessions} E), ₹${m.totalRevenue}`);
    }

    console.log('\n🎉 Monthly Analytics API test passed successfully!');
  } catch (err) {
    console.error('❌ Analytics test failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testAnalytics();
