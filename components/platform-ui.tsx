'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import type { AdminScreen, Metric, Row } from '../lib/admin-routes.ts';
import {
  catalogErrorMessage,
  catalogRecordsToRows,
  listCatalogDomain,
  resolveCatalogDataset,
  resolveCatalogPurposeFilter,
  shouldUseCatalogLiveData,
} from '../lib/admin-catalog-api';
import {
  defaultAdminScope,
  exportAdminAuditCsv,
  formatTimestamp,
  listAdminAccessDecisions,
  listAdminAuditEvents,
  listAdminSecuritySessions,
  shouldUseDesignFixtures,
  type AdminAccessDecision,
  type AdminAuditEvent,
} from '../lib/admin-identity-api';
import {
  activateObjectStorage,
  configureObjectStorage,
  deactivateObjectStorage,
  designFixturesEnabled,
  disableFeatureFlag,
  enableFeatureFlag,
  getDemoDataset,
  getObjectStorage,
  isPlatformResourceMissing,
  listConfigurations,
  listFeatureFlags,
  listMediaAttachments,
  platformApiConfigured,
  platformErrorMessage,
  removeMediaAttachment,
  uploadMediaAttachment,
  upsertConfiguration,
  upsertFeatureFlag,
  validateObjectStorage,
  wipeDemoDataset,
  type DemoDatasetStatus,
  type FeatureFlag,
  type MediaAttachment,
  type ObjectStorageStatus,
  type PlatformConfiguration,
  configureKcaGovernance,
  getKcaGovernance,
  getKcaOrientationSteps,
  syncKcaOrientationSteps,
  uploadPlatformGovernanceFile,
  type KcaGovernanceStatus,
  type KcaOrientationStepRecord,
} from '../lib/admin-platform-api.ts';
import type { JsonValue } from '../lib/api-types.ts';
import { useAdminWizardStep } from '../lib/use-admin-wizard-step';
import { AdminWizardFooter, AdminWizardStepper } from './admin-wizard-chrome';
import { MapsSettingsPanel } from './maps-settings-panel';
import { PressPublicationCreateForm, PressPublicationDetail } from './press-ui';
import { EventCreateForm, EventDetailPanel } from './events-ui';
import { PaymentsSettingsPanel } from './payments-settings-panel';
import { CommunicationsSettingsPanel } from './communications-settings-panel';
import { CommunicationsComposePanel } from './communications-compose-panel';
import { CommunicationsAudienceCreatePanel } from './communications-audience-create-panel';
import { FinanceTransactionDetail } from './finance-transaction-detail';
import { SafeguardingCaseDetail } from './safeguarding-case-detail';
import { AuditEventDetail } from './audit-event-detail';
import { DataClassificationPanel } from './data-classification-panel';
import { ChurchSettingsPanel } from './church-settings-panel';
import { DomainSettingsLinksPanel, LanguagesSettingsPanel } from './domain-settings-panels';
import { BrandingSettingsPanel } from './branding-settings-panel';
import { EntitySearchSelect } from './entity-search-select';
import { PublicSiteCmsPanel } from './public-site-cms-panel';
import { resolveEntityKey } from '../lib/admin-form-schemas';
import { formatRowActionRecord, rowActionCapabilities } from '../lib/admin-row-actions';
import { stashAdminRecords } from '../lib/admin-record-cache';
import { TableRowActions } from './table-row-actions';
import { useLocale } from '@/components/locale-provider';
import {
  breakdownToItems,
  dashboardModuleForScreen,
} from '../lib/admin-dashboard-api';
import { useAdminDashboard } from '../lib/use-admin-dashboard';
import { DashboardQuickLinks, DashboardShell, LinkedMetricCards } from './admin-dashboard-chrome';
import {
  defaultOpsScope,
  loadOpsDataset,
  operationsErrorMessage,
  opsRecordsToRows,
  resolveOpsDataset,
  shouldUseOperationsLiveData,
  type OpsDatasetKey,
} from '../lib/admin-operations-api';

function tone(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function Badge({ value }: { value: string }) {
  return <span className={`platform-badge is-${tone(value)}`}>{value}</span>;
}

function Metrics({ metrics = [] }: { metrics?: Metric[] }) {
  return <div className={`platform-metrics count-${Math.min(metrics.length, 5)}`}>{metrics.map((metric,index)=><article className="platform-card platform-metric" key={metric.label}><span>{metric.label}</span><div><strong>{metric.value}</strong>{metric.trend&&<small className={metric.trend.includes('-')?'down':''}>{metric.trend}</small>}</div><i style={{width:`${48+(index*11)%45}%`}}/></article>)}</div>;
}

function Bars({ compact = false, series }: { compact?: boolean; series?: Array<{ label: string; value: number }> }) {
  const { t } = useLocale();
  const points = series ?? [];
  const max = Math.max(1, ...points.map((point) => point.value));
  const values = points.map((point) => Math.round((point.value / max) * 100));
  if (points.length === 0) {
    return <p className="maps-settings-lead">{t('admin.noSeries', { defaultMessage: 'No series values in this period.' })}</p>;
  }
  return <div className={`platform-bars ${compact?'compact':''}`} role="img" aria-label={t('admin.performanceTrendChart', { defaultMessage: 'Performance trend chart' })}>{values.map((height,index)=><i style={{height:`${height}%`}} key={points[index]?.label ?? index}/>)}</div>;
}

function Donut({ value = '0', label }: { value?: string; label?: string }) {
  const { t } = useLocale();
  const caption = label || t('admin.total', { defaultMessage: 'Total' });
  return <div className="platform-donut" role="img" aria-label={t('admin.categoryDistributionTotal', { defaultMessage: 'Category distribution total {value}', vars: { value } })}><div><strong>{value}</strong><span>{caption}</span></div></div>;
}

function downloadDashboardCsv(title: string, metrics: Metric[], breakdownItems: string[]) {
  const lines = [['Section', 'Label', 'Value']];
  for (const metric of metrics) {
    lines.push(['Metric', metric.label, String(metric.value)]);
  }
  for (const item of breakdownItems) {
    const [label, value] = item.split(' — ');
    lines.push(['Category', label ?? item, value ?? '']);
  }
  const csv = lines.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'report'}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function FilterBar({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  return <div className="platform-filter-bar"><button type="button">{t('admin.allStatus', { defaultMessage: 'All Status⌄' })}</button><button type="button">{t('admin.allCategories', { defaultMessage: 'All Categories⌄' })}</button><label><span aria-hidden="true">⌕</span><input aria-label={t('admin.searchAria', { defaultMessage: 'Search {title}', vars: { title: screen.title } })} placeholder={t('admin.searchPlaceholder', { defaultMessage: 'Search {title}...', vars: { title: screen.title.toLowerCase() } })}/></label><button type="button">{t('admin.filtersButton', { defaultMessage: '☷ Filters' })}</button></div>;
}

const FINANCE_STATUS_OPTIONS = [
  { value: 'succeeded', label: 'Succeeded' },
  { value: 'pending_provider', label: 'Pending provider' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
];
const RECONCILIATION_STATUS_OPTIONS = [
  { value: 'matched', label: 'Matched' },
  { value: 'mismatch', label: 'Mismatch' },
];
const REFUND_STATUS_OPTIONS = [{ value: 'requested', label: 'Requested' }];
const DELIVERY_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'succeeded', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
  { value: 'suppressed', label: 'Suppressed' },
];
const BROADCAST_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'prepared', label: 'Prepared' },
  { value: 'cancelled', label: 'Cancelled' },
];
const FINANCE_CATEGORY_OPTIONS = [
  { value: 'tithe', label: 'Tithe' },
  { value: 'offering', label: 'Offering' },
  { value: 'missions', label: 'Missions' },
  { value: 'projects', label: 'Projects' },
  { value: 'donation', label: 'Donation' },
  { value: 'event_payment', label: 'Event payment' },
  { value: 'kca', label: 'KCA' },
  { value: 'publication', label: 'Publication' },
];

function catalogStatusOptions(dataset: string | null): Array<{ value: string; label: string }> {
  if (dataset === 'finance.payment_transactions' || dataset === 'finance.payment_intents') return FINANCE_STATUS_OPTIONS;
  if (dataset === 'finance.payment_reconciliations') return RECONCILIATION_STATUS_OPTIONS;
  if (dataset === 'finance.payment_refunds') return REFUND_STATUS_OPTIONS;
  if (dataset === 'finance.payment_disputes') return DISPUTE_STATUS_OPTIONS;
  if (dataset === 'communications.deliveries') return DELIVERY_STATUS_OPTIONS;
  if (dataset === 'communications.broadcasts') return BROADCAST_STATUS_OPTIONS;
  return [];
}

