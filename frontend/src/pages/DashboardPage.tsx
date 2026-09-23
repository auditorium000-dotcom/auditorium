import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogOut, User, CalendarDays, BarChart3 } from 'lucide-react';
import { CalendarPage } from './CalendarPage';
import { MonthlyAnalyticsPage } from './MonthlyAnalyticsPage';
import { DateBookingPage } from './DateBookingPage';
import { BookingFormPage } from './BookingFormPage';
import { BookingDetailsPage } from './BookingDetailsPage';
import { EditBookingPlaceholder } from './EditBookingPlaceholder';
import type { SessionType } from '../types/booking';
import {
  type ActiveView,
  navigateTo,
  pathToView,
} from '../lib/router';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();

  // Initialize view from URL
  const [currentView, setCurrentView] = useState<ActiveView>(() => {
    if (typeof window === 'undefined') return { type: 'CALENDAR' };
    return pathToView(window.location.pathname, window.location.search);
  });

  // Listen to popstate events for backward/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(pathToView(window.location.pathname, window.location.search));
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Navigation handlers
  const handleSelectDate = (dateKey: string) => {
    navigateTo({ type: 'DATE_BOOKING', dateKey });
  };

  const handleBookSession = (dateKey: string, session: SessionType) => {
    navigateTo({ type: 'BOOKING_FORM', dateKey, session });
  };

  const handleViewBooking = (bookingId: string, returnDateKey?: string) => {
    navigateTo({ type: 'BOOKING_DETAILS', bookingId, returnDateKey });
  };

  const handleEditBooking = (bookingId: string, returnDateKey?: string) => {
    navigateTo({ type: 'EDIT_BOOKING', bookingId, returnDateKey });
  };

  const handleBackToCalendar = (year?: number, monthIndex?: number) => {
    if (year !== undefined && monthIndex !== undefined) {
      navigateTo({ type: 'CALENDAR', initialYear: year, initialMonthIndex: monthIndex });
    } else {
      navigateTo({ type: 'CALENDAR' });
    }
  };

  const handleBackToDateBooking = (dateKey: string) => {
    navigateTo({ type: 'DATE_BOOKING', dateKey });
  };

  const isAnalyticsActive = currentView.type === 'MONTHLY_ANALYTICS';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Logo & System Brand */}
          <div
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none shrink-0"
            onClick={() => navigateTo({ type: 'CALENDAR' })}
          >
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50/90 border border-amber-200/90 shadow-xs p-1">
              <img
                src="/oruma-avenue-emblem.png"
                alt="Oruma Avenue"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 leading-tight">
                Oruma Avenue
              </h1>
              <p className="text-[10px] sm:text-[11px] text-amber-900/80 tracking-wider font-semibold uppercase">
                Auditorium
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs (Calendar vs Monthly Analytics) */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200 shadow-2xs shrink-0">
            <button
              id="nav-tab-calendar"
              type="button"
              onClick={() => navigateTo({ type: 'CALENDAR' })}
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
              onClick={() => navigateTo({ type: 'MONTHLY_ANALYTICS' })}
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isAnalyticsActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Monthly </span>
              <span>Dashboard</span>
            </button>
          </div>

          {/* Right Side: Auth User & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
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
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Screen Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-8">
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
            onBackToCalendar={() => {
              const [y, m] = currentView.dateKey.split('-');
              const year = parseInt(y, 10);
              const monthIndex = parseInt(m, 10) - 1;
              if (!isNaN(year) && !isNaN(monthIndex) && monthIndex >= 0 && monthIndex <= 11) {
                handleBackToCalendar(year, monthIndex);
              } else {
                handleBackToCalendar();
              }
            }}
            onBookSession={handleBookSession}
            onViewBooking={(bookingId) => handleViewBooking(bookingId, currentView.dateKey)}
          />
        )}

        {currentView.type === 'BOOKING_FORM' && (
          <BookingFormPage
            initialDateKey={currentView.dateKey}
            initialSession={currentView.session}
            onCancel={() => handleBackToDateBooking(currentView.dateKey)}
            onSuccess={(bookingId) => {
              // Navigate to the confirmed booking details view with fromCreate: true
              navigateTo({
                type: 'BOOKING_DETAILS',
                bookingId,
                returnDateKey: currentView.dateKey,
                fromCreate: true,
              });
            }}
          />
        )}

        {currentView.type === 'BOOKING_DETAILS' && (
          <BookingDetailsPage
            bookingId={currentView.bookingId}
            onBack={() => {
              if (currentView.fromCreate) {
                // If reached immediately after successful booking creation, navigate directly to Calendar
                const [yStr, mStr] = (currentView.returnDateKey || '').split('-');
                if (yStr && mStr) {
                  const year = parseInt(yStr, 10);
                  const monthIndex = parseInt(mStr, 10) - 1;
                  if (!isNaN(year) && !isNaN(monthIndex) && monthIndex >= 0 && monthIndex <= 11) {
                    handleBackToCalendar(year, monthIndex);
                    return;
                  }
                }
                handleBackToCalendar();
              } else if (currentView.returnDateKey) {
                // Otherwise retain existing behavior: return to Date Booking page
                handleBackToDateBooking(currentView.returnDateKey);
              } else {
                handleBackToCalendar();
              }
            }}
            onBackToCalendar={() => {
              const [yStr, mStr] = (currentView.returnDateKey || '').split('-');
              if (yStr && mStr) {
                const year = parseInt(yStr, 10);
                const monthIndex = parseInt(mStr, 10) - 1;
                if (!isNaN(year) && !isNaN(monthIndex) && monthIndex >= 0 && monthIndex <= 11) {
                  handleBackToCalendar(year, monthIndex);
                  return;
                }
              }
              handleBackToCalendar();
            }}
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
