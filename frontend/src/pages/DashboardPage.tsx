import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Building2, LogOut, User, CalendarDays, BarChart3 } from 'lucide-react';
import { CalendarPage } from './CalendarPage';
import { MonthlyAnalyticsPage } from './MonthlyAnalyticsPage';
import { DateBookingPage } from './DateBookingPage';
import { BookingFormPage } from './BookingFormPage';
import { BookingDetailsPage } from './BookingDetailsPage';
import { EditBookingPlaceholder } from './EditBookingPlaceholder';
import type { SessionType } from '../types/booking';

type ActiveView =
  | { type: 'CALENDAR'; initialYear?: number; initialMonthIndex?: number }
  | { type: 'MONTHLY_ANALYTICS' }
  | { type: 'DATE_BOOKING'; dateKey: string }
  | { type: 'BOOKING_FORM'; dateKey: string; session: SessionType }
  | { type: 'BOOKING_DETAILS'; bookingId: string; returnDateKey?: string }
  | { type: 'EDIT_BOOKING'; bookingId: string; returnDateKey?: string };

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState<ActiveView>({ type: 'CALENDAR' });

  // Navigation handlers
  const handleSelectDate = (dateKey: string) => {
    setCurrentView({ type: 'DATE_BOOKING', dateKey });
  };

  const handleBookSession = (dateKey: string, session: SessionType) => {
    setCurrentView({ type: 'BOOKING_FORM', dateKey, session });
  };

  const handleViewBooking = (bookingId: string, returnDateKey?: string) => {
    setCurrentView({ type: 'BOOKING_DETAILS', bookingId, returnDateKey });
  };

  const handleEditBooking = (bookingId: string, returnDateKey?: string) => {
    setCurrentView({ type: 'EDIT_BOOKING', bookingId, returnDateKey });
  };

  const handleBackToCalendar = (year?: number, monthIndex?: number) => {
    setCurrentView({ type: 'CALENDAR', initialYear: year, initialMonthIndex: monthIndex });
  };

  const handleBackToDateBooking = (dateKey: string) => {
    setCurrentView({ type: 'DATE_BOOKING', dateKey });
  };

  const isAnalyticsActive = currentView.type === 'MONTHLY_ANALYTICS';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          {/* Logo & System Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none shrink-0"
            onClick={() => handleBackToCalendar()}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-100 border border-indigo-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-tight">
                Auditorium Booking
              </h1>
              <p className="text-[11px] text-slate-500 tracking-wide font-medium">
                Management System
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs (Calendar vs Monthly Analytics) */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              id="nav-tab-calendar"
              type="button"
              onClick={() => setCurrentView({ type: 'CALENDAR' })}
              className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !isAnalyticsActive
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
            <button
              id="nav-tab-analytics"
              type="button"
              onClick={() => setCurrentView({ type: 'MONTHLY_ANALYTICS' })}
              className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isAnalyticsActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Monthly Dashboard</span>
            </button>
          </div>

          {/* Right Side: Auth User & Logout */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Authenticated User Badge */}
            <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs">
              <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <p id="user-name-display" className="font-semibold text-slate-800 leading-tight">
                  {user?.name || 'Manager'}
                </p>
                <p id="user-email-display" className="text-[10px] text-slate-500 leading-none">
                  {user?.email || ''}
                </p>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              id="logout-btn"
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Screen Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {currentView.type === 'CALENDAR' && (
          <CalendarPage
            onSelectDate={handleSelectDate}
            initialYear={currentView.initialYear}
            initialMonthIndex={currentView.initialMonthIndex}
          />
        )}

        {currentView.type === 'MONTHLY_ANALYTICS' && (
          <MonthlyAnalyticsPage
            onNavigateToCalendarMonth={(year, monthIndex) =>
              handleBackToCalendar(year, monthIndex)
            }
          />
        )}

        {currentView.type === 'DATE_BOOKING' && (
          <DateBookingPage
            dateKey={currentView.dateKey}
            onBackToCalendar={() => handleBackToCalendar()}
            onBookSession={handleBookSession}
            onViewBooking={(bookingId) => handleViewBooking(bookingId, currentView.dateKey)}
          />
        )}

        {currentView.type === 'BOOKING_FORM' && (
          <BookingFormPage
            initialDateKey={currentView.dateKey}
            initialSession={currentView.session}
            onCancel={() => handleBackToDateBooking(currentView.dateKey)}
            onSuccess={() => handleBackToCalendar()}
          />
        )}

        {currentView.type === 'BOOKING_DETAILS' && (
          <BookingDetailsPage
            bookingId={currentView.bookingId}
            onBack={() => {
              if (currentView.returnDateKey) {
                handleBackToDateBooking(currentView.returnDateKey);
              } else {
                handleBackToCalendar();
              }
            }}
            onBackToCalendar={() => handleBackToCalendar()}
            onEditBooking={(id) => handleEditBooking(id, currentView.returnDateKey)}
          />
        )}

        {currentView.type === 'EDIT_BOOKING' && (
          <EditBookingPlaceholder
            bookingId={currentView.bookingId}
            onBack={() => handleViewBooking(currentView.bookingId, currentView.returnDateKey)}
          />
        )}
      </main>
    </div>
  );
};
