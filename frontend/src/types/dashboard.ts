import type { PaymentMethod } from './payment';

export type DateRangePreset =
  | 'TODAY'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_YEAR'
  | 'CUSTOM';

export interface DateRangeState {
  preset: DateRangePreset;
  startDate: string;
  endDate: string;
}

export interface DashboardAnalytics {
  period: {
    preset: string;
    startDate: string;
    endDate: string;
  };
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  totalBookingValue: number;
  totalAmountCollected: number;
  outstandingAmount: number;
  todayBookingsCount: number;
  periodRevenue: number;
  kpis?: {
    totalBookings: number;
    confirmedBookings: number;
    cancelledBookings: number;
    totalBookingValue: number;
    totalAmountCollected: number;
    outstandingAmount: number;
    todayBookingsCount: number;
    periodRevenue: number;
  };
  paymentMethodBreakdown: {
    method: PaymentMethod;
    amount: number;
    count: number;
    percentage: number;
  }[];
  sessionCounts: {
    morning: number;
    evening: number;
    total: number;
  };
}

export interface GlobalPaymentItem {
  id: string;
  bookingId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  receivedBy: string;
  notes: string | null;
  createdAt: string;
  booking: {
    id: string;
    eventName: string;
    contactName: string;
    contactPhone: string;
    eventType: string;
    status: 'CONFIRMED' | 'CANCELLED';
    totalAmount: string;
  };
  receiver?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface PaginatedPaymentsResponse {
  payments: GlobalPaymentItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  summary: {
    totalAmount: number;
    count: number;
  };
}

export interface OutstandingBookingSession {
  id: string;
  bookingDate: string;
  session: 'MORNING' | 'EVENING';
  status: 'BOOKED' | 'CANCELLED';
  startTime: string | null;
  endTime: string | null;
}

export interface OutstandingBookingItem {
  id: string;
  eventName: string;
  contactName: string;
  contactPhone: string;
  eventType: string;
  bookingDate: string;
  status: 'CONFIRMED' | 'CANCELLED';
  totalAmount: string;
  advanceAmount: string | null;
  amountPaid: string;
  outstandingBalance: string;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sessions: OutstandingBookingSession[];
}

export interface PaginatedOutstandingResponse {
  bookings: OutstandingBookingItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  summary: {
    totalOutstanding: number;
    totalBookingValue: number;
    totalPaid: number;
    count: number;
  };
}

export interface BackupFileInfo {
  fileId: string;
  fileName: string;
  createdAt: string;
  sizeBytes: number;
  mimeType?: string;
}

export interface BackupStatusResponse {
  success: boolean;
  googleDriveConnected: boolean;
  cronSchedule: string;
  cronScheduleDescription: string;
  nextScheduledBackupIst: string;
  latestBackup: {
    createdAt: string;
    createdAtIst?: string;
    jsonFile?: BackupFileInfo;
    excelFile?: BackupFileInfo;
  } | null;
  cached?: boolean;
}
