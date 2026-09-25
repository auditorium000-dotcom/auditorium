import { Readable } from 'node:stream';
import type { drive_v3 } from 'googleapis';
import { db } from '../db/index.js';
import * as schema from '../db/schema/index.js';
import { getAuthenticatedDriveClient } from './google-drive.js';

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

export interface BackupResult {
  success: boolean;
  fileId: string;
  fileName: string;
  createdAt: string;
  sizeBytes: number;
}

export class BackupConcurrencyError extends Error {
  constructor(message = 'A database backup is already in progress.') {
    super(message);
    this.name = 'BackupConcurrencyError';
  }
}

let isBackupInProgress = false;

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
 * Generates a standard timestamped backup filename:
 * auditorium-backup-YYYY-MM-DD-HHmmss.json
 */
function generateBackupFileName(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `auditorium-backup-${year}-${month}-${day}-${hours}${minutes}${seconds}.json`;
}

/**
 * Executes a consistent read-only snapshot export of the PostgreSQL database
 * and uploads the resulting structured JSON archive to Google Drive.
 */
export async function createDatabaseBackup(): Promise<BackupResult> {
  if (isBackupInProgress) {
    throw new BackupConcurrencyError('A database backup is already in progress.');
  }

  isBackupInProgress = true;
  try {
    const now = new Date();
    const createdAtIso = now.toISOString();

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

    // 2. Build structured backup archive payload
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

    const jsonContent = JSON.stringify(backupPayload, null, 2);
    const sizeBytes = Buffer.byteLength(jsonContent, 'utf8');
    const fileName = generateBackupFileName(now);

    // 3. Connect to Google Drive using authenticated OAuth client
    const drive = getAuthenticatedDriveClient();

    // 4. Resolve folder hierarchy: Auditorium Backups / YYYY / MM
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yearFolderName = now.getFullYear().toString();
    const monthFolderName = pad(now.getMonth() + 1);

    const rootFolderId = await getOrCreateDriveFolder(drive, 'Auditorium Backups');
    const yearFolderId = await getOrCreateDriveFolder(drive, yearFolderName, rootFolderId);
    const targetFolderId = await getOrCreateDriveFolder(drive, monthFolderName, yearFolderId);

    // 5. Upload backup file stream
    const fileStream = new Readable();
    fileStream.push(jsonContent);
    fileStream.push(null);

    const uploadResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [targetFolderId],
        mimeType: 'application/json',
      },
      media: {
        mimeType: 'application/json',
        body: fileStream,
      },
      fields: 'id, name, size, createdTime',
    });

    const fileId = uploadResponse.data.id;
    if (!fileId) {
      throw new Error('Google Drive upload succeeded but no file ID was returned.');
    }

    return {
      success: true,
      fileId,
      fileName: uploadResponse.data.name || fileName,
      createdAt: createdAtIso,
      sizeBytes,
    };
  } finally {
    isBackupInProgress = false;
  }
}
