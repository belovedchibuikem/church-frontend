'use client';

import { useEffect, useState } from 'react';

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
};

export function useAdminDashboard(
  module: AdminDashboardModule | null,
  scopeType?: string,
): UseAdminDashboardResult {
  const live = shouldUseDashboardLiveData() && module !== null;
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(live);
  const [error, setError] = useState<string | null>(null);

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

    void fetchAdminDashboard(module, defaultAdminScope(scopeType), controller.signal)
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
  }, [live, module, scopeType]);

  return {
    data,
    metrics: data?.metrics ?? [],
    loading,
    error,
    live,
  };
}
