import React, { useState, useEffect, useCallback } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileJson,
  FileSpreadsheet,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { fetchBackupStatus } from '../../services/api';
import type { BackupStatusResponse } from '../../types/dashboard';

interface BackupStatusCardProps {
  className?: string;
}

export const BackupStatusCard: React.FC<BackupStatusCardProps> = ({ className = '' }) => {
  const [status, setStatus] = useState<BackupStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchBackupStatus();
      setStatus(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to check backup status';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Cloud className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Google Drive Automated Backups
            </h3>
            <p className="text-[11px] text-slate-500">
              Daily automated database snapshot & Excel report
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadStatus}
          disabled={loading}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Refresh Backup Status"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
        </button>
      </div>

      {loading && !status ? (
        <div className="py-6 text-center space-y-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-500 mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Checking backup health...</p>
        </div>
      ) : error ? (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="space-y-3.5 text-xs">
          {/* Connection Status & Schedule Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Drive Connection Status */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Drive Connection</span>
              {status?.googleDriveConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  Standby
                </span>
              )}
            </div>

            {/* Next Schedule */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Next Backup</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800">
                <Clock className="w-3 h-3 text-indigo-500" />
                {status?.nextScheduledBackupIst || '02:00 AM IST (Daily)'}
              </span>
            </div>
          </div>

          {/* Latest Backup Metadata */}
          {status?.latestBackup ? (
            <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100/80 space-y-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-indigo-950 uppercase tracking-wider">
                  Latest Backup Snapshot
                </span>
                <span className="text-slate-500 font-medium">
                  {status.latestBackup.createdAtIst || status.latestBackup.createdAt}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {status.latestBackup.jsonFile && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-indigo-100">
                    <FileJson className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="truncate flex-1">
                      <p className="font-semibold text-slate-800 truncate" title={status.latestBackup.jsonFile.fileName}>
                        {status.latestBackup.jsonFile.fileName}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {formatFileSize(status.latestBackup.jsonFile.sizeBytes)} • JSON
                      </p>
                    </div>
                  </div>
                )}

                {status.latestBackup.excelFile && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-indigo-100">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="truncate flex-1">
                      <p className="font-semibold text-slate-800 truncate" title={status.latestBackup.excelFile.fileName}>
                        {status.latestBackup.excelFile.fileName}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {formatFileSize(status.latestBackup.excelFile.sizeBytes)} • Excel
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 text-[11px] flex items-center justify-between">
              <span>Automatic backups run daily at 02:00 AM IST.</span>
              <span className="font-mono text-[10px] text-slate-400">Cron: 30 20 * * *</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
