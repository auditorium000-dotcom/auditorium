export type PaymentMethod = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';

export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';

export interface Payment {
  id: string;
  bookingId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  receivedBy: string;
  receiver?: {
    id: string;
    name: string;
    email: string;
  } | null;
  notes: string | null;
  createdAt: string;
}

export interface CreatePaymentPayload {
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string;
  notes?: string | null;
}

export interface PaymentSummary {
  totalAmount: number;
  totalPaid: number;
  balance: number;
  status: PaymentStatus;
}
