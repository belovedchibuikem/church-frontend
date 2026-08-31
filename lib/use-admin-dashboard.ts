'use client';

import { useCallback, useEffect, useState } from 'react';

import type { Metric } from './admin-routes';
import {
  dashboardErrorMessage,
  fetchAdminDashboard,
  shouldUseDashboardLiveData,
  type AdminDashboardData,
  type AdminDashboardModule,
} from './admin-dashboard-api';
import { defaultAdminScope } from './admin-identity-api';

type UseAdminDashboardResult = {
  data: AdminDashboardData | null;
  metrics: Metric[];
  loading: boolean;
  error: string | null;
  live: boolean;
  retry: () => void;
  preset: string;
  setPreset: (preset: string) => void;
};

export function readDashboardDatePreset(): string {
  if (typeof window === 'undefined') return 'last_6_months';
  return new URLSearchParams(window.location.search).get('date') ?? 'last_6_months';
}

export function useAdminDashboard(
  module: AdminDashboardModule | null,
  scopeType?: string,
): UseAdminDashboardResult {
  const live = shouldUseDashboardLiveData() && module !== null;
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(live);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [preset, setPresetState] = useState('last_6_months');
  const retry = useCallback(() => setRefreshKey((value) => value + 1), []);
  const setPreset = useCallback((next: string) => {
    setPresetState(next);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('date', next);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  useEffect(() => {
    setPresetState(readDashboardDatePreset());
  }, []);

  useEffect(() => {
    if (!live || !module) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void fetchAdminDashboard(module, defaultAdminScope(scopeType), controller.signal, { preset })
      .then((dashboard) => {
        if (controller.signal.aborted) return;
        setData(dashboard);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setData(null);
        setError(dashboardErrorMessage(err, 'Unable to load dashboard data.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [live, module, scopeType, preset, refreshKey]);

  return {
    data,
    metrics: data?.metrics ?? [],
    loading,
    error,
    live,
    retry,
    preset,
    setPreset,
  };
}
