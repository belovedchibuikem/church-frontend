import { ApiError, apiRequest, resolveApiBaseUrl } from './api-client';
import type { ApiAdminScope, ApiSuccessEnvelope } from './api-types';
import type { Metric } from './admin-routes';

export type AdminDashboardModule =
  | 'global'
  | 'geography'
  | 'home-churches'
  | 'church'
  | 'kca'
  | 'mission'
  | 'press'
  | 'finance'
  | 'communications'
  | 'reports'
  | 'security';

export type DashboardBreakdownItem = {
  label: string;
  value: string;
  percent?: number;
};

export type DashboardSeriesPoint = {
  label: string;
  value: number;
};

export type DashboardActivity = {
  title: string;
  detail?: string;
  occurred_at: string;
};

export type DashboardDonut = {
  value: string;
  label: string;
};

export type AdminDashboardData = {
  metrics: Metric[];
  breakdown?: DashboardBreakdownItem[];
  series?: DashboardSeriesPoint[];
  recent_activities?: DashboardActivity[];
  recent_rows?: Array<Record<string, string>>;
  donut?: DashboardDonut;
};

export class AdminDashboardApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public correlationId?: string,
  ) {
    super(message);
    this.name = 'AdminDashboardApiError';
  }
}

export function dashboardApiConfigured(): boolean {
  return Boolean(resolveApiBaseUrl());
}

export function shouldUseDashboardLiveData(): boolean {
  return (
    process.env.FHC_ENABLE_DESIGN_FIXTURES !== 'true' &&
    process.env.NEXT_PUBLIC_FHC_ENABLE_DESIGN_FIXTURES !== 'true' &&
    dashboardApiConfigured()
  );
}

function toDashboardError(error: unknown, fallback: string): AdminDashboardApiError {
  if (error instanceof AdminDashboardApiError) return error;
  if (error instanceof ApiError) {
    return new AdminDashboardApiError(
      error.status,
      error.message || fallback,
      error.code,
      error.correlationId,
    );
  }
  if (error instanceof Error) {
    return new AdminDashboardApiError(503, error.message || fallback, 'NETWORK_ERROR');
  }
  return new AdminDashboardApiError(503, fallback, 'UNKNOWN');
}

export function dashboardErrorMessage(error: unknown, fallback: string): string {
  const dashboardError = toDashboardError(error, fallback);
  return dashboardError.code
    ? `${dashboardError.message} (${dashboardError.code})`
    : dashboardError.message;
}

export async function fetchAdminDashboard(
  module: AdminDashboardModule,
  scope?: ApiAdminScope,
  signal?: AbortSignal,
): Promise<AdminDashboardData> {
  const envelope = await apiRequest<ApiSuccessEnvelope<AdminDashboardData>>(
    `admin/dashboards/${module}`,
    { scope, signal },
  );
  return envelope.data;
}

export function breakdownToItems(
  breakdown: DashboardBreakdownItem[] | undefined,
): string[] {
  return (breakdown ?? []).map((item) =>
    item.percent !== undefined ? `${item.label} — ${item.percent}%` : `${item.label} — ${item.value}`,
  );
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export const SCREEN_DASHBOARD_MODULES: Record<string, AdminDashboardModule> = {
  'A-03': 'global',
  'A-10': 'security',
  'A-12': 'global',
  'A-13': 'geography',
  'C-01': 'geography',
  'D-01': 'home-churches',
  'E-01': 'church',
  'G-01': 'kca',
  'I-01': 'mission',
  'J-01': 'press',
  'K-01': 'finance',
  'K-16': 'finance',
  'M-01': 'communications',
  'M-16': 'communications',
  'N-01': 'reports',
  'N-02': 'church',
  'N-03': 'home-churches',
  'N-04': 'church',
  'N-05': 'church',
  'N-06': 'church',
  'N-07': 'mission',
  'N-08': 'kca',
  'N-09': 'kca',
  'N-10': 'press',
  'N-11': 'finance',
  'N-12': 'geography',
  'N-13': 'geography',
  'N-14': 'reports',
  'N-15': 'reports',
  'N-16': 'press',
  'O-01': 'security',
  'O-08': 'security',
};

export function dashboardModuleForScreen(screenId: string): AdminDashboardModule | null {
  return SCREEN_DASHBOARD_MODULES[screenId] ?? null;
}
