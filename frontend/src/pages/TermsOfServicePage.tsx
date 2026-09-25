import React from 'react';
import { FileText, ArrowLeft, ShieldAlert, CheckSquare, KeyRound, Mail, AlertTriangle } from 'lucide-react';

export const TermsOfServicePage: React.FC = () => {
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
        <div className="absolute top-1/2 -right-32 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[140px]" />
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
            <FileText className="w-3.5 h-3.5" />
            <span>Operational Agreement</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Terms of Service
          </h1>
          <p className="text-xs text-slate-400">
            Last updated: <span className="text-slate-300 font-medium">September 25, 2026</span>
          </p>
        </div>

        {/* Content Container */}
        <main className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl p-6 sm:p-10 space-y-8 text-slate-300 text-sm leading-relaxed shadow-xl">
          {/* Section 1: Purpose & Authorization */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
              1. Authorized Use & Scope
            </h2>
            <p>
              This application is provided exclusively for the operational management of <strong className="text-slate-100">Oruma Avenue Auditorium</strong>. Access to and use of this system is strictly limited to authorized personnel, including venue managers, administrative staff, and designated operators. Unauthorized access or use is strictly prohibited.
            </p>
          </section>

          {/* Section 2: Account Security & Responsibility */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-400" />
              2. User Account & Credential Security
            </h2>
            <p>
              Authorized users are responsible for maintaining the confidentiality of their authentication credentials. Any action, entry, or modification performed through an authenticated account is the responsibility of that account holder. Users must promptly report any suspected credential compromise or unauthorized access to management.
            </p>
          </section>

          {/* Section 3: Booking Accuracy & Data Integrity */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-indigo-400" />
              3. Accurate Records & Financial Information
            </h2>
            <p>
              When utilizing this platform, all operators must ensure that:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
              <li>All booking reservations, slot allocations, customer details, and event dates entered into the system are truthful, up-to-date, and accurate.</li>
              <li>Financial records, including advance receipts, security deposits, discounts, and payment settlements, are handled responsibly in accordance with venue policies.</li>
              <li>Cancellations, schedule alterations, or refunds are recorded transparently with appropriate audit notes.</li>
            </ul>
          </section>

          {/* Section 4: System Availability & Operations */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-indigo-400" />
              4. System Availability & Maintenance
            </h2>
            <p>
              The system is maintained to ensure reliable daily operations. Routine maintenance, feature upgrades, or cloud backups may occur periodically. The auditorium administration reserves the right to update system configurations and manage user permissions as required for business operations.
            </p>
          </section>

          {/* Section 5: Responsible Handling & Backup Storage */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-semibold text-white">
              5. Data Governance & Backup Integration
            </h2>
            <p>
              System operators agree to handle customer booking information in compliance with the Privacy Policy. Cloud backup mechanisms (such as Google Drive backup synchronization) are operated solely for disaster recovery, data redundancy, and operational continuity.
            </p>
          </section>

          {/* Section 6: Contact Information */}
          <section className="space-y-3 border-t border-slate-800 pt-6">
            <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-400" />
              6. Contact Information
            </h2>
            <p>
              For inquiries regarding these Terms of Service or access management, please contact:
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

export default TermsOfServicePage;
