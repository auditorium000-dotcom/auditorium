import { Readable } from 'node:stream';
import type { drive_v3 } from 'googleapis';
import { db } from '../db/index.js';
import * as schema from '../db/schema/index.js';
import { getAuthenticatedDriveClient } from './google-drive.js';
import { generateExcelWorkbook, getIstTimestampInfo } from './backup-excel.js';

export interface BackupMetadata {
  application: string;
  backupVersion: number;
  createdAt: string;
  tableCounts: Record<string, number>;
}

export interface DatabaseBackupPayload {
  backupVersion: number;
  createdAt: string;
  database: string;
  metadata: BackupMetadata;
  tables: {
    user: schema.User[];
    account: schema.Account[];
    session: schema.Session[];
    verification: schema.Verification[];
    bookings: (typeof schema.bookings.$inferSelect)[];
    booking_sessions: (typeof schema.bookingSessions.$inferSelect)[];
    payments: (typeof schema.payments.$inferSelect)[];
    audit_logs: (typeof schema.auditLogs.$inferSelect)[];
  };
}

export interface FileBackupMetadata {
  fileId: string;
  fileName: string;
  createdAt: string;
  sizeBytes: number;
  mimeType: string;
}

export interface BackupResult {
  success: boolean;
  createdAt: string;
  fileId: string;
  fileName: string;
  sizeBytes: number;
  jsonFile: FileBackupMetadata;
  excelFile: FileBackupMetadata;
}

export interface BackupStatusResult {
  success: boolean;
  googleDriveConnected: boolean;
  cronSchedule: string;
  cronScheduleDescription: string;
  nextScheduledBackupIst: string;
  latestBackup: {
    createdAt: string;
    createdAtIst?: string;
    jsonFile?: FileBackupMetadata;
    excelFile?: FileBackupMetadata;
  } | null;
  cached?: boolean;
}

export class BackupConcurrencyError extends Error {
  constructor(message = 'A database backup is already in progress.') {
    super(message);
    this.name = 'BackupConcurrencyError';
  }
}

let isBackupInProgress = false;

interface CachedBackupStatus {
  timestamp: number;
  data: BackupStatusResult;
}

let cachedBackupStatus: CachedBackupStatus | null = null;
const BACKUP_STATUS_CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Returns sanitized backup system status including Google Drive connectivity,
 * latest backup metadata, and schedule info. Cached in-memory to prevent repeated Drive queries.
 */
export async function getBackupStatus(forceRefresh = false): Promise<BackupStatusResult> {
  const now = Date.now();
  if (!forceRefresh && cachedBackupStatus && now - cachedBackupStatus.timestamp < BACKUP_STATUS_CACHE_TTL_MS) {
    return {
      ...cachedBackupStatus.data,
      cached: true,
    };
  }

  const baseStatus: BackupStatusResult = {
    success: true,
    googleDriveConnected: false,
    cronSchedule: '30 20 * * *',
    cronScheduleDescription: 'Daily at 02:00 AM IST / 20:30 UTC',
    nextScheduledBackupIst: '02:00 AM IST (Daily)',
    latestBackup: null,
  };

  try {
    const drive = getAuthenticatedDriveClient();
    // Fast, lightweight query limited to top 10 recent non-folder files within drive.file scope
    const listRes = await drive.files.list({
      q: "trashed = false and mimeType != 'application/vnd.google-apps.folder'",
      orderBy: 'createdTime desc',
      pageSize: 10,
      fields: 'files(id, name, mimeType, size, createdTime)',
    });

    baseStatus.googleDriveConnected = true;

    const files = listRes.data.files || [];
    const jsonFile = files.find(
      (f) =>
        f.name?.endsWith('.json') ||
        f.mimeType === 'application/json' ||
        f.name?.startsWith('auditorium-backup-')
    );
    const excelFile = files.find(
      (f) =>
        f.name?.endsWith('.xlsx') ||
        f.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        f.name?.startsWith('auditorium-report-')
    );

    if (jsonFile || excelFile) {
      const primaryFile = jsonFile || excelFile!;
      const createdAt = primaryFile.createdTime || new Date().toISOString();
      const createdAtIst = new Date(createdAt).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'medium',
      });

      baseStatus.latestBackup = {
        createdAt,
        createdAtIst,
        jsonFile: jsonFile && jsonFile.id
          ? {
              fileId: jsonFile.id,
              fileName: jsonFile.name || '',
              createdAt: jsonFile.createdTime || createdAt,
              sizeBytes: jsonFile.size ? parseInt(jsonFile.size, 10) : 0,
              mimeType: jsonFile.mimeType || 'application/json',
            }
          : undefined,
        excelFile: excelFile && excelFile.id
          ? {
              fileId: excelFile.id,
              fileName: excelFile.name || '',
              createdAt: excelFile.createdTime || createdAt,
              sizeBytes: excelFile.size ? parseInt(excelFile.size, 10) : 0,
              mimeType:
                excelFile.mimeType ||
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            }
          : undefined,
      };
    }

    cachedBackupStatus = {
      timestamp: now,
      data: baseStatus,
    };

    return baseStatus;
  } catch {
    // If Drive is unconfigured or connection fails, return sanitized status with googleDriveConnected: false
    baseStatus.googleDriveConnected = false;
    return baseStatus;
  }
}

