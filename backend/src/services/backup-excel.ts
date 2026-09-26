import ExcelJS from 'exceljs';
import type { DatabaseBackupPayload } from './backup.js';

export interface IstTimestampInfo {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
  timestampStr: string;
  readableIst: string;
  jsonFileName: string;
  excelFileName: string;
}

/**
 * Converts a UTC Date object into IST (Asia/Kolkata) formatted components
 * and standardized filenames for both JSON and Excel backups.
 */
export function getIstTimestampInfo(date: Date): IstTimestampInfo {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const find = (type: string) => parts.find((p) => p.type === type)?.value || '';

  const year = find('year');
  const month = find('month');
  const day = find('day');
  let hour = find('hour');
  if (hour === '24') hour = '00';
  const minute = find('minute');
  const second = find('second');

  const timestampStr = `${year}-${month}-${day}-${hour}${minute}${second}`;
  const readableIst = `${year}-${month}-${day} ${hour}:${minute}:${second} IST`;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    timestampStr,
    readableIst,
    jsonFileName: `auditorium-backup-${timestampStr}.json`,
    excelFileName: `auditorium-report-${timestampStr}.xlsx`,
  };
}

function toExcelDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const d = new Date(val as string);
  return isNaN(d.getTime()) ? null : d;
}

function toNumber(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
}

function toNullableNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

/**
 * Standard table header styling for consistent, high-contrast readability.
 */
const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E293B' }, // Slate 800
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: 'Segoe UI',
  size: 11,
  bold: true,
  color: { argb: 'FFFFFFFF' },
};

const HEADER_ALIGNMENT: Partial<ExcelJS.Alignment> = {
  vertical: 'middle',
  horizontal: 'left',
};

const DATA_FONT: Partial<ExcelJS.Font> = {
  name: 'Segoe UI',
  size: 10,
};

/**
 * Applies header styling, frozen top pane, and AutoFilter to a worksheet table.
 */
function styleDataTable(
  worksheet: ExcelJS.Worksheet,
  lastColumnLetter: string,
  minWidth = 12,
  maxWidth = 45
) {
  // Freeze top row
  worksheet.views = [{ state: 'frozen', ySplit: 1, showGridLines: true }];

  // Enable AutoFilter on header row
  worksheet.autoFilter = `A1:${lastColumnLetter}1`;

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = HEADER_ALIGNMENT;
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
    };
  });

  // Style data rows and calculate reasonable column widths
  worksheet.columns.forEach((column) => {
    let maxLen = column.header ? column.header.toString().length : 10;

    if (column.values) {
      for (let i = 2; i < column.values.length; i++) {
        const val = column.values[i];
        if (val === null || val === undefined) continue;

        let cellStr = '';
        if (val instanceof Date) {
          cellStr = '2026-00-00 00:00:00';
        } else if (typeof val === 'object') {
          cellStr = JSON.stringify(val);
        } else {
          cellStr = String(val);
        }

        if (cellStr.length > maxLen) {
          maxLen = cellStr.length;
        }
      }
    }

    column.width = Math.max(minWidth, Math.min(maxLen + 3, maxWidth));
  });

  // Apply row height and base font to data rows
  for (let r = 2; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    row.height = 20;
    row.eachCell({ includeEmpty: true }, (cell) => {
      if (!cell.font) {
        cell.font = DATA_FONT;
      }
      if (!cell.alignment) {
        cell.alignment = { vertical: 'middle' };
      }
    });
  }
}

/**
 * Generates an Excel workbook containing 9 structured worksheets matching the point-in-time
 * database snapshot. Sensitive authentication credentials and tokens are strictly redacted.
 */
