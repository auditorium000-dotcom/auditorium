import { z } from 'zod';
import type { DateRangePreset } from '../utils/date-ranges.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const dateRangePresetEnum = z.enum([
  'TODAY',
  'THIS_WEEK',
  'THIS_MONTH',
  'LAST_MONTH',
  'THIS_YEAR',
  'CUSTOM',
]);

export const dashboardAnalyticsQuerySchema = z
  .object({
    preset: dateRangePresetEnum.optional(),
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
  })
  .superRefine((data, ctx) => {
    if (data.preset === 'CUSTOM') {
      if (!data.startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'startDate is required when preset is CUSTOM',
          path: ['startDate'],
        });
      }
      if (!data.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'endDate is required when preset is CUSTOM',
          path: ['endDate'],
        });
      }
    }
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'startDate cannot be after endDate',
        path: ['startDate'],
      });
    }
  });

export const queryMonthlyAnalyticsSchema = z.object({
  year: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : new Date().getFullYear()))
    .pipe(z.number().min(2000).max(2100)),
});

export type DashboardAnalyticsQueryInput = z.infer<typeof dashboardAnalyticsQuerySchema>;
