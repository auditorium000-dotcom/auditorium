import { eq, desc, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import * as schema from '../db/schema/index.js';
import type { CreatePaymentInput } from '../schemas/payments.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';

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
}

export const paymentService = new PaymentService();
