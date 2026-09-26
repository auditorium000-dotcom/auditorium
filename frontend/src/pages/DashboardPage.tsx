import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  LogOut,
  User,
  CalendarDays,
  LayoutDashboard,
  CalendarCheck,
  CreditCard,
  Receipt,
  TrendingUp,
} from 'lucide-react';
import { DateRangeProvider } from '../context/DateRangeContext';
import { OverviewTab, BookingsTab, PaymentsTab, OutstandingTab } from '../components/dashboard';
import { CalendarPage } from './CalendarPage';
import { MonthlyAnalyticsPage } from './MonthlyAnalyticsPage';
import { DateBookingPage } from './DateBookingPage';
import { BookingFormPage } from './BookingFormPage';
import { BookingDetailsPage } from './BookingDetailsPage';
import { EditBookingPage } from './EditBookingPage';
import type { SessionType } from '../types/booking';
import {
  type ActiveView,
  type DashboardTab,
  navigateTo,
  pathToView,
} from '../lib/router';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();

  // Initialize view from URL
  const [currentView, setCurrentView] = useState<ActiveView>(() => {
    if (typeof window === 'undefined') return { type: 'DASHBOARD', tab: 'overview' };
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

  const isDashboard = currentView.type === 'DASHBOARD';
  const activeDashboardTab: DashboardTab = isDashboard ? currentView.tab || 'overview' : 'overview';
  const isCalendarActive = currentView.type === 'CALENDAR';

  return (
    <DateRangeProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
        {/* Top Navigation Bar: ONLY 2 PRIMARY OPTIONS */}
        <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-xs">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-3">
            {/* Logo & System Brand */}
            <div
              className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none shrink-0"
              onClick={() => navigateTo({ type: 'DASHBOARD', tab: 'overview' })}
            >
              <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-50/90 border border-amber-200/90 shadow-xs p-1">
                <img
                  src="/oruma-avenue-emblem.png"
                  alt="Oruma Avenue"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-xs sm:text-base font-bold tracking-tight text-slate-900 leading-tight">
                  Oruma Avenue
                </h1>
                <p className="text-[9px] sm:text-[10px] text-amber-900/80 tracking-wider font-semibold uppercase">
                  Auditorium
                </p>
              </div>
            </div>

            {/* Main Navigation: 2 Primary Options (Calendar & Dashboard) */}
            <nav className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200 shadow-2xs shrink-0">
              {/* 1. Calendar */}
              <button
                id="main-nav-calendar"
                type="button"
                onClick={() => navigateTo({ type: 'CALENDAR' })}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isCalendarActive
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
                <span>Calendar</span>
              </button>

              {/* 2. Dashboard */}
              <button
                id="main-nav-dashboard"
                type="button"
                onClick={() => navigateTo({ type: 'DASHBOARD', tab: activeDashboardTab })}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isDashboard
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-indigo-600" />
                <span>Dashboard</span>
              </button>
            </nav>

            {/* Right Side: Auth User & Logout */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              {/* Authenticated User Badge */}
              <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs">
                <div className="w-5 h-5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                  <User className="w-3 h-3" />
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
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Screen Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6">
          {/* 1. DASHBOARD INTERNAL HUB & SUB-NAVIGATION */}
          {isDashboard && (
            <div className="space-y-4 sm:space-y-6">
              {/* Sub-Navigation Bar */}
              <div className="w-full overflow-x-auto no-scrollbar py-0.5">
                <nav className="bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 inline-flex items-center gap-1 shadow-2xs shrink-0 min-w-full sm:min-w-0 sm:w-auto">
                  {/* Overview Subtab */}
                  <button
                    id="sub-nav-overview"
                    type="button"
                    onClick={() => navigateTo({ type: 'DASHBOARD', tab: 'overview' })}
                    className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 min-h-[38px] ${
                      activeDashboardTab === 'overview'
                        ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Overview</span>
                  </button>

                  {/* Bookings Subtab */}
                  <button
                    id="sub-nav-bookings"
                    type="button"
                    onClick={() => navigateTo({ type: 'DASHBOARD', tab: 'bookings' })}
                    className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 min-h-[38px] ${
                      activeDashboardTab === 'bookings'
                        ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>Bookings</span>
                  </button>

                  {/* Payments Subtab */}
                  <button
                    id="sub-nav-payments"
                    type="button"
                    onClick={() => navigateTo({ type: 'DASHBOARD', tab: 'payments' })}
                    className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 min-h-[38px] ${
                      activeDashboardTab === 'payments'
                        ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Payments</span>
                  </button>

                  {/* Outstanding Subtab */}
                  <button
                    id="sub-nav-outstanding"
                    type="button"
                    onClick={() => navigateTo({ type: 'DASHBOARD', tab: 'outstanding' })}
                    className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 min-h-[38px] ${
                      activeDashboardTab === 'outstanding'
                        ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Outstanding</span>
                  </button>

                  {/* Monthly Analytics Subtab */}
                  <button
                    id="sub-nav-analytics"
                    type="button"
                    onClick={() => navigateTo({ type: 'DASHBOARD', tab: 'analytics' })}
                    className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 min-h-[38px] ${
                      activeDashboardTab === 'analytics'
                        ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Monthly Analytics</span>
                  </button>
                </nav>
              </div>

              {/* Sub-Tab Content */}
              {activeDashboardTab === 'overview' && (
                <OverviewTab onNavigateToTab={(tab) => navigateTo({ type: 'DASHBOARD', tab })} />
              )}

              {activeDashboardTab === 'bookings' && (
                <BookingsTab
                  onViewBooking={(id) => handleViewBooking(id)}
                  onCreateBooking={() => navigateTo({ type: 'CALENDAR' })}
                />
              )}

              {activeDashboardTab === 'payments' && (
                <PaymentsTab onViewBooking={(id) => handleViewBooking(id)} />
              )}

              {activeDashboardTab === 'outstanding' && (
                <OutstandingTab onViewBooking={(id) => handleViewBooking(id)} />
              )}

              {activeDashboardTab === 'analytics' && (
                <MonthlyAnalyticsPage
                  onNavigateToCalendarMonth={(year, monthIndex) =>
                    handleBackToCalendar(year, monthIndex)
                  }
                />
              )}
            </div>
          )}

          {/* 2. CALENDAR PAGE */}
          {currentView.type === 'CALENDAR' && (
            <CalendarPage
              onSelectDate={handleSelectDate}
              initialYear={currentView.initialYear}
              initialMonthIndex={currentView.initialMonthIndex}
            />
          )}

          {/* 4. DATE BOOKING PAGE */}
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

          {/* 5. BOOKING FORM PAGE */}
          {currentView.type === 'BOOKING_FORM' && (
            <BookingFormPage
              initialDateKey={currentView.dateKey}
              initialSession={currentView.session}
              onCancel={() => handleBackToDateBooking(currentView.dateKey)}
              onSuccess={(bookingId) => {
                navigateTo({
                  type: 'BOOKING_DETAILS',
                  bookingId,
                  returnDateKey: currentView.dateKey,
                  fromCreate: true,
                });
              }}
            />
          )}

          {/* 6. BOOKING DETAILS PAGE */}
          {currentView.type === 'BOOKING_DETAILS' && (
            <BookingDetailsPage
              bookingId={currentView.bookingId}
              onBack={() => {
                if (currentView.fromCreate) {
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
                  handleBackToDateBooking(currentView.returnDateKey);
                } else {
                  navigateTo({ type: 'DASHBOARD', tab: 'bookings' });
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

          {/* 7. EDIT BOOKING PAGE */}
          {currentView.type === 'EDIT_BOOKING' && (
            <EditBookingPage
              bookingId={currentView.bookingId}
              onCancel={() => handleViewBooking(currentView.bookingId, currentView.returnDateKey)}
              onSuccess={() => handleViewBooking(currentView.bookingId, currentView.returnDateKey)}
            />
          )}
        </main>
      </div>
    </DateRangeProvider>
  );
};
