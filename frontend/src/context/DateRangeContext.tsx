import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { DateRangePreset, DateRangeState } from '../types/dashboard';
import { computePresetRange, getDefaultDateRange } from '../lib/dateRange';

interface DateRangeContextValue {
  preset: DateRangePreset;
  startDate: string;
  endDate: string;
  setPreset: (preset: DateRangePreset) => void;
  setCustomRange: (startDate: string, endDate: string) => void;
  resetToDefault: () => void;
}

const DateRangeContext = createContext<DateRangeContextValue | undefined>(undefined);

export const DateRangeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rangeState, setRangeState] = useState<DateRangeState>(() => {
    if (typeof window === 'undefined') return getDefaultDateRange();
    const params = new URLSearchParams(window.location.search);
    const urlPreset = params.get('preset') as DateRangePreset | null;
    const urlStart = params.get('startDate');
    const urlEnd = params.get('endDate');

    if (urlPreset === 'CUSTOM' && urlStart && urlEnd) {
      return {
        preset: 'CUSTOM',
        startDate: urlStart,
        endDate: urlEnd,
      };
    }

    if (
      urlPreset &&
      ['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'LAST_MONTH', 'THIS_YEAR'].includes(urlPreset)
    ) {
      const computed = computePresetRange(urlPreset);
      return {
        preset: urlPreset,
        startDate: computed.startDate,
        endDate: computed.endDate,
      };
    }

    return getDefaultDateRange();
  });

  const setPreset = useCallback((preset: DateRangePreset) => {
    if (preset === 'CUSTOM') {
      setRangeState((prev) => ({
        preset: 'CUSTOM',
        startDate: prev.startDate,
        endDate: prev.endDate,
      }));
    } else {
      const computed = computePresetRange(preset);
      setRangeState({
        preset,
        startDate: computed.startDate,
        endDate: computed.endDate,
      });
    }
  }, []);

  const setCustomRange = useCallback((startDate: string, endDate: string) => {
    setRangeState({
      preset: 'CUSTOM',
      startDate,
      endDate,
    });
  }, []);

  const resetToDefault = useCallback(() => {
    const defaultRange = getDefaultDateRange();
    setRangeState(defaultRange);
  }, []);

  // Sync to URL search query parameters when state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (rangeState.preset === 'THIS_MONTH') {
      url.searchParams.delete('preset');
      url.searchParams.delete('startDate');
      url.searchParams.delete('endDate');
    } else if (rangeState.preset === 'CUSTOM') {
      url.searchParams.set('preset', 'CUSTOM');
      url.searchParams.set('startDate', rangeState.startDate);
      url.searchParams.set('endDate', rangeState.endDate);
    } else {
      url.searchParams.set('preset', rangeState.preset);
      url.searchParams.delete('startDate');
      url.searchParams.delete('endDate');
    }

    const newRelativePathQuery = url.pathname + (url.search ? url.search : '');
    if (window.location.pathname + window.location.search !== newRelativePathQuery) {
      window.history.replaceState(null, '', newRelativePathQuery);
    }
  }, [rangeState]);

  const value = useMemo(
    () => ({
      preset: rangeState.preset,
      startDate: rangeState.startDate,
      endDate: rangeState.endDate,
      setPreset,
      setCustomRange,
      resetToDefault,
    }),
    [rangeState, setPreset, setCustomRange, resetToDefault]
  );

  return <DateRangeContext.Provider value={value}>{children}</DateRangeContext.Provider>;
};

export function useDateRange(): DateRangeContextValue {
  const context = useContext(DateRangeContext);
  if (!context) {
    throw new Error('useDateRange must be used within a DateRangeProvider');
  }
  return context;
}
