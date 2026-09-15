import React from 'react';
import { Tag, SunMedium, Moon, PieChart } from 'lucide-react';
import type { YearlyAnalyticsSummary } from '@auditorium/shared';

interface EventTypeDistributionProps {
  summary: YearlyAnalyticsSummary;
}

const BAR_COLORS = [
  'bg-indigo-600',
  'bg-violet-500',
  'bg-sky-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-slate-400',
];

export const EventTypeDistribution: React.FC<EventTypeDistributionProps> = ({ summary }) => {
  const totalSessions = summary.totalYearSessions;
  const morningPercent = totalSessions > 0
    ? Math.round((summary.morningSessionsTotal / totalSessions) * 100)
    : 0;
  const eveningPercent = totalSessions > 0
    ? Math.round((summary.eveningSessionsTotal / totalSessions) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. Event Types Breakdown (Spans 2 cols on desktop) */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Event Types Distribution</h3>
            <p className="text-xs text-slate-500">
              Breakdown of bookings by event categories in {summary.year}
            </p>
          </div>
        </div>

        {summary.eventTypeDistribution.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No bookings recorded for this year yet.
          </div>
        ) : (
          <div className="space-y-3.5">
            {summary.eventTypeDistribution.map((item, idx) => {
              const barColor = BAR_COLORS[idx % BAR_COLORS.length];
              return (
                <div key={item.eventType} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">
                      {item.eventType}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {item.count} {item.count === 1 ? 'booking' : 'bookings'}
                      </span>
                      <span className="text-slate-400 font-medium w-10 text-right">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Session Slot Preference (1 col) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Session Preference</h3>
              <p className="text-xs text-slate-500">Morning vs. Evening slots</p>
            </div>
          </div>

          {/* Visual Ratio Bar */}
          <div className="mt-4">
            <div className="w-full h-4 rounded-xl bg-slate-100 flex overflow-hidden p-0.5 border border-slate-200">
              <div
                className="bg-amber-400 h-full rounded-l-lg transition-all duration-500"
                style={{ width: `${morningPercent}%` }}
                title={`Morning: ${morningPercent}%`}
              />
              <div
                className="bg-indigo-600 h-full rounded-r-lg transition-all duration-500"
                style={{ width: `${eveningPercent}%` }}
                title={`Evening: ${eveningPercent}%`}
              />
            </div>
          </div>

          {/* Morning Stats */}
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/70 border border-amber-200/70">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <SunMedium className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Morning Session</p>
                  <p className="text-[10px] text-slate-500">11:00 AM – 3:00 PM</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-extrabold text-amber-900">
                  {summary.morningSessionsTotal} slots
                </p>
                <p className="text-[11px] font-semibold text-amber-700">{morningPercent}%</p>
              </div>
            </div>

            {/* Evening Stats */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/70">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Evening Session</p>
                  <p className="text-[10px] text-slate-500">5:00 PM – 9:00 PM</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-extrabold text-indigo-900">
                  {summary.eveningSessionsTotal} slots
                </p>
                <p className="text-[11px] font-semibold text-indigo-700">{eveningPercent}%</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 mt-4 text-center">
          Total Slots Booked: {totalSessions}
        </p>
      </div>
    </div>
  );
};