/**
 * Searches for an existing folder by name and parent. Creates it if not found.
 * Works within the Google Drive drive.file scope for application-managed folders.
 */
async function getOrCreateDriveFolder(
  drive: drive_v3.Drive,
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  const queryParts = [
    "mimeType = 'application/vnd.google-apps.folder'",
    `name = '${folderName.replace(/'/g, "\\'")}'`,
    'trashed = false',
  ];

  if (parentFolderId) {
    queryParts.push(`'${parentFolderId}' in parents`);
  }

  const listResponse = await drive.files.list({
    q: queryParts.join(' and '),
    spaces: 'drive',
    fields: 'files(id, name)',
    pageSize: 1,
  });

  if (listResponse.data.files && listResponse.data.files.length > 0 && listResponse.data.files[0].id) {
    return listResponse.data.files[0].id;
  }

  const fileMetadata: drive_v3.Schema$File = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentFolderId) {
    fileMetadata.parents = [parentFolderId];
  }

  const createResponse = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id',
  });

  if (!createResponse.data.id) {
    throw new Error(`Failed to create Google Drive folder: ${folderName}`);
  }

  return createResponse.data.id;
}

/**
 * Helper to upload a buffer/stream to Google Drive.
 */
async function uploadFileToDrive(
  drive: drive_v3.Drive,
  fileName: string,
  parentFolderId: string,
  mimeType: string,
  content: Buffer | string
): Promise<{ id: string; name: string; sizeBytes: number }> {
  const fileStream = new Readable();
  fileStream.push(content);
  fileStream.push(null);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [parentFolderId],
      mimeType,
    },
    media: {
      mimeType,
      body: fileStream,
    },
    fields: 'id, name, size, createdTime',
  });

  const fileId = response.data.id;
  if (!fileId) {
    throw new Error(`Google Drive upload succeeded for ${fileName} but no file ID was returned.`);
  }

  const sizeBytes = typeof content === 'string'
    ? Buffer.byteLength(content, 'utf8')
    : content.byteLength;

  return {
    id: fileId,
    name: response.data.name || fileName,
    sizeBytes,
  };
}

/**
 * Executes a consistent read-only snapshot export of the PostgreSQL database
 * and uploads TWO files to the target Google Drive folder (Auditorium Backups/YYYY/MM/):
 * 1. Machine-readable JSON backup: auditorium-backup-YYYY-MM-DD-HHmmss.json
 * 2. Human-readable Excel report:  auditorium-report-YYYY-MM-DD-HHmmss.xlsx
 *
 * Both files are generated from the EXACT same point-in-time database snapshot.
 */
