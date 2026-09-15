import { z } from 'zod';

export const paymentMethodEnumValues = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'] as const;

export const createPaymentSchema = z.object({
  amount: z.coerce
    .number()
    .positive('Payment amount must be greater than 0'),
  paymentMethod: z.enum(paymentMethodEnumValues, {
    errorMap: () => ({
      message: "Payment method must be one of: 'CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'",
    }),
  }),
  paymentDate: z
    .string()
    .trim()
    .optional(),
  notes: z.string().trim().nullable().optional(),
});

export const bookingIdParamSchema = z.object({
  id: z.string().uuid('Invalid booking UUID parameter'),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type BookingIdParamInput = z.infer<typeof bookingIdParamSchema>;
