import { z } from 'zod';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const paymentMethodEnumValues = [
  'CASH',
  'UPI',
  'BANK_TRANSFER',
  'CHEQUE',
  'OTHER',
] as const;

export const createPaymentSchema = z.object({
  amount: z.coerce.number().positive('Payment amount must be greater than 0'),
  paymentMethod: z.enum(paymentMethodEnumValues, {
    errorMap: () => ({
      message:
        "Payment method must be one of: 'CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'",
    }),
  }),
  paymentDate: z.string().trim().optional(),
  notes: z.string().trim().nullable().optional(),
});

export const bookingIdParamSchema = z.object({
  id: z.string().uuid('Invalid booking UUID parameter'),
});

export const paymentSortByEnum = z.enum(['paymentDate', 'amount', 'createdAt']);
export const sortOrderEnum = z.enum(['asc', 'desc']);

export const queryPaymentsSchema = z
  .object({
    startDate: z
      .string()
      .trim()
      .regex(DATE_REGEX, 'startDate must be formatted as YYYY-MM-DD')
      .optional(),
    endDate: z
      .string()
      .trim()
      .regex(DATE_REGEX, 'endDate must be formatted as YYYY-MM-DD')
      .optional(),
    paymentMethod: z.enum(paymentMethodEnumValues).optional(),
    minAmount: z.coerce.number().min(0, 'minAmount must be >= 0').optional(),
    maxAmount: z.coerce.number().min(0, 'maxAmount must be >= 0').optional(),
    search: z.string().trim().optional(),
    sortBy: paymentSortByEnum.default('paymentDate'),
    sortOrder: sortOrderEnum.default('desc'),
    page: z.coerce.number().int().min(1, 'page must be >= 1').default(1),
    limit: z.coerce.number().int().min(1, 'limit must be >= 1').max(100, 'limit cannot exceed 100').default(25),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'startDate cannot be after endDate',
        path: ['startDate'],
      });
    }
    if (
      data.minAmount !== undefined &&
      data.maxAmount !== undefined &&
      data.minAmount > data.maxAmount
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'minAmount cannot be greater than maxAmount',
        path: ['minAmount'],
      });
    }
  });

export const exportPaymentsSchema = z
  .object({
    startDate: z
      .string()
      .trim()
      .regex(DATE_REGEX, 'startDate must be formatted as YYYY-MM-DD')
      .optional(),
    endDate: z
      .string()
      .trim()
      .regex(DATE_REGEX, 'endDate must be formatted as YYYY-MM-DD')
      .optional(),
    paymentMethod: z.enum(paymentMethodEnumValues).optional(),
    minAmount: z.coerce.number().min(0, 'minAmount must be >= 0').optional(),
    maxAmount: z.coerce.number().min(0, 'maxAmount must be >= 0').optional(),
    search: z.string().trim().optional(),
    sortBy: paymentSortByEnum.default('paymentDate'),
    sortOrder: sortOrderEnum.default('desc'),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'startDate cannot be after endDate',
        path: ['startDate'],
      });
    }
    if (
      data.minAmount !== undefined &&
      data.maxAmount !== undefined &&
      data.minAmount > data.maxAmount
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'minAmount cannot be greater than maxAmount',
        path: ['minAmount'],
      });
    }
  });

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type BookingIdParamInput = z.infer<typeof bookingIdParamSchema>;
export type QueryPaymentsInput = z.infer<typeof queryPaymentsSchema>;
export type ExportPaymentsInput = z.infer<typeof exportPaymentsSchema>;
