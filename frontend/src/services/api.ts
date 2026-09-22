import type { Booking } from '../types/booking';
import type { Payment, CreatePaymentPayload } from '../types/payment';
import type { YearlyAnalyticsSummary } from '@auditorium/shared';

export const API_BASE_URL = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_URL || '/api';


export interface FetchBookingsParams {
  startDate?: string;
  endDate?: string;
  status?: 'CONFIRMED' | 'CANCELLED';
  search?: string;
}

/**
 * Fetches bookings with optional query filters.
 * Sends session cookies automatically via credentials: 'include'.
 */
export async function fetchBookings(params?: FetchBookingsParams): Promise<Booking[]> {
  const query = new URLSearchParams();
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);

  const url = `${API_BASE_URL}/bookings${query.toString() ? `?${query.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMessage = 'Failed to fetch bookings';
    try {
      const errorData = await response.json();
      if (errorData.message) errorMessage = errorData.message;
    } catch {
      // Ignored
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export interface CreateBookingPayload {
  eventName: string;
  contactName: string;
  contactPhone: string;
  eventType: string;
  totalAmount: number;
  notes?: string | null;
  sessions: {
    date: string;
    session: 'MORNING' | 'EVENING';
    startTime?: string;
    endTime?: string;
  }[];
}

/**
 * Creates a new booking with sessions via POST /api/bookings.
 * Automatically sends session cookies with credentials: 'include'.
 */
export async function createBooking(payload: CreateBookingPayload): Promise<Booking> {
  const response = await fetch(`${API_BASE_URL}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorData: { error?: string; message?: string; details?: Record<string, string[]> } = {};
    try {
      errorData = await response.json();
    } catch {
      // Ignored
    }

    const err = new Error(errorData.message || 'Failed to create booking') as Error & {
      status: number;
      code?: string;
      details?: Record<string, string[]>;
    };
    err.status = response.status;
    err.code = errorData.error;
    err.details = errorData.details;
    throw err;
  }

  return response.json();
}

/**
 * Retrieves a single booking by ID via GET /api/bookings/:id.
 */
export async function getBookingById(id: string): Promise<Booking> {
  const response = await fetch(`${API_BASE_URL}/bookings/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let errorData: { error?: string; message?: string } = {};
    try {
      errorData = await response.json();
    } catch {
      // Ignored
    }

    const err = new Error(errorData.message || 'Failed to retrieve booking') as Error & {
      status: number;
      code?: string;
    };
    err.status = response.status;
    err.code = errorData.error;
    throw err;
  }

  return response.json();
}

/**
 * Cancels a confirmed booking via POST /api/bookings/:id/cancel.
 */
export async function cancelBooking(id: string): Promise<Booking> {
  const response = await fetch(`${API_BASE_URL}/bookings/${id}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    let errorData: { error?: string; message?: string } = {};
    try {
      errorData = await response.json();
    } catch {
      // Ignored
    }

    const err = new Error(errorData.message || 'Failed to cancel booking') as Error & {
      status: number;
      code?: string;
    };
    err.status = response.status;
    err.code = errorData.error;
    throw err;
  }

  return response.json();
}

/**
 * Cancels a specific session within a booking via POST /api/bookings/:id/sessions/:sessionId/cancel.
 */
export async function cancelBookingSession(
  bookingId: string,
  sessionId: string
): Promise<Booking> {
  const response = await fetch(
    `${API_BASE_URL}/bookings/${bookingId}/sessions/${sessionId}/cancel`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({}),
    }
  );

  if (!response.ok) {
    let errorData: { error?: string; message?: string } = {};
    try {
      errorData = await response.json();
    } catch {
      // Ignored
    }

    const err = new Error(errorData.message || 'Failed to cancel session') as Error & {
      status: number;
      code?: string;
    };
    err.status = response.status;
    err.code = errorData.error;
    throw err;
  }

  return response.json();
}

/**
 * Retrieves all payments for a booking via GET /api/bookings/:id/payments.
 */
export async function getBookingPayments(bookingId: string): Promise<Payment[]> {
  const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/payments`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let errorData: { error?: string; message?: string } = {};
    try {
      errorData = await response.json();
    } catch {
      // Ignored
    }

    const err = new Error(errorData.message || 'Failed to retrieve payments') as Error & {
      status: number;
      code?: string;
    };
    err.status = response.status;
    err.code = errorData.error;
    throw err;
  }

  return response.json();
}

/**
 * Records a new payment for a booking via POST /api/bookings/:id/payments.
 */
export async function createPayment(
  bookingId: string,
  payload: CreatePaymentPayload
): Promise<Payment> {
  const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorData: { error?: string; message?: string; details?: Record<string, string[]> } = {};
    try {
      errorData = await response.json();
    } catch {
      // Ignored
    }

    const err = new Error(errorData.message || 'Failed to record payment') as Error & {
      status: number;
      code?: string;
      details?: Record<string, string[]>;
    };
    err.status = response.status;
    err.code = errorData.error;
    err.details = errorData.details;
    throw err;
  }

  return response.json();
}

/**
 * Fetches monthly booking statistics and yearly analytics summary via GET /api/analytics/monthly?year=YYYY
 */
export async function fetchMonthlyAnalytics(year?: number): Promise<YearlyAnalyticsSummary> {
  const query = new URLSearchParams();
  if (year) query.set('year', year.toString());

  const url = `${API_BASE_URL}/analytics/monthly${query.toString() ? `?${query.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMessage = 'Failed to fetch monthly analytics';
    try {
      const errorData = await response.json();
      if (errorData.message) errorMessage = errorData.message;
    } catch {
      // Ignored
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