function CatalogFilterBar({
  screen,
  dataset,
  search,
  status,
  category,
  lockedPurpose,
  onSearchChange,
  onStatusChange,
  onCategoryChange,
}: {
  screen: AdminScreen;
  dataset: string | null;
  search: string;
  status: string;
  category: string;
  lockedPurpose?: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}) {
  const { t } = useLocale();
  const statuses = catalogStatusOptions(dataset);
  const showCategories = Boolean(dataset?.startsWith('finance.payment_')) && !lockedPurpose;
  return (
    <form className="platform-filter-bar" onSubmit={(event) => event.preventDefault()}>
      {statuses.length > 0 ? (
        <select
          aria-label={t('admin.allStatus', { defaultMessage: 'All Status' })}
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
        >
          <option value="">{t('admin.allStatus', { defaultMessage: 'All Status' })}</option>
          {statuses.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : (
        <button type="button">{t('admin.allStatus', { defaultMessage: 'All Status⌄' })}</button>
      )}
      {showCategories ? (
        <select
          aria-label={t('admin.allCategories', { defaultMessage: 'All Categories' })}
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
        >
          <option value="">{t('admin.allCategories', { defaultMessage: 'All Categories' })}</option>
          {FINANCE_CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : (
        <button type="button">{t('admin.allCategories', { defaultMessage: 'All Categories⌄' })}</button>
      )}
      <label>
        <span aria-hidden="true">⌕</span>
        <input
          aria-label={t('admin.searchAria', { defaultMessage: 'Search {title}', vars: { title: screen.title } })}
          placeholder={t('admin.searchPlaceholder', { defaultMessage: 'Search {title}...', vars: { title: screen.title.toLowerCase() } })}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>
    </form>
  );
}

function PlatformTabs({ tabs = [] }: { tabs?: string[] }) {
  const { t } = useLocale();
  return <div className="platform-tabs" role="tablist" aria-label={t('admin.pageSections', { defaultMessage: 'Page sections' })}>{tabs.map((tab,index)=><button type="button" role="tab" aria-selected={index===0} className={index===0?'active':''} key={tab}>{tab}</button>)}</div>;
}

function FixtureDenseTable({ screen, rows = screen.rows ?? [], columns = screen.columns ?? [] }: { screen: AdminScreen; rows?: Row[]; columns?: string[] }) {
  const { t } = useLocale();
  const entityKey = resolveEntityKey(screen.route, screen.id);
  return <article className="platform-card platform-table-card"><FilterBar screen={screen}/><div className="platform-table-scroll"><table aria-label={t('admin.recordsAria', { defaultMessage: '{title} records', vars: { title: screen.title } })}><thead><tr>{columns.map(column=><th scope="col" key={column}>{column}</th>)}<th scope="col">{t('admin.actions', { defaultMessage: 'Actions' })}</th></tr></thead><tbody>{rows.map((row,index)=><tr key={`${screen.id}-${index}`}>{columns.map((column,columnIndex)=>{const value=row[column]??'—';return <td key={column}>{columnIndex===0?<span className="platform-leading"><i>{value.slice(0,2).toUpperCase()}</i><b>{value}</b></span>:/status|priority/i.test(column)?<Badge value={value}/>:value}</td>})}<td><TableRowActions record={String(row[columns[0]]??'record')} entityKey={entityKey} className="row-actions platform-row-actions" /></td></tr>)}</tbody></table></div><footer><span>{t('admin.showingRecordsRange', { defaultMessage: 'Showing 1 to {count} of {total} records', vars: { count: rows.length, total: rows.length>5?'256':rows.length } })}</span><nav aria-label={t('admin.paginationAria', { defaultMessage: '{title} pagination', vars: { title: screen.title } })}><button type="button" aria-label={t('common.previousPage', { defaultMessage: 'Previous page' })}>‹</button><button className="active" type="button" aria-label={t('common.pageNumber', { defaultMessage: 'Page {number}', vars: { number: 1 } })} aria-current="page">1</button><button type="button" aria-label={t('common.pageNumber', { defaultMessage: 'Page {number}', vars: { number: 2 } })}>2</button><button type="button" aria-label={t('common.pageNumber', { defaultMessage: 'Page {number}', vars: { number: 3 } })}>3</button><button type="button" aria-label={t('common.nextPage', { defaultMessage: 'Next page' })}>›</button></nav></footer></article>;
}

const CATALOG_FEED_COLUMNS = ['Item', 'Detail', 'Time'];
const CATALOG_NAME_COLUMNS = ['Name', 'Status', 'Updated'];
const CATALOG_ASSET_COLUMNS = ['Name', 'Type', 'Status', 'Updated'];

function CatalogLiveTable({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const columns = screen.columns ?? [];
  const columnKey = columns.join('\0');
  const dataset = resolveCatalogDataset(screen);
  const purpose = resolveCatalogPurposeFilter(screen.route);
  const entityKey = resolveEntityKey(screen.route, screen.id);
  const mutationLabel =
    screen.route === '/admin/communications/delivery-queue' || screen.route === '/admin/communications/failed'
      ? 'Retry Delivery'
      : screen.route === '/admin/communications/broadcasts'
        ? 'Resolve Broadcast'
        : screen.route === '/admin/alerts' ||
            screen.route === '/admin/finance/alerts' ||
            screen.route === '/admin/security/alerts'
          ? 'Resolve Alert'
          : screen.route === '/admin/security/data-deletion-requests'
            ? 'Record Policy Denial'
            : undefined;
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [message, setMessage] = useState(() => t('admin.loadingCatalog', { defaultMessage: 'Loading catalog…' }));
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(() => (screen.route === '/admin/communications/failed' ? 'failed' : ''));
  const [category, setCategory] = useState('');

  useEffect(() => {
    const handle = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    if (!dataset) return;
    const mappedColumns = columnKey ? columnKey.split('\0') : [];
    let cancelled = false;
    void (async () => {
      setError(null);
      setMessage(t('admin.loadingCatalog', { defaultMessage: 'Loading catalog…' }));
      try {
        const result = await listCatalogDomain(dataset, {
          perPage: 25,
          purpose: purpose ?? (category || undefined),
          status: status || undefined,
          search: search || undefined,
        });
        if (cancelled) return;
        stashAdminRecords(result.items as Array<Record<string, unknown>>);
        setRows(catalogRecordsToRows(result.items as Record<string, unknown>[], mappedColumns));
        setMessage(
          result.pagination.total === 0
            ? t('admin.noCatalogRecords', { defaultMessage: 'No catalog records in this scope.' })
            : t('admin.showingCatalogRecords', { defaultMessage: 'Showing {shown} of {total} records', vars: { shown: result.items.length, total: result.pagination.total } }),
        );
      } catch (err) {
        if (cancelled) return;
        setRows([]);
        setError(catalogErrorMessage(err, t('errors.loadCatalog', { defaultMessage: 'Unable to load domain catalog.' })));
        setMessage(t('admin.catalogUnavailable', { defaultMessage: 'Live catalog unavailable' }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category, columnKey, dataset, purpose, search, status, t]);

  return (
    <article className="platform-card platform-table-card">
      <CatalogFilterBar
        screen={screen}
        dataset={dataset}
        search={searchInput}
        status={status}
        category={category}
        lockedPurpose={purpose}
        onSearchChange={setSearchInput}
        onStatusChange={setStatus}
        onCategoryChange={setCategory}
      />
      {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
      <div className="platform-table-scroll">
        <table aria-label={t('admin.recordsAria', { defaultMessage: '{title} records', vars: { title: screen.title } })}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th scope="col" key={column}>{column}</th>
              ))}
              <th scope="col">{t('admin.actions', { defaultMessage: 'Actions' })}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1}>{error ? t('errors.unableToLoadRecords', { defaultMessage: 'Unable to load records.' }) : message}</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.__id}>
                  {columns.map((column, columnIndex) => {
                    const value = row[column] ?? '—';
                    return (
                      <td key={column}>
                        {columnIndex === 0 ? (
                          <span className="platform-leading">
                            <i>{value.slice(0, 2).toUpperCase()}</i>
                            {screen.route === '/admin/finance/transactions' && row.__id ? (
                              <b><Link href={`/admin/finance/transactions/${row.__id}`}>{value}</Link></b>
                            ) : screen.route === '/admin/press/publications' && row.__id ? (
                              <b><Link href={`/admin/press/publications/${row.__id}`}>{value}</Link></b>
                            ) : (screen.route === '/admin/events' || screen.route === '/admin/settings/events') && row.__id ? (
                              <b><Link href={`/admin/events/${row.__id}`}>{value}</Link></b>
                            ) : screen.route === '/admin/security/safeguarding/cases' && row.__id ? (
                              <b><Link href={`/admin/security/safeguarding/cases/${row.__id}`}>{value}</Link></b>
                            ) : screen.route === '/admin/security/audit-logs' && row.__id ? (
                              <b><Link href={`/admin/security/audit-logs/${row.__id}`}>{value}</Link></b>
                            ) : (
                              <b>{value}</b>
                            )}
                          </span>
                        ) : /status|priority/i.test(column) ? (
                          <Badge value={value} />
                        ) : (
                          value
                        )}
                      </td>
                    );
                  })}
                  <td>
                    <TableRowActions
                      record={formatRowActionRecord(row[columns[0]], row.__id)}
                      entityKey={entityKey}
                      className="row-actions platform-row-actions"
                      mutationLabel={mutationLabel}
                      {...rowActionCapabilities(screen.route)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <footer>
        <span>{message}</span>
      </footer>
    </article>
  );
}

function IdentitySecurityLiveTable({
  screen,
  kind,
  targetTypes,
}: {
  screen: AdminScreen;
  kind: 'audit' | 'access-decisions' | 'sessions';
  targetTypes?: string;
}) {
  const { t } = useLocale();
  const columns = screen.columns ?? [];
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [message, setMessage] = useState(() => t('admin.loadingSecurityRecords', { defaultMessage: 'Loading security records…' }));
  const [error, setError] = useState<string | null>(null);
  const entityKey = resolveEntityKey(screen.route, screen.id);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setError(null);
      try {
        if (kind === 'sessions') {
          const [result, denied] = await Promise.all([
            listAdminSecuritySessions({ scope: defaultAdminScope(), perPage: 25 }),
            listAdminAccessDecisions({ scope: defaultAdminScope(), perPage: 25, allowed: false }),
          ]);
          if (cancelled) return;
          const sessionRows = result.data.map((session) => {
              const mapped: Record<string, string> = {};
              for (const column of columns) {
                if (column === 'Date & Time') mapped[column] = formatTimestamp(session.started_at ?? session.occurred_at);
                else if (column === 'User') mapped[column] = session.user_name ?? session.actor_user_id ?? '—';
                else if (column === 'Status') mapped[column] = session.status ?? '—';
                else if (column === 'IP Address') mapped[column] = session.ip_address ?? '—';
                else if (column === 'Location') mapped[column] = session.location ?? '—';
                else if (column === 'Device') mapped[column] = session.device ?? '—';
                else mapped[column] = '—';
              }
              mapped.__id = session.id;
              return mapped;
            });
          const deniedRows = denied.data.map((decision) => {
            const mapped: Record<string, string> = {};
            for (const column of columns) {
              if (column === 'Date & Time') mapped[column] = formatTimestamp(decision.decided_at);
              else if (column === 'User') mapped[column] = decision.actor_user_id ?? '—';
              else if (column === 'Status') mapped[column] = t('admin.statusDenied', { defaultMessage: 'Denied' });
              else if (column === 'IP Address' || column === 'Location' || column === 'Device') mapped[column] = '—';
              else mapped[column] = decision.permission_code;
            }
            mapped.__id = `denied-${decision.id}`;
            return mapped;
          });
          setRows([...deniedRows, ...sessionRows]);
          setMessage(t('admin.showingLoginHistory', {
            defaultMessage: 'Showing {denied} denied access decisions and {sessions} sessions',
            vars: { denied: denied.pagination.total, sessions: result.pagination.total },
          }));
        } else if (kind === 'audit') {
          const result = await listAdminAuditEvents({
            scope: defaultAdminScope(),
            perPage: 25,
            targetTypes,
          });
          if (cancelled) return;
          setRows(
            result.data.map((event: AdminAuditEvent) => {
              const mapped: Record<string, string> = {};
              for (const column of columns) {
                if (column === 'Date & Time') mapped[column] = formatTimestamp(event.occurred_at);
                else if (column === 'User') mapped[column] = event.actor_user_id ?? '—';
                else if (column === 'Module') mapped[column] = event.target_type ?? '—';
                else if (column === 'Action') mapped[column] = event.action;
                else if (column === 'Status') mapped[column] = t('admin.statusRecorded', { defaultMessage: 'Recorded' });
                else if (column === 'IP Address') mapped[column] = event.correlation_id ?? '—';
                else mapped[column] = '—';
              }
              mapped.__id = event.id;
              return mapped;
            }),
          );
          setMessage(t('admin.showingAuditEvents', { defaultMessage: 'Showing {shown} of {total} audit events', vars: { shown: result.data.length, total: result.pagination.total } }));
        } else {
          const result = await listAdminAccessDecisions({ scope: defaultAdminScope(), perPage: 25 });
          if (cancelled) return;
          setRows(
            result.data.map((decision: AdminAccessDecision) => {
              const mapped: Record<string, string> = {};
              for (const column of columns) {
                if (column === 'User') mapped[column] = decision.actor_user_id ?? '—';
                else if (column === 'Module') mapped[column] = decision.scope_type ?? '—';
                else if (column === 'Action') mapped[column] = decision.permission_code;
                else if (column === 'Status') mapped[column] = decision.allowed
                  ? t('admin.statusAllowed', { defaultMessage: 'Allowed' })
                  : t('admin.statusDenied', { defaultMessage: 'Denied' });
                else if (column === 'Date' || column === 'Date & Time') {
                  mapped[column] = formatTimestamp(decision.decided_at);
                } else mapped[column] = '—';
              }
              mapped.__id = decision.id;
              return mapped;
            }),
          );
          setMessage(t('admin.showingAccessDecisions', { defaultMessage: 'Showing {shown} of {total} access decisions', vars: { shown: result.data.length, total: result.pagination.total } }));
        }
      } catch (err) {
        if (cancelled) return;
        setRows([]);
        setError(err instanceof Error ? err.message : t('errors.loadSecurityRecords', { defaultMessage: 'Unable to load security records.' }));
        setMessage(t('admin.securityDataUnavailable', { defaultMessage: 'Live security data unavailable' }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [columns, kind, t, targetTypes]);

  function downloadAuditCsv() {
    void exportAdminAuditCsv(defaultAdminScope()).then((blob) => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'audit-events.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <article className="platform-card platform-table-card">
      <div className="table-toolbar">
        <FilterBar screen={screen} />
        {kind === 'audit' ? (
          <button type="button" className="ghost-button" data-interaction-native="true" onClick={downloadAuditCsv}>
            {t('admin.exportCsv', { defaultMessage: 'Export CSV' })}
          </button>
        ) : null}
      </div>
      {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
      <div className="platform-table-scroll">
        <table aria-label={t('admin.recordsAria', { defaultMessage: '{title} records', vars: { title: screen.title } })}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th scope="col" key={column}>{column}</th>
              ))}
              <th scope="col">{t('admin.actions', { defaultMessage: 'Actions' })}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1}>{error ? t('errors.unableToLoadRecords', { defaultMessage: 'Unable to load records.' }) : message}</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.__id}>
                  {columns.map((column, columnIndex) => {
                    const value = row[column] ?? '—';
                    return (
                      <td key={column}>
                        {columnIndex === 0 ? (
                          <span className="platform-leading">
                            <i>{value.slice(0, 2).toUpperCase()}</i>
                            {kind === 'audit' && row.__id ? (
                              <b><Link href={`/admin/security/audit-logs/${row.__id}`}>{value}</Link></b>
                            ) : (
                              <b>{value}</b>
                            )}
                          </span>
                        ) : /status|priority/i.test(column) ? (
                          <Badge value={value} />
                        ) : (
                          value
                        )}
                      </td>
                    );
                  })}
                  <td>
                    <TableRowActions
                      record={formatRowActionRecord(row[columns[0]], row.__id)}
                      entityKey={entityKey}
                      className="row-actions platform-row-actions"
                      {...rowActionCapabilities(screen.route)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <footer>
        <span>{message}</span>
      </footer>
    </article>
  );
}

function DenseTable({ screen, rows = screen.rows ?? [], columns = screen.columns ?? [] }: { screen: AdminScreen; rows?: Row[]; columns?: string[] }) {
  const { t } = useLocale();
  if (!shouldUseDesignFixtures()) {
    if (screen.route === '/admin/security/audit-logs') {
      return <IdentitySecurityLiveTable screen={screen} kind="audit" />;
    }
    if (screen.route === '/admin/security/restricted-access') {
      return (
        <IdentitySecurityLiveTable
          screen={screen}
          kind="audit"
          targetTypes="safeguarding_incident,guardian_relationship,data_subject_request"
        />
      );
    }
    if (screen.route === '/admin/security/access-decisions') {
      return <IdentitySecurityLiveTable screen={screen} kind="access-decisions" />;
    }
    if (screen.route === '/admin/security/login-history') {
      return <IdentitySecurityLiveTable screen={screen} kind="sessions" />;
    }
    if (shouldUseCatalogLiveData() && resolveCatalogDataset(screen)) {
      return <CatalogLiveTable screen={screen} />;
    }
    const opsDataset = resolveOpsDataset(screen);
    if (opsDataset && shouldUseOperationsLiveData()) {
      return <PlatformOpsLiveTable screen={screen} dataset={opsDataset} />;
    }
    return (
      <article className="platform-card platform-table-card">
        <p className="maps-settings-lead" role="status">
          {t('admin.noLiveListApi', { defaultMessage: 'No live list API is wired for this screen. Design fixtures are disabled.' })}
        </p>
        <div className="platform-table-scroll">
          <table aria-label={t('admin.recordsAria', { defaultMessage: '{title} records', vars: { title: screen.title } })}>
            <thead>
              <tr>{columns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={Math.max(columns.length, 1)}>{t('admin.liveDataUnavailable', { defaultMessage: 'Live data unavailable for this route.' })}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    );
  }
  return <FixtureDenseTable screen={screen} rows={rows} columns={columns} />;
}

function PlatformOpsLiveTable({ screen, dataset }: { screen: AdminScreen; dataset: OpsDatasetKey }) {
  const { t } = useLocale();
  const columns = screen.columns ?? [];
  const entityKey = resolveEntityKey(screen.route, screen.id);
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [message, setMessage] = useState(() => t('admin.loadingCatalog', { defaultMessage: 'Loading catalog…' }));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setError(null);
      try {
        const result = await loadOpsDataset(dataset, { scope: defaultOpsScope(screen.scope), perPage: 25 });
        if (cancelled) return;
        stashAdminRecords(result.items as Array<Record<string, unknown>>);
        setRows(opsRecordsToRows(dataset, result.items, columns));
        setMessage(
          result.pagination.total === 0
            ? t('admin.noCatalogRecords', { defaultMessage: 'No catalog records in this scope.' })
            : t('admin.showingCatalogRecords', {
              defaultMessage: 'Showing {shown} of {total} records',
              vars: { shown: result.items.length, total: result.pagination.total },
            }),
        );
      } catch (err) {
        if (cancelled) return;
        setRows([]);
        setError(operationsErrorMessage(err, t('errors.loadOps', { defaultMessage: 'Unable to load operations records.' })));
        setMessage(t('admin.catalogUnavailable', { defaultMessage: 'Live catalog unavailable' }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [columns, dataset, screen.scope, t]);

  return (
    <article className="platform-card platform-table-card">
      <FilterBar screen={screen} />
      {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
      <div className="platform-table-scroll">
        <table aria-label={t('admin.recordsAria', { defaultMessage: '{title} records', vars: { title: screen.title } })}>
          <thead>
            <tr>
              {columns.map((column) => <th scope="col" key={column}>{column}</th>)}
              <th scope="col">{t('admin.actions', { defaultMessage: 'Actions' })}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1}>{error ? t('errors.unableToLoadRecords', { defaultMessage: 'Unable to load records.' }) : message}</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.__id}>
                  {columns.map((column, columnIndex) => {
                    const value = row[column] ?? '—';
                    return (
                      <td key={column}>
                        {columnIndex === 0 ? (
                          <span className="platform-leading">
                            <i>{value.slice(0, 2).toUpperCase()}</i>
                            <b>{value}</b>
                          </span>
                        ) : /status|priority/i.test(column) ? (
                          <Badge value={value} />
                        ) : (
                          value
                        )}
                      </td>
                    );
                  })}
                  <td>
                    <TableRowActions
                      record={formatRowActionRecord(row[columns[0]], row.__id)}
                      entityKey={entityKey}
                      className="row-actions platform-row-actions"
                      {...rowActionCapabilities(screen.route)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <footer><span>{message}</span></footer>
    </article>
  );
}

function Dashboard({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  const { t } = useLocale();
  const dashboard = useAdminDashboard(dashboardModuleForScreen(screen.id), requestedScope);
  const channelItems = breakdownToItems(dashboard.data?.breakdown);
  const campaignItems = (dashboard.data?.recent_rows ?? []).map((row) => {
    const title = row.Campaign ?? row.Title ?? row.Message ?? 'Campaign';
    const status = row.Status ?? row.Channel ?? '';
    return status ? `${title} — ${status}` : title;
  });
  const listItems = campaignItems.length > 0 ? campaignItems : channelItems;
  const chartTitle = screen.batch === 'K'
    ? t('admin.incomeOverview', { defaultMessage: 'Income Overview' })
    : screen.batch === 'M'
      ? t('admin.deliveryOverview', { defaultMessage: 'Delivery Overview' })
      : screen.batch === 'O'
        ? t('admin.signInOverview', { defaultMessage: 'Sign-in Overview' })
        : t('admin.performanceOverTime', { defaultMessage: 'Performance Over Time' });
  const donutTitle = screen.batch === 'M'
    ? t('admin.byChannel', { defaultMessage: 'By Channel' })
    : screen.batch === 'O'
      ? t('admin.alertsBySeverity', { defaultMessage: 'Alerts by Severity' })
      : t('admin.byCategory', { defaultMessage: 'By Category' });
  const listTitle = screen.batch === 'M'
    ? t('admin.recentCampaigns', { defaultMessage: 'Recent Campaigns' })
    : screen.batch === 'O'
      ? t('admin.recentSecurityAlerts', { defaultMessage: 'Recent Security Alerts' })
      : t('admin.topResults', { defaultMessage: 'Top Results' });
  const listHref = screen.batch === 'K' ? '/admin/finance/transactions' : screen.batch === 'M' ? '/admin/communications/broadcasts' : screen.batch === 'O' ? '/admin/security/alerts' : '/admin/press/publications';
  return <DashboardShell screenId={screen.id} href={screen.route} data={dashboard.data} loading={dashboard.loading} error={dashboard.error} onRetry={dashboard.retry} preset={dashboard.preset} onPresetChange={dashboard.setPreset}>
    <div className="platform-dashboard">
    <LinkedMetricCards screenId={screen.id} metrics={dashboard.metrics} />
    <div className="platform-dashboard-grid"><article className="platform-card platform-chart"><header><h2>{chartTitle}</h2></header><Bars series={dashboard.data?.series}/></article><article className="platform-card platform-chart platform-donut-card"><h2>{donutTitle}</h2><div><Donut value={dashboard.data?.donut?.value ?? dashboard.metrics?.[0]?.value ?? '0'}/><ul>{channelItems.slice(0,5).map((item,index)=><li key={item}><i className={`tone-${index}`}/><span>{item.split(' — ')[0]}</span><strong>{item.split(' — ')[1]}</strong></li>)}</ul></div></article></div>
    <div className="platform-bottom-grid"><article className="platform-card platform-list"><header><h2>{listTitle}</h2><Link href={listHref}>{t('admin.viewAll', { defaultMessage: 'View all' })}</Link></header>{listItems.length === 0 ? <p className="maps-settings-lead">No results in this period.</p> : listItems.slice(0,6).map((item,index)=><div key={item}><span className="platform-list-icon">{index+1}</span><b>{item.split(' — ')[0]}</b><strong>{item.split(' — ')[1]}</strong></div>)}</article><DashboardQuickLinks screenId={screen.id} className="platform-card platform-actions" /></div>
  </div>
  </DashboardShell>;
}

function Detail({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  if (/^\/admin\/security\/audit-logs\//.test(screen.route) && !shouldUseDesignFixtures()) {
    return <AuditEventDetail screen={screen} />;
  }
  if (/^\/admin\/finance\/transactions\/[0-7][0-9A-HJKMNP-TV-Z]{25}$/i.test(screen.route)) {
    return <FinanceTransactionDetail screen={screen} />;
  }
  const publication = screen.batch==='J';
  return <div className="platform-detail"><article className="platform-card platform-detail-hero">{publication&&<div className="publication-cover small"><span>{t('admin.walkingIn', { defaultMessage: 'WALKING IN' })}</span><strong>{t('admin.dominion', { defaultMessage: 'DOMINION' })}</strong></div>}<div><span className="platform-overline">{t(publication ? 'admin.publicationDetail' : 'admin.recordDetail', { defaultMessage: publication ? 'Publication detail' : 'Record detail' })}</span><h2>{screen.title}</h2><p>{screen.subtitle}</p><Badge value={screen.details?.Status??t('admin.statusActive', { defaultMessage: 'Active' })}/></div></article>{screen.tabs&&<PlatformTabs tabs={screen.tabs}/>}<div className="platform-detail-grid"><article className="platform-card platform-definition"><h3>{t('admin.information', { defaultMessage: 'Information' })}</h3><dl>{Object.entries(screen.details??{}).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{key==='Status'?<Badge value={value}/>:value}</dd></div>)}</dl></article><article className="platform-card platform-detail-chart"><h3>{t('admin.summary', { defaultMessage: 'Summary' })}</h3>{screen.metrics&&<Metrics metrics={screen.metrics}/>}<Bars compact/><button className="platform-primary" type="button">{screen.action??t('admin.viewReport', { defaultMessage: 'View Report' })}</button></article></div></div>;
}

function Workflow({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  return <div className="platform-workflow"><aside className="platform-card platform-workflow-rail" aria-label={t('admin.publicationWorkflow', { defaultMessage: 'Publication workflow' })}>{(screen.tabs??[]).map((tab,index)=><div className={tab===screen.title?'active':index<2?'done':''} key={tab}><span>{index<2?'✓':index+1}</span><b>{tab}</b></div>)}</aside><article className="platform-card platform-review"><header><div><span className="platform-overline">{t('admin.reviewNotes', { defaultMessage: 'Review notes' })}</span><h2>{screen.title}</h2><p>{screen.subtitle}</p></div><button type="button">{t('admin.downloadManuscript', { defaultMessage: 'Download Manuscript' })}</button></header><div className="platform-review-score"><span>{t('admin.overallAssessment', { defaultMessage: 'Overall Assessment' })}</span><strong>★★★★★</strong></div>{Object.entries(screen.details??{}).map(([key,value])=><div className="platform-review-row" key={key}><span>{key}</span><b>{value}</b></div>)}<label><span>{t('admin.comments', { defaultMessage: 'Comments' })}</span><textarea defaultValue={t('admin.reviewCommentsDefault', { defaultMessage: 'The work is clear, accurate and ready to continue to the next publication stage.' })}/></label><footer><button type="button">{t('admin.requestRevisions', { defaultMessage: 'Request Revisions' })}</button><button className="platform-primary" type="button">{screen.action}</button></footer></article></div>;
}

function Form({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const steps = screen.tabs ?? [];
  const wizard = useAdminWizardStep(steps);
  const entries = Object.entries(screen.details ?? {});
  const fields = wizard.currentStep >= steps.length - 1 && steps.length > 0
    ? entries
    : entries.slice(
        Math.floor((entries.length / Math.max(steps.length - 1, 1)) * wizard.currentStep),
        Math.floor((entries.length / Math.max(steps.length - 1, 1)) * (wizard.currentStep + 1)) || entries.length,
      );

  return (
    <div className="platform-form-view" data-admin-wizard="true">
      {steps.length > 0 && <AdminWizardStepper steps={steps} currentStep={wizard.currentStep} className="platform-stepper" itemClassName="" activeClassName="active" />}
      <article className="platform-card platform-form">
        <header><h2>{wizard.currentLabel || screen.title}</h2><p>{screen.subtitle}</p></header>
        {wizard.currentStep < steps.length - 1 || steps.length === 0 ? (
          <div className="platform-form-grid">
            {fields.map(([label, value]) => (
              <label className={/message|description/i.test(label) ? 'wide' : ''} key={label}>
                <span>{label}</span>
                {/message|description/i.test(label) ? <textarea defaultValue={value} /> : <input defaultValue={value} />}
              </label>
            ))}
          </div>
        ) : (
          <dl className="wizard-review-summary">
            {entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
        )}
        {screen.items && wizard.isLast && (
          <aside className="platform-summary"><h3>{t('admin.summary', { defaultMessage: 'Summary' })}</h3>{screen.items.map(item => <p key={item}><span>{item.split(' — ')[0]}</span><strong>{item.split(' — ')[1]}</strong></p>)}</aside>
        )}
        <AdminWizardFooter wizard={wizard} nextLabel={screen.action} finishLabel={screen.action ?? t('common.submit', { defaultMessage: 'Submit' })} primaryClassName="platform-primary" secondaryClassName="ghost-button" />
      </article>
    </div>
  );
}

function FixtureSettings({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  return <div className="platform-settings"><aside className="platform-card"><button className="active" type="button">{t('admin.general', { defaultMessage: 'General' })}</button>{(screen.tabs??[t('admin.configuration', { defaultMessage: 'Configuration' }),t('admin.policies', { defaultMessage: 'Policies' }),t('admin.advanced', { defaultMessage: 'Advanced' })]).slice(1).map(tab=><button type="button" key={tab}>{tab}</button>)}<button type="button">{t('admin.integrations', { defaultMessage: 'Integrations' })}</button><button type="button">{t('admin.maintenance', { defaultMessage: 'Maintenance' })}</button></aside><article className="platform-card platform-settings-body"><div className="platform-form-grid">{Object.entries(screen.details??{}).map(([label,value])=><label key={label}><span>{label}</span>{/enabled|active/i.test(value)?<span className="platform-toggle"><input type="checkbox" defaultChecked/><i/></span>:<input defaultValue={value}/>}</label>)}</div><h3>{t('admin.configurationRules', { defaultMessage: 'Configuration Rules' })}</h3>{(screen.items??[]).map((item,index)=><div className="platform-setting-row" key={item}><span>{item.split(' — ')[0]}</span><b>{item.split(' — ')[1]}</b><span className="platform-toggle"><input aria-label={t('admin.toggleItem', { defaultMessage: 'Toggle {item}', vars: { item } })} type="checkbox" defaultChecked={index<3}/><i/></span></div>)}<footer><button className="platform-primary" type="button">{screen.action}</button></footer></article></div>;
}

export function KcaSettingsPanel() {
  const { t } = useLocale();
  const [status, setStatus] = useState<KcaGovernanceStatus | null>(null);
  const [message, setMessage] = useState(() => t('admin.loadingKcaGovernance', { defaultMessage: 'Loading KCA governance…' }));
  const [busy, setBusy] = useState(false);
  const [letterheadId, setLetterheadId] = useState<string | null>(null);
  const [signatureId, setSignatureId] = useState<string | null>(null);
  const [orientationSteps, setOrientationSteps] = useState<KcaOrientationStepRecord[]>([]);
  const [stepsBusy, setStepsBusy] = useState(false);
  const templateRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    void getKcaGovernance()
      .then((data) => {
        setStatus(data);
        setLetterheadId(data.admission_letterhead_file_asset_id ?? null);
        setSignatureId(data.admission_signature_file_asset_id ?? null);
        setMessage(data.configured
          ? t('admin.kcaLiveFromApi', { defaultMessage: 'Live KCA governance from the admin API.' })
          : t('admin.kcaUsingDefaults', { defaultMessage: 'Using KCA defaults until you save.' }));
      })
      .catch((error) => {
        setMessage(platformErrorMessage(error, t('errors.loadKcaGovernance', { defaultMessage: 'Could not load KCA governance. Requires kca.governance.view and recent MFA.' })));
      });
    void getKcaOrientationSteps()
      .then((steps) => setOrientationSteps(steps))
      .catch(() => setOrientationSteps([]));
  }, [t]);

  const uploadAsset = async (
    file: File,
    purpose: 'kca_admission_letterhead' | 'kca_admission_signature',
  ) => {
    const asset = await uploadPlatformGovernanceFile(file, purpose);
    if (purpose === 'kca_admission_letterhead') setLetterheadId(asset.id);
    else setSignatureId(asset.id);
    return asset.id;
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const letterheadInput = form.get('admission_letterhead_file') as File | null;
      const signatureInput = form.get('admission_signature_file') as File | null;
      let nextLetterheadId = letterheadId;
      let nextSignatureId = signatureId;
      if (letterheadInput instanceof File && letterheadInput.size > 0) {
        nextLetterheadId = await uploadAsset(letterheadInput, 'kca_admission_letterhead');
      }
      if (signatureInput instanceof File && signatureInput.size > 0) {
        nextSignatureId = await uploadAsset(signatureInput, 'kca_admission_signature');
      }
      const data = await configureKcaGovernance({
        pass_threshold_percent: Number(form.get('pass_threshold_percent') || 70),
        attendance_threshold_percent: Number(form.get('attendance_threshold_percent') || 75),
        require_final_assessment: form.get('require_final_assessment') === 'on',
        require_signed_pdf: form.get('require_signed_pdf') === 'on',
        certificate_signer_name: String(form.get('certificate_signer_name') || ''),
        certificate_signer_title: String(form.get('certificate_signer_title') || ''),
        admission_signer_name: String(form.get('admission_signer_name') || ''),
        admission_signer_title: String(form.get('admission_signer_title') || ''),
        admission_reference_prefix: String(form.get('admission_reference_prefix') || 'KCA/ADM'),
        admission_letter_body_template: String(form.get('admission_letter_body_template') || ''),
        admission_programme_commencement: String(form.get('admission_programme_commencement') || ''),
        admission_programme_completion: String(form.get('admission_programme_completion') || ''),
        admission_programme_venue: String(form.get('admission_programme_venue') || ''),
        admission_programme_schedule: String(form.get('admission_programme_schedule') || ''),
        admission_programme_mentor: String(form.get('admission_programme_mentor') || ''),
        orientation_welcome: String(form.get('orientation_welcome') || ''),
        orientation_review_welcome: String(form.get('orientation_review_welcome') || ''),
        admission_letterhead_file_asset_id: nextLetterheadId,
        admission_signature_file_asset_id: nextSignatureId,
      });
      setStatus(data);
      setLetterheadId(data.admission_letterhead_file_asset_id ?? nextLetterheadId);
      setSignatureId(data.admission_signature_file_asset_id ?? nextSignatureId);
      setMessage(t('admin.kcaSaved', { defaultMessage: 'KCA governance saved. Superadmins delegate kca.governance.manage and kca.certificates.revoke.' }));
    } catch (error) {
      setMessage(platformErrorMessage(error, t('errors.saveKcaGovernance', { defaultMessage: 'Save failed. Confirm kca.governance.manage and recent MFA.' })));
    } finally {
      setBusy(false);
    }
  };

  const saveOrientationSteps = async () => {
    setStepsBusy(true);
    try {
      const saved = await syncKcaOrientationSteps(orientationSteps);
      setOrientationSteps(saved);
      setMessage(t('admin.kcaOrientationStepsSaved', { defaultMessage: 'Orientation programme saved.' }));
    } catch (error) {
      setMessage(platformErrorMessage(error, t('errors.saveKcaOrientationSteps', { defaultMessage: 'Could not save orientation steps.' })));
    } finally {
      setStepsBusy(false);
    }
  };

  const updateOrientationStep = (index: number, patch: Partial<KcaOrientationStepRecord>) => {
    setOrientationSteps((current) => current.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  };

  return (
    <form className="platform-settings kca-governance-form" noValidate onSubmit={(event) => void save(event)}>
      <article className="platform-card platform-settings-body">
        <header className="platform-settings-heading">
          <span className="platform-overline">{t('admin.kcaOverline', { defaultMessage: 'KINGDOM CHANGE AGENTS' })}</span>
          <h2>{t('admin.certificationGovernance', { defaultMessage: 'Certification governance' })}</h2>
          <p>{t('admin.kcaLead', { defaultMessage: 'Pass thresholds, signer identity, signed PDF requirement, and revocation authority are server-owned.' })}</p>
        </header>
        <p className="maps-settings-lead" role="status">
          {message}
        </p>
        <div className="platform-form-grid">
          <label>
            <span>{t('admin.passThreshold', { defaultMessage: 'Pass threshold (%)' })}</span>
            <input defaultValue={status?.pass_threshold_percent ?? 70} max={100} min={1} name="pass_threshold_percent" type="number" />
          </label>
          <label>
            <span>{t('admin.attendanceThreshold', { defaultMessage: 'Attendance threshold (%)' })}</span>
            <input defaultValue={status?.attendance_threshold_percent ?? 75} max={100} min={1} name="attendance_threshold_percent" type="number" />
          </label>
          <label>
            <span>{t('admin.certificateSignerName', { defaultMessage: 'Certificate signer name' })}</span>
            <input defaultValue={status?.certificate_signer_name ?? ''} name="certificate_signer_name" />
          </label>
          <label>
            <span>{t('admin.certificateSignerTitle', { defaultMessage: 'Certificate signer title' })}</span>
            <input defaultValue={status?.certificate_signer_title ?? ''} name="certificate_signer_title" />
          </label>
          <label>
            <span>{t('admin.requireFinalAssessment', { defaultMessage: 'Require final assessment' })}</span>
            <span className="platform-toggle">
              <input defaultChecked={status?.require_final_assessment ?? true} name="require_final_assessment" type="checkbox" />
              <i />
            </span>
          </label>
          <label>
            <span>{t('admin.requireSignedPdf', { defaultMessage: 'Require signed PDF certificates' })}</span>
            <span className="platform-toggle">
              <input defaultChecked={status?.require_signed_pdf ?? false} name="require_signed_pdf" type="checkbox" />
              <i />
            </span>
          </label>
        </div>
        <h3>{t('admin.admissionLetterGovernance', { defaultMessage: 'Admission letter' })}</h3>
        <p>{t('admin.admissionLetterLead', { defaultMessage: 'Configure the provost signature and full-page letter template used when admission letters are issued.' })}</p>
        <div className="platform-form-grid">
          <label>
            <span>{t('admin.admissionSignerName', { defaultMessage: 'Provost / signer name' })}</span>
            <input defaultValue={status?.admission_signer_name ?? ''} name="admission_signer_name" />
          </label>
          <label>
            <span>{t('admin.admissionSignerTitle', { defaultMessage: 'Signer title' })}</span>
            <input defaultValue={status?.admission_signer_title ?? ''} name="admission_signer_title" />
          </label>
          <label>
            <span>{t('admin.admissionLetterhead', { defaultMessage: 'Full-page letter template' })}</span>
            <input accept="image/*" name="admission_letterhead_file" type="file" />
            {letterheadId ? <small>{letterheadId}</small> : null}
            <small>{t('admin.admissionLetterheadHelp', { defaultMessage: 'Upload an A4/letter page image. It fills the PDF background; letter text is written on top.' })}</small>
          </label>
          <label>
            <span>{t('admin.admissionSignature', { defaultMessage: 'Provost signature (upload or draw externally)' })}</span>
            <input accept="image/*" name="admission_signature_file" type="file" />
            {signatureId ? <small>{signatureId}</small> : null}
          </label>
          <label>
            <span>{t('admin.admissionReferencePrefix', { defaultMessage: 'Admission reference prefix' })}</span>
            <input defaultValue={status?.admission_reference_prefix ?? 'KCA/ADM'} name="admission_reference_prefix" placeholder="KCA/ADM" />
          </label>
          <label>
            <span>{t('admin.programmeCommencement', { defaultMessage: 'Programme commencement date' })}</span>
            <input defaultValue={status?.admission_programme_commencement ?? ''} name="admission_programme_commencement" />
          </label>
          <label>
            <span>{t('admin.programmeCompletion', { defaultMessage: 'Programme completion date' })}</span>
            <input defaultValue={status?.admission_programme_completion ?? ''} name="admission_programme_completion" />
          </label>
          <label>
            <span>{t('admin.programmeVenue', { defaultMessage: 'Venue' })}</span>
            <input defaultValue={status?.admission_programme_venue ?? ''} name="admission_programme_venue" />
          </label>
          <label>
            <span>{t('admin.programmeSchedule', { defaultMessage: 'Training day/time' })}</span>
            <input defaultValue={status?.admission_programme_schedule ?? ''} name="admission_programme_schedule" />
          </label>
          <label>
            <span>{t('admin.programmeMentor', { defaultMessage: 'Default assigned mentor' })}</span>
            <input defaultValue={status?.admission_programme_mentor ?? ''} name="admission_programme_mentor" />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            <span>{t('admin.admissionLetterTemplate', { defaultMessage: 'Admission letter content template' })}</span>
            <textarea
              ref={templateRef}
              defaultValue={status?.admission_letter_body_template ?? ''}
              name="admission_letter_body_template"
              placeholder="{reference_code}, {date}, {applicant_name}, {applicant_first_name}, {applicant_address}, {kca_year}, {programme_commencement}, {venue}, {signer_name}..."
              rows={18}
            />
            <small>{t('admin.admissionLetterTemplateHelp', { defaultMessage: 'Leave blank to use the default KCA admission letter. Placeholders are filled from applicant profile, application data, and programme settings above.' })}</small>
            {status?.admission_letter_template_placeholders ? (
              <small style={{ display: 'block', marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>
                {status.admission_letter_template_placeholders}
              </small>
            ) : null}
          </label>
          <div className="kca-template-actions" style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem' }}>
            <button
              className="ghost-button"
              data-interaction-native="true"
              disabled={!status?.admission_letter_template_default}
              onClick={() => {
                if (templateRef.current && status?.admission_letter_template_default) {
                  templateRef.current.value = status.admission_letter_template_default;
                }
              }}
              type="button"
            >
              {t('admin.loadDefaultAdmissionTemplate', { defaultMessage: 'Load default template' })}
            </button>
          </div>
        </div>
        <h3>{t('admin.kcaOrientationProgram', { defaultMessage: 'Orientation programme' })}</h3>
        <p>{t('admin.kcaOrientationProgramLead', { defaultMessage: 'Edit step titles and content shown to applicants and students. Add new steps any time; slugs are fixed after creation.' })}</p>
        <div className="platform-form-grid">
          <label style={{ gridColumn: '1 / -1' }}>
            <span>{t('admin.orientationWelcome', { defaultMessage: 'Welcome message (first visit)' })}</span>
            <textarea defaultValue={status?.orientation_welcome ?? ''} name="orientation_welcome" rows={3} />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            <span>{t('admin.orientationReviewWelcome', { defaultMessage: 'Welcome message (revisit after completion)' })}</span>
            <textarea defaultValue={status?.orientation_review_welcome ?? ''} name="orientation_review_welcome" rows={3} />
          </label>
        </div>
        {orientationSteps.map((step, index) => (
          <fieldset className="platform-card" key={step.id ?? `${step.slug}-${index}`} style={{ marginTop: '1rem' }}>
            <legend>{step.id ? step.slug : t('admin.newOrientationStep', { defaultMessage: 'New step' })}</legend>
            <div className="platform-form-grid">
              {!step.id ? (
                <label>
                  <span>{t('admin.stepSlug', { defaultMessage: 'Slug (permanent id)' })}</span>
                  <input
                    onChange={(event) => updateOrientationStep(index, { slug: event.target.value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') })}
                    value={step.slug}
                    placeholder="e.g. vision_mission"
                  />
                </label>
              ) : null}
              <label>
                <span>{t('admin.stepTitle', { defaultMessage: 'Step title' })}</span>
                <input
                  onChange={(event) => updateOrientationStep(index, { title: event.target.value })}
                  value={step.title}
                />
              </label>
              <label>
                <span>{t('admin.stepSubtitle', { defaultMessage: 'Subtitle' })}</span>
                <input
                  onChange={(event) => updateOrientationStep(index, { subtitle: event.target.value })}
                  value={step.subtitle ?? ''}
                />
              </label>
              <label>
                <span>{t('admin.stepType', { defaultMessage: 'Display type' })}</span>
                <select
                  onChange={(event) => updateOrientationStep(index, { display_type: event.target.value as KcaOrientationStepRecord['display_type'] })}
                  value={step.display_type}
                >
                  <option value="content">Content</option>
                  <option value="modules_list">Modules list</option>
                  <option value="mentor">Mentor</option>
                </select>
              </label>
              <label>
                <span>{t('admin.stepSequence', { defaultMessage: 'Sequence' })}</span>
                <input
                  type="number"
                  min={1}
                  onChange={(event) => updateOrientationStep(index, { sequence: Number(event.target.value) || index + 1 })}
                  value={step.sequence}
                />
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                <span>{t('admin.stepBody', { defaultMessage: 'Content' })}</span>
                <textarea
                  onChange={(event) => updateOrientationStep(index, { body: event.target.value })}
                  rows={8}
                  value={step.body ?? ''}
                />
                {step.display_type === 'modules_list' ? (
                  <small>{t('admin.orientationModulesListHelp', { defaultMessage: 'Introductory content appears above the auto-generated module list on this step.' })}</small>
                ) : step.display_type === 'mentor' ? (
                  <small>{t('admin.orientationMentorStepHelp', { defaultMessage: 'Introductory content appears above the assigned mentor details on this step.' })}</small>
                ) : (
                  <small>{t('admin.orientationContentHelp', { defaultMessage: 'Use blank lines between paragraphs. Keep titles short and body clear for mobile reading.' })}</small>
                )}
              </label>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem' }}>
                <label className="interaction-check">
                  <input
                    checked={step.is_active !== false}
                    onChange={(event) => updateOrientationStep(index, { is_active: event.target.checked })}
                    type="checkbox"
                  />{' '}
                  {t('admin.stepActive', { defaultMessage: 'Active (shown to students)' })}
                </label>
              </div>
            </div>
          </fieldset>
        ))}
        <div className="form-footer" style={{ marginTop: '1rem', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="ghost-button"
            data-interaction-native="true"
            type="button"
            onClick={() => {
              const slugBase = `step_${orientationSteps.length + 1}`;
              setOrientationSteps((current) => [
                ...current,
                {
                  slug: slugBase,
                  title: 'New orientation step',
                  subtitle: '',
                  body: '',
                  display_type: 'content',
                  sequence: current.length + 1,
                  is_active: true,
                },
              ]);
            }}
          >
            {t('admin.addOrientationStep', { defaultMessage: '+ Add orientation step' })}
          </button>
        </div>
        <footer className="form-footer kca-governance-footer">
          <button
            className="ghost-button"
            data-interaction-native="true"
            disabled={stepsBusy || orientationSteps.length === 0}
            onClick={() => void saveOrientationSteps()}
            type="button"
          >
            {stepsBusy
              ? t('common.saving', { defaultMessage: 'Saving…' })
              : t('admin.saveOrientationSteps', { defaultMessage: 'Save orientation steps' })}
          </button>
        </footer>
        <footer className="form-footer kca-governance-footer">
          <button className="platform-primary" data-interaction-native="true" disabled={busy} type="submit">
            {busy
              ? t('common.saving', { defaultMessage: 'Saving…' })
              : t('admin.saveGovernance', { defaultMessage: 'Save governance' })}
          </button>
        </footer>
      </article>
    </form>
  );
}

function configurationMatchesSecurityTab(key: string, tab: string): boolean {
  const normalized = key.toLowerCase();
  const theme = tab.toLowerCase();
  if (!theme || theme === 'authentication') {
    return /mfa|totp|password|session|ip|allowlist|auth|login/.test(normalized) || theme === '';
  }
  if (theme.includes('password')) return normalized.includes('password');
  if (theme.includes('mfa')) return /mfa|totp/.test(normalized);
  if (theme.includes('session')) return normalized.includes('session');
  if (theme.includes('ip')) return /ip|allowlist/.test(normalized);
  if (theme.includes('data')) return /encrypt|privacy|classif|retention/.test(normalized);
  return true;
}

function ConfigurationsSettingsPanel({ variant = 'platform' }: { variant?: 'platform' | 'security' | 'ai' }) {
  const { t } = useLocale();
  const [items, setItems] = useState<PlatformConfiguration[]>([]);
  const [message, setMessage] = useState(() => t('admin.loadingConfigurations', { defaultMessage: 'Loading platform configurations…' }));
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState('');
  const [valueType, setValueType] = useState<'string' | 'integer' | 'boolean' | 'json'>('string');
  const [classification, setClassification] = useState<'internal' | 'confidential'>('internal');
  const [environment, setEnvironment] = useState('production');
  const [value, setValue] = useState('');

  const refresh = useCallback(async () => {
    if (!platformApiConfigured()) {
      setMessage(t('admin.setApiUrlConfigurations', { defaultMessage: 'Set NEXT_PUBLIC_FHC_API_URL to load platform configurations.' }));
      return;
    }
    setBusy(true);
    try {
      const result = await listConfigurations({ per_page: 50, sort: 'key' });
      setItems(result.items);
      setMessage(result.items.length
        ? t('admin.loadedConfigurations', { defaultMessage: 'Loaded {count} configuration(s).', vars: { count: result.pagination?.total ?? result.items.length } })
        : t('admin.noConfigurations', { defaultMessage: 'No configurations yet. Save one below.' }));
    } catch (error) {
      setMessage(platformErrorMessage(error, t('errors.loadConfigurations', { defaultMessage: 'Could not load configurations. Confirm session, scope, and recent MFA.' })));
    } finally {
      setBusy(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!platformApiConfigured()) {
      setMessage(t('admin.configureApiUrlConfigurations', { defaultMessage: 'Configure NEXT_PUBLIC_FHC_API_URL to persist configurations.' }));
      return;
    }
    setBusy(true);
    try {
      let parsed: JsonValue = value;
      if (valueType === 'integer') parsed = Number.parseInt(value, 10);
      else if (valueType === 'boolean') parsed = value === 'true' || value === '1';
      else if (valueType === 'json') parsed = JSON.parse(value || '{}') as JsonValue;

      await upsertConfiguration({
        key: key.trim(),
        value_type: valueType,
        classification,
        environment: environment.trim() || 'production',
        value: parsed,
      });
      setKey('');
      setValue('');
      setMessage(t('admin.configurationSaved', { defaultMessage: 'Configuration saved.' }));
      await refresh();
    } catch (error) {
      setMessage(platformErrorMessage(error, t('errors.saveConfigurations', { defaultMessage: 'Save failed. Confirm platform.configuration.manage and recent MFA.' })));
      setBusy(false);
    }
  }

  const visibleItems = items.filter((item) => configurationMatchesSecurityTab(item.key, typeof window === 'undefined' ? '' : (new URL(window.location.href).searchParams.get('tab') ?? '')));
  return (
    <form className="card settings-card ministry-settings" onSubmit={onSave}>
      <p className="maps-settings-lead" role="status">{message}</p>
      <p className="maps-settings-lead">
        {variant === 'security'
          ? t('admin.securityConfigTabs', { defaultMessage: 'MFA, password, session, and IP tabs filter these platform configuration keys. There is no dedicated security-settings API.' })
          : variant === 'ai'
            ? t('admin.aiConfigKeys', { defaultMessage: 'Advisory AI keys and flags are stored as platform configurations. There is no separate AI-settings CRUD API.' })
            : t('admin.platformConfigKeys', { defaultMessage: 'Keyed platform configurations (not a second settings store). Confidential values stay masked.' })}
      </p>
      <div className="platform-setting-row" style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        {(visibleItems.length ? visibleItems : items).map((item) => (
          <div key={item.id} className="platform-setting-row">
            <span>{item.key}</span>
            <b>
              {item.classification === 'confidential'
                ? item.has_value
                  ? t('admin.confidentialMasked', { defaultMessage: '•••• (confidential)' })
                  : '—'
                : String(item.value ?? '—')}
            </b>
            <span>{item.environment} · {item.value_type}</span>
          </div>
        ))}
      </div>
      <div className="form-grid">
        <label className="full"><span>{t('admin.key', { defaultMessage: 'Key' })}</span><input value={key} onChange={(e) => setKey(e.target.value)} placeholder="church.first_timer.follow_up_hours" disabled={busy} required /></label>
        <label><span>{t('admin.valueType', { defaultMessage: 'Value type' })}</span><select value={valueType} onChange={(e) => setValueType(e.target.value as typeof valueType)} disabled={busy}><option value="string">string</option><option value="integer">integer</option><option value="boolean">boolean</option><option value="json">json</option></select></label>
        <label><span>{t('admin.classification', { defaultMessage: 'Classification' })}</span><select value={classification} onChange={(e) => setClassification(e.target.value as typeof classification)} disabled={busy}><option value="internal">internal</option><option value="confidential">confidential</option></select></label>
        <label><span>{t('admin.environment', { defaultMessage: 'Environment' })}</span><input value={environment} onChange={(e) => setEnvironment(e.target.value)} disabled={busy} required /></label>
        <label className="full"><span>{t('admin.value', { defaultMessage: 'Value' })}</span><input value={value} onChange={(e) => setValue(e.target.value)} placeholder={valueType === 'boolean' ? t('admin.trueFalsePlaceholder', { defaultMessage: 'true / false' }) : valueType === 'json' ? '{"key":"value"}' : t('admin.value', { defaultMessage: 'Value' })} disabled={busy} required={classification === 'internal' || valueType !== 'string'} /></label>
      </div>
      <div className="form-footer">
        <button className="ghost-button" type="button" onClick={() => void refresh()} disabled={busy}>{t('common.refresh', { defaultMessage: 'Refresh' })}</button>
        <button className="primary-button" type="submit" disabled={busy}>{t('admin.saveChanges', { defaultMessage: 'Save Changes' })}</button>
      </div>
    </form>
  );
}

function FeatureFlagsSettingsPanel() {
  const { t } = useLocale();
  const [items, setItems] = useState<FeatureFlag[]>([]);
  const [message, setMessage] = useState(() => t('admin.loadingFeatureFlags', { defaultMessage: 'Loading feature flags…' }));
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState('');
  const [environment, setEnvironment] = useState('production');
  const [rollout, setRollout] = useState('100');

  const refresh = useCallback(async () => {
    if (!platformApiConfigured()) {
      setMessage(t('admin.setApiUrlFeatureFlags', { defaultMessage: 'Set NEXT_PUBLIC_FHC_API_URL to load feature flags.' }));
      return;
    }
    setBusy(true);
    try {
      const result = await listFeatureFlags({ per_page: 50, sort: 'key' });
      setItems(result.items);
      setMessage(result.items.length
        ? t('admin.loadedFeatureFlags', { defaultMessage: 'Loaded {count} feature flag(s).', vars: { count: result.pagination?.total ?? result.items.length } })
        : t('admin.noFeatureFlags', { defaultMessage: 'No feature flags yet. Save one below.' }));
    } catch (error) {
      setMessage(platformErrorMessage(error, t('errors.loadFeatureFlags', { defaultMessage: 'Could not load feature flags. Confirm session, scope, and recent MFA.' })));
    } finally {
      setBusy(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!platformApiConfigured()) {
      setMessage(t('admin.configureApiUrlFeatureFlags', { defaultMessage: 'Configure NEXT_PUBLIC_FHC_API_URL to persist feature flags.' }));
      return;
    }
    setBusy(true);
    try {
      await upsertFeatureFlag({
        key: key.trim(),
        environment: environment.trim() || 'production',
        rollout_percentage: Number.parseInt(rollout, 10) || 0,
      });
      setKey('');
      setMessage(t('admin.featureFlagSaved', { defaultMessage: 'Feature flag saved.' }));
      await refresh();
    } catch (error) {
      setMessage(platformErrorMessage(error, t('errors.saveFeatureFlags', { defaultMessage: 'Save failed. Confirm platform.feature_flags.manage and recent MFA.' })));
      setBusy(false);
    }
  }

  async function toggleFlag(flag: FeatureFlag) {
    if (!platformApiConfigured()) return;
    setBusy(true);
    try {
      const updated = flag.enabled ? await disableFeatureFlag(flag.id) : await enableFeatureFlag(flag.id);
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setMessage(t('admin.featureFlagToggled', { defaultMessage: '{key} is now {state}.', vars: { key: updated.key, state: updated.enabled ? t('admin.enabled', { defaultMessage: 'enabled' }) : t('admin.disabled', { defaultMessage: 'disabled' }) } }));
    } catch (error) {
      setMessage(platformErrorMessage(error, t('errors.toggleFeatureFlag', { defaultMessage: 'Enable/disable failed. Confirm permissions and recent MFA.' })));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card settings-card ministry-settings" onSubmit={onSave}>
      <p className="maps-settings-lead">{message}</p>
      <div style={{ marginBottom: 16 }}>
        {items.map((flag) => (
          <div className="platform-setting-row" key={flag.id}>
            <span>{flag.key}</span>
            <b>{flag.environment} · {flag.rollout_percentage}%</b>
            <span className="platform-toggle">
              <input
                aria-label={t('admin.toggleItem', { defaultMessage: 'Toggle {item}', vars: { item: flag.key } })}
                type="checkbox"
                checked={flag.enabled}
                disabled={busy}
                onChange={() => void toggleFlag(flag)}
              />
              <i />
            </span>
          </div>
        ))}
      </div>
      <div className="form-grid">
        <label className="full"><span>{t('admin.key', { defaultMessage: 'Key' })}</span><input value={key} onChange={(e) => setKey(e.target.value)} placeholder="church.follow_up_alerts" disabled={busy} required /></label>
        <label><span>{t('admin.environment', { defaultMessage: 'Environment' })}</span><input value={environment} onChange={(e) => setEnvironment(e.target.value)} disabled={busy} required /></label>
        <label><span>{t('admin.rolloutPercent', { defaultMessage: 'Rollout %' })}</span><input type="number" min={0} max={100} value={rollout} onChange={(e) => setRollout(e.target.value)} disabled={busy} required /></label>
      </div>
      <div className="form-footer">
        <button className="ghost-button" type="button" onClick={() => void refresh()} disabled={busy}>{t('common.refresh', { defaultMessage: 'Refresh' })}</button>
        <button className="primary-button" type="submit" disabled={busy}>{t('admin.saveChanges', { defaultMessage: 'Save Changes' })}</button>
      </div>
    </form>
  );
}

function ObjectStorageSettingsPanel() {
  const { t } = useLocale();
  const [status, setStatus] = useState<ObjectStorageStatus | null>(null);
  const [message, setMessage] = useState(() => t('admin.loadingObjectStorage', { defaultMessage: 'Loading object storage configuration…' }));
  const [busy, setBusy] = useState(false);
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState('');
  const [bucket, setBucket] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [url, setUrl] = useState('');
  const [rootPrefix, setRootPrefix] = useState('');
  const [pathStyle, setPathStyle] = useState(false);

  const refresh = useCallback(async () => {
    if (!platformApiConfigured()) {
      setMessage('Set NEXT_PUBLIC_FHC_API_URL to load object storage settings.');
      return;
    }
    setBusy(true);
    try {
      const data = await getObjectStorage();
      setStatus(data);
      setRegion(data.region ?? '');
      setBucket(data.bucket ?? '');
      setEndpoint(data.endpoint ?? '');
      setUrl(data.url ?? '');
      setRootPrefix(data.root_prefix ?? '');
      setPathStyle(Boolean(data.use_path_style_endpoint));
      setMessage(
        data.active
          ? `Active provider: ${data.active_provider ?? 's3'}. Validation: ${data.validation?.status ?? 'n/a'}.`
          : `Configured: ${data.configured ? 'yes' : 'no'}. Active provider: ${data.active_provider ?? 'local'}.`,
      );
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Could not load object storage. Confirm global scope, platform.storage.view, and recent MFA.'));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!platformApiConfigured()) {
      setMessage('Configure NEXT_PUBLIC_FHC_API_URL to persist object storage.');
      return;
    }
    setBusy(true);
    try {
      const data = await configureObjectStorage({
        access_key_id: accessKeyId.trim(),
        secret_access_key: secretAccessKey.trim(),
        region: region.trim(),
        bucket: bucket.trim(),
        endpoint: endpoint.trim() || null,
        url: url.trim() || null,
        root_prefix: rootPrefix.trim() || null,
        use_path_style_endpoint: pathStyle,
      });
      setStatus(data);
      setAccessKeyId('');
      setSecretAccessKey('');
      setMessage('Object storage configuration saved. Validate, then activate.');
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Save failed. Confirm platform.storage.manage and recent MFA.'));
    } finally {
      setBusy(false);
    }
  }

  async function runValidate() {
    if (!platformApiConfigured()) return;
    setBusy(true);
    try {
      const data = await validateObjectStorage();
      setStatus(data);
      const result = data.validation_result?.status ?? data.validation?.status ?? 'unknown';
      setMessage(`Validation ${result}${data.validation_result?.failure_code ? ` (${data.validation_result.failure_code})` : ''}.`);
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Validation failed. Save a valid S3-compatible configuration first.'));
    } finally {
      setBusy(false);
    }
  }

  async function runActivate() {
    if (!platformApiConfigured()) return;
    setBusy(true);
    try {
      const data = await activateObjectStorage();
      setStatus(data);
      setMessage('Object storage activated for new writes.');
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Activation failed. Validate the connection first.'));
    } finally {
      setBusy(false);
    }
  }

  async function runDeactivate() {
    if (!platformApiConfigured()) return;
    setBusy(true);
    try {
      const data = await deactivateObjectStorage();
      setStatus((prev) =>
        prev
          ? { ...prev, active: false, active_provider: data.active_provider, credentials_configured: prev.credentials_configured }
          : prev,
      );
      setMessage('Object storage deactivated. New writes use local storage.');
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Deactivation failed.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card settings-card ministry-settings" onSubmit={onSave}>
      <p className="maps-settings-lead">{message}</p>
      <div className="form-grid">
        <label>
          <span>Status</span>
          <input readOnly value={status?.active ? `Active · ${status.active_provider ?? 's3'}` : `Inactive · ${status?.active_provider ?? 'local'}`} />
        </label>
        <label>
          <span>Configured</span>
          <input readOnly value={status?.configured ? (status.credentials_configured ? 'Yes · credentials saved' : 'Yes') : 'No'} />
        </label>
        <label className="full"><span>Access key ID</span><input type="password" autoComplete="off" value={accessKeyId} onChange={(e) => setAccessKeyId(e.target.value)} disabled={busy} required placeholder={status?.credentials_configured ? '•••••••• (required to re-save)' : 'Access key'} /></label>
        <label className="full"><span>Secret access key</span><input type="password" autoComplete="off" value={secretAccessKey} onChange={(e) => setSecretAccessKey(e.target.value)} disabled={busy} required placeholder={status?.credentials_configured ? '•••••••• (required to re-save)' : 'Secret key'} /></label>
        <label><span>Region</span><input value={region} onChange={(e) => setRegion(e.target.value)} disabled={busy} required /></label>
        <label><span>Bucket</span><input value={bucket} onChange={(e) => setBucket(e.target.value)} disabled={busy} required /></label>
        <label className="full"><span>Endpoint (optional HTTPS)</span><input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} disabled={busy} placeholder="https://s3.example.org" /></label>
        <label className="full"><span>Public URL (optional HTTPS)</span><input value={url} onChange={(e) => setUrl(e.target.value)} disabled={busy} /></label>
        <label><span>Root prefix</span><input value={rootPrefix} onChange={(e) => setRootPrefix(e.target.value)} disabled={busy} /></label>
        <label><span>Path-style endpoint</span><span className="platform-toggle"><input type="checkbox" checked={pathStyle} onChange={(e) => setPathStyle(e.target.checked)} disabled={busy} /><i /></span></label>
      </div>
      <div className="form-footer">
        <button className="ghost-button" type="button" onClick={() => void refresh()} disabled={busy}>Refresh</button>
        <button className="ghost-button" type="button" onClick={() => void runValidate()} disabled={busy || !status?.configured}>Validate</button>
        <button className="ghost-button" type="button" onClick={() => void runDeactivate()} disabled={busy}>Use Local</button>
        <button className="ghost-button" type="button" onClick={() => void runActivate()} disabled={busy || !status?.configured}>Activate</button>
        <button className="primary-button" type="submit" disabled={busy}>Save Changes</button>
      </div>
    </form>
  );
}

function DemoDatasetPanel() {
  const [status, setStatus] = useState<DemoDatasetStatus | null>(null);
  const [message, setMessage] = useState('Loading demo dataset status…');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const refresh = useCallback(async () => {
    if (!platformApiConfigured()) {
      setUnavailable(false);
      setMessage('Configure the admin API base URL to manage the demo dataset.');
      return;
    }
    try {
      const data = await getDemoDataset();
      setUnavailable(false);
      setStatus(data);
      setMessage(data.seeded ? 'Demonstration data is currently loaded.' : 'No demonstration dataset is loaded.');
    } catch (error) {
      setStatus(null);
      if (isPlatformResourceMissing(error)) {
        setUnavailable(true);
        setMessage('Demo dataset tools are disabled in this environment. Production APIs do not expose wipe.');
        return;
      }
      setUnavailable(false);
      setMessage(platformErrorMessage(error, 'Unable to load demo dataset status.'));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onWipe(event: FormEvent) {
    event.preventDefault();
    if (!window.confirm('This permanently deletes demonstration rows (churches, events, people, images). Continue?')) {
      return;
    }
    setBusy(true);
    try {
      const result = await wipeDemoDataset(confirmation || 'ERASE DEMO');
      setConfirmation('');
      setMessage(
        result.wiped
          ? `Demo data erased (${result.deleted_records ?? 0} rows). Baseline CMS pages were restored.`
          : 'No demo dataset was present.',
      );
      await refresh();
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Unable to erase demo data. Confirm recent MFA and platform.configuration.manage.'));
    } finally {
      setBusy(false);
    }
  }

  if (unavailable) {
    return (
      <article className="card settings-card demo-wipe-card">
        <h2>Demonstration data</h2>
        <p className="maps-settings-lead" role="status">{message}</p>
      </article>
    );
  }

  return (
    <form className="card settings-card demo-wipe-card" onSubmit={(event) => void onWipe(event)}>
      <h2>Demonstration data</h2>
      <p className="maps-settings-lead" role="status">{message}</p>
      {status?.seeded ? (
        <>
          <p>Seeded {status.seeded_at ? new Date(status.seeded_at).toLocaleString() : 'recently'}.</p>
          {status.accounts?.length ? (
            <ul>
              {status.accounts.map((account) => (
                <li key={account.email}>
                  <strong>{account.name}</strong> · {account.email} · {account.role}
                </li>
              ))}
            </ul>
          ) : null}
          {status.password_hint ? <p>Demo password: <code>{status.password_hint}</code></p> : null}
          <label>
            <span>Type ERASE DEMO to confirm</span>
            <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy} />
          </label>
          <div className="form-footer">
            <button className="danger-button" type="submit" disabled={busy || confirmation !== 'ERASE DEMO'}>
              Erase demo data
            </button>
          </div>
        </>
      ) : (
        <p>Run <code>php artisan demo:seed</code> when you need a walkthrough dataset again.</p>
      )}
    </form>
  );
}

export function DemoDatasetBanner() {
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (!platformApiConfigured()) return;
    void getDemoDataset()
      .then((data) => setSeeded(data.seeded))
      .catch(() => setSeeded(false));
  }, []);
  if (!seeded) return null;
  return (
    <div className="demo-banner" role="status">
      <div>
        <strong>Demo dataset is active.</strong>
        <p>Public pages, admin catalogues, and images are populated for walkthroughs.</p>
      </div>
      <a href="/admin/settings/platform">Erase demo data</a>
    </div>
  );
}

function MediaLibraryPanel() {
  const [items, setItems] = useState<MediaAttachment[]>([]);
  const [message, setMessage] = useState('Loading media library…');
  const [busy, setBusy] = useState(false);
  const [attachableType, setAttachableType] = useState('church');
  const [attachableId, setAttachableId] = useState('');
  const [role, setRole] = useState('cover');

  const refresh = useCallback(async () => {
    if (!platformApiConfigured()) {
      setMessage('Configure the admin API base URL to manage images.');
      return;
    }
    try {
      const rows = await listMediaAttachments();
      setItems(rows);
      setMessage(rows.length ? `${rows.length} images controlled from this library.` : 'No images attached yet. Upload a public image below.');
    } catch (error) {
      setItems([]);
      setMessage(platformErrorMessage(error, 'Unable to load media. Confirm platform.files.manage and recent MFA.'));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem('file') as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file || !attachableId.trim()) {
      setMessage('Choose an image and select the record to attach it to.');
      return;
    }
    setBusy(true);
    try {
      const payload = new FormData();
      payload.append('file', file);
      payload.append('attachable_type', attachableType);
      payload.append('attachable_id', attachableId.trim());
      payload.append('role', role);
      payload.append('purpose', 'media.public');
      payload.append('classification', 'public');
      await uploadMediaAttachment(payload);
      form.reset();
      setMessage('Image uploaded and attached. It now appears on the public site.');
      await refresh();
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Upload failed. Use a PNG, JPEG, or WebP under 25MB.'));
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id: string) {
    if (!window.confirm('Remove this image from the record? The public page will no longer show it.')) return;
    setBusy(true);
    try {
      await removeMediaAttachment(id);
      setMessage('Image removed.');
      await refresh();
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Unable to remove this image.'));
    } finally {
      setBusy(false);
    }
  }

  async function onReplace(_id: string, attachable: MediaAttachment['attachable'], currentRole: string, file: File) {
    if (!attachable?.type || !attachable.id) return;
    setBusy(true);
    try {
      const payload = new FormData();
      payload.append('file', file);
      payload.append('attachable_type', attachable.type);
      payload.append('attachable_id', attachable.id);
      payload.append('role', currentRole);
      payload.append('purpose', 'media.public');
      payload.append('classification', 'public');
      await uploadMediaAttachment(payload);
      setMessage('Image replaced.');
      await refresh();
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Unable to replace this image.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="media-library">
      <p className="maps-settings-lead" role="status">{message}</p>
      <form className="card settings-card" onSubmit={(event) => void onUpload(event)}>
        <h2>Upload or replace an image</h2>
        <div className="form-grid">
          <label>
            <span>Record type</span>
            <select
              value={attachableType}
              onChange={(event) => {
                setAttachableType(event.target.value);
                setAttachableId('');
              }}
              disabled={busy}
            >
              <option value="church">Church</option>
              <option value="home_church">Home church</option>
              <option value="ministry_event">Event</option>
              <option value="crusade">Crusade</option>
              <option value="press_publication">Press publication</option>
              <option value="content_page">CMS page</option>
              <option value="content_item">CMS item</option>
              <option value="person">Person avatar</option>
            </select>
          </label>
          <label>
            <span>Role</span>
            <select value={role} onChange={(event) => setRole(event.target.value)} disabled={busy}>
              <option value="cover">Cover</option>
              <option value="hero">Hero</option>
              <option value="thumbnail">Thumbnail</option>
              <option value="avatar">Avatar</option>
              <option value="logo">Logo</option>
            </select>
          </label>
          <label className="full">
            <span>Record</span>
            <EntitySearchSelect
              name="attachable_id"
              catalog={
                (
                  {
                    church: 'church',
                    home_church: 'homeChurch',
                    ministry_event: 'event',
                    crusade: 'crusade',
                    press_publication: 'pressPublication',
                    person: 'person',
                  } as Record<string, string>
                )[attachableType]
              }
              required
              value={attachableId}
              onValueChange={setAttachableId}
              disabled={busy}
              placeholder="Search the record to attach this image to"
            />
          </label>
          <label className="full">
            <span>Image file</span>
            <input name="file" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} />
          </label>
        </div>
        <div className="form-footer">
          <button className="primary-button" type="submit" disabled={busy}>Upload & attach</button>
        </div>
      </form>
      <div className="media-library-grid">
        {items.map((item) => (
          <article className="card media-library-card" key={item.id}>
            {item.image_url ? <img src={item.image_url} alt="" /> : <div className="asset-preview">No preview</div>}
            <div className="media-meta">
              <strong>{item.attachable?.label || item.file?.original_filename || item.role}</strong>
              <small>
                {item.attachable?.type} · {item.role}
                {item.attachable?.id ? ` · ${item.attachable.id}` : ''}
              </small>
              <label>
                Replace
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onReplace(item.id, item.attachable, item.role, file);
                    event.currentTarget.value = '';
                  }}
                />
              </label>
              <button
                className="ghost-button"
                type="button"
                disabled={busy || !item.attachable?.type || !item.attachable?.id}
                onClick={() => {
                  if (item.attachable?.type) setAttachableType(item.attachable.type);
                  if (item.attachable?.id) setAttachableId(item.attachable.id);
                  setRole(item.role);
                  setMessage(`Ready to replace ${item.attachable?.label ?? item.role}. Choose a new file above, or use Replace on this card.`);
                }}
              >
                Use this record
              </button>
              <button className="ghost-button" type="button" disabled={busy} onClick={() => void onRemove(item.id)}>
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function PlatformSettingsScreen({ screen }: { screen: AdminScreen }) {
  const fixtures = designFixturesEnabled();
  const route = screen.route;

  if (!fixtures) {
    if (route.includes('/settings/maps')) return <MapsSettingsPanel />;
    if (route.includes('/settings/payments') || route.includes('/finance/providers')) return <PaymentsSettingsPanel />;
    if (route.includes('/communications/settings') || route.includes('/settings/notifications')) {
      return <CommunicationsSettingsPanel />;
    }
    if (route.includes('/settings/branding')) return <BrandingSettingsPanel />;
    if (route.includes('/settings/kca')) return <KcaSettingsPanel />;
    if (route.includes('/settings/church')) return <ChurchSettingsPanel />;
    if (route.includes('/settings/languages')) return <LanguagesSettingsPanel screen={screen} />;
    if (
      route.includes('/settings/ministry')
      || route.includes('/settings/home-church-rules')
      || route.includes('/settings/mission')
      || route.includes('/settings/press')
    ) {
      return <DomainSettingsLinksPanel screen={screen} />;
    }
    if (route.includes('/settings/translation-governance')) {
      return (
        <>
          <p className="maps-settings-lead" role="status">
            Translation governance is the Press translation workflow — not a separate settings CRUD API. Live queue below.
          </p>
          <DenseTable
            screen={{
              ...screen,
              kind: 'table',
              columns: screen.columns?.length ? screen.columns : ['Name', 'Type', 'Status', 'Updated'],
            }}
            columns={screen.columns?.length ? screen.columns : ['Name', 'Type', 'Status', 'Updated']}
          />
        </>
      );
    }
    if (route.includes('/settings/platform') || route.includes('/security/configuration') || route.includes('/settings/ai-api')) {
      return (
        <>
          {route.includes('/settings/platform') ? <BrandingSettingsPanel /> : null}
          {route.includes('/settings/platform') ? <DemoDatasetPanel /> : null}
          {route.includes('/settings/ai-api') ? (
            <p className="maps-settings-lead" role="status">
              Advisory AI uses `POST admin/platform/advisory/requests`. Provider keys and related flags live in platform configurations below.
            </p>
          ) : null}
          {route.includes('/security/configuration') ? (
            <p className="maps-settings-lead" role="status">
              Authentication and protection settings are stored as platform configurations (no separate security-settings CRUD API).
            </p>
          ) : null}
          <ConfigurationsSettingsPanel variant={route.includes('/security/configuration') ? 'security' : route.includes('/settings/ai-api') ? 'ai' : 'platform'} />
        </>
      );
    }
    if (route.includes('/settings/feature-flags')) return <FeatureFlagsSettingsPanel />;
    if (route.includes('/settings/media')) return <MediaLibraryPanel />;
    if (route.includes('/settings/uploads')) return <ObjectStorageSettingsPanel />;
    if (route.includes('/settings/public-site') || route.includes('/content/public-site')) return <PublicSiteCmsPanel />;
    if (route.includes('/settings/system-information')) {
      return (
        <article className="platform-card platform-settings-body">
          <h2>System Information</h2>
          <p className="maps-settings-lead" role="status">
            Runtime details below are from the admin browser session. Server build metadata requires a dedicated health endpoint (not invented here).
          </p>
          <dl className="platform-detail-grid">
            <div><dt>Admin UI</dt><dd>Family House Connect</dd></div>
            <div><dt>User Agent</dt><dd>{typeof navigator !== 'undefined' ? navigator.userAgent : '—'}</dd></div>
            <div><dt>Locale</dt><dd>{typeof navigator !== 'undefined' ? navigator.language : '—'}</dd></div>
            <div><dt>Time Zone</dt><dd>{Intl.DateTimeFormat().resolvedOptions().timeZone}</dd></div>
            <div><dt>API Base</dt><dd>{process.env.NEXT_PUBLIC_FHC_API_URL || 'Not configured'}</dd></div>
          </dl>
        </article>
      );
    }
    if (route.includes('/settings/events')) {
      return (
        <>
          <p className="maps-settings-lead" role="status">
            Event preferences use the live events catalogue. <Link href="/admin/events">Open Events</Link> to create, edit, publish, or delete ministry events.
          </p>
          <DenseTable
            screen={{
              ...screen,
              route: '/admin/events',
              kind: 'table',
              action: '+ Create Event',
              columns: screen.columns?.length ? screen.columns : ['Name', 'Category', 'Status', 'Updated'],
            }}
            columns={screen.columns?.length ? screen.columns : ['Name', 'Category', 'Status', 'Updated']}
          />
        </>
      );
    }
    if (shouldUseCatalogLiveData() && resolveCatalogDataset(screen)) {
      const columns = screen.columns?.length ? screen.columns : CATALOG_NAME_COLUMNS;
      return <DenseTable screen={{ ...screen, columns }} columns={columns} />;
    }
    return (
      <div className="platform-settings">
        <article className="platform-card platform-settings-body">
          <p className="maps-settings-lead" role="status">
            No live platform settings API for this screen. Remaining gaps require new backend endpoints.
          </p>
          <footer>
            <button className="platform-primary" type="button" disabled title="No live settings API for this screen">
              {screen.action ?? 'Save Changes'}
            </button>
          </footer>
        </article>
      </div>
    );
  }

  if (fixtures && route.includes('/settings/maps')) {
    return <MapsSettingsPanel />;
  }
  if (fixtures && route.includes('/settings/branding')) {
    return <BrandingSettingsPanel />;
  }
  if (fixtures && (route.includes('/settings/public-site') || route.includes('/content/public-site'))) {
    return <PublicSiteCmsPanel />;
  }

  return <FixtureSettings screen={screen} />;
}

function Operations({ screen }: { screen: AdminScreen }) {
  if (!shouldUseDesignFixtures() && shouldUseCatalogLiveData() && resolveCatalogDataset(screen)) {
    const columns = screen.columns?.length ? screen.columns : CATALOG_ASSET_COLUMNS;
    return <DenseTable screen={{ ...screen, columns }} columns={columns} />;
  }
  const covers=screen.title==='Catalogue';
  return <div className="platform-asset-grid">{(screen.items??[]).map((item,index)=><article className="platform-card platform-asset" key={item}>{covers?<div className={`publication-cover tone-${index}`}><span>{item.split(' — ')[0].split(' ').slice(0,2).join(' ')}</span><strong>{item.split(' — ')[0].split(' ').slice(2).join(' ')||'KINGDOM'}</strong></div>:<div className={`asset-preview tone-${index}`}>{['▧','▤','PDF','▣'][index%4]}</div>}<h3>{item.split(' — ')[0]}</h3><p>{item.split(' — ')[1]}</p><button type="button">View</button></article>)}</div>;
}

function Analytics({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  const { t } = useLocale();
  if (screen.nav === 'report-ai') {
    return <ReportsAiPanel screen={screen} requestedScope={requestedScope} />;
  }
  const dashboard = useAdminDashboard(dashboardModuleForScreen(screen.id), requestedScope);
  const listItems = breakdownToItems(dashboard.data?.breakdown);
  const donutValue = dashboard.data?.donut?.value ?? dashboard.metrics?.[0]?.value ?? '0';
  const donutLabel = dashboard.data?.donut?.label;
  const categoryEmpty = listItems.length === 0 && !dashboard.loading;
  return <DashboardShell screenId={screen.id} href={screen.route} data={dashboard.data} loading={dashboard.loading} error={dashboard.error} onRetry={dashboard.retry} preset={dashboard.preset} onPresetChange={dashboard.setPreset}>
    <div className="platform-analytics">
    <div className="table-toolbar">
      <p className="maps-settings-lead">{screen.subtitle}</p>
      <button
        type="button"
        className="ghost-button"
        disabled={!dashboard.data || dashboard.loading}
        onClick={() => downloadDashboardCsv(screen.title, dashboard.metrics ?? [], listItems)}
      >
        {t('admin.exportCsv', { defaultMessage: 'Export CSV' })}
      </button>
    </div>
    <LinkedMetricCards screenId={screen.id} metrics={dashboard.metrics} />
    {dashboard.data?.definitions?.length ? (
      <p className="maps-settings-lead">{dashboard.data.definitions.join(' ')}</p>
    ) : null}
    <div className="platform-analytics-grid">
      <article className="platform-card platform-chart">
        <h2>{t('admin.performanceTrend', { defaultMessage: 'Performance Trend' })}</h2>
        <Bars series={dashboard.data?.series}/>
      </article>
      <article className="platform-card platform-chart">
        <h2>{t('admin.byCategory', { defaultMessage: 'By Category' })}</h2>
        <div className="platform-chart-split">
          <Donut value={donutValue} label={donutLabel}/>
          {categoryEmpty
            ? <p className="maps-settings-lead">{t('admin.noCategoryBreakdown', { defaultMessage: 'No category breakdown in this period.' })}</p>
            : <ul>{listItems.slice(0,5).map((item,index)=><li key={item}><i className={`tone-${index}`}/><span>{item.split(' — ')[0]}</span><b>{item.split(' — ')[1]}</b></li>)}</ul>}
        </div>
      </article>
      <article className="platform-card platform-list wide">
        <h2>{t('admin.topResults', { defaultMessage: 'Top Results' })}</h2>
        {listItems.length === 0
          ? <p className="maps-settings-lead">{t('admin.noResultsPeriod', { defaultMessage: 'No results in this period.' })}</p>
          : listItems.map((item,index)=><div key={item}><span>{index+1}</span><b>{item.split(' — ')[0]}</b><strong>{item.split(' — ')[1]}</strong></div>)}
      </article>
    </div>
    <DashboardQuickLinks screenId={screen.id} />
  </div>
  </DashboardShell>;
}

function SecurityUnavailablePanel({ screen, copy }: { screen: AdminScreen; copy: string }) {
  return (
    <div className="platform-restricted">
      <div className="platform-restricted-banner">
        <span>🔒</span>
        <div>
          <strong>{screen.title}</strong>
          <p>{copy}</p>
        </div>
      </div>
    </div>
  );
}

function Restricted({ screen }: { screen: AdminScreen }) {
  if (!shouldUseDesignFixtures() && /\/admin\/security\/safeguarding\/cases\/[0-7][0-9A-HJKMNP-TV-Z]{25}$/i.test(screen.route)) {
    return <SafeguardingCaseDetail screen={screen} />;
  }
  return <div className="platform-restricted"><div className="platform-restricted-banner"><span>🔒</span><div><strong>Restricted information</strong><p>Access is audited and limited to explicitly authorized personnel.</p></div></div>{screen.rows?<DenseTable screen={screen}/>:<Detail screen={screen}/>}</div>;
}

export function PlatformScreenContent({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  let content;
  switch(screen.kind){
    case 'dashboard': content=<Dashboard screen={screen} requestedScope={requestedScope} />; break;
    case 'table':
      if (screen.route === '/admin/security/data-classification' && !shouldUseDesignFixtures()) {
        content = <DataClassificationPanel screen={screen} />;
      } else {
        content = <><Metrics metrics={screen.metrics}/><DenseTable screen={screen}/></>;
      }
      break;
    case 'detail': case 'profile':
      if (!shouldUseDesignFixtures() && /^\/admin\/press\/publications\/[0-7][0-9A-HJKMNP-TV-Z]{25}$/i.test(screen.route)) {
        return <PressPublicationDetail screen={screen} />;
      }
      if (!shouldUseDesignFixtures() && /^\/admin\/events\/[0-7][0-9A-HJKMNP-TV-Z]{25}$/i.test(screen.route)) {
        return <EventDetailPanel screen={screen} />;
      }
      return <Detail screen={screen}/>;
    case 'workflow': case 'approval': content=<Workflow screen={screen}/>; break;
    case 'form': case 'wizard':
      if (screen.route === '/admin/press/publications/create') {
        content = <PressPublicationCreateForm screen={screen} />;
      } else if (screen.route === '/admin/events/create') {
        content = <EventCreateForm screen={screen} />;
      } else if (screen.route === '/admin/communications/audiences/create') {
        content = <CommunicationsAudienceCreatePanel screen={screen} />;
      } else if (screen.route.startsWith('/admin/communications/') && !screen.route.includes('/settings')) {
        content = <CommunicationsComposePanel screen={screen} />;
      } else {
        content = <Form screen={screen} />;
      }
      break;
    case 'settings': content=<PlatformSettingsScreen screen={screen}/>; break;
    case 'operations': content=<Operations screen={screen}/>; break;
    case 'reports':
    case 'finance': {
      const catalogLive = !shouldUseDesignFixtures() && shouldUseCatalogLiveData() && resolveCatalogDataset(screen);
      if (catalogLive) {
        const columns = screen.columns?.length ? screen.columns : CATALOG_FEED_COLUMNS;
        content = <><Metrics metrics={screen.metrics}/><DenseTable screen={{...screen, columns}} columns={columns}/></>;
      } else {
        content = <Analytics screen={screen} requestedScope={requestedScope} />;
      }
      break;
    }
    case 'feed': content=<DenseTable screen={{...screen,columns:CATALOG_FEED_COLUMNS}} rows={screen.rows} columns={CATALOG_FEED_COLUMNS}/>; break;
    case 'restricted':
      if (screen.route === '/admin/security/pastoral-records' && !shouldUseDesignFixtures()) {
        content = (
          <>
            <p className="maps-settings-lead" role="status">
              Counselling cases are restricted by design. Client identity stays on People counselling; this list is the same live counselling catalog.
            </p>
            <Restricted screen={screen} />
          </>
        );
      } else {
        content = <Restricted screen={screen} />;
      }
      break;
    default: content=<Analytics screen={screen}/>;
  }
  const needsTabs = Boolean(screen.tabs?.length && ['operations','feed','restricted','table','reports','finance'].includes(screen.kind));
  return <>{needsTabs&&<PlatformTabs tabs={screen.tabs}/>} {content}</>;
}
