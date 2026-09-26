import ExcelJS from 'exceljs';
import type { ExportPaymentsInput } from '../schemas/payments.js';

export interface ExportPaymentRowItem {
  id: string;
  paymentDate: Date;
  amount: string;
  paymentMethod: string;
  receivedBy: string;
  receivedByName: string;
  notes: string | null;
  booking: {
    id: string;
    eventName: string;
    contactName: string;
    contactPhone: string;
    eventType: string;
    status: 'CONFIRMED' | 'CANCELLED';
    totalAmount: string;
    bookingDate: string; // Formatted YYYY-MM-DD or primary session date
  };
}

export function generatePaymentsExportFilename(input: ExportPaymentsInput): string {
  const methodStr = input.paymentMethod ? input.paymentMethod.replace(/_/g, '-') : 'all-methods';

  let dateRangeStr = 'all-dates';
  if (input.startDate && input.endDate) {
    dateRangeStr = `${input.startDate}-to-${input.endDate}`;
  } else if (input.startDate) {
    dateRangeStr = `from-${input.startDate}`;
  } else if (input.endDate) {
    dateRangeStr = `until-${input.endDate}`;
  }

  return `payments-${dateRangeStr}-${methodStr}.xlsx`;
}

/**
 * Builds a multi-worksheet Excel workbook containing a "Summary" and "Payments" ledger.
 */
