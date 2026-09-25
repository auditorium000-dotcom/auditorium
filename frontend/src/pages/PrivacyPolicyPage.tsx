import React from 'react';
import { Shield, ArrowLeft, Lock, HardDrive, Database, Mail, CheckCircle2 } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  const handleNavigateHome = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8 relative selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -left-32 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[140px]" />
      </div>

      <div className="w-full max-w-4xl relative z-10 space-y-6">
        {/* Navigation & Brand Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <a
              href="/"
              onClick={handleNavigateHome}
              className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all duration-200 flex items-center gap-2 text-sm"
              title="Return to Application"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Portal</span>
            </a>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs">
              OA
            </div>
            <span className="font-semibold text-slate-200 tracking-tight text-sm">
              Oruma Avenue Auditorium
            </span>
          </div>
        </header>

        {/* Hero Section */}
        <div className="space-y-2 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
            <Shield className="w-3.5 h-3.5" />
            <span>Legal Documentation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Privacy Policy
          </h1>
          <p className="text-xs text-slate-400">
            Last updated: <span className="text-slate-300 font-medium">September 25, 2026</span>
          </p>
        </div>

        {/* Content Container */}
        <main className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl p-6 sm:p-10 space-y-8 text-slate-300 text-sm leading-relaxed shadow-xl">
          {/* Section 1: Overview */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" />
              1. Overview & Purpose
            </h2>
            <p>
              This Privacy Policy explains how the <strong className="text-slate-100">Oruma Avenue Auditorium Management Application</strong> collects, handles, and safeguards data. The application is an internal management system designed exclusively for authorized venue managers, administrators, and staff to schedule and coordinate auditorium bookings, sessions, and billing operations.
            </p>
          </section>

          {/* Section 2: Data We Collect */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-400" />
              2. Information Collected and Stored
            </h2>
            <p>
              In order to perform auditorium booking operations, the application securely processes and stores:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
              <li><strong className="text-slate-200">Booking Information:</strong> Event dates, allocated time sessions (Morning, Evening, Full Day), event types, and booking status.</li>
              <li><strong className="text-slate-200">Contact Details:</strong> Names, phone numbers, and associated contact records of booking organizers and clients.</li>
              <li><strong className="text-slate-200">Financial & Payment Records:</strong> Rent calculations, advance payments, balance amounts, transaction identifiers, and receipt logs.</li>
              <li><strong className="text-slate-200">Audit & System Logs:</strong> Timestamped action logs created by authorized staff members to maintain operational integrity.</li>
            </ul>
          </section>

          {/* Section 3: Google OAuth & Drive Backup Usage */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-400" />
              3. Google OAuth & Google Drive Backup Integration
            </h2>
            <p>
              The application integrates with Google Drive solely to provide automated, encrypted cloud backup storage for auditorium data archives:
            </p>
            <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 space-y-2">
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Backup Storage Only:</strong> Google OAuth permission is requested strictly to authorize secure uploading and synchronization of system backup files to the organization's Google Drive.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>No Commercial Exploitation:</strong> Google user data and Drive files are never used for advertising, commercial profiling, marketing, or behavioral tracking.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>No Sale of Data:</strong> We do not sell, rent, or trade your data or Google account information to any third parties under any circumstances.</span>
              </div>
            </div>
          </section>

          {/* Section 4: Data Security */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              4. Data Protection & Security
            </h2>
            <p>
              We implement industry-standard administrative, physical, and technical security safeguards—including authenticated session cookies, transport-layer encryption (HTTPS/TLS), and restricted database access—to protect all stored information against unauthorized access, alteration, or disclosure.
            </p>
          </section>

          {/* Section 5: Data Retention */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-semibold text-white">
              5. Data Retention
            </h2>
            <p>
              Booking, payment, and audit records are retained for as long as necessary to fulfill operational booking commitments, comply with legal accounting obligations, and support administrative audit reviews.
            </p>
          </section>

          {/* Section 6: Contact Information */}
          <section className="space-y-3 border-t border-slate-800 pt-6">
            <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-400" />
              6. Contact Us
            </h2>
            <p>
              If you have any questions or inquiries regarding this Privacy Policy or system data practices, please contact us at:
            </p>
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono">
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              <a
                href="mailto:auditorium000@gmail.com"
                className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors"
              >
                auditorium000@gmail.com
              </a>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="text-center py-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Oruma Avenue Auditorium. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
