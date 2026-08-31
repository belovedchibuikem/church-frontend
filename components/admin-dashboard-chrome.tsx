'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import type { Metric } from '../lib/admin-routes';
import {
  dashboardMetricLinks,
  dashboardNavItems,
  dashboardPeriodPresets,
  dashboardQuickActions,
} from '../lib/admin-dashboard-nav';
import type { AdminDashboardData } from '../lib/admin-dashboard-api';

export function DashboardPeriodFilter({
  preset,
  onPresetChange,
  periodLabel,
}: {
  preset: string;
  onPresetChange: (preset: string) => void;
  periodLabel?: string;
}) {
  return (
    <div className="dashboard-toolbar" role="group" aria-label="Dashboard period">
      <label>
        <span>Period</span>
        <select value={preset} onChange={(event) => onPresetChange(event.target.value)}>
          {dashboardPeriodPresets.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
      </label>
      {periodLabel ? <small>{periodLabel}</small> : null}
    </div>
  );
}

export function DashboardLiveNotice({
  loading,
  error,
  onRetry,
}: {
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  if (!loading && !error) return null;
  return (
    <p className="maps-settings-lead" role={error ? 'alert' : 'status'} style={error ? { color: '#dc2626' } : undefined}>
      {loading ? 'Loading live dashboard data…' : error}
      {error && onRetry ? (
        <button type="button" className="ghost-button" data-interaction-native="true" onClick={onRetry} style={{ marginLeft: 12 }}>
          Retry
        </button>
      ) : null}
    </p>
  );
}

export function DashboardEmptyState({ title, href, cta }: { title: string; href: string; cta: string }) {
  return (
    <article className="card dashboard-empty" role="status">
      <h2>{title}</h2>
      <p>No records in this scope and period yet. Adjust the date range or continue in the related register.</p>
      <Link href={href} className="primary-button link-button">{cta}</Link>
    </article>
  );
}

export function LinkedMetricCards({
  screenId,
  metrics = [],
}: {
  screenId: string;
  metrics?: Metric[];
}) {
  const links = dashboardMetricLinks[screenId] ?? {};
  if (metrics.length === 0) {
    return (
      <div className="metric-grid dashboard-metric-skeleton" aria-hidden="true">
        {['a', 'b', 'c', 'd'].map((key) => (
          <article className="card metric-card" key={key}><span className="metric-label">…</span><strong className="metric-value">—</strong></article>
        ))}
      </div>
    );
  }
  return (
    <div className="metric-grid">
      {metrics.map((metric, index) => {
        const href = links[metric.label];
        const body = (
          <>
            <span className="metric-label">{metric.label}</span>
            <div className="metric-row">
              <strong className={`metric-value ${index === 0 ? 'violet' : ''}`}>{metric.value}</strong>
              {metric.trend ? <span className="trend">{metric.trend}</span> : null}
            </div>
          </>
        );
        return href ? (
          <Link className={`card metric-card ${index === 0 ? 'metric-selected' : ''}`} href={href} key={metric.label} title={metric.hint}>{body}</Link>
        ) : (
          <article className={`card metric-card ${index === 0 ? 'metric-selected' : ''}`} key={metric.label} title={metric.hint}>{body}</article>
        );
      })}
    </div>
  );
}

export function DashboardModuleGrid({ currentHref }: { currentHref: string }) {
  return (
    <nav className="dashboard-module-grid" aria-label="Ministry dashboards">
      {dashboardNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`card dashboard-module-card${item.href === currentHref ? ' is-current' : ''}`}
          aria-current={item.href === currentHref ? 'page' : undefined}
        >
          <span aria-hidden="true">{item.icon}</span>
          <strong>{item.label}</strong>
        </Link>
      ))}
    </nav>
  );
}

export function DashboardQuickLinks({ screenId, className = 'card compact-list' }: { screenId: string; className?: string }) {
  const actions = dashboardQuickActions[screenId] ?? [];
  if (actions.length === 0) return null;
  return (
    <article className={className}>
      <h2 className="card-title">Quick Actions</h2>
      {actions.map((action, index) => (
        <Link key={action.href} href={action.href}>
          <span>{['▣', '▦', '◇', '▤'][index] ?? '→'}</span>
          {action.label}
        </Link>
      ))}
    </article>
  );
}

export function SeriesBarChart({
  title,
  series,
  value,
}: {
  title: string;
  series?: Array<{ label: string; value: number }>;
  value?: string;
}) {
  const points = series ?? [];
  const max = Math.max(1, ...points.map((point) => point.value));
  return (
    <article className="card chart-card">
      <h2 className="card-title">{title}</h2>
      {value ? <strong className="chart-value">{value}</strong> : null}
      {points.length === 0 ? (
        <p className="maps-settings-lead">No series values in this period.</p>
      ) : (
        <>
          <div className="bar-chart" role="img" aria-label={title}>
            {points.map((point) => (
              <i key={point.label} style={{ height: `${Math.round((point.value / max) * 100)}%` }} title={`${point.label}: ${point.value}`} />
            ))}
          </div>
          <div className="chart-axis">{points.map((point) => <span key={point.label}>{point.label}</span>)}</div>
        </>
      )}
    </article>
  );
}

export function dashboardHasZeroActivity(data: AdminDashboardData | null): boolean {
  if (!data) return false;
  const metricZero = (data.metrics ?? []).every((metric) => /^0(?:\.0+)?$|^₦0$|^\$0$/.test(metric.value.replace(/,/g, '')));
  const seriesZero = (data.series ?? []).every((point) => point.value === 0);
  return metricZero && seriesZero && (data.breakdown ?? []).length === 0 && (data.recent_rows ?? []).length === 0;
}

export function DashboardShell({
  screenId,
  href,
  data,
  loading,
  error,
  onRetry,
  preset,
  onPresetChange,
  children,
  showModules = false,
}: {
  screenId: string;
  href: string;
  data: AdminDashboardData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  preset: string;
  onPresetChange: (preset: string) => void;
  children: ReactNode;
  showModules?: boolean;
}) {
  return (
    <>
      <DashboardPeriodFilter preset={preset} onPresetChange={onPresetChange} periodLabel={data?.period?.label} />
      <DashboardLiveNotice loading={loading} error={error} onRetry={onRetry} />
      {showModules ? <DashboardModuleGrid currentHref={href} /> : null}
      {children}
      {dashboardHasZeroActivity(data) && !loading && !error ? (
        <DashboardEmptyState title="Nothing recorded yet" href={dashboardQuickActions[screenId]?.[0]?.href ?? href} cta="Open related records" />
      ) : null}
    </>
  );
}