export async function buildPaymentsExcelWorkbook(
  payments: ExportPaymentRowItem[],
  input: ExportPaymentsInput,
  generatedAt: Date = new Date()
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Oruma Avenue Auditorium Management System';
  workbook.created = generatedAt;
  workbook.modified = generatedAt;

  // Formatter for readable IST time
  const istTimeStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(generatedAt).replace(',', '') + ' IST';

  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // ==========================================
  // WORKSHEET 1: SUMMARY
  // ==========================================
  const summarySheet = workbook.addWorksheet('Summary', {
    properties: { tabColor: { argb: 'FF4F46E5' } },
    views: [{ showGridLines: true }],
  });

  summarySheet.columns = [
    { key: 'label', width: 28 },
    { key: 'value', width: 42 },
  ];

  // Title Block
  const titleRow = summarySheet.addRow(['ORUMA AVENUE AUDITORIUM']);
  titleRow.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF1E293B' } };
  titleRow.height = 24;

  const subtitleRow = summarySheet.addRow(['Payments & Financial Collections Report']);
  subtitleRow.font = { name: 'Segoe UI', size: 11, italic: true, color: { argb: 'FF64748B' } };
  subtitleRow.height = 18;

  summarySheet.addRow([]); // Blank line

  // Summary Table Header
  const summaryHeaderRow = summarySheet.addRow(['Report Parameter', 'Filter / Value']);
  summaryHeaderRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  summaryHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };
  summaryHeaderRow.height = 24;

  // Metadata Rows
  const dateRangeDisplay =
    input.startDate && input.endDate
      ? `${input.startDate} to ${input.endDate}`
      : input.startDate
      ? `From ${input.startDate}`
      : input.endDate
      ? `Until ${input.endDate}`
      : 'All Recorded Dates';

  const methodDisplay = input.paymentMethod || 'All Payment Methods';
  const searchDisplay = input.search ? `"${input.search}"` : 'None (All Records)';
  const minAmtDisplay = input.minAmount !== undefined ? `₹${input.minAmount.toFixed(2)}` : 'None';
  const maxAmtDisplay = input.maxAmount !== undefined ? `₹${input.maxAmount.toFixed(2)}` : 'None';
  const sortDisplay = `${input.sortBy} (${input.sortOrder.toUpperCase()})`;

  const metadataRows: [string, string | number][] = [
    ['Export Generated At', istTimeStr],
    ['Selected Date Range', dateRangeDisplay],
    ['Payment Method Filter', methodDisplay],
    ['Search Text Query', searchDisplay],
    ['Minimum Amount Filter', minAmtDisplay],
    ['Maximum Amount Filter', maxAmtDisplay],
    ['Sort Order', sortDisplay],
    ['Total Transactions Count', payments.length],
    ['Total Amount Collected (₹)', totalAmount],
  ];

  for (const [label, value] of metadataRows) {
    const row = summarySheet.addRow([label, value]);
    row.height = 20;
    row.getCell(1).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF334155' } };
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    row.getCell(1).border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };

    const valCell = row.getCell(2);
    valCell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF0F172A' } };
    valCell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };

    // Format total amount with currency in Summary
    if (label.includes('Total Amount Collected')) {
      valCell.numFmt = '"₹"#,##0.00';
      valCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF059669' } };
    } else if (label.includes('Total Transactions Count')) {
      valCell.font = { name: 'Segoe UI', size: 10, bold: true };
    }
  }

  // ==========================================
  // WORKSHEET 2: PAYMENTS
  // ==========================================
  const paymentsSheet = workbook.addWorksheet('Payments', {
    properties: { tabColor: { argb: 'FF059669' } },
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
  });

  paymentsSheet.columns = [
    { header: 'Payment Date', key: 'paymentDate', width: 15 },
    { header: 'Event Name', key: 'eventName', width: 28 },
    { header: 'Customer Name', key: 'customerName', width: 22 },
    { header: 'Contact Phone', key: 'contactPhone', width: 16 },
    { header: 'Booking Date', key: 'bookingDate', width: 15 },
    { header: 'Payment Method', key: 'paymentMethod', width: 18 },
    { header: 'Amount (₹)', key: 'amount', width: 18 },
    { header: 'Received By', key: 'receivedBy', width: 20 },
    { header: 'Notes', key: 'notes', width: 30 },
    { header: 'Booking Status', key: 'status', width: 16 },
  ];

  // Header Styling
  const tableHeaderRow = paymentsSheet.getRow(1);
  tableHeaderRow.height = 26;
  tableHeaderRow.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } },
    };
  });

  // Enable AutoFilter on row 1 (A1:J1)
  paymentsSheet.autoFilter = 'A1:J1';

  // Add Data Rows
  payments.forEach((p, idx) => {
    // Parse Payment Date to Excel Date
    let pDate: Date | null = null;
    if (p.paymentDate instanceof Date && !isNaN(p.paymentDate.getTime())) {
      pDate = p.paymentDate;
    } else if (typeof p.paymentDate === 'string') {
      const parsed = new Date(p.paymentDate);
      if (!isNaN(parsed.getTime())) pDate = parsed;
    }

    // Parse Booking Date to Excel Date or string
    let bDate: Date | string = p.booking.bookingDate || '';
    if (typeof bDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(bDate)) {
      const [y, m, d] = bDate.split('-').map(Number);
      bDate = new Date(Date.UTC(y, m - 1, d));
    }

    const numAmount = Number(p.amount) || 0;

    const row = paymentsSheet.addRow({
      paymentDate: pDate,
      eventName: p.booking.eventName,
      customerName: p.booking.contactName,
      contactPhone: p.booking.contactPhone,
      bookingDate: bDate,
      paymentMethod: p.paymentMethod,
      amount: numAmount,
      receivedBy: p.receivedByName || p.receivedBy || 'Manager',
      notes: p.notes || '',
      status: p.booking.status,
    });

    row.height = 20;

    // Zebra striping: alternate background
    const isEven = idx % 2 === 0;
    const rowFill: ExcelJS.Fill = isEven
      ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
      : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.fill = rowFill;
      cell.border = borderStyle;
      cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF0F172A' } };

      // Alignments & formats per column
      if (colNumber === 1) {
        // Payment Date
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.numFmt = 'yyyy-mm-dd';
      } else if (colNumber === 2) {
        // Event Name
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      } else if (colNumber === 3) {
        // Customer Name
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else if (colNumber === 4) {
        // Contact Phone
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNumber === 5) {
        // Booking Date
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        if (cell.value instanceof Date) {
          cell.numFmt = 'yyyy-mm-dd';
        }
      } else if (colNumber === 6) {
        // Payment Method
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF4338CA' } };
      } else if (colNumber === 7) {
        // Amount (Numeric with Currency format)
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '"₹"#,##0.00';
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF059669' } };
      } else if (colNumber === 8) {
        // Received By
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else if (colNumber === 9) {
        // Notes
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else if (colNumber === 10) {
        // Status
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = {
          name: 'Segoe UI',
          size: 9,
          bold: true,
          color: { argb: p.booking.status === 'CONFIRMED' ? 'FF059669' : 'FFE11D48' },
        };
      }
    });
  });

  // Total Summary Row at bottom of Payments sheet if rows exist
  if (payments.length > 0) {
    const totalRowIndex = payments.length + 2;
    const totalRow = paymentsSheet.addRow({
      paymentMethod: 'TOTAL',
      amount: totalAmount,
    });
    totalRow.height = 24;

    totalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'double', color: { argb: 'FF475569' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      if (colNumber === 6) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1E293B' } };
      } else if (colNumber === 7) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '"₹"#,##0.00';
        cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF059669' } };
        // Use formula for Excel calculations
        cell.value = { formula: `SUM(G2:G${totalRowIndex - 1})`, result: totalAmount };
      }
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