export async function createDatabaseBackup(): Promise<BackupResult> {
  if (isBackupInProgress) {
    throw new BackupConcurrencyError('A database backup is already in progress.');
  }

  isBackupInProgress = true;
  try {
    const now = new Date();
    const createdAtIso = now.toISOString();
    const istInfo = getIstTimestampInfo(now);

    // 1. Snapshot database tables inside an atomic, read-only transaction with REPEATABLE READ snapshot isolation
    const tableData = await db.transaction(
      async (tx) => {
        const [
          userRows,
          accountRows,
          sessionRows,
          verificationRows,
          bookingRows,
          bookingSessionRows,
          paymentRows,
          auditLogRows,
        ] = await Promise.all([
          tx.select().from(schema.user),
          tx.select().from(schema.account),
          tx.select().from(schema.session),
          tx.select().from(schema.verification),
          tx.select().from(schema.bookings),
          tx.select().from(schema.bookingSessions),
          tx.select().from(schema.payments),
          tx.select().from(schema.auditLogs),
        ]);

        return {
          user: userRows,
          account: accountRows,
          session: sessionRows,
          verification: verificationRows,
          bookings: bookingRows,
          booking_sessions: bookingSessionRows,
          payments: paymentRows,
          audit_logs: auditLogRows,
        };
      },
      {
        isolationLevel: 'repeatable read',
        accessMode: 'read only',
      }
    );

    const tableCounts = {
      user: tableData.user.length,
      account: tableData.account.length,
      session: tableData.session.length,
      verification: tableData.verification.length,
      bookings: tableData.bookings.length,
      booking_sessions: tableData.booking_sessions.length,
      payments: tableData.payments.length,
      audit_logs: tableData.audit_logs.length,
    };

    // 2. Build structured backup archive payload from snapshot
    const backupPayload: DatabaseBackupPayload = {
      backupVersion: 1,
      createdAt: createdAtIso,
      database: 'auditorium',
      metadata: {
        application: 'Oruma Avenue Auditorium',
        backupVersion: 1,
        createdAt: createdAtIso,
        tableCounts,
      },
      tables: tableData,
    };

    // 3. Generate JSON machine-readable archive
    const jsonContent = JSON.stringify(backupPayload, null, 2);
    const jsonFileName = istInfo.jsonFileName;

    // 4. Generate Human-Readable Excel workbook from the SAME snapshot
    const excelBuffer = await generateExcelWorkbook(backupPayload, istInfo);
    const excelFileName = istInfo.excelFileName;

    // 5. Connect to Google Drive using authenticated OAuth client
    const drive = getAuthenticatedDriveClient();

    // 6. Resolve folder hierarchy using IST date components: Auditorium Backups / YYYY / MM
    const yearFolderName = istInfo.year;
    const monthFolderName = istInfo.month;

    const rootFolderId = await getOrCreateDriveFolder(drive, 'Auditorium Backups');
    const yearFolderId = await getOrCreateDriveFolder(drive, yearFolderName, rootFolderId);
    const targetFolderId = await getOrCreateDriveFolder(drive, monthFolderName, yearFolderId);

    // 7. Upload JSON file
    const jsonUpload = await uploadFileToDrive(
      drive,
      jsonFileName,
      targetFolderId,
      'application/json',
      jsonContent
    );

    // 8. Upload Excel file
    const excelUpload = await uploadFileToDrive(
      drive,
      excelFileName,
      targetFolderId,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      excelBuffer
    );

    const result: BackupResult = {
      success: true,
      createdAt: createdAtIso,
      fileId: jsonUpload.id,
      fileName: jsonUpload.name,
      sizeBytes: jsonUpload.sizeBytes,
      jsonFile: {
        fileId: jsonUpload.id,
        fileName: jsonUpload.name,
        createdAt: createdAtIso,
        sizeBytes: jsonUpload.sizeBytes,
        mimeType: 'application/json',
      },
      excelFile: {
        fileId: excelUpload.id,
        fileName: excelUpload.name,
        createdAt: createdAtIso,
        sizeBytes: excelUpload.sizeBytes,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    };

    cachedBackupStatus = {
      timestamp: Date.now(),
      data: {
        success: true,
        googleDriveConnected: true,
        cronSchedule: '30 20 * * *',
        cronScheduleDescription: 'Daily at 02:00 AM IST / 20:30 UTC',
        nextScheduledBackupIst: '02:00 AM IST (Daily)',
        latestBackup: {
          createdAt: createdAtIso,
          createdAtIst: new Date(createdAtIso).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            dateStyle: 'medium',
            timeStyle: 'medium',
          }),
          jsonFile: result.jsonFile,
          excelFile: result.excelFile,
        },
      },
    };

    return result;
  } finally {
    isBackupInProgress = false;
  }
}