export async function generateExcelWorkbook(
  payload: DatabaseBackupPayload,
  istInfo?: IstTimestampInfo
): Promise<Buffer> {
  const info = istInfo || getIstTimestampInfo(new Date(payload.createdAt));
  const workbook = new ExcelJS.Workbook();

  workbook.creator = 'Oruma Avenue Auditorium Backup System';
  workbook.lastModifiedBy = 'Oruma Avenue Auditorium Backup System';
  workbook.created = new Date(payload.createdAt);
  workbook.modified = new Date();

  // ---------------------------------------------------------------------------
  // 1. SUMMARY WORKSHEET
  // ---------------------------------------------------------------------------
  const summarySheet = workbook.addWorksheet('Summary', {
    views: [{ showGridLines: true }],
  });

  summarySheet.columns = [
    { key: 'colA', width: 28 },
    { key: 'colB', width: 38 },
    { key: 'colC', width: 34 },
  ];

  // Title Banner
  summarySheet.mergeCells('A1:C1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'ORUMA AVENUE AUDITORIUM — DATABASE REPORT';
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' },
  };
  titleCell.font = {
    name: 'Segoe UI',
    size: 13,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(1).height = 32;

  // Calculate Metrics safely from existing snapshot
  const totalPaymentsAmount = payload.tables.payments.reduce(
    (sum, p) => sum + toNumber(p.amount),
    0
  );
  const totalBookingsAmount = payload.tables.bookings.reduce(
    (sum, b) => sum + toNumber(b.totalAmount),
    0
  );
  const totalAdvanceAmount = payload.tables.bookings.reduce(
    (sum, b) => sum + toNumber(b.advanceAmount),
    0
  );
  const confirmedBookingsCount = payload.tables.bookings.filter(
    (b) => b.status === 'CONFIRMED'
  ).length;
  const cancelledBookingsCount = payload.tables.bookings.filter(
    (b) => b.status === 'CANCELLED'
  ).length;

  const sectionHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2E8F0' }, // Slate 200
  };
  const sectionHeaderFont: Partial<ExcelJS.Font> = {
    name: 'Segoe UI',
    size: 11,
    bold: true,
    color: { argb: 'FF0F172A' },
  };

  let currentRow = 3;

  // Helper for adding section headers
  const addSectionHeader = (title: string) => {
    summarySheet.mergeCells(`A${currentRow}:C${currentRow}`);
    const cell = summarySheet.getCell(`A${currentRow}`);
    cell.value = title;
    cell.fill = sectionHeaderFill;
    cell.font = sectionHeaderFont;
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    summarySheet.getRow(currentRow).height = 24;
    currentRow++;
  };

  // Helper for adding key-value rows
  const addKeyValueRow = (
    label: string,
    value: string | number,
    note: string,
    numFmt?: string
  ) => {
    const row = summarySheet.getRow(currentRow);
    row.height = 20;

    const cellA = row.getCell(1);
    cellA.value = label;
    cellA.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF334155' } };
    cellA.alignment = { vertical: 'middle' };

    const cellB = row.getCell(2);
    cellB.value = value;
    cellB.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF0F172A' } };
    cellB.alignment = { vertical: 'middle', horizontal: typeof value === 'number' ? 'right' : 'left' };
    if (numFmt) cellB.numFmt = numFmt;

    const cellC = row.getCell(3);
    cellC.value = note;
    cellC.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    cellC.alignment = { vertical: 'middle' };

    currentRow++;
  };

  // Section 1: System & Snapshot Metadata
  addSectionHeader('1. Snapshot & Environment Metadata');
  addKeyValueRow('Application', 'Oruma Avenue Auditorium', 'Production System');
  addKeyValueRow('Database Name', payload.database, 'PostgreSQL (Neon)');
  addKeyValueRow('Backup Version', payload.backupVersion, 'Standard Snapshot Format');
  addKeyValueRow('Snapshot Timestamp (ISO)', payload.createdAt, 'Universal UTC Time');
  addKeyValueRow('Snapshot Timestamp (IST)', info.readableIst, 'Asia/Kolkata Local Time');
  currentRow++; // spacer

  // Section 2: Financial & Operational Metrics
  addSectionHeader('2. Key Business & Financial Metrics');
  addKeyValueRow(
    'Total Payments Recorded',
    totalPaymentsAmount,
    'Numeric sum of all recorded payments',
    '#,##0.00'
  );
  addKeyValueRow(
    'Total Booking Value',
    totalBookingsAmount,
    'Numeric sum of all booking values',
    '#,##0.00'
  );
  addKeyValueRow(
    'Total Advance Received',
    totalAdvanceAmount,
    'Numeric sum of recorded advances',
    '#,##0.00'
  );
  addKeyValueRow('Total Bookings Count', payload.tables.bookings.length, 'All time bookings count');
  addKeyValueRow('Confirmed Bookings', confirmedBookingsCount, 'Active / confirmed bookings');
  addKeyValueRow('Cancelled Bookings', cancelledBookingsCount, 'Cancelled bookings');
  addKeyValueRow(
    'Total Reserved Sessions',
    payload.tables.booking_sessions.length,
    'Total Morning/Evening session slots'
  );
  currentRow++; // spacer

  // Section 3: Database Table Record Counts
  addSectionHeader('3. Database Table Record Summary');

  // Sub-header for tables
  const tableHeaderRow = summarySheet.getRow(currentRow);
  tableHeaderRow.height = 22;
  tableHeaderRow.getCell(1).value = 'Table Name';
  tableHeaderRow.getCell(2).value = 'Record Count';
  tableHeaderRow.getCell(3).value = 'Worksheet / Purpose';
  for (let c = 1; c <= 3; c++) {
    const cell = tableHeaderRow.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: c === 2 ? 'right' : 'left' };
  }
  currentRow++;

  const tableRowsConfig = [
    { name: 'user', count: payload.tables.user.length, desc: 'Users Sheet (Application Users)' },
    { name: 'account', count: payload.tables.account.length, desc: 'Accounts Sheet (Sanitized Auth Accounts)' },
    { name: 'session', count: payload.tables.session.length, desc: 'Sessions Sheet (Sanitized User Sessions)' },
    { name: 'verification', count: payload.tables.verification.length, desc: 'Verifications Sheet (Sanitized Tokens)' },
    { name: 'bookings', count: payload.tables.bookings.length, desc: 'Bookings Sheet (Customer Bookings)' },
    { name: 'booking_sessions', count: payload.tables.booking_sessions.length, desc: 'Booking Sessions Sheet (Slot Allocations)' },
    { name: 'payments', count: payload.tables.payments.length, desc: 'Payments Sheet (Transaction Records)' },
    { name: 'audit_logs', count: payload.tables.audit_logs.length, desc: 'Audit Logs Sheet (System Activity Trail)' },
  ];

  for (const t of tableRowsConfig) {
    addKeyValueRow(t.name, t.count, t.desc, '#,##0');
  }

  currentRow++; // spacer
  summarySheet.mergeCells(`A${currentRow}:C${currentRow}`);
  const footerCell = summarySheet.getCell(`A${currentRow}`);
  footerCell.value =
    '🔒 Security Notice: Passwords, OAuth secrets, session tokens, and connection strings are strictly redacted in this report.';
  footerCell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
  footerCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // ---------------------------------------------------------------------------
  // 2. BOOKINGS WORKSHEET
  // ---------------------------------------------------------------------------
  const bookingsSheet = workbook.addWorksheet('Bookings');
  bookingsSheet.columns = [
    { header: 'Booking ID', key: 'id' },
    { header: 'Event Name', key: 'eventName' },
    { header: 'Customer Name', key: 'contactName' },
    { header: 'Contact Phone', key: 'contactPhone' },
    { header: 'Event Type', key: 'eventType' },
    { header: 'Total Amount', key: 'totalAmount', style: { numFmt: '#,##0.00' } },
    { header: 'Advance Amount', key: 'advanceAmount', style: { numFmt: '#,##0.00' } },
    { header: 'Status', key: 'status' },
    { header: 'Notes', key: 'notes' },
    { header: 'Created By', key: 'createdBy' },
    { header: 'Created At', key: 'createdAt', style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
    { header: 'Updated At', key: 'updatedAt', style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
  ];

  for (const b of payload.tables.bookings) {
    bookingsSheet.addRow({
      id: b.id,
      eventName: b.eventName,
      contactName: b.contactName,
      contactPhone: b.contactPhone,
      eventType: b.eventType,
      totalAmount: toNumber(b.totalAmount),
      advanceAmount: toNullableNumber(b.advanceAmount),
      status: b.status,
      notes: b.notes ?? '',
      createdBy: b.createdBy,
      createdAt: toExcelDate(b.createdAt),
      updatedAt: toExcelDate(b.updatedAt),
    });
  }
  styleDataTable(bookingsSheet, 'L');

  // ---------------------------------------------------------------------------
  // 3. BOOKING SESSIONS WORKSHEET
  // ---------------------------------------------------------------------------
  const sessionsSheet = workbook.addWorksheet('Booking Sessions');
  sessionsSheet.columns = [
    { header: 'Session ID', key: 'id' },
    { header: 'Booking ID', key: 'bookingId' },
    { header: 'Booking Date', key: 'bookingDate' },
    { header: 'Session', key: 'session' },
    { header: 'Start Time', key: 'startTime' },
    { header: 'End Time', key: 'endTime' },
    { header: 'Status', key: 'status' },
    { header: 'Created At', key: 'createdAt', style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
    { header: 'Updated At', key: 'updatedAt', style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
  ];

  for (const s of payload.tables.booking_sessions) {
    sessionsSheet.addRow({
      id: s.id,
      bookingId: s.bookingId,
      bookingDate: s.bookingDate,
      session: s.session,
      startTime: s.startTime ?? '',
      endTime: s.endTime ?? '',
      status: s.status,
      createdAt: toExcelDate(s.createdAt),
      updatedAt: toExcelDate(s.updatedAt),
    });
  }
  styleDataTable(sessionsSheet, 'I');

  // ---------------------------------------------------------------------------
  // 4. PAYMENTS WORKSHEET
  // ---------------------------------------------------------------------------
  const paymentsSheet = workbook.addWorksheet('Payments');
  paymentsSheet.columns = [
    { header: 'Payment ID', key: 'id' },
    { header: 'Booking ID', key: 'bookingId' },
    { header: 'Amount', key: 'amount', style: { numFmt: '#,##0.00' } },
    { header: 'Payment Method', key: 'paymentMethod' },
    { header: 'Payment Date', key: 'paymentDate', style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
    { header: 'Received By', key: 'receivedBy' },
    { header: 'Notes', key: 'notes' },
    { header: 'Created At', key: 'createdAt', style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
  ];

  for (const p of payload.tables.payments) {
    paymentsSheet.addRow({
      id: p.id,
      bookingId: p.bookingId,
      amount: toNumber(p.amount), // Numeric amount for calculations
      paymentMethod: p.paymentMethod, // Filterable enum value (CASH, UPI, etc.)
      paymentDate: toExcelDate(p.paymentDate),
      receivedBy: p.receivedBy,
      notes: p.notes ?? '',
      createdAt: toExcelDate(p.createdAt),
    });
  }
  styleDataTable(paymentsSheet, 'H');

  // ---------------------------------------------------------------------------
  // 5. USERS WORKSHEET
  // ---------------------------------------------------------------------------
  const usersSheet = workbook.addWorksheet('Users');
  usersSheet.columns = [
    { header: 'User ID', key: 'id' },
    { header: 'Name', key: 'name' },
    { header: 'Email', key: 'email' },
    { header: 'Email Verified', key: 'emailVerified' },
    { header: 'Image URL', key: 'image' },
    { header: 'Created At', key: 'createdAt', style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
    { header: 'Updated At', key: 'updatedAt', style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
  ];

  for (const u of payload.tables.user) {
    usersSheet.addRow({
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerified: u.emailVerified ? 'TRUE' : 'FALSE',
      image: u.image ?? '',
      createdAt: toExcelDate(u.createdAt),
      updatedAt: toExcelDate(u.updatedAt),
    });
  }
  styleDataTable(usersSheet, 'G');

  // ---------------------------------------------------------------------------
  // 6. ACCOUNTS WORKSHEET (Sanitized)
  // ---------------------------------------------------------------------------
  const accountsSheet = workbook.addWorksheet('Accounts');
  accountsSheet.columns = [
    { header: 'Account ID', key: 'id' },
    { header: 'User ID', key: 'userId' },
    { header: 'Provider ID', key: 'providerId' },
    { header: 'Account Provider ID', key: 'accountId' },
    { header: 'Scope', key: 'scope' },
    { header: 'Access Token', key: 'accessToken' },
    { header: 'Refresh Token', key: 'refreshToken' },
    { header: 'ID Token', key: 'idToken' },
    { header: 'Password Hash', key: 'password' },
    { header: 'Access Token Expires At', key: 'accessTokenExpiresAt', style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
    { header: 'Refresh Token Expires At', key: 'refreshTokenExpiresAt', style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
    { header: 'Created At', key: 'createdAt', style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
    { header: 'Updated At', key: 'updatedAt', style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
  ];

  for (const a of payload.tables.account) {
    accountsSheet.addRow({
      id: a.id,
      userId: a.userId,
      providerId: a.providerId,
      accountId: a.accountId,
      scope: a.scope ?? '',
      accessToken: a.accessToken ? '[REDACTED]' : '',
      refreshToken: a.refreshToken ? '[REDACTED]' : '',
      idToken: a.idToken ? '[REDACTED]' : '',
      password: a.password ? '[REDACTED]' : '',
      accessTokenExpiresAt: toExcelDate(a.accessTokenExpiresAt),
      refreshTokenExpiresAt: toExcelDate(a.refreshTokenExpiresAt),
      createdAt: toExcelDate(a.createdAt),
      updatedAt: toExcelDate(a.updatedAt),
    });
  }
  styleDataTable(accountsSheet, 'M');

  // ---------------------------------------------------------------------------
  // 7. SESSIONS WORKSHEET (Sanitized)
  // ---------------------------------------------------------------------------
  const userSessionsSheet = workbook.addWorksheet('Sessions');
  userSessionsSheet.columns = [
    { header: 'Session ID', key: 'id' },
    { header: 'User ID', key: 'userId' },
    { header: 'Session Token', key: 'token' },
    { header: 'Expires At', key: 'expiresAt', style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
    { header: 'IP Address', key: 'ipAddress' },
    { header: 'User Agent', key: 'userAgent' },
    { header: 'Created At', key: 'createdAt', style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
    { header: 'Updated At', key: 'updatedAt', style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
  ];

  for (const s of payload.tables.session) {
    userSessionsSheet.addRow({
      id: s.id,
      userId: s.userId,
      token: s.token ? '[REDACTED]' : '',
      expiresAt: toExcelDate(s.expiresAt),
      ipAddress: s.ipAddress ?? '',
      userAgent: s.userAgent ?? '',
      createdAt: toExcelDate(s.createdAt),
      updatedAt: toExcelDate(s.updatedAt),
    });
  }
  styleDataTable(userSessionsSheet, 'H');

  // ---------------------------------------------------------------------------
  // 8. VERIFICATIONS WORKSHEET (Sanitized)
  // ---------------------------------------------------------------------------
  const verificationsSheet = workbook.addWorksheet('Verifications');
  verificationsSheet.columns = [
    { header: 'Verification ID', key: 'id' },
    { header: 'Identifier', key: 'identifier' },
    { header: 'Value', key: 'value' },
    { header: 'Expires At', key: 'expiresAt', style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
    { header: 'Created At', key: 'createdAt', style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
    { header: 'Updated At', key: 'updatedAt', style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
  ];

  for (const v of payload.tables.verification) {
    verificationsSheet.addRow({
      id: v.id,
      identifier: v.identifier,
      value: v.value ? '[REDACTED]' : '',
      expiresAt: toExcelDate(v.expiresAt),
      createdAt: toExcelDate(v.createdAt),
      updatedAt: toExcelDate(v.updatedAt),
    });
  }
  styleDataTable(verificationsSheet, 'F');

  // ---------------------------------------------------------------------------
  // 9. AUDIT LOGS WORKSHEET
  // ---------------------------------------------------------------------------
  const auditLogsSheet = workbook.addWorksheet('Audit Logs');
  auditLogsSheet.columns = [
    { header: 'Log ID', key: 'id' },
    { header: 'User ID', key: 'userId' },
    { header: 'Action', key: 'action' },
    { header: 'Booking ID', key: 'bookingId' },
    { header: 'Details', key: 'details' },
    { header: 'Created At', key: 'createdAt', style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
  ];

  for (const l of payload.tables.audit_logs) {
    const detailsStr =
      l.details !== null && l.details !== undefined
        ? typeof l.details === 'object'
          ? JSON.stringify(l.details)
          : String(l.details)
        : '';

    auditLogsSheet.addRow({
      id: l.id,
      userId: l.userId,
      action: l.action,
      bookingId: l.bookingId ?? '',
      details: detailsStr,
      createdAt: toExcelDate(l.createdAt),
    });
  }
  styleDataTable(auditLogsSheet, 'F');

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
