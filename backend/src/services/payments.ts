import { eq, desc, asc, and, or, ilike, gte, lte, inArray, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import * as schema from '../db/schema/index.js';
import type { CreatePaymentInput, QueryPaymentsInput, ExportPaymentsInput } from '../schemas/payments.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';
import { getIstDayBoundaries } from '../utils/date-ranges.js';
import {
  type ExportPaymentRowItem,
  buildPaymentsExcelWorkbook,
  generatePaymentsExportFilename,
} from './payments-export.js';

export interface PaymentWithReceiver {
  id: string;
  bookingId: string;
  amount: string;
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';
  paymentDate: Date;
  receivedBy: string;
  receiver?: {
    id: string;
    name: string;
    email: string;
  } | null;
  notes: string | null;
  createdAt: Date;
}

export interface GlobalPaymentItem extends PaymentWithReceiver {
  booking: {
    id: string;
    eventName: string;
    contactName: string;
    contactPhone: string;
    eventType: string;
    status: 'CONFIRMED' | 'CANCELLED';
    totalAmount: string;
  };
}

export interface PaginatedPaymentsResult {
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

export class PaymentService {
  /**
   * Records a payment inside an atomic transaction with row locking on the booking record.
   * Prevents race conditions and guarantees that total paid never exceeds the booking amount.
   */
  async createPayment(
    bookingId: string,
    data: CreatePaymentInput,
    userId: string
  ): Promise<PaymentWithReceiver> {
    return await db.transaction(async (tx) => {
      // 1. Lock the booking record with FOR UPDATE to serialize concurrent payment attempts
      const [booking] = await tx
        .select()
        .from(schema.bookings)
        .where(eq(schema.bookings.id, bookingId))
        .for('update');

      if (!booking) {
        throw new NotFoundError(`Booking with ID '${bookingId}' not found`, 'BOOKING_NOT_FOUND');
      }

      if (booking.status === 'CANCELLED') {
        throw new ConflictError(
          'Payments cannot be added to a cancelled booking.',
          'BOOKING_CANCELLED'
        );
      }

      // 2. Fetch all existing recorded payments for this booking
      const existingPayments = await tx
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.bookingId, bookingId));

      const totalPaid = existingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalAmount = Number(booking.totalAmount);
      const balance = Math.max(totalAmount - totalPaid, 0);

      // 3. Validate that the payment amount does not exceed the outstanding balance
      if (data.amount > balance + 0.001) {
        throw new ConflictError(
          `Payment amount (₹${data.amount.toFixed(2)}) exceeds the outstanding balance (₹${balance.toFixed(2)}).`,
          'EXCEEDS_BALANCE',
          {
            totalAmount: totalAmount.toFixed(2),
            totalPaid: totalPaid.toFixed(2),
            balance: balance.toFixed(2),
            requestedAmount: data.amount.toFixed(2),
          }
        );
      }

      // 4. Determine payment date safely
      let paymentDate = new Date();
      if (data.paymentDate) {
        // If YYYY-MM-DD, parse as calendar date without shift
        const parts = data.paymentDate.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          paymentDate = new Date(y, m, d, 12, 0, 0);
        } else {
          paymentDate = new Date(data.paymentDate);
        }
      }

      // 5. Insert the payment record
      const [newPayment] = await tx
        .insert(schema.payments)
        .values({
          bookingId,
          amount: data.amount.toFixed(2),
          paymentMethod: data.paymentMethod,
          paymentDate,
          receivedBy: userId,
          notes: data.notes || null,
        })
        .returning();

      // 6. Record audit log inside the same transaction
      await tx.insert(schema.auditLogs).values({
        userId,
        action: 'PAYMENT_RECORDED',
        bookingId,
        details: {
          paymentId: newPayment.id,
          amount: newPayment.amount,
          paymentMethod: newPayment.paymentMethod,
          bookingTotal: booking.totalAmount,
          previousPaid: totalPaid.toFixed(2),
          newBalance: (balance - data.amount).toFixed(2),
        },
      });

      // 7. Query receiver user information
      let receiver: { id: string; name: string; email: string } | null = null;
      const [receiverUser] = await tx
        .select({
          id: schema.user.id,
          name: schema.user.name,
          email: schema.user.email,
        })
        .from(schema.user)
        .where(eq(schema.user.id, userId))
        .limit(1);

      if (receiverUser) {
        receiver = receiverUser;
      }

      return {
        ...newPayment,
        receiver,
      };
    });
  }

  /**
   * Retrieves all payments for a given booking ordered by createdAt descending.
   */
  async getPaymentsByBookingId(bookingId: string): Promise<PaymentWithReceiver[]> {
    // 1. Verify booking exists
    const [booking] = await db
      .select({ id: schema.bookings.id })
      .from(schema.bookings)
      .where(eq(schema.bookings.id, bookingId))
      .limit(1);

    if (!booking) {
      throw new NotFoundError(`Booking with ID '${bookingId}' not found`, 'BOOKING_NOT_FOUND');
    }

    // 2. Query all payments for this booking
    const paymentsList = await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.bookingId, bookingId))
      .orderBy(desc(schema.payments.createdAt));

    if (paymentsList.length === 0) {
      return [];
    }

    // 3. Query receiver users
    const receiverIds = [...new Set(paymentsList.map((p) => p.receivedBy).filter(Boolean))];
    const receiversMap = new Map<string, { id: string; name: string; email: string }>();

    if (receiverIds.length > 0) {
      const receivers = await db
        .select({
          id: schema.user.id,
          name: schema.user.name,
          email: schema.user.email,
        })
        .from(schema.user)
        .where(inArray(schema.user.id, receiverIds));

      for (const r of receivers) {
        receiversMap.set(r.id, r);
      }
    }

    return paymentsList.map((p) => ({
      ...p,
      receiver: receiversMap.get(p.receivedBy) || null,
    }));
  }

  /**
   * Retrieves paginated payments across all bookings with multi-criteria filtering, search, and sorting.
   */
  async getGlobalPayments(input: QueryPaymentsInput): Promise<PaginatedPaymentsResult> {
    const conditions = [];

    // Date range filtering (by paymentDate in IST day boundaries)
    if (input.startDate) {
      const { startUtc } = getIstDayBoundaries(input.startDate);
      conditions.push(gte(schema.payments.paymentDate, startUtc));
    }
    if (input.endDate) {
      const { endUtc } = getIstDayBoundaries(input.endDate);
      conditions.push(lte(schema.payments.paymentDate, endUtc));
    }

    // Payment method filtering
    if (input.paymentMethod) {
      conditions.push(eq(schema.payments.paymentMethod, input.paymentMethod));
    }

    // Amount range filtering
    if (input.minAmount !== undefined) {
      conditions.push(gte(schema.payments.amount, input.minAmount.toFixed(2)));
    }
    if (input.maxAmount !== undefined) {
      conditions.push(lte(schema.payments.amount, input.maxAmount.toFixed(2)));
    }

    // Search query filtering
    if (input.search && input.search.length > 0) {
      const searchPattern = `%${input.search}%`;
      conditions.push(
        or(
          ilike(schema.bookings.eventName, searchPattern),
          ilike(schema.bookings.contactName, searchPattern),
          ilike(schema.bookings.contactPhone, searchPattern),
          ilike(schema.payments.notes, searchPattern),
          ilike(schema.user.name, searchPattern)
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 1. Get summary count and total amount for matching records
    const [summaryRow] = await db
      .select({
        totalCount: sql<number>`COUNT(*)::int`,
        totalAmount: sql<string>`COALESCE(SUM(${schema.payments.amount}), 0)`,
      })
      .from(schema.payments)
      .innerJoin(schema.bookings, eq(schema.payments.bookingId, schema.bookings.id))
      .leftJoin(schema.user, eq(schema.payments.receivedBy, schema.user.id))
      .where(whereClause);

    const totalItems = summaryRow?.totalCount || 0;
    const totalAmount = Math.round(parseFloat(summaryRow?.totalAmount || '0') * 100) / 100;
    const totalPages = Math.max(1, Math.ceil(totalItems / input.limit));
    const offset = (input.page - 1) * input.limit;

    if (totalItems === 0) {
      return {
        payments: [],
        pagination: {
          page: input.page,
          limit: input.limit,
          totalItems: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
        summary: {
          totalAmount: 0,
          count: 0,
        },
      };
    }

    // 2. Determine sorting
    let orderByClause;
    const sortDir = input.sortOrder === 'asc' ? asc : desc;

    if (input.sortBy === 'amount') {
      orderByClause = [sortDir(schema.payments.amount), desc(schema.payments.paymentDate)];
    } else if (input.sortBy === 'createdAt') {
      orderByClause = [sortDir(schema.payments.createdAt)];
    } else {
      // Default: paymentDate
      orderByClause = [sortDir(schema.payments.paymentDate), desc(schema.payments.createdAt)];
    }

    // 3. Fetch paginated records with joins
    const rows = await db
      .select({
        payment: schema.payments,
        booking: {
          id: schema.bookings.id,
          eventName: schema.bookings.eventName,
          contactName: schema.bookings.contactName,
          contactPhone: schema.bookings.contactPhone,
          eventType: schema.bookings.eventType,
          status: schema.bookings.status,
          totalAmount: schema.bookings.totalAmount,
        },
        receiver: {
          id: schema.user.id,
          name: schema.user.name,
          email: schema.user.email,
        },
      })
      .from(schema.payments)
      .innerJoin(schema.bookings, eq(schema.payments.bookingId, schema.bookings.id))
      .leftJoin(schema.user, eq(schema.payments.receivedBy, schema.user.id))
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(input.limit)
      .offset(offset);

    const payments: GlobalPaymentItem[] = rows.map((r) => ({
      ...r.payment,
      booking: r.booking,
      receiver: r.receiver?.id ? r.receiver : null,
    }));

    return {
      payments,
      pagination: {
        page: input.page,
        limit: input.limit,
        totalItems,
        totalPages,
        hasNextPage: input.page < totalPages,
        hasPrevPage: input.page > 1,
      },
      summary: {
        totalAmount,
        count: totalItems,
      },
    };
  }

  /**
   * Generates a fully formatted Excel workbook for all payments matching the filter criteria.
   */
  async generatePaymentsExcel(
    input: ExportPaymentsInput
  ): Promise<{ buffer: Buffer; filename: string }> {
    const conditions = [];

    // Date range filtering (by paymentDate in IST day boundaries)
    if (input.startDate) {
      const { startUtc } = getIstDayBoundaries(input.startDate);
      conditions.push(gte(schema.payments.paymentDate, startUtc));
    }
    if (input.endDate) {
      const { endUtc } = getIstDayBoundaries(input.endDate);
      conditions.push(lte(schema.payments.paymentDate, endUtc));
    }

    // Payment method filtering
    if (input.paymentMethod) {
      conditions.push(eq(schema.payments.paymentMethod, input.paymentMethod));
    }

    // Amount range filtering
    if (input.minAmount !== undefined) {
      conditions.push(gte(schema.payments.amount, input.minAmount.toFixed(2)));
    }
    if (input.maxAmount !== undefined) {
      conditions.push(lte(schema.payments.amount, input.maxAmount.toFixed(2)));
    }

    // Search query filtering
    if (input.search && input.search.length > 0) {
      const searchPattern = `%${input.search}%`;
      conditions.push(
        or(
          ilike(schema.bookings.eventName, searchPattern),
          ilike(schema.bookings.contactName, searchPattern),
          ilike(schema.bookings.contactPhone, searchPattern),
          ilike(schema.payments.notes, searchPattern),
          ilike(schema.user.name, searchPattern)
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Determine sorting
    let orderByClause;
    const sortDir = input.sortOrder === 'asc' ? asc : desc;

    if (input.sortBy === 'amount') {
      orderByClause = [sortDir(schema.payments.amount), desc(schema.payments.paymentDate)];
    } else if (input.sortBy === 'createdAt') {
      orderByClause = [sortDir(schema.payments.createdAt)];
    } else {
      // Default: paymentDate
      orderByClause = [sortDir(schema.payments.paymentDate), desc(schema.payments.createdAt)];
    }

    // Fetch ALL matching rows (no limit/offset)
    const rows = await db
      .select({
        payment: schema.payments,
        booking: {
          id: schema.bookings.id,
          eventName: schema.bookings.eventName,
          contactName: schema.bookings.contactName,
          contactPhone: schema.bookings.contactPhone,
          eventType: schema.bookings.eventType,
          status: schema.bookings.status,
          totalAmount: schema.bookings.totalAmount,
        },
        receiver: {
          id: schema.user.id,
          name: schema.user.name,
          email: schema.user.email,
        },
      })
      .from(schema.payments)
      .innerJoin(schema.bookings, eq(schema.payments.bookingId, schema.bookings.id))
      .leftJoin(schema.user, eq(schema.payments.receivedBy, schema.user.id))
      .where(whereClause)
      .orderBy(...orderByClause);

    // Retrieve booking dates from booking_sessions for these bookings
    const bookingIds = [...new Set(rows.map((r) => r.booking.id))];
    const bookingDatesMap = new Map<string, string>();

    if (bookingIds.length > 0) {
      const sessions = await db
        .select({
          bookingId: schema.bookingSessions.bookingId,
          bookingDate: schema.bookingSessions.bookingDate,
        })
        .from(schema.bookingSessions)
        .where(inArray(schema.bookingSessions.bookingId, bookingIds))
        .orderBy(asc(schema.bookingSessions.bookingDate));

      for (const s of sessions) {
        if (!bookingDatesMap.has(s.bookingId)) {
          bookingDatesMap.set(s.bookingId, s.bookingDate);
        }
      }
    }

    const exportRows: ExportPaymentRowItem[] = rows.map((r) => ({
      id: r.payment.id,
      paymentDate: r.payment.paymentDate,
      amount: r.payment.amount,
      paymentMethod: r.payment.paymentMethod,
      receivedBy: r.payment.receivedBy,
      receivedByName: r.receiver?.name || r.receiver?.email || 'Manager',
      notes: r.payment.notes,
      booking: {
        ...r.booking,
        bookingDate: bookingDatesMap.get(r.booking.id) || '',
      },
    }));

    const filename = generatePaymentsExportFilename(input);
    const buffer = await buildPaymentsExcelWorkbook(exportRows, input);

    return { buffer, filename };
  }
}

export const paymentService = new PaymentService();
