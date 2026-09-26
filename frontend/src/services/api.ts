import type { Booking } from '../types/booking';
import type { Payment, CreatePaymentPayload, PaymentMethod } from '../types/payment';
import type { YearlyAnalyticsSummary } from '@auditorium/shared';
import type {
  DashboardAnalytics,
  DateRangePreset,
  PaginatedPaymentsResponse,
  PaginatedOutstandingResponse,
  BackupStatusResponse,
} from '../types/dashboard';

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
  query.set('_t', Date.now().toString());

  const url = `${API_BASE_URL}/bookings?${query.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
    cache: 'no-store',
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
  advanceAmount?: number | null;
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
  const response = await fetch(`${API_BASE_URL}/bookings/${encodeURIComponent(id)}?_t=${Date.now()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
    cache: 'no-store',
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

export interface UpdateBookingPayload {
  eventName?: string;
  contactName?: string;
  contactPhone?: string;
  eventType?: string;
  totalAmount?: number;
  advanceAmount?: number | null;
  notes?: string | null;
  sessions?: {
    date: string;
    session: 'MORNING' | 'EVENING';
    startTime?: string;
    endTime?: string;
  }[];
}

/**
 * Updates an existing booking via PATCH /api/bookings/:id.
 */
export async function updateBooking(id: string, payload: UpdateBookingPayload): Promise<Booking> {
  const response = await fetch(`${API_BASE_URL}/bookings/${encodeURIComponent(id)}`, {
    method: 'PATCH',
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

    const err = new Error(errorData.message || 'Failed to update booking') as Error & {
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
  const response = await fetch(`${API_BASE_URL}/bookings/${encodeURIComponent(bookingId)}/payments?_t=${Date.now()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
    cache: 'no-store',
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
  query.set('_t', Date.now().toString());

  const url = `${API_BASE_URL}/analytics/monthly?${query.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
    cache: 'no-store',
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

export interface FetchDashboardParams {
  preset?: DateRangePreset;
  startDate?: string;
  endDate?: string;
}

/**
 * Fetches dashboard KPI aggregation, breakdowns, and today's counts via GET /api/analytics/dashboard
 */
export async function fetchDashboardAnalytics(
  params?: FetchDashboardParams
): Promise<DashboardAnalytics> {
  const query = new URLSearchParams();
  if (params?.preset) query.set('preset', params.preset);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  query.set('_t', Date.now().toString());

  const url = `${API_BASE_URL}/analytics/dashboard?${query.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
    cache: 'no-store',
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMessage = 'Failed to fetch dashboard analytics';
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

export interface FetchPaymentsParams {
  startDate?: string;
  endDate?: string;
  paymentMethod?: PaymentMethod;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  sortBy?: 'paymentDate' | 'amount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Fetches paginated global payments with filters, search, and sorting via GET /api/payments
 */
export async function fetchGlobalPayments(
  params?: FetchPaymentsParams
): Promise<PaginatedPaymentsResponse> {
  const query = new URLSearchParams();
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.paymentMethod) query.set('paymentMethod', params.paymentMethod);
  if (params?.minAmount !== undefined && !isNaN(params.minAmount)) {
    query.set('minAmount', params.minAmount.toString());
  }
  if (params?.maxAmount !== undefined && !isNaN(params.maxAmount)) {
    query.set('maxAmount', params.maxAmount.toString());
  }
  if (params?.search) query.set('search', params.search);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  query.set('_t', Date.now().toString());

  const url = `${API_BASE_URL}/payments?${query.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
    cache: 'no-store',
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMessage = 'Failed to fetch payments';
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

export interface ExportPaymentsParams {
  startDate?: string;
  endDate?: string;
  paymentMethod?: PaymentMethod | 'ALL';
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  sortBy?: 'paymentDate' | 'amount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Downloads an Excel XLSX export file of all payments matching the filter criteria.
 */
export async function downloadPaymentsExcel(params?: ExportPaymentsParams): Promise<void> {
  const query = new URLSearchParams();
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.paymentMethod && params.paymentMethod !== 'ALL') {
    query.set('paymentMethod', params.paymentMethod);
  }
  if (params?.minAmount !== undefined && !isNaN(params.minAmount)) {
    query.set('minAmount', params.minAmount.toString());
  }
  if (params?.maxAmount !== undefined && !isNaN(params.maxAmount)) {
    query.set('maxAmount', params.maxAmount.toString());
  }
  if (params?.search) query.set('search', params.search);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
  query.set('_t', Date.now().toString());

  const url = `${API_BASE_URL}/payments/export?${query.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
    cache: 'no-store',
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMessage = 'Failed to export payments';
    try {
      const errorData = await response.json();
      if (errorData.message) errorMessage = errorData.message;
    } catch {
      // Ignored
    }
    throw new Error(errorMessage);
  }

  // Extract filename from Content-Disposition header if available
  const disposition = response.headers.get('content-disposition');
  let filename = 'payments-export.xlsx';
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match?.[1]) {
      filename = match[1];
    }
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

export interface FetchOutstandingParams {
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: 'outstandingBalance' | 'totalAmount' | 'amountPaid' | 'createdAt' | 'eventName';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Fetches paginated confirmed bookings with unpaid balances via GET /api/bookings/outstanding
 */
export async function fetchOutstandingBookings(
  params?: FetchOutstandingParams
): Promise<PaginatedOutstandingResponse> {
  const query = new URLSearchParams();
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.search) query.set('search', params.search);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  query.set('_t', Date.now().toString());

  const url = `${API_BASE_URL}/bookings/outstanding?${query.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
    cache: 'no-store',
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMessage = 'Failed to fetch outstanding bookings';
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

/**
 * Fetches sanitized Google Drive backup status and schedule info via GET /api/backup/status
 */
export async function fetchBackupStatus(): Promise<BackupStatusResponse> {
  const url = `${API_BASE_URL}/backup/status?_t=${Date.now()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
    cache: 'no-store',
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMessage = 'Failed to fetch backup status';
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
