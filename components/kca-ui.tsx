'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';

import { useLocale } from '@/components/locale-provider';
import type { AdminScreen, Metric, Row } from '../lib/admin-routes.ts';
import {
  catalogErrorMessage,
  catalogRecordsToRows,
  CATALOG_GLOBAL_SCOPE,
  listCatalogDomain,
  resolveCatalogDataset,
  shouldUseCatalogLiveData,
} from '../lib/admin-catalog-api';
import { shouldUseDesignFixtures, formatTimestamp } from '../lib/admin-identity-api';
import { getAdminRecordDetails, stashAdminRecords } from '../lib/admin-record-cache';
import { formatRowActionRecord, rowActionCapabilities } from '../lib/admin-row-actions';
import { executeAdminAction, extractUlid, formatAdminMutationError } from '../lib/admin-mutation-dispatcher';
import { KcaAdmissionLetterSheet } from './kca-admission-letter-sheet';
import { getKcaAdmissionLetter, fetchKcaAdmissionLetterAssetBlob, issueKcaAdmissionLetter, downloadKcaAdmissionLetterPdf, previewKcaRegistrationNumber, type KcaAdmissionLetter } from '../lib/admin-platform-api';
import { downloadBlob } from '../lib/download-blob.ts';
import { pathEntityId } from '../lib/site-api.ts';
import { fieldsForEntity, normalizeDetailValues, resolveEntityKey } from '../lib/admin-form-schemas';
import { AdminFormFields } from './admin-form-fields';
import { flattenKcaRegistrationPayload, kcaRegistrationSteps } from '../lib/kca-registration-steps';
import {
  captureKcaModuleFormValues,
  kcaModuleMutationPayload,
  validateKcaModuleFormValues,
  type KcaModuleFormValues,
} from '../lib/kca-module-builder';
import { EntitySearchSelect } from './entity-search-select';
import { AdminWizardFooter, AdminWizardStepper } from './admin-wizard-chrome';
import { KcaOrientationCreateForm, KcaOrientationDetailPanel } from './kca-orientation-ui';
import { useAdminWizardStep } from '../lib/use-admin-wizard-step';
import { TableRowActions } from './table-row-actions';
import {
  breakdownToItems,
  dashboardModuleForScreen,
} from '../lib/admin-dashboard-api';
import { useAdminDashboard } from '../lib/use-admin-dashboard';
import { DashboardQuickLinks, DashboardShell, LinkedMetricCards } from './admin-dashboard-chrome';

const applicationSteps = [
  'Personal Information',
  'Church Information',
  'Walk With Christ',
  'Motivation / Interests',
  'Commitment',
  'Parent Consent',
  'Leadership Recommendation',
  'Review',
  'Decision',
];

const applicationStepMessageKeys: Record<string, string> = {
  'Personal Information': 'member.kca.personalInformation',
  'Church Information': 'member.kca.churchInformation',
  'Walk With Christ': 'member.kca.walkWithChrist',
  'Motivation / Interests': 'member.kca.motivationInterests',
  'Commitment': 'member.kca.commitment',
  'Parent Consent': 'member.kca.parentConsent',
  'Leadership Recommendation': 'member.kca.leadershipRecommendation',
  'Review': 'member.kca.review',
  'Decision': 'member.kca.decision',
};

const kcaFilterMessageKeys: Record<string, string> = {
  'All Status': 'member.kca.allStatus',
  'All Cohorts': 'member.kca.allCohorts',
  'All Regions': 'member.kca.allRegions',
  'All Batches': 'member.kca.allBatches',
  'All Venues': 'member.kca.allVenues',
  'All Statuses': 'member.kca.allStatuses',
};

function translateAction(
  t: (key: string, options?: { defaultMessage?: string }) => string,
  action?: string,
) {
  const label = action?.trim();
  if (!label || /^submit$/i.test(label)) {
    return t('common.submit', { defaultMessage: 'Submit' });
  }
  return t('common.action', { defaultMessage: label });
}

function statusClass(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function KcaBadge({ value }: { value: string }) {
  return <span className={`kca-badge is-${statusClass(value)}`}>{value}</span>;
}

function KcaMetrics({ metrics = [] }: { metrics?: Metric[] }) {
  return <div className={`kca-metric-grid count-${Math.min(metrics.length, 5)}`}>
    {metrics.map((metric, index) => <article className="card kca-metric" key={metric.label}>
      <span>{metric.label}</span>
      <div><strong>{metric.value}</strong>{metric.trend && <small className={metric.trend.includes('-') ? 'is-down' : 'is-up'}>{metric.trend}</small>}</div>
      <i style={{ width: `${48 + ((index * 13) % 42)}%` }} />
    </article>)}
  </div>;
}

function KcaFilters({ search, compact = false, labels }: { search?: string; compact?: boolean; labels?: string[] }) {
  const { t } = useLocale();
  const searchLabel = search ?? t('member.kca.searchRecords', { defaultMessage: 'Search records...' });
  const resolvedLabels = labels ?? ['All Status', 'All Cohorts', 'All Regions'];
  return <div className={`kca-filters ${compact ? 'is-compact' : ''}`}>
    {resolvedLabels.map(label => <button type="button" aria-label={t('member.kca.filterBy', { defaultMessage: 'Filter by {facet}', vars: { facet: label.replace(/^All /, '').toLowerCase() } })} key={label}>{t(kcaFilterMessageKeys[label] ?? 'member.kca.filterLabel', { defaultMessage: label })}⌄</button>)}
    <label><span aria-hidden="true">⌕</span><input aria-label={searchLabel} placeholder={searchLabel} /></label>
    <button className="kca-filter-button" type="button" aria-label={t('member.kca.openAdditionalFilters', { defaultMessage: 'Open additional filters' })}>☷ {t('common.filters', { defaultMessage: 'Filters' })}</button>
  </div>;
}

function KcaTable({ screen, rows = screen.rows ?? [], columns = screen.columns ?? [], showAction = true, filterLabels, toolbarAction, reviewLabel, total, renderActions }: { screen: AdminScreen; rows?: Row[]; columns?: string[]; showAction?: boolean; filterLabels?: string[]; toolbarAction?: string; reviewLabel?: string; total?: number; renderActions?: (row: Row) => ReactNode }) {
  const { t } = useLocale();
  const entityKey = resolveEntityKey(screen.route, screen.id);
  return <article className={`card kca-table-card ${toolbarAction ? 'kca-prerequisites' : ''}`}>
    {toolbarAction && <header><div><h2>{t('member.kca.orientationSessions', { defaultMessage: 'Orientation Sessions' })}</h2><p>{t('member.kca.orientationSessionsCopy', { defaultMessage: 'Manage upcoming orientation sessions and student attendance.' })}</p></div><button className="primary-button" type="button">{translateAction(t, toolbarAction)}</button></header>}
    <KcaFilters search={t('member.kca.searchScreen', { defaultMessage: 'Search {title}...', vars: { title: screen.title.toLowerCase() } })} labels={filterLabels} />
    <div className="kca-table-scroll">
      <table className="kca-table" aria-label={t('member.kca.recordsAria', { defaultMessage: '{title} records', vars: { title: screen.title } })}>
        <thead><tr>{columns.map(column => <th scope="col" key={column}>{column}</th>)}{showAction && <th scope="col">{t('member.kca.actions', { defaultMessage: 'Actions' })}</th>}</tr></thead>
        <tbody>{rows.map((row, rowIndex) => <tr key={`${screen.id}-${rowIndex}`}>
          {columns.map((column, columnIndex) => {
            const value = row[column] ?? '—';
            const isStatus = /status|priority|progress|issued/i.test(column);
            return <td key={column}>{columnIndex === 0 ? <div className="kca-person-cell"><span className="kca-mini-avatar">{value.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><strong>{value}</strong></div> : isStatus ? <KcaBadge value={value} /> : value}</td>;
          })}
          {showAction && <td>{renderActions ? renderActions(row) : <TableRowActions record={formatRowActionRecord(row[columns[0]], row.__id)} entityKey={entityKey} className="row-actions kca-row-actions" reviewLabel={reviewLabel} {...rowActionCapabilities(screen.route)} />}</td>}
        </tr>)}</tbody>
      </table>
    </div>
    <footer className="kca-table-footer"><span>{t('member.kca.showingRecords', { defaultMessage: 'Showing 1 to {visible} of {total} records', vars: { visible: rows.length, total: total ?? rows.length } })}</span><div role="navigation" aria-label={t('member.kca.paginationAria', { defaultMessage: '{title} pagination', vars: { title: screen.title } })}><button type="button" aria-label={t('member.kca.previousPage', { defaultMessage: 'Previous page' })}>‹</button><button className="active" type="button" aria-label={t('member.kca.page', { defaultMessage: 'Page {number}', vars: { number: 1 } })} aria-current="page">1</button></div></footer>
  </article>;
}

function KcaDonut({ value, label, segments = ['#4c11b5', '#16a467', '#e7a11d', '#ea4d4d'] }: { value: string; label?: string; segments?: string[] }) {
  const { t } = useLocale();
  const resolvedLabel = label ?? t('member.kca.total', { defaultMessage: 'Total' });
  const gradient = `conic-gradient(${segments[0]} 0 42%, ${segments[1]} 42% 66%, ${segments[2]} 66% 82%, ${segments[3]} 82% 100%)`;
  return <div className="kca-donut" style={{ background: gradient }} role="img" aria-label={`${resolvedLabel}: ${value}`}><div><strong>{value}</strong><span>{resolvedLabel}</span></div></div>;
}

function KcaLineChart({ title, series }: { title?: string; series?: Array<{ label: string; value: number }> }) {
  const { t } = useLocale();
  const resolvedTitle = title ?? t('member.kca.applicationTrend', { defaultMessage: 'Application Trend' });
  const points = series ?? [];
  const max = Math.max(1, ...points.map((point) => point.value));
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? 310 : 20 + (index * 580) / Math.max(1, points.length - 1);
    const y = 170 - (point.value / max) * 140;
    return `${x},${y}`;
  });
  const line = coords.join(' ');
  const area = coords.length ? `M${coords[0]} L${coords.join(' L')} L${coords.at(-1)?.split(',')[0] ?? 600},180 L20 180 Z` : '';
  return <article className="card kca-chart-card">
    <header><h2>{resolvedTitle}</h2></header>
    {points.length === 0 ? <p className="maps-settings-lead">No application volume in this period.</p> : (
    <div className="kca-line-chart">
      <svg viewBox="0 0 620 190" role="img" aria-label={resolvedTitle}><defs><linearGradient id="kca-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#6d35d9" stopOpacity=".24"/><stop offset="1" stopColor="#6d35d9" stopOpacity="0"/></linearGradient></defs><path className="area" d={area}/><polyline className="line" fill="none" points={line}/>{coords.map((pair) => { const [cx, cy] = pair.split(','); return <circle cx={cx} cy={cy} r="5" key={pair}/>; })}</svg>
      <div className="kca-chart-labels">{points.map(item => <span key={item.label}>{item.label}</span>)}</div>
    </div>
    )}
  </article>;
}

function KcaDashboard({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  const { t } = useLocale();
  const dashboard = useAdminDashboard(dashboardModuleForScreen(screen.id), requestedScope);
  const statusItems = breakdownToItems(dashboard.data?.breakdown);
  const recentRows = dashboard.data?.recent_rows ?? [];
  const donut = dashboard.data?.donut;

  return <DashboardShell screenId={screen.id} href={screen.route} data={dashboard.data} loading={dashboard.loading} error={dashboard.error} onRetry={dashboard.retry} preset={dashboard.preset} onPresetChange={dashboard.setPreset}>
    <div className="kca-dashboard">
    <LinkedMetricCards screenId={screen.id} metrics={dashboard.metrics} />
    <div className="kca-dashboard-main">
      <KcaLineChart series={dashboard.data?.series} />
      <article className="card kca-status-card"><header><h2>{t('member.kca.byStatus', { defaultMessage: 'By Status' })}</h2></header><div className="kca-status-visual"><KcaDonut value={donut?.value ?? '0'} label={donut?.label ?? t('member.kca.applications', { defaultMessage: 'Applications' })}/><ul>{statusItems.length === 0 ? <li>No applications in this scope.</li> : statusItems.slice(0, 5).map((item, index) => { const [label, value] = item.split(' — '); return <li key={item}><i aria-hidden="true" className={`tone-${index + 1}`}/><span>{label}</span><strong>{value}</strong></li>; })}</ul></div></article>
    </div>
    <div className="kca-dashboard-bottom">
      <article className="card kca-recent"><header><h2>{t('member.kca.recentApplications', { defaultMessage: 'Recent Applications' })}</h2><Link href="/admin/kca/applications">{t('member.kca.viewAll', { defaultMessage: 'View all' })}</Link></header>{recentRows.length === 0 ? <p className="maps-settings-lead">No recent applications.</p> : recentRows.map((row, index) => <div className="kca-recent-row" key={`${row.Applicant}-${index}`}><span className="kca-mini-avatar">{row.Applicant?.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><div><strong>{row.Applicant}</strong><small>{row.Church}</small></div><time>{row.Submitted}</time><KcaBadge value={row.Status}/></div>)}</article>
      <DashboardQuickLinks screenId={screen.id} className="card kca-quick-actions" />
    </div>
  </div>
  </DashboardShell>;
}

function KcaApplicantOverview({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const live = !shouldUseDesignFixtures() && shouldUseCatalogLiveData();
  const applicationId = applicationIdFromRoute(screen.route);
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!live || !applicationId) return;
    let cancelled = false;
    void listCatalogDomain('kca.applications', { perPage: 100, scope: CATALOG_GLOBAL_SCOPE })
      .then((result) => {
        if (cancelled) return;
        setRecord((result.items.find((item) => String(item.id) === applicationId) as Record<string, unknown>) ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [applicationId, live]);

  if (live) {
    if (!applicationId) {
      return <p className="maps-settings-lead">Open an application from the Applications list.</p>;
    }
    const name = String(record?.person_name ?? 'Applicant');
    const status = String(record?.status ?? 'received');
    return (
      <article className="card kca-identity-banner">
        <div>
          <span className="kca-overline">{t('member.kca.applicantProfile', { defaultMessage: 'Applicant profile' })}</span>
          <h2>{name} <KcaBadge value={status} /></h2>
          <p>{applicationId}</p>
          <p>Submitted {record?.received_at ? String(record.received_at) : 'Not provided'}</p>
          <Link href={`/admin/kca/applications/${applicationId}/decision`}>Open decision</Link>
        </div>
      </article>
    );
  }

  const details = screen.details ?? {};
  return <div className="kca-entity-page">
    <article className="card kca-identity-banner"><div className="kca-avatar large">SD</div><div><span className="kca-overline">{t('member.kca.applicantProfile', { defaultMessage: 'Applicant profile' })}</span><h2>Samuel David <KcaBadge value={t('member.kca.underReview', { defaultMessage: 'Under Review' })}/></h2><p>{screen.subtitle}</p><div className="kca-contact-line"><span>☎ {details.Phone}</span><span>✉ {details.Email}</span><span>⌖ {details.Location}</span></div></div></article>
    <nav className="kca-entity-tabs" aria-label={t('member.kca.applicationSections', { defaultMessage: 'Application sections' })}>{(screen.tabs ?? []).map((tab,index) => <button className={index === 0 ? 'active' : ''} aria-current={index === 0 ? 'page' : undefined} type="button" key={tab}>{tab}</button>)}</nav>
    <div className="kca-overview-grid">
      <article className="card kca-detail-panel"><h2>{t('member.kca.applicationSummary', { defaultMessage: 'Application Summary' })}</h2><dl>{Object.entries(details).slice(0, 7).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></article>
      <article className="card kca-detail-panel"><h2>{t('member.kca.status', { defaultMessage: 'Status' })}</h2><dl>{Object.entries(details).slice(7).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{label === 'Current Status' ? <KcaBadge value={value}/> : value}</dd></div>)}</dl><div className="kca-progress"><header><span>{t('member.kca.progress', { defaultMessage: 'Progress' })}</span><strong>78%</strong></header><i role="progressbar" aria-label={t('member.kca.applicationCompletion', { defaultMessage: 'Application completion' })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={78}><b style={{ width: '78%' }}/></i><small>{t('member.kca.sectionsCompleted', { defaultMessage: '7 of 9 sections completed' })}</small></div></article>
    </div>
    <article className="card kca-section-progress"><h2>{t('member.kca.applicationJourney', { defaultMessage: 'Application Journey' })}</h2><div>{(screen.items ?? []).map((item, index) => { const [label, state] = item.split(' — '); return <div key={item}><span className={index < 7 ? 'complete' : 'current'}>{index < 7 ? '✓' : index + 1}</span><small>{label}</small><KcaBadge value={state}/></div>; })}</div></article>
  </div>;
}

function KcaStepRail({ current }: { current: string }) {
  const { t } = useLocale();
  const currentIndex = Math.max(applicationSteps.findIndex(step => current.toLowerCase().includes(step.toLowerCase().replace('parent consent', 'parent'))), 0);
  return <nav className="kca-step-rail" aria-label={t('member.kca.applicationProgress', { defaultMessage: 'Application progress' })}><h3 aria-level={2}>{t('member.kca.application', { defaultMessage: 'Application' })}</h3>{applicationSteps.map((step, index) => <div aria-current={index === currentIndex ? 'step' : undefined} className={index < currentIndex ? 'complete' : index === currentIndex ? 'current' : ''} key={step}><span aria-hidden="true">{index < currentIndex ? '✓' : index + 1}</span><b>{t(applicationStepMessageKeys[step] ?? 'member.kca.step', { defaultMessage: step })}</b></div>)}</nav>;
}

function KcaApplicationForm({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  if (!shouldUseDesignFixtures()) {
    return (
      <article className="card kca-form-card">
        <h2>{screen.title}</h2>
        <p>Submitted application answers cannot be silently edited. Request information so the applicant can submit a correction version.</p>
        <Link className="primary-button" href="/admin/kca/applications">Back to applications</Link>
      </article>
    );
  }
  const entries = Object.entries(screen.details ?? {});
  const longValue = (label: string, value: string) => value.length > 48 || /address|motivation|hope|challenge|consent|recommendation|manage time/i.test(label);
  const isRequired = (label: string) => !/optional|signature/i.test(label);
  return <div className="kca-flow-layout">
    <KcaStepRail current={screen.title}/>
    <article className="card kca-form-card">
      <header><div><span className="kca-overline">{t('member.kca.kcaApplication', { defaultMessage: 'KCA application' })}</span><h2>{screen.title}</h2><p>{screen.subtitle}</p></div><KcaBadge value={t('member.kca.inProgress', { defaultMessage: 'In progress' })}/></header>
      <div className="kca-form-grid">{entries.map(([label, value]) => <label className={longValue(label, value) ? 'wide' : ''} key={label}><span>{label}</span>{longValue(label, value) ? <textarea required={isRequired(label)} defaultValue={value}/> : /date/i.test(label) ? <input required={isRequired(label)} type="text" defaultValue={value}/> : /gender|relationship|year|frequency|agree|recommend|commit|attend|decision time/i.test(label) ? <select required={isRequired(label)} defaultValue={value}><option>{value}</option></select> : <input required={isRequired(label)} defaultValue={value}/>}</label>)}</div>
      {/Signature/.test(entries.map(([key]) => key).join(' ')) && <div className="kca-signature-line"><span>{t('member.kca.signedDigitallyBy', { defaultMessage: 'Signed digitally by' })}</span><strong>{screen.details?.Signature}</strong></div>}
      <footer><button className="ghost-button" type="button">{t('common.back', { defaultMessage: 'Back' })}</button><div><button className="ghost-button" type="button">{t('member.kca.saveDraft', { defaultMessage: 'Save Draft' })}</button><button className="primary-button" type="button">{translateAction(t, screen.action)}</button></div></footer>
    </article>
  </div>;
}

function applicationIdFromRoute(route: string): string | null {
  const match = route.match(/^\/admin\/kca\/applications\/([^/]+)(?:\/|$)/);
  if (!match) return null;
  const segment = match[1];
  if (segment === 'samuel-david') return null;
  return extractUlid(segment) ?? segment;
}

function enrollmentIdFromRoute(route: string): string | null {
  const match = route.match(/^\/admin\/kca\/students\/([^/]+)$/);
  if (!match) return null;
  const segment = match[1];
  if (segment === 'register' || segment === 'samuel-david') return null;
  return extractUlid(segment) ?? segment;
}

function KcaLeadershipRecommendationAdmin({ screen }: { screen: AdminScreen }) {
  const live = !shouldUseDesignFixtures() && shouldUseCatalogLiveData();
  const applicationId = applicationIdFromRoute(screen.route);
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!live || !applicationId) return;
    let cancelled = false;
    void listCatalogDomain('kca.applications', { perPage: 100, scope: CATALOG_GLOBAL_SCOPE })
      .then((result) => {
        const match = result.items.find((item) => String(item.id) === applicationId) ?? null;
        if (!cancelled) setRecord(match as Record<string, unknown> | null);
      })
      .catch((err) => {
        if (!cancelled) setError(catalogErrorMessage(err, 'Unable to load recommendation.'));
      });
    return () => {
      cancelled = true;
    };
  }, [applicationId, live]);

  if (!live) return <KcaApplicationForm screen={screen} />;
  if (!applicationId) return <p className="maps-settings-lead">Open an application from the Applications list.</p>;

  const recommendationId = typeof record?.recommendation_id === 'string' ? record.recommendation_id : '';
  const status = typeof record?.recommendation_status === 'string' ? record.recommendation_status : 'none';

  async function onVerify() {
    if (!recommendationId) return;
    setBusy(true);
    setError(null);
    try {
      await executeAdminAction({
        route: screen.route,
        label: 'Verify recommendation',
        payload: { recommendation_id: recommendationId },
        recordId: recommendationId,
        scope: CATALOG_GLOBAL_SCOPE,
      });
      setMessage('Recommendation verified.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card kca-form-card">
      <h2>{screen.title}</h2>
      <p>Applicant contact details request a leadership recommendation. The recommender submits the letter on a public token link. Status: {status}.</p>
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      <button className="primary-button" type="button" disabled={busy || !recommendationId || status !== 'submitted'} onClick={() => void onVerify()}>
        {busy ? 'Saving…' : 'Verify recommendation'}
      </button>
    </article>
  );
}

function applicationPermitsEnrollment(status: string): boolean {
  return status === 'accepted' || status === 'provisionally_accepted';
}

function decisionIsFinal(status: string): boolean {
  return ['accepted', 'provisionally_accepted', 'not_accepted', 'deferred'].includes(status);
}

function formatDecisionStatus(status: string): string {
  return status.replaceAll('_', ' ');
}

function KcaAdmissionWorkflowSteps({
  status,
  letterIssued,
  enrolled,
}: {
  status: string;
  letterIssued: boolean;
  enrolled: boolean;
}) {
  const decisionDone = decisionIsFinal(status);
  const enrollmentAllowed = applicationPermitsEnrollment(status);
  const steps = [
    { label: 'Admission decision', done: decisionDone, active: !decisionDone },
    { label: 'Issue letter', done: letterIssued, active: decisionDone && enrollmentAllowed && !letterIssued },
    { label: 'Enroll student', done: enrolled, active: letterIssued && !enrolled },
  ];

  return (
    <ol className="kca-admission-workflow" aria-label="Admission workflow">
      {steps.map((step, index) => (
        <li className={`${step.done ? 'is-done' : ''} ${step.active ? 'is-active' : ''}`.trim()} key={step.label}>
          <span aria-hidden="true">{step.done ? '✓' : index + 1}</span>
          <strong>{step.label}</strong>
        </li>
      ))}
    </ol>
  );
}

function KcaAdmissionPostDecisionPanel({
  applicationId,
  personName,
  status,
  onEnrolled,
  onMessage,
  onError,
}: {
  applicationId: string;
  personName: string;
  status: string;
  onEnrolled: (enrollment: Record<string, unknown>) => void;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}) {
  const { t } = useLocale();
  const live = !shouldUseDesignFixtures() && shouldUseCatalogLiveData();
  const [enrollment, setEnrollment] = useState<Record<string, unknown> | null>(null);
  const [letterIssued, setLetterIssued] = useState(false);
  const [loadingEnrollment, setLoadingEnrollment] = useState(live);
  const [cohortId, setCohortId] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [startsOn, setStartsOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!live || !cohortId.trim()) {
      if (!cohortId.trim()) setRegistrationNumber('');
      return;
    }
    let cancelled = false;
    void previewKcaRegistrationNumber(cohortId.trim(), CATALOG_GLOBAL_SCOPE)
      .then((nextNumber) => {
        if (!cancelled) setRegistrationNumber(nextNumber);
      })
      .catch(() => {
        if (!cancelled) setRegistrationNumber('');
      });
    return () => {
      cancelled = true;
    };
  }, [cohortId, live]);

  useEffect(() => {
    if (!live || !applicationPermitsEnrollment(status)) {
      setLoadingEnrollment(false);
      return;
    }
    let cancelled = false;
    void Promise.all([
      listCatalogDomain('kca.enrollments', { perPage: 100, scope: CATALOG_GLOBAL_SCOPE }),
      getKcaAdmissionLetter(applicationId).then(() => true).catch(() => false),
    ])
      .then(([result, hasLetter]) => {
        if (cancelled) return;
        const match = result.items.find((item) => String(item.application_id) === applicationId) ?? null;
        setEnrollment(match as Record<string, unknown> | null);
        setLetterIssued(hasLetter);
      })
      .catch(() => {
        if (!cancelled) {
          setEnrollment(null);
          setLetterIssued(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingEnrollment(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applicationId, live, status]);

  async function submitEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cohortId.trim()) {
      onError('Select a cohort before enrolling.');
      return;
    }
    if (!startsOn.trim()) {
      onError('Start date is required.');
      return;
    }
    setBusy(true);
    onError('');
    try {
      const result = await executeAdminAction({
        route: `/admin/kca/applications/${applicationId}/decision`,
        label: 'Enroll student',
        payload: {
          application_id: applicationId,
          cohort_id: cohortId,
          registration_number: registrationNumber.trim() || undefined,
          starts_on: startsOn,
        },
        recordId: applicationId,
        scope: CATALOG_GLOBAL_SCOPE,
      });
      const record = (result.data as { data?: Record<string, unknown> })?.data ?? (result.data as Record<string, unknown>);
      const nextEnrollment = record && typeof record === 'object' ? record : { id: result.id, application_id: applicationId };
      setEnrollment(nextEnrollment);
      onEnrolled(nextEnrollment);
      onMessage(`${personName} enrolled successfully. The student dashboard will unlock for this applicant.`);
    } catch (err) {
      onError(formatAdminMutationError(err));
    } finally {
      setBusy(false);
    }
  }

  if (!applicationPermitsEnrollment(status)) return null;

  return (
    <section className="kca-post-decision-panel" aria-labelledby="kca-post-decision-title">
      <span className="kca-overline">{t('member.kca.nextSteps', { defaultMessage: 'Next steps' })}</span>
      <h3 id="kca-post-decision-title">{t('member.kca.completeAdmissionJourney', { defaultMessage: 'Complete admission & enrollment' })}</h3>
      <KcaAdmissionWorkflowSteps
        enrolled={Boolean(enrollment)}
        letterIssued={letterIssued}
        status={status}
      />
      <p className="maps-settings-lead">
        {t('member.kca.postDecisionCopy', {
          defaultMessage: '{name} has been {status}. Issue the admission letter, then enroll the student into a cohort to activate learning.',
          vars: { name: personName, status: formatDecisionStatus(status) },
        })}
      </p>
      <div className="kca-post-decision-actions">
        <Link className="primary-button link-button" href={`/admin/kca/applications/${applicationId}/admission-letter`}>
          {letterIssued
            ? t('member.kca.viewAdmissionLetter', { defaultMessage: 'View admission letter' })
            : t('member.kca.issueAdmissionLetter', { defaultMessage: 'Issue admission letter' })}
        </Link>
        <Link className="ghost-button link-button" href="/admin/settings/kca">
          {t('member.kca.configureLetter', { defaultMessage: 'Configure letter template' })}
        </Link>
      </div>
      {loadingEnrollment ? (
        <p className="maps-settings-lead" role="status">{t('common.loading', { defaultMessage: 'Loading…' })}</p>
      ) : enrollment ? (
        <div className="kca-enrollment-summary">
          <p><KcaBadge value="enrolled" /></p>
          <dl>
            <div><dt>{t('member.kca.registrationNumber', { defaultMessage: 'Registration number' })}</dt><dd>{String(enrollment.registration_number ?? '—')}</dd></div>
            <div><dt>{t('member.kca.batch', { defaultMessage: 'Batch' })}</dt><dd>{String(enrollment.cohort_name ?? enrollment.batch_name ?? '—')}</dd></div>
            <div><dt>{t('member.kca.startsOn', { defaultMessage: 'Starts on' })}</dt><dd>{String(enrollment.starts_on ?? '—')}</dd></div>
          </dl>
          {enrollment.id ? (
            <Link className="primary-button link-button" href={`/admin/kca/students/${String(enrollment.id)}`}>
              {t('member.kca.viewStudentRecord', { defaultMessage: 'View student record' })}
            </Link>
          ) : null}
        </div>
      ) : (
        <form className="kca-form-grid" onSubmit={(event) => void submitEnrollment(event)}>
          <label className="wide">
            <span>{t('member.kca.cohort', { defaultMessage: 'Cohort / batch' })}</span>
            <EntitySearchSelect
              catalog="kcaCohort"
              name="cohort_id"
              onValueChange={setCohortId}
              placeholder={t('member.kca.searchCohort', { defaultMessage: 'Search cohort' })}
              required
              value={cohortId}
            />
          </label>
          <label>
            <span>{t('member.kca.registrationNumber', { defaultMessage: 'Registration number' })}</span>
            <input
              name="registration_number"
              placeholder={t('member.kca.autoAssignedOnEnroll', { defaultMessage: 'Auto-assigned when you enroll' })}
              readOnly
              value={registrationNumber}
            />
          </label>
          <label>
            <span>{t('member.kca.startsOn', { defaultMessage: 'Starts on' })}</span>
            <input
              name="starts_on"
              onChange={(event) => setStartsOn(event.target.value)}
              required
              type="date"
              value={startsOn}
            />
          </label>
          <footer className="form-footer wide">
            <button className="primary-button" disabled={busy} type="submit">
              {t('member.kca.enrollStudent', { defaultMessage: 'Enroll student' })}
            </button>
          </footer>
        </form>
      )}
    </section>
  );
}

function KcaDecision({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const live = !shouldUseDesignFixtures() && shouldUseCatalogLiveData();
  const applicationId = applicationIdFromRoute(screen.route);
  const [application, setApplication] = useState<Record<string, unknown> | null>(null);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!live || !applicationId) return;
    let cancelled = false;
    void (async () => {
      setError(null);
      try {
        const result = await listCatalogDomain('kca.applications', { perPage: 100, scope: CATALOG_GLOBAL_SCOPE });
        const match = result.items.find((item) => String(item.id) === applicationId) ?? null;
        if (!cancelled) setApplication(match as Record<string, unknown> | null);
      } catch (err) {
        if (!cancelled) setError(catalogErrorMessage(err, 'Unable to load application.'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId, live]);

  async function refreshApplication() {
    if (!applicationId) return null;
    const result = await listCatalogDomain('kca.applications', { perPage: 100, scope: CATALOG_GLOBAL_SCOPE });
    const match = (result.items.find((item) => String(item.id) === applicationId) as Record<string, unknown>) ?? null;
    setApplication(match);
    return match;
  }

  async function submitDecision(status: string, label: string) {
    if (!applicationId) return;
    const current = String(application?.status ?? '').toLowerCase();
    if (current === status) {
      setError(null);
      setMessage(`This application is already ${status.replaceAll('_', ' ')}.`);
      return;
    }
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await executeAdminAction({
        route: screen.route,
        label,
        payload: { status, reason_code: `${status}_by_admin`, notes },
        recordId: applicationId,
        scope: CATALOG_GLOBAL_SCOPE,
      });
      setMessage(`Decision recorded: ${status.replaceAll('_', ' ')}.`);
      await refreshApplication();
    } catch (err) {
      setError(formatAdminMutationError(err));
    } finally {
      setBusy(false);
    }
  }

  async function completeOrientation() {
    if (!applicationId) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await executeAdminAction({
        route: screen.route,
        label: 'Complete orientation',
        payload: { action: 'complete_orientation' },
        recordId: applicationId,
        scope: CATALOG_GLOBAL_SCOPE,
      });
      setMessage('Orientation marked complete. Application is ready for admission decision.');
      await refreshApplication();
    } catch (err) {
      setError(formatAdminMutationError(err));
    } finally {
      setBusy(false);
    }
  }

  if (live && applicationId) {
    const personName = String(application?.person_name ?? 'Applicant');
    const initials = personName.split(' ').map((part) => part[0]).slice(0, 2).join('') || '?';
    const status = String(application?.status ?? 'received');
    const orientationProgress = Array.isArray(application?.orientation_progress)
      ? (application.orientation_progress as string[])
      : [];
    const orientationComplete = Boolean(application?.orientation_completed_at);
    const showPostDecisionPanel = applicationPermitsEnrollment(status);
    const finalDecision = decisionIsFinal(status);
    return (
      <div className="kca-decision-layout">
        <aside className="card kca-review-summary">
          <div className="kca-avatar">{initials}</div>
          <h2>{personName}</h2>
          <small>{applicationId}</small>
          <p><KcaBadge value={status} /></p>
          <p>{application?.received_at ? `Received ${formatTimestamp(String(application.received_at))}` : null}</p>
          {application?.batch_name ? <p>{t('member.kca.batch', { defaultMessage: 'Batch' })}: {String(application.batch_name)}</p> : null}
          {showPostDecisionPanel ? (
            <div className="kca-review-summary-links">
              <Link href={`/admin/kca/applications/${applicationId}/admission-letter`}>
                {t('member.kca.admissionLetter', { defaultMessage: 'Admission letter' })}
              </Link>
              <Link href="/admin/settings/kca">
                {t('member.kca.letterSettings', { defaultMessage: 'Letter settings' })}
              </Link>
            </div>
          ) : null}
          {status === 'interview' ? (
            <p>
              Orientation: {orientationComplete ? 'Complete' : `${orientationProgress.length}/4 stages`}
            </p>
          ) : null}
        </aside>
        <article className="card kca-decision-card">
          {showPostDecisionPanel ? (
            <>
              <div className="kca-decision-recorded is-accept">
                <span aria-hidden="true">✓</span>
                <div>
                  <strong>{t('member.kca.decisionRecorded', { defaultMessage: 'Decision recorded' })}</strong>
                  <p>{personName} was {formatDecisionStatus(status)}.</p>
                </div>
              </div>
              <KcaAdmissionPostDecisionPanel
                applicationId={applicationId}
                onEnrolled={() => {
                  void refreshApplication();
                }}
                onError={setError}
                onMessage={setMessage}
                personName={personName}
                status={status}
              />
              {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
              {message ? <p className="maps-settings-lead" role="status">{message}</p> : null}
            </>
          ) : (
            <>
              <span className="kca-overline">{t('member.kca.finalReview', { defaultMessage: 'Final review' })}</span>
              <h2>{t('member.kca.selectAdmissionDecision', { defaultMessage: 'Select an admission decision' })}</h2>
              <p>{t('member.kca.decisionCopy', { defaultMessage: 'Choose the appropriate outcome for {name} after reviewing all application sections.', vars: { name: personName } })}</p>
              {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
              {message ? <p className="maps-settings-lead" role="status">{message}</p> : null}
              {status === 'interview' && !orientationComplete ? (
                <p className="maps-settings-lead">
                  The applicant must complete orientation, or you can mark it complete from here before admitting.
                </p>
              ) : null}
              {status === 'interview' && !orientationComplete ? (
                <button className="primary-button" type="button" data-interaction-native="true" disabled={busy} onClick={() => void completeOrientation()}>
                  Mark Orientation Complete
                </button>
              ) : null}
              <div className="kca-decision-options">
                <button className="accept" type="button" data-interaction-native="true" disabled={busy} onClick={() => void submitDecision('accepted', 'Admit')}>
                  <span>✓</span><strong>{t('member.kca.admit', { defaultMessage: 'Admit' })}</strong>
                </button>
                <button className="accept" type="button" data-interaction-native="true" disabled={busy} onClick={() => void submitDecision('provisionally_accepted', 'Provisionally Accept')}>
                  <span>✓</span><strong>{t('member.kca.provisionallyAccept', { defaultMessage: 'Provisionally Accept' })}</strong>
                </button>
                <button className="defer" type="button" data-interaction-native="true" disabled={busy} onClick={() => void submitDecision('information_required', 'Request Information')}>
                  <span>◷</span><strong>Request Information</strong>
                </button>
                <button className="defer" type="button" data-interaction-native="true" disabled={busy} onClick={() => void submitDecision('interview', 'Interview')}>
                  <span>◷</span><strong>Interview / Orientation</strong>
                </button>
                <button className="defer" type="button" data-interaction-native="true" disabled={busy} onClick={() => void submitDecision('deferred', 'Defer')}>
                  <span>◷</span><strong>{t('member.kca.defer', { defaultMessage: 'Defer' })}</strong>
                </button>
                <button className="reject" type="button" data-interaction-native="true" disabled={busy} onClick={() => void submitDecision('not_accepted', 'Not Accepted')}>
                  <span>×</span><strong>{t('member.kca.notAccepted', { defaultMessage: 'Not Accepted' })}</strong>
                </button>
              </div>
            </>
          )}
          {!showPostDecisionPanel && finalDecision ? (
            <div className={`kca-decision-recorded ${status === 'not_accepted' ? 'is-reject' : 'is-defer'}`}>
              <span aria-hidden="true">{status === 'not_accepted' ? '×' : '◷'}</span>
              <div>
                <strong>{t('member.kca.decisionRecorded', { defaultMessage: 'Decision recorded' })}</strong>
                <p>{personName} was {formatDecisionStatus(status)}.</p>
              </div>
            </div>
          ) : null}
          {!showPostDecisionPanel && finalDecision ? (
            <>
              {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
              {message ? <p className="maps-settings-lead" role="status">{message}</p> : null}
            </>
          ) : null}
          <label className="kca-decision-notes">
            <span>{t('member.kca.admissionNotesOptional', { defaultMessage: 'Admission Notes (Optional)' })}</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={t('member.kca.privateNotesPlaceholder', { defaultMessage: 'Write your private notes here...' })} />
          </label>
          <footer>
            <Link className="ghost-button" href="/admin/kca/applications">{t('common.back', { defaultMessage: 'Back' })}</Link>
            {!showPostDecisionPanel ? (
              <Link className="ghost-button link-button" href={`/admin/kca/applications/${applicationId}`}>
                {t('member.kca.reviewApplication', { defaultMessage: 'Review application' })}
              </Link>
            ) : null}
          </footer>
        </article>
      </div>
    );
  }

  return <div className="kca-decision-layout">
    <aside className="card kca-review-summary"><div className="kca-avatar">SD</div><h2>Samuel David</h2><small>KCA-2024-000124</small><div>{(screen.items ?? []).slice(0, 8).map((item, index) => <p key={item}><span className={index < 7 ? 'done' : ''}>{index < 7 ? '✓' : '•'}</span>{item.split(' — ')[0]}<KcaBadge value={item.split(' — ')[1]}/></p>)}</div></aside>
    <article className="card kca-decision-card"><span className="kca-overline">{t('member.kca.finalReview', { defaultMessage: 'Final review' })}</span><h2>{t('member.kca.selectAdmissionDecision', { defaultMessage: 'Select an admission decision' })}</h2><p>{t('member.kca.decisionCopy', { defaultMessage: 'Choose the appropriate outcome for {name} after reviewing all application sections.', vars: { name: 'Samuel David' } })}</p><div className="kca-decision-options"><button className="accept" type="button"><span>✓</span><strong>{t('member.kca.provisionallyAccept', { defaultMessage: 'Provisionally Accept' })}</strong><small>{t('member.kca.meetsRequirements', { defaultMessage: 'Applicant meets the requirements.' })}</small></button><button className="defer" type="button"><span>◷</span><strong>{t('member.kca.defer', { defaultMessage: 'Defer' })}</strong><small>{t('member.kca.moreInformationRequired', { defaultMessage: 'More information is required.' })}</small></button><button className="reject" type="button"><span>×</span><strong>{t('member.kca.notAccepted', { defaultMessage: 'Not Accepted' })}</strong><small>{t('member.kca.doesNotMeetRequirements', { defaultMessage: 'Applicant does not meet requirements.' })}</small></button></div><label><span>{t('member.kca.admissionNotesOptional', { defaultMessage: 'Admission Notes (Optional)' })}</span><textarea placeholder={t('member.kca.privateNotesPlaceholder', { defaultMessage: 'Write your private notes here...' })}/></label><footer><button className="ghost-button" type="button">{t('common.back', { defaultMessage: 'Back' })}</button><button className="primary-button" type="button">{translateAction(t, screen.action)}</button></footer></article>
  </div>;
}

function KcaOutcome({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const tone = screen.id === 'G-14' ? 'defer' : screen.id === 'G-15' ? 'reject' : 'accept';
  const symbol = tone === 'accept' ? '✓' : tone === 'defer' ? '◷' : '×';
  const isDestructive = tone === 'defer' || tone === 'reject';
  return <article className={`card kca-outcome is-${tone}`}><div className="kca-outcome-symbol" aria-hidden="true">{symbol}</div><h2>{screen.title}</h2><p>{screen.subtitle}</p><dl>{Object.entries(screen.details ?? {}).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{key === 'Status' ? <KcaBadge value={value}/> : value}</dd></div>)}</dl><div className="kca-outcome-actions"><button className={isDestructive ? 'danger-button' : 'primary-button'} type="button">{translateAction(t, screen.action)}</button>{screen.items?.[1] && <button className="ghost-button" type="button">{screen.items[1]}</button>}</div></article>;
}

function KcaLetter({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const live = !shouldUseDesignFixtures() && shouldUseCatalogLiveData();
  const applicationId = applicationIdFromRoute(screen.route);
  const [letter, setLetter] = useState<KcaAdmissionLetter | null>(null);
  const [loading, setLoading] = useState(live);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const details = screen.details ?? {};

  useEffect(() => {
    if (!live || !applicationId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getKcaAdmissionLetter(applicationId)
      .then((data) => {
        if (cancelled) return;
        setLetter(data);
        setMessage('');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(formatAdminMutationError(err));
        setLetter(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applicationId, live]);

  const issue = async () => {
    if (!applicationId) return;
    setBusy(true);
    setError(null);
    try {
      const data = await issueKcaAdmissionLetter(applicationId);
      setLetter(data);
      setMessage(t('member.kca.letterIssued', { defaultMessage: 'Admission letter issued.' }));
    } catch (err) {
      setError(formatAdminMutationError(err));
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = async () => {
    if (!applicationId) return;
    setDownloadBusy(true);
    setError(null);
    try {
      const blob = await downloadKcaAdmissionLetterPdf(applicationId);
      downloadBlob(blob, 'kca-admission-letter.pdf');
      setMessage(t('member.kca.letterDownloadReady', { defaultMessage: 'Admission letter downloaded.' }));
    } catch (err) {
      setError(formatAdminMutationError(err));
    } finally {
      setDownloadBusy(false);
    }
  };

  const isIssued = letter?.status === 'issued';
  const applicant = letter?.applicant_name ?? (live ? 'Applicant' : details.To ?? 'Applicant');
  const reference = letter?.reference_code ?? (live
    ? t('member.kca.pendingReference', { defaultMessage: 'Pending' })
    : 'KCA/ADM/2024/0124');
  const batchLabel = letter?.batch_label ?? '';

  const resolveAsset = live && applicationId
    ? (fileAssetId: string) => fetchKcaAdmissionLetterAssetBlob(applicationId, fileAssetId)
    : undefined;

  return (
    <div className="kca-document-layout">
      <div className="kca-letter-main">
        {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
        {loading ? <p className="maps-settings-lead" role="status">{t('common.loading', { defaultMessage: 'Loading…' })}</p> : null}
        {message ? <p className="maps-settings-lead" role="status">{message}</p> : null}
        {letter ? (
          <KcaAdmissionLetterSheet
            admissionsTeamLabel={t('member.kca.admissionsTeam', { defaultMessage: 'KCA Admissions Team' })}
            dateLabel={(date) => t('member.kca.letterDate', { defaultMessage: 'Date: {date}', vars: { date } })}
            dearLabel={t('member.kca.dear', { defaultMessage: 'Dear' })}
            fallbackHeader={(
              <>
                <div className="kca-seal" aria-hidden="true">{t('member.kca', { defaultMessage: 'KCA' })}</div>
                <div>
                  <strong>{t('member.kca.academyName', { defaultMessage: 'KINGDOM CITIZENS ACADEMY' })}</strong>
                  <small>{t('member.kca.familyHouseConnect', { defaultMessage: 'Family House Connect' })}</small>
                </div>
              </>
            )}
            letter={{
              applicant_name: applicant,
              reference_code: letter.reference_code,
              letter_body: letter.letter_body,
              signer_name: letter.signer_name,
              signer_title: letter.signer_title,
              issued_at: letter.issued_at,
              batch_label: batchLabel,
              letterhead_file_asset_id: letter.letterhead_file_asset_id,
              signature_file_asset_id: letter.signature_file_asset_id,
            }}
            pendingReferenceLabel={t('member.kca.pendingReference', { defaultMessage: 'Pending' })}
            refLabel={(ref) => t('member.kca.letterRef', { defaultMessage: 'Ref: {ref}', vars: { ref } })}
            resolveAsset={resolveAsset}
          />
        ) : !loading ? (
          <article className="card kca-letter" aria-labelledby="admission-letter-title">
            <h1 id="admission-letter-title" aria-level={2}>{t('member.kca.admissionLetter', { defaultMessage: 'ADMISSION LETTER' })}</h1>
          </article>
        ) : null}
      </div>
      <aside className="card kca-document-meta">
        <h2>{t('member.kca.letterActions', { defaultMessage: 'Letter actions' })}</h2>
        <p className="maps-settings-lead">
          {t('member.kca.letterActionsCopy', {
            defaultMessage: 'Configure the provost signature and letterhead once, then issue the letter for this applicant.',
          })}
        </p>
        <div className="kca-document-actions">
          {live && !loading && !error && !isIssued && applicationId ? (
            <button className="primary-button" data-interaction-native="true" disabled={busy} onClick={() => void issue()} type="button">
              {t('member.kca.issueLetter', { defaultMessage: 'Issue admission letter' })}
            </button>
          ) : null}
          {isIssued && applicationId ? (
            <button
              className="primary-button"
              data-interaction-native="true"
              disabled={downloadBusy}
              onClick={() => void downloadPdf()}
              type="button"
            >
              {t('member.kca.downloadPdf', { defaultMessage: 'Download PDF' })}
            </button>
          ) : null}
          {applicationId ? (
            <Link className="ghost-button link-button" href={`/admin/kca/applications/${applicationId}/decision`}>
              {t('common.back', { defaultMessage: 'Back to decision' })}
            </Link>
          ) : null}
          <Link className="ghost-button link-button" href="/admin/settings/kca">
            {t('member.kca.configureLetter', { defaultMessage: 'Configure letter template' })}
          </Link>
        </div>
        <dl className="kca-document-details">
          <div><dt>{t('member.kca.applicant', { defaultMessage: 'Applicant' })}</dt><dd>{applicant}</dd></div>
          <div><dt>{t('member.kca.reference', { defaultMessage: 'Reference' })}</dt><dd>{reference}</dd></div>
          <div><dt>{t('admin.status', { defaultMessage: 'Status' })}</dt><dd>{isIssued ? t('member.kca.issued', { defaultMessage: 'Issued' }) : t('member.kca.notIssued', { defaultMessage: 'Not issued' })}</dd></div>
        </dl>
      </aside>
    </div>
  );
}

function KcaOrientation({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const columns = screen.columns ?? [];
  const columnKey = columns.join('\0');
  const dataset = resolveCatalogDataset(screen);
  const live = !shouldUseDesignFixtures() && shouldUseCatalogLiveData() && dataset !== null;
  const [rows, setRows] = useState<Row[]>(live ? [] : (screen.rows ?? []));
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState(live ? t('common.loadingCatalog', { defaultMessage: 'Loading catalog…' }) : '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!live || !dataset) return;
    const mappedColumns = columnKey ? columnKey.split('\0') : [];
    let cancelled = false;
    void (async () => {
      setError(null);
      setMessage(t('common.loadingCatalog', { defaultMessage: 'Loading catalog…' }));
      try {
        const result = await listCatalogDomain(dataset, { perPage: 25 });
        if (cancelled) return;
        stashAdminRecords(result.items as Array<Record<string, unknown>>);
        setRows(catalogRecordsToRows(result.items as Record<string, unknown>[], mappedColumns) as Row[]);
        setTotal(result.pagination.total);
        setMessage(
          result.pagination.total === 0
            ? t('errors.noCatalogRecords', { defaultMessage: 'No catalog records in this scope.' })
            : t('common.showingOfRecords', { defaultMessage: 'Showing {visible} of {total} records', vars: { visible: result.items.length, total: result.pagination.total } }),
        );
      } catch (err) {
        if (cancelled) return;
        setRows([]);
        setError(catalogErrorMessage(err, t('errors.unableToLoadDomainCatalog', { defaultMessage: 'Unable to load domain catalog.' })));
        setMessage(t('errors.liveCatalogUnavailable', { defaultMessage: 'Live catalog unavailable' }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [columnKey, dataset, live, t]);

  if (!shouldUseDesignFixtures() && !live) {
    return (
      <section className="kca-managed-table" aria-label={t('member.kca.orientationSessionsAria', { defaultMessage: 'Orientation sessions' })}>
        <p className="maps-settings-lead" role="status">
          {t('errors.noLiveListApiWired', { defaultMessage: 'No live list API is wired for this screen. Design fixtures are disabled.' })}
        </p>
      </section>
    );
  }

  return <section className="kca-managed-table" aria-label={t('member.kca.orientationSessionsAria', { defaultMessage: 'Orientation sessions' })}>
    {live ? (
      <div className="kca-students-toolbar">
        <KcaMetrics metrics={[
          { label: t('admin.totalSessions', { defaultMessage: 'Sessions' }), value: String(total || rows.length) },
          { label: t('admin.onThisPage', { defaultMessage: 'On this page' }), value: String(rows.length) },
        ]} />
        <Link className="primary-button link-button" href="/admin/kca/orientation/create">{screen.action ?? '+ New Orientation'}</Link>
      </div>
    ) : (
      <KcaMetrics metrics={screen.metrics}/>
    )}
    {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
    {live && !error ? <p className="maps-settings-lead" role="status">{message}</p> : null}
    <KcaTable screen={screen} rows={rows} columns={columns} filterLabels={['All Batches', 'All Venues', 'All Statuses']} toolbarAction={live ? undefined : screen.action} total={total || rows.length} />
  </section>;
}

function KcaEntityDetail({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const isStudent = screen.id === 'H-02';
  const live = !shouldUseDesignFixtures() && shouldUseCatalogLiveData();
  const enrollmentId = isStudent ? enrollmentIdFromRoute(screen.route) : null;
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(Boolean(live && enrollmentId));

  useEffect(() => {
    if (!live || !enrollmentId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void listCatalogDomain('kca.enrollments', { perPage: 100, scope: CATALOG_GLOBAL_SCOPE })
      .then((result) => {
        if (cancelled) return;
        const match = result.items.find((item) => String(item.id) === enrollmentId) ?? null;
        setRecord(match as Record<string, unknown> | null);
      })
      .catch(() => {
        if (!cancelled) setRecord(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enrollmentId, live]);

  const personName = String(record?.person_name ?? screen.title);
  const initials = personName.split(' ').map((part) => part[0]).slice(0, 2).join('') || '?';
  const registrationNumber = String(record?.registration_number ?? screen.details?.['Registration number'] ?? '—');
  const cohortName = String(record?.cohort_name ?? record?.batch_name ?? screen.details?.Cohort ?? '—');
  const startsOn = String(record?.starts_on ?? screen.details?.['Starts on'] ?? '—');
  const yearName = String(record?.year_name ?? '—');
  const status = String(record?.status ?? t('member.kca.active', { defaultMessage: 'Active' }));

  if (loading) {
    return <p className="maps-settings-lead" role="status">{t('common.loading', { defaultMessage: 'Loading…' })}</p>;
  }

  if (live && enrollmentId && !record) {
    return (
      <article className="card">
        <h2>{t('member.kca.studentNotFound', { defaultMessage: 'Student record not found' })}</h2>
        <p className="maps-settings-lead">{t('member.kca.studentNotFoundCopy', { defaultMessage: 'This enrollment may have been removed or is outside your current scope.' })}</p>
        <Link className="primary-button link-button" href="/admin/kca/students">{t('member.kca.backToStudents', { defaultMessage: 'Back to students' })}</Link>
      </article>
    );
  }

  const detailEntries = isStudent
    ? {
        [t('member.kca.registrationNumber', { defaultMessage: 'Registration number' })]: registrationNumber,
        [t('member.kca.cohort', { defaultMessage: 'Cohort / batch' })]: cohortName,
        [t('member.kca.kcaYear', { defaultMessage: 'KCA year' })]: yearName,
        [t('member.kca.startsOn', { defaultMessage: 'Starts on' })]: startsOn,
        [t('member.kca.status', { defaultMessage: 'Status' })]: status,
      }
    : (screen.details ?? {});

  return <div className="kca-entity-page"><article className="card kca-identity-banner"><div className="kca-avatar large">{initials}</div><div><span className="kca-overline">{isStudent ? t('member.kca.studentProfile', { defaultMessage: 'Student profile' }) : screen.subtitle}</span><h2>{personName} <KcaBadge value={status}/></h2><p>{isStudent ? `${registrationNumber}${yearName !== '—' ? ` · ${yearName}` : ''}` : t('member.kca.lagosNigeria', { defaultMessage: 'Lagos, Nigeria' })}</p><div className="kca-contact-line"><span>✉ {personName.toLowerCase().replaceAll(' ', '.')}@kca.org</span><span>☎ +234 803 111 2222</span></div></div></article><div className="kca-overview-grid"><article className="card kca-detail-panel"><h2>{isStudent ? t('member.kca.personalInformation', { defaultMessage: 'Personal Information' }) : t('member.kca.profileOverview', { defaultMessage: 'Profile Overview' })}</h2><dl>{Object.entries(detailEntries).map(([key,value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></article><article className="card kca-detail-panel kca-performance-panel"><h2>{isStudent ? t('member.kca.progressOverview', { defaultMessage: 'Progress Overview' }) : t('member.kca.performance', { defaultMessage: 'Performance' })}</h2>{(screen.items ?? []).map((item,index) => { const [label,value] = item.split(' — '); const progress = Number(value?.match(/\d+/)?.[0] ?? (86 - index * 9)); return <div className="kca-performance-row" key={item}><header><span>{label}</span><strong>{value}</strong></header><i role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(progress,100)}><b style={{ width: `${Math.min(progress,100)}%` }}/></i></div>; })}</article></div></div>;
}

function KcaCohorts({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  return <div className="kca-cohort-view"><div className="kca-cohort-cards">{(screen.items ?? []).map((item, index) => { const [name, summary] = item.split(' — '); return <article className="card" key={item}><span className="kca-cohort-icon">{String(index + 1).padStart(2,'0')}</span><h2>{name}</h2><p>{summary}</p><footer><KcaBadge value={summary.includes('Completed') ? t('member.kca.completed', { defaultMessage: 'Completed' }) : t('member.kca.active', { defaultMessage: 'Active' })}/><button type="button">{t('member.kca.viewCohort', { defaultMessage: 'View cohort →' })}</button></footer></article>; })}</div><KcaTable screen={screen}/></div>;
}

function KcaYears({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  return <div className="kca-years-view"><KcaTable screen={screen}/><article className="card kca-year-chart"><h2>{t('member.kca.yearProgressOverview', { defaultMessage: 'Year Progress Overview' })}</h2><div className="kca-bars" role="img" aria-label={t('member.kca.yearProgressAria', { defaultMessage: 'Year progress: {items}', vars: { items: (screen.items ?? []).join(', ') } })}>{(screen.items ?? []).map((item,index) => { const [label,value] = item.split(' — '); const height = [92,72,58,4,4][index] ?? 40; return <div key={item}><span>{value}</span><i aria-hidden="true" style={{ height: `${height}%` }}/><b>{label}</b></div>; })}</div></article></div>;
}

function KcaModuleBuilder({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const fields = fieldsForEntity('kca_module');
  const live = !shouldUseDesignFixtures();
  const fixtureValues = normalizeDetailValues(screen.details ?? {});
  const moduleDraftRef = useRef<KcaModuleFormValues>(live ? {} : fixtureValues);
  const [values, setValues] = useState<KcaModuleFormValues>(() => moduleDraftRef.current);
  const steps = screen.tabs ?? [];
  const wizard = useAdminWizardStep(steps);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [showLessonManager, setShowLessonManager] = useState(false);

  function captureModuleFields(): KcaModuleFormValues {
    const card = document.querySelector('[data-kca-module-builder="true"]');
    const nextValues = captureKcaModuleFormValues(card, moduleDraftRef.current);
    moduleDraftRef.current = nextValues;
    setValues(nextValues);
    return nextValues;
  }

  async function onFinishModule() {
    if (!live) return;
    const draft = captureModuleFields();
    const validationError = validateKcaModuleFormValues(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const created = await executeAdminAction({
        route: screen.route,
        label: 'Create module',
        payload: kcaModuleMutationPayload(draft),
        scope: CATALOG_GLOBAL_SCOPE,
      });
      if (created.id) {
        setModuleId(created.id);
        setShowLessonManager(true);
      }
      setMessage(created.id
        ? 'Module created. Add lessons, then map learning days and publish.'
        : 'Module created. Add lessons from the Lessons screen.');
    } catch (err) {
      setError(formatAdminMutationError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kca-builder" data-admin-wizard="true">
      <AdminWizardStepper steps={steps} currentStep={wizard.currentStep} className="kca-builder-steps" itemClassName="" activeClassName="current" />
      <article className="card kca-form-card" data-kca-module-builder="true">
        <header>
          <div>
            <span className="kca-overline">{wizard.isFirst ? t('member.kca.newModule', { defaultMessage: 'New module' }) : t('member.kca.stepOf', { defaultMessage: 'Step {current} of {total}', vars: { current: wizard.currentStep + 1, total: steps.length } })}</span>
            <h2>{wizard.currentLabel || t('member.kca.basicInformation', { defaultMessage: 'Basic Information' })}</h2>
            <p>
              {wizard.currentStep === 0 && t('member.kca.moduleStepDefine', { defaultMessage: 'Define the module students will learn. Fields map to kca_modules columns.' })}
              {wizard.currentStep === 1 && t('member.kca.moduleStepLessons', { defaultMessage: 'Add lessons and learning content for this module.' })}
              {wizard.currentStep === 2 && t('member.kca.moduleStepPrerequisites', { defaultMessage: 'Set prerequisites students must complete before starting.' })}
              {wizard.currentStep === 3 && t('member.kca.moduleStepEvidence', { defaultMessage: 'Configure evidence and assessment requirements.' })}
              {wizard.currentStep >= 4 && t('member.kca.moduleStepReview', { defaultMessage: 'Review module details before publishing.' })}
            </p>
          </div>
        </header>

        {wizard.currentStep === 0 && <AdminFormFields fields={fields} values={values} />}

        {wizard.currentStep === 1 && (
          <div className="kca-form-grid">
            <p className="maps-settings-lead">Save the module first, then add lessons from Lessons. Notes here are planning-only and are not stored until the module exists.</p>
            <label className="wide"><span>{t('member.kca.lessonPlanNotes', { defaultMessage: 'Lesson plan notes' })}</span><textarea placeholder={t('member.kca.lessonPlanPlaceholder', { defaultMessage: 'Outline videos, readings, and assignments for this module...' })} rows={5} /></label>
            <label><span>{t('member.kca.contentFormat', { defaultMessage: 'Content format' })}</span><select defaultValue="Mixed"><option value="Mixed">{t('member.kca.formatMixed', { defaultMessage: 'Mixed' })}</option><option value="Video-led">{t('member.kca.formatVideoLed', { defaultMessage: 'Video-led' })}</option><option value="Reading-led">{t('member.kca.formatReadingLed', { defaultMessage: 'Reading-led' })}</option></select></label>
            <label><span>{t('member.kca.estimatedLessons', { defaultMessage: 'Estimated lessons' })}</span><input type="number" min={1} /></label>
          </div>
        )}

        {wizard.currentStep === 2 && (
          <div className="kca-prerequisite-list">
            <p className="maps-settings-lead">Prerequisites are added after the module exists, from the Prerequisites screen. Nothing is saved from these placeholder rows.</p>
            <button className="ghost-button" type="button" data-interaction-native="true">{t('member.kca.addPrerequisite', { defaultMessage: '+ Add prerequisite' })}</button>
          </div>
        )}

        {wizard.currentStep === 3 && (
          <div className="kca-form-grid">
            <label><span>{t('member.kca.evidenceType', { defaultMessage: 'Evidence type' })}</span><select defaultValue="Written + Practical"><option value="Written + Practical">{t('member.kca.evidenceWrittenPractical', { defaultMessage: 'Written + Practical' })}</option><option value="Written only">{t('member.kca.evidenceWrittenOnly', { defaultMessage: 'Written only' })}</option><option value="Practical only">{t('member.kca.evidencePracticalOnly', { defaultMessage: 'Practical only' })}</option></select></label>
            <label><span>{t('member.kca.minimumSubmissions', { defaultMessage: 'Minimum submissions' })}</span><input type="number" defaultValue="3" min={0} /></label>
            <label className="wide"><span>{t('member.kca.evidenceInstructions', { defaultMessage: 'Evidence instructions' })}</span><textarea rows={4} placeholder={t('member.kca.evidencePlaceholder', { defaultMessage: 'Describe what students must submit...' })} /></label>
          </div>
        )}

        {wizard.currentStep >= 4 && (
          <dl className="kca-review-summary">
            {Object.entries(values).filter(([, value]) => String(value).trim() !== '').map(([key, value]) => (
              <div key={key}><dt>{key.replace(/_/g, ' ')}</dt><dd>{value}</dd></div>
            ))}
            <div><dt>{t('member.kca.lessons', { defaultMessage: 'Lessons' })}</dt><dd>{t('member.kca.addAfterCreate', { defaultMessage: 'Add via Lessons after module is created' })}</dd></div>
            <div><dt>{t('member.kca.prerequisites', { defaultMessage: 'Prerequisites' })}</dt><dd>{t('member.kca.noPrerequisiteApi', { defaultMessage: 'No prerequisite admin API yet' })}</dd></div>
            {(['code', 'title', 'sequence', 'duration_days'] as const).map((name) => (
              <input key={name} type="hidden" name={name} value={values[name] ?? ''} readOnly />
            ))}
          </dl>
        )}

        {moduleId && showLessonManager ? (
          <KcaModuleLessonsManager
            moduleId={moduleId}
            moduleTitle={values.title ?? 'Module'}
            onClose={() => setShowLessonManager(false)}
          />
        ) : null}

        {moduleId ? (
          <div className="kca-form-grid">
            <button
              className="ghost-button"
              type="button"
              disabled={busy}
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    await executeAdminAction({
                      route: `/admin/kca/modules/${moduleId}`,
                      label: 'Map learning days',
                      payload: {},
                      recordId: moduleId,
                      scope: CATALOG_GLOBAL_SCOPE,
                    });
                    setMessage('Learning days mapped.');
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Day map failed.');
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              Map learning days
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={busy}
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    await executeAdminAction({
                      route: `/admin/kca/modules/${moduleId}`,
                      label: 'Publish module',
                      payload: {},
                      recordId: moduleId,
                      scope: CATALOG_GLOBAL_SCOPE,
                    });
                    setMessage('Module published.');
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Publish failed.');
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              Publish module
            </button>
          </div>
        ) : null}

        {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
        {message ? <p className="maps-settings-lead" role="status">{message}</p> : null}
        <AdminWizardFooter
          wizard={wizard}
          nextLabel={translateAction(t, screen.action)}
          finishLabel={busy ? t('common.saving', { defaultMessage: 'Saving…' }) : t('member.kca.createModule', { defaultMessage: 'Create module' })}
          secondaryClassName="ghost-button"
          primaryClassName="primary-button"
          onBeforeAdvance={captureModuleFields}
          onFinish={() => void onFinishModule()}
        />
      </article>
    </div>
  );
}

function KcaPrerequisites({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const live = !shouldUseDesignFixtures() && shouldUseCatalogLiveData();
  const [rows, setRows] = useState<Row[]>(live ? [] : (screen.rows ?? []));
  const [modules, setModules] = useState<Array<Record<string, unknown>>>([]);
  const [message, setMessage] = useState<string | null>(live ? 'Loading prerequisites…' : null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [total, setTotal] = useState(0);

  const refresh = async () => {
    if (!live) return;
    setError(null);
    try {
      const [prerequisites, moduleCatalog] = await Promise.all([
        listCatalogDomain('kca.prerequisites', { perPage: 50, scope: CATALOG_GLOBAL_SCOPE }),
        listCatalogDomain('kca.modules', { perPage: 100, scope: CATALOG_GLOBAL_SCOPE }),
      ]);
      stashAdminRecords(prerequisites.items as Array<Record<string, unknown>>);
      setRows(
        (prerequisites.items as Array<Record<string, unknown>>).map((item) => ({
          __id: String(item.id ?? ''),
          Module: String(item.module_title ?? item.module_id ?? '—'),
          Prerequisite: String(item.prerequisite_module_title ?? item.prerequisite_module_id ?? '—'),
          Requirement: String(item.requirement ?? '—'),
          Status: String(item.status ?? 'Active'),
        })),
      );
      setModules(moduleCatalog.items as Array<Record<string, unknown>>);
      setTotal(prerequisites.pagination.total);
      setMessage(
        prerequisites.pagination.total === 0
          ? 'No module prerequisites configured yet.'
          : `Showing ${prerequisites.items.length} of ${prerequisites.pagination.total} prerequisites.`,
      );
    } catch (reason) {
      setRows([]);
      setModules([]);
      setTotal(0);
      setError(catalogErrorMessage(reason, 'Unable to load KCA prerequisites.'));
      setMessage('Prerequisite data is currently unavailable');
    }
  };

  useEffect(() => {
    void refresh();
  }, [live]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!live) return;
    const form = new FormData(event.currentTarget);
    const moduleId = String(form.get('module_id') ?? '').trim();
    const prerequisiteModuleId = String(form.get('prerequisite_module_id') ?? '').trim();
    const requirement = String(form.get('requirement') ?? '').trim();
    if (!moduleId || !prerequisiteModuleId || !requirement) {
      setError('Module, prerequisite module, and requirement are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await executeAdminAction({
        route: `/admin/kca/modules/${moduleId}/prerequisites`,
        label: 'Add prerequisite',
        recordId: moduleId,
        payload: { module_id: moduleId, prerequisite_module_id: prerequisiteModuleId, requirement },
        scope: CATALOG_GLOBAL_SCOPE,
      });
      (event.currentTarget as HTMLFormElement).reset();
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create prerequisite.');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(row: Row) {
    const id = String(row.__id ?? '').trim();
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await executeAdminAction({
        route: screen.route,
        label: 'Remove prerequisite',
        recordId: id,
        payload: { prerequisite_id: id },
        scope: CATALOG_GLOBAL_SCOPE,
      });
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to remove prerequisite.');
    } finally {
      setBusy(false);
    }
  }

  if (!live) {
    return <article className="card kca-prerequisites"><header><div><h2>{t('member.kca.modulePrerequisites', { defaultMessage: 'Module prerequisites' })}</h2><p>{t('member.kca.modulePrerequisitesCopy', { defaultMessage: 'Students must complete these requirements before starting this module.' })}</p></div><button className="primary-button" type="button">{translateAction(t, screen.action)}</button></header><KcaFilters compact search={t('member.kca.searchPrerequisites', { defaultMessage: 'Search prerequisites...' })}/><div>{(screen.items ?? []).map((item,index) => { const [name,status] = item.split(' — '); return <div className="kca-prerequisite-row" key={item}><span className="kca-drag" aria-hidden="true">⋮⋮</span><span className="kca-prerequisite-icon" aria-hidden="true">{index < 3 ? '▣' : '◇'}</span><strong>{name}</strong><KcaBadge value={status}/><button type="button" aria-label={t('member.kca.moreActionsFor', { defaultMessage: 'More actions for {name}', vars: { name } })}>•••</button></div>; })}</div></article>;
  }

  return (
    <section className="kca-managed-table">
      {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
      {message ? <p className="maps-settings-lead" role="status">{message}</p> : null}
      <form className="card form-card" onSubmit={(event) => void onCreate(event)} style={{ marginBottom: 12 }}>
        <h2 className="section-title">Add prerequisite</h2>
        <div className="form-grid">
          <label>
            <span>Module *</span>
            <EntitySearchSelect name="module_id" required catalog="kcaModule" options={modules.map((item) => ({ value: String(item.id), label: String(item.title ?? item.code ?? item.id) }))} />
          </label>
          <label>
            <span>Prerequisite module *</span>
            <EntitySearchSelect name="prerequisite_module_id" required catalog="kcaModule" options={modules.map((item) => ({ value: String(item.id), label: String(item.title ?? item.code ?? item.id) }))} />
          </label>
          <label>
            <span>Requirement *</span>
            <select name="requirement" required defaultValue="previous_module_complete">
              <option value="previous_module_complete">previous_module_complete</option>
              <option value="assignment_submitted">assignment_submitted</option>
              <option value="mentor_approval">mentor_approval</option>
              <option value="quiz_passed">quiz_passed</option>
              <option value="spiritual_exercise_complete">spiritual_exercise_complete</option>
            </select>
          </label>
        </div>
        <div className="form-footer">
          <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save prerequisite'}</button>
        </div>
      </form>
      <article className="card kca-table-card">
        <table className="kca-table">
          <thead><tr><th>Module</th><th>Prerequisite</th><th>Requirement</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5}>{message ?? 'No prerequisites found.'}</td></tr>
            ) : rows.map((row, index) => (
              <tr key={`${row.__id ?? index}`}>
                <td>{row.Module ?? '—'}</td>
                <td>{row.Prerequisite ?? '—'}</td>
                <td>{row.Requirement ?? '—'}</td>
                <td><KcaBadge value={row.Status ?? 'Active'} /></td>
                <td>
                  <button className="table-action" type="button" disabled={busy} onClick={() => void onDelete(row)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="maps-settings-lead" role="status">Total {total}</p>
      </article>
    </section>
  );
}

function KcaAssessment({ screen }: { screen: AdminScreen }) {
  const live = !shouldUseDesignFixtures() && shouldUseCatalogLiveData();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState(live ? 'Loading assessments…' : '');
  const [busy, setBusy] = useState(false);
  const [audience, setAudience] = useState('One student');

  async function load() {
    if (!live) return;
    setError(null);
    try {
      const result = await listCatalogDomain('kca.assessments', { perPage: 50 });
      stashAdminRecords(result.items as Array<Record<string, unknown>>);
      const mapped = catalogRecordsToRows(result.items as Record<string, unknown>[], ['Student', 'Assessment', 'Result', 'Score']) as Row[];
      setRows(mapped);
      setTotal(result.pagination.total);
      setMessage(`${result.pagination.total} assessment results recorded`);
    } catch (err) {
      setRows([]);
      setError(catalogErrorMessage(err, 'Unable to load assessments.'));
    }
  }

  useEffect(() => {
    void load();
  }, [live]);

  async function onRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await executeAdminAction({
        route: screen.route,
        label: 'Record Assessment',
        payload: Object.fromEntries(form.entries()) as Record<string, string>,
        scope: CATALOG_GLOBAL_SCOPE,
      });
      event.currentTarget.reset();
      setAudience('One student');
      await load();
      setMessage('Assessment recorded.');
    } catch (err) {
      setError(formatAdminMutationError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kca-attendance">
      {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
      {live && message ? <p className="maps-settings-lead" role="status">{message}</p> : null}
      <form className="card settings-card" onSubmit={(event) => void onRecord(event)}>
        <header className="kca-form-card-header">
          <div>
            <span className="kca-overline">Record assessment</span>
            <h2 className="card-title">Assessment results</h2>
            <p className="maps-settings-lead">Record pass/fail results for one student, an entire year, or all enrolled students.</p>
          </div>
        </header>
        <div className="form-grid">
          <label>
            <span>Who is this for? *</span>
            <select name="audience" required value={audience} onChange={(event) => setAudience(event.target.value)}>
              <option>One student</option>
              <option>A student year</option>
              <option>All enrolled students</option>
            </select>
          </label>
          {/one student/i.test(audience) ? (
            <label><span>Student *</span><EntitySearchSelect name="kca_enrollment_id" catalog="kcaEnrollment" required placeholder="Search enrolled KCA student" /></label>
          ) : null}
          {/year/i.test(audience) ? (
            <label><span>KCA year *</span><EntitySearchSelect name="year_id" catalog="kcaYear" required placeholder="Search academic year" /></label>
          ) : null}
          <label><span>Module</span><EntitySearchSelect name="kca_module_id" catalog="kcaModule" placeholder="Optional module" /></label>
          <label><span>Lesson</span><EntitySearchSelect name="kca_lesson_id" catalog="kcaLesson" placeholder="Optional lesson" /></label>
          <label><span>Assessment name *</span><input name="assessment_code" required placeholder="e.g. Identity final" /></label>
          <label>
            <span>Result *</span>
            <select name="result_code" defaultValue="pass" required>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="distinction">Distinction</option>
              <option value="incomplete">Incomplete</option>
            </select>
          </label>
          <label><span>Score</span><input name="score" type="number" min={0} max={100} placeholder="0–100" /></label>
        </div>
        <div className="form-footer">
          <button className="primary-button" disabled={busy || !live} type="submit">{busy ? 'Saving…' : 'Record assessment'}</button>
        </div>
      </form>
      <article className="card kca-table-card">
        <table className="kca-table" aria-label="Assessment results">
          <thead><tr><th>Student</th><th>Assessment</th><th>Result</th><th>Score</th></tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4}>{live ? 'No assessment results recorded yet.' : 'Enable live API to record assessments.'}</td></tr>
            ) : rows.map((row, index) => (
              <tr key={`${row.__id ?? index}`}>
                <td>{row.Student ?? '—'}</td>
                <td>{row.Assessment ?? '—'}</td>
                <td><KcaBadge value={String(row.Result ?? '—')} /></td>
                <td>{row.Score ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {total ? <p className="maps-settings-lead">Total {total}</p> : null}
      </article>
    </div>
  );
}

function KcaAlumni({ screen }: { screen: AdminScreen }) {
  const live = !shouldUseDesignFixtures() && shouldUseCatalogLiveData();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState(live ? 'Loading alumni…' : '');
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!live) return;
    setError(null);
    try {
      const result = await listCatalogDomain('kca.certificates', { perPage: 50 });
      stashAdminRecords(result.items as Array<Record<string, unknown>>);
      const mapped = catalogRecordsToRows(result.items as Record<string, unknown>[], ['Student', 'Certificate', 'Issued', 'Status']) as Row[];
      setRows(mapped);
      setTotal(result.pagination.total);
      setMessage(`${result.pagination.total} alumni certificates on record`);
    } catch (err) {
      setRows([]);
      setError(catalogErrorMessage(err, 'Unable to load alumni records.'));
    }
  }

  useEffect(() => {
    void load();
  }, [live]);

  async function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await executeAdminAction({
        route: screen.route,
        label: 'Add Alumni',
        payload: Object.fromEntries(form.entries()) as Record<string, string>,
        scope: CATALOG_GLOBAL_SCOPE,
      });
      event.currentTarget.reset();
      await load();
      setMessage('Alumni certificate issued.');
    } catch (err) {
      setError(formatAdminMutationError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kca-alumni">
      {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
      {live && message ? <p className="maps-settings-lead" role="status">{message}</p> : null}
      <form className="card settings-card" onSubmit={(event) => void onAdd(event)}>
        <header className="kca-form-card-header">
          <div>
            <span className="kca-overline">Add alumni</span>
            <h2 className="card-title">Graduate a KCA student</h2>
            <p className="maps-settings-lead">Issue a completion certificate for an enrolled student to add them to the alumni network.</p>
          </div>
        </header>
        <div className="form-grid">
          <label><span>Student *</span><EntitySearchSelect name="kca_enrollment_id" catalog="kcaEnrollment" required placeholder="Search enrolled KCA student" /></label>
          <label><span>Certificate number *</span><input name="certificate_number" required placeholder="e.g. KCA/CERT/2026/0042" /></label>
          <label><span>Completion date *</span><input name="completion_on" type="date" required /></label>
          <label><span>Verification code *</span><input name="verification_code" required placeholder="Unique verification code" /></label>
        </div>
        <div className="form-footer">
          <button className="primary-button" disabled={busy || !live} type="submit">{busy ? 'Saving…' : 'Issue certificate'}</button>
        </div>
      </form>
      <article className="card kca-table-card">
        <table className="kca-table" aria-label="Alumni certificates">
          <thead><tr><th>Student</th><th>Certificate</th><th>Issued</th><th>Status</th></tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4}>{live ? 'No alumni certificates issued yet.' : 'Enable live API to manage alumni.'}</td></tr>
            ) : rows.map((row, index) => (
              <tr key={`${row.__id ?? index}`}>
                <td>{row.Student ?? '—'}</td>
                <td>{row.Certificate ?? '—'}</td>
                <td>{row.Issued ?? '—'}</td>
                <td><KcaBadge value={String(row.Status ?? 'Issued')} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {total ? <p className="maps-settings-lead">Total {total}</p> : null}
      </article>
    </div>
  );
}

function RegistrationStepRail({ currentIndex }: { currentIndex: number }) {
  return (
    <nav className="kca-step-rail" aria-label="Registration progress">
      <h3 aria-level={2}>Registration</h3>
      {kcaRegistrationSteps.map((registrationStep, index) => (
        <div
          aria-current={index === currentIndex ? 'step' : undefined}
          className={index < currentIndex ? 'complete' : index === currentIndex ? 'current' : ''}
          key={registrationStep.id}
        >
          <span aria-hidden="true">{index < currentIndex ? '✓' : index + 1}</span>
          <b>{registrationStep.title}</b>
        </div>
      ))}
    </nav>
  );
}

async function admitAndEnrollKcaStudent(
  applicationId: string,
  enrollment: { cohort_id: string; registration_number: string; starts_on: string },
) {
  await executeAdminAction({
    route: `/admin/kca/applications/${applicationId}/decision`,
    label: 'Review application',
    payload: { status: 'reviewed' },
    recordId: applicationId,
    scope: CATALOG_GLOBAL_SCOPE,
  });
  await executeAdminAction({
    route: `/admin/kca/applications/${applicationId}/decision`,
    label: 'Accept application',
    payload: { status: 'accepted' },
    recordId: applicationId,
    scope: CATALOG_GLOBAL_SCOPE,
  });
  return executeAdminAction({
    route: '/admin/kca/students/register',
    label: 'Enroll KCA student',
    payload: {
      application_id: applicationId,
      cohort_id: enrollment.cohort_id,
      registration_number: enrollment.registration_number,
      starts_on: enrollment.starts_on,
    },
    recordId: applicationId,
    scope: CATALOG_GLOBAL_SCOPE,
  });
}

function KcaStudentRegistration({ screen }: { screen: AdminScreen }) {
  const live = !shouldUseDesignFixtures() && shouldUseCatalogLiveData();
  const wizard = useAdminWizardStep(kcaRegistrationSteps.map((step) => step.title));
  const [values, setValues] = useState<Record<string, string>>({});
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const step = kcaRegistrationSteps[wizard.currentStep] ?? kcaRegistrationSteps[0];

  useEffect(() => {
    if (!live || step.id !== 'enrollment') return;
    const cohortId = values.cohort_id?.trim();
    if (!cohortId) {
      setValues((current) => (current.registration_number ? { ...current, registration_number: '' } : current));
      return;
    }
    let cancelled = false;
    void previewKcaRegistrationNumber(cohortId, CATALOG_GLOBAL_SCOPE)
      .then((registrationNumber) => {
        if (!cancelled) {
          setValues((current) => ({ ...current, registration_number: registrationNumber }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setValues((current) => ({ ...current, registration_number: '' }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [live, step.id, values.cohort_id]);

  function captureStepValues() {
    const card = document.querySelector('.kca-registration-form');
    const nextValues = { ...values };
    card?.querySelectorAll('input[name], select[name], textarea[name]').forEach((node) => {
      const el = node as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (!el.name) return;
      if (el.type === 'checkbox') {
        nextValues[el.name] = (el as HTMLInputElement).checked ? 'true' : '';
      } else {
        nextValues[el.name] = el.value;
      }
    });
    setValues(nextValues);
    return nextValues;
  }

  function buildActionPayload(payload: ReturnType<typeof flattenKcaRegistrationPayload>, finalize: boolean) {
    return {
      application_id: applicationId ?? payload.application_id ?? '',
      person_id: payload.person_id ?? '',
      given_name: payload.given_name ?? '',
      family_name: payload.family_name ?? '',
      email: payload.email ?? '',
      phone: payload.phone ?? '',
      create_login: finalize && payload.create_login ? 'true' : 'false',
      password: finalize && payload.create_login ? (payload.password ?? '') : '',
      password_confirmation: finalize && payload.create_login ? (payload.password_confirmation ?? '') : '',
      application_data_json: JSON.stringify(payload.application_data),
      finalize: finalize ? 'true' : 'false',
    };
  }

  function validateRegistrationPayload(
    payload: ReturnType<typeof flattenKcaRegistrationPayload>,
    finalize: boolean,
  ): string | null {
    if (!applicationId && !payload.application_id && !payload.person_id && (!payload.given_name || !payload.family_name)) {
      return 'Given name and family name are required for a new applicant.';
    }
    if (finalize && payload.create_login) {
      if (!payload.email) return 'Email is required when creating a student login account.';
      if (!payload.password || payload.password.length < 8) {
        return 'A password of at least 8 characters is required when creating a login account.';
      }
      if (payload.password !== payload.password_confirmation) {
        return 'Password confirmation does not match.';
      }
    }
    if (finalize && Object.keys(payload.application_data).length === 0) {
      return 'Complete the application fields before submitting.';
    }
    if (finalize && payload.admit_and_enroll) {
      if (!payload.cohort_id) return 'Cohort is required when admitting and enrolling.';
      if (!payload.starts_on) return 'Start date is required when admitting and enrolling.';
    }
    return null;
  }

  async function persistRegistration(finalize: boolean): Promise<boolean> {
    const merged = captureStepValues();
    if (!live) {
      setError('Connect to the platform to register KCA students.');
      return false;
    }
    const payload = flattenKcaRegistrationPayload({
      ...merged,
      application_id: applicationId ?? merged.application_id ?? '',
    });
    const validationError = validateRegistrationPayload(payload, finalize);
    if (validationError) {
      setError(validationError);
      return false;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await executeAdminAction({
        route: '/admin/kca/students/register',
        label: finalize ? 'Register KCA student' : 'Save KCA draft',
        payload: buildActionPayload(payload, finalize),
        scope: CATALOG_GLOBAL_SCOPE,
      });
      if (result.id) {
        setApplicationId(result.id);
        setValues((current) => ({ ...current, application_id: result.id ?? '' }));
      }
      if (!finalize) {
        setMessage(result.id ? `Draft saved (${result.id}). You can continue later.` : 'Draft saved.');
        return true;
      }
      if (payload.admit_and_enroll && result.id && payload.cohort_id && payload.starts_on) {
        const enrollment = await admitAndEnrollKcaStudent(result.id, {
          cohort_id: payload.cohort_id,
          registration_number: payload.registration_number ?? '',
          starts_on: payload.starts_on,
        });
        setMessage(
          enrollment.id
            ? `Application submitted and student enrolled (${enrollment.id}).`
            : 'Application submitted and student enrolled.',
        );
        return true;
      }
      setMessage(result.id ? `Application submitted (${result.id}). Review it in Applications.` : 'KCA application submitted.');
      return true;
    } catch (err) {
      setError(formatAdminMutationError(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submitRegistration(finalize: boolean) {
    await persistRegistration(finalize);
  }

  async function saveDraft() {
    await persistRegistration(false);
  }

  async function saveAndContinue() {
    if (live) {
      const saved = await persistRegistration(false);
      if (!saved) return;
    } else {
      captureStepValues();
    }
    wizard.goToStep(wizard.currentStep + 1);
  }

  return (
    <div className="kca-flow-layout" data-admin-wizard="true">
      <RegistrationStepRail currentIndex={wizard.currentStep} />
      <article className="card kca-form-card kca-registration-form">
        <header>
          <div>
            <span className="kca-overline">KCA student registration</span>
            <h2>{step.title}</h2>
            <p>{step.subtitle}</p>
          </div>
          <KcaBadge value={`Step ${wizard.currentStep + 1} of ${kcaRegistrationSteps.length}`} />
        </header>
        <AdminFormFields fields={step.fields} values={values} />
        {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
        {message ? <p className="maps-settings-lead" role="status">{message}</p> : null}
        <footer className="form-footer">
          {!wizard.isFirst ? (
            <button type="button" className="ghost-button" data-interaction-native="true" onClick={() => wizard.goToStep(wizard.currentStep - 1)}>
              Back
            </button>
          ) : (
            <Link className="ghost-button" href="/admin/kca/students">Cancel</Link>
          )}
          <div>
            <button className="ghost-button" type="button" disabled={busy} onClick={() => void saveDraft()}>
              Save draft
            </button>
            {wizard.isLast ? (
              <button className="primary-button" type="button" data-interaction-native="true" disabled={busy} onClick={() => void submitRegistration(true)}>
                {busy ? 'Submitting…' : 'Submit application'}
              </button>
            ) : (
              <button
                className="primary-button"
                type="button"
                data-interaction-native="true"
                disabled={busy}
                onClick={() => void saveAndContinue()}
              >
                {busy ? 'Saving…' : 'Save & continue'}
              </button>
            )}
          </div>
        </footer>
        <p className="maps-settings-lead">
          <Link href="/admin/kca/applications">View submitted applications</Link>
          {' · '}
          <Link href="/admin/kca/students">Back to students</Link>
        </p>
      </article>
    </div>
  );
}

function KcaAttendance({ screen }: { screen: AdminScreen }) {
  const live = !shouldUseDesignFixtures() && shouldUseCatalogLiveData();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState(live ? 'Loading attendance…' : '');
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!live) return;
    setError(null);
    try {
      const result = await listCatalogDomain('kca.attendance', { perPage: 50 });
      stashAdminRecords(result.items as Array<Record<string, unknown>>);
      const mapped = catalogRecordsToRows(result.items as Record<string, unknown>[], ['Name', 'Lesson', 'Session', 'Status']) as Row[];
      setRows(mapped);
      setTotal(result.pagination.total);
      const present = result.items.filter((item) => String((item as { status?: string }).status) === 'present').length;
      const absent = result.items.filter((item) => String((item as { status?: string }).status) === 'absent').length;
      const excused = result.items.filter((item) => String((item as { status?: string }).status) === 'excused').length;
      setMessage(`${result.pagination.total} sessions · this page: ${present} present, ${absent} absent, ${excused} excused`);
    } catch (err) {
      setRows([]);
      setError(catalogErrorMessage(err, 'Unable to load attendance.'));
    }
  }

  useEffect(() => {
    void load();
  }, [live]);

  async function onRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await executeAdminAction({
        route: screen.route,
        label: 'Record attendance',
        payload: {
          kca_enrollment_id: String(form.get('kca_enrollment_id') ?? ''),
          kca_lesson_id: String(form.get('kca_lesson_id') ?? ''),
          status: String(form.get('status') ?? 'present'),
          session_on: String(form.get('session_on') ?? ''),
        },
        scope: CATALOG_GLOBAL_SCOPE,
      });
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record attendance.');
    } finally {
      setBusy(false);
    }
  }

  const metrics = live
    ? []
    : (screen.metrics ?? []);

  return (
    <div className="kca-attendance">
      {metrics.length ? <KcaMetrics metrics={metrics} /> : null}
      {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
      {live ? <p className="maps-settings-lead" role="status">{message}</p> : null}
      <form className="card settings-card" onSubmit={(event) => void onRecord(event)}>
        <header className="kca-form-card-header">
          <div>
            <span className="kca-overline">Lesson attendance</span>
            <h2 className="card-title">Record attendance</h2>
            <p className="maps-settings-lead">Select an enrolled KCA student, the lesson taught, and the session date.</p>
          </div>
        </header>
        <div className="form-grid">
          <label><span>Student *</span><EntitySearchSelect name="kca_enrollment_id" catalog="kcaEnrollment" required placeholder="Search student by name" /></label>
          <label><span>Lesson *</span><EntitySearchSelect name="kca_lesson_id" catalog="kcaLesson" required placeholder="Search lesson by name" /></label>
          <label><span>Session date *</span><input name="session_on" type="date" required /></label>
          <label>
            <span>Status *</span>
            <select name="status" defaultValue="present">
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="excused">Excused</option>
            </select>
          </label>
        </div>
        <div className="form-footer">
          <button className="primary-button" disabled={busy} type="submit">{busy ? 'Saving…' : 'Record attendance'}</button>
        </div>
      </form>
      <article className="card kca-table-card">
        <table className="kca-table" aria-label="Attendance sessions">
          <thead><tr><th>Student</th><th>Lesson</th><th>Session</th><th>Status</th></tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4}>{live ? 'No attendance recorded yet.' : 'Design fixtures are disabled for attendance.'}</td></tr>
            ) : rows.map((row, index) => (
              <tr key={`${row.__id ?? index}`}>
                <td>{row.Name ?? '—'}</td>
                <td>{row.Lesson ?? '—'}</td>
                <td>{row.Session ?? '—'}</td>
                <td><KcaBadge value={row.Status ?? '—'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {total ? <p className="maps-settings-lead">Total {total}</p> : null}
      </article>
    </div>
  );
}

function KcaCertificate({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const details = screen.details ?? {};
  return <div className="kca-document-layout"><article className="card kca-certificate"><div className="kca-certificate-border"><div className="kca-seal large">{t('member.kca', { defaultMessage: 'KCA' })}</div><span>{t('member.kca.academyName', { defaultMessage: 'KINGDOM CITIZENS ACADEMY' })}</span><h1 aria-level={2}>{t('member.kca.certificateOfCompletion', { defaultMessage: 'Certificate of Completion' })}</h1><p>{t('member.kca.certifyThat', { defaultMessage: 'This is to certify that' })}</p><h2>{details.Student}</h2><p>{t('member.kca.completedRequirementsFor', { defaultMessage: 'has successfully completed all the requirements for' })}</p><h3>{details.Year}</h3><small>{t('member.kca.issuedOn', { defaultMessage: 'Issued on {date}', vars: { date: details['Issue Date'] ?? '' } })}</small><div className="kca-certificate-signatures"><span><b>Pastor Daniel David</b>{t('member.kca.academyDirector', { defaultMessage: 'Academy Director' })}</span><span className="kca-qr" aria-label={t('member.kca.certificateQrAria', { defaultMessage: 'Certificate verification QR code' })}>▦</span><span><b>Mary Okoro</b>{t('member.kca.registrar', { defaultMessage: 'Registrar' })}</span></div></div></article><aside className="card kca-document-meta"><h2>{t('member.kca.certificateDetails', { defaultMessage: 'Certificate Details' })}</h2><dl>{Object.entries(details).map(([key,value]) => <div key={key}><dt>{key}</dt><dd>{key === 'Status' ? <KcaBadge value={value}/> : value}</dd></div>)}</dl><button className="primary-button" type="button">{translateAction(t, screen.action)}</button></aside></div>;
}

function lessonFormValuesFromRecord(record: Record<string, unknown>): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === null || value === undefined || value === '') continue;
    values[key] = String(value);
  }
  if (values.module_id && !values.kca_module_id) values.kca_module_id = values.module_id;
  return values;
}

function nextLessonFormDefaults(lessons: Array<Record<string, unknown>>): Record<string, string> {
  let maxSequence = 0;
  let maxCodeNumber = 0;
  for (const lesson of lessons) {
    const sequence = Number(lesson.sequence ?? 0);
    if (Number.isFinite(sequence) && sequence > maxSequence) {
      maxSequence = sequence;
    }
    const codeMatch = String(lesson.code ?? '').match(/(\d+)\s*$/);
    if (codeMatch) {
      const codeNumber = Number(codeMatch[1]);
      if (Number.isFinite(codeNumber) && codeNumber > maxCodeNumber) {
        maxCodeNumber = codeNumber;
      }
    }
  }
  const nextSequence = maxSequence + 1;
  const nextCodeNumber = maxCodeNumber > 0 ? maxCodeNumber + 1 : nextSequence;
  return {
    sequence: String(nextSequence),
    code: `L${String(nextCodeNumber).padStart(2, '0')}`,
  };
}

function KcaLessonForm({
  moduleId,
  moduleTitle,
  lessonId,
  initialValues = {},
  onCancel,
  onSaved,
}: {
  moduleId: string;
  moduleTitle: string;
  lessonId?: string;
  initialValues?: Record<string, string>;
  onCancel?: () => void;
  onSaved?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(lessonId);
  const lessonFields = fieldsForEntity('kca_lesson').filter((field) => field.name !== 'kca_module_id');

  return (
    <form
      className="card form-card kca-add-lesson-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy(true);
        setError(null);
        const payload = {
          kca_module_id: moduleId,
          code: String(form.get('code') ?? ''),
          title: String(form.get('title') ?? ''),
          sequence: String(form.get('sequence') ?? '1'),
          day_index: String(form.get('day_index') ?? ''),
          lesson_type: String(form.get('lesson_type') ?? 'text'),
          summary: String(form.get('summary') ?? ''),
          body: String(form.get('body') ?? ''),
          content_url: String(form.get('content_url') ?? ''),
        };
        void executeAdminAction({
          route: isEdit ? '/admin/kca/lessons' : `/admin/kca/modules/${moduleId}`,
          label: isEdit ? 'Save lesson changes' : 'Add lesson',
          recordId: isEdit ? lessonId : moduleId,
          payload,
          scope: CATALOG_GLOBAL_SCOPE,
        })
          .then(() => {
            onSaved?.();
          })
          .catch((err) => setError(formatAdminMutationError(err)))
          .finally(() => setBusy(false));
      }}
    >
      <header className="kca-add-lesson-header">
        <div>
          <h2 className="section-title">{isEdit ? 'Edit lesson' : 'Add lesson'}</h2>
          <p className="field-help">Module: <strong>{moduleTitle}</strong></p>
        </div>
        {onCancel ? <button type="button" className="ghost-button" data-interaction-native="true" onClick={onCancel}>Close</button> : null}
      </header>
      {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
      <AdminFormFields fields={lessonFields} values={initialValues} className="form-grid" />
      <footer className="form-footer">
        {onCancel ? <button type="button" className="ghost-button" data-interaction-native="true" onClick={onCancel}>Cancel</button> : null}
        <button className="primary-button" type="submit" disabled={busy} data-interaction-native="true">
          {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Save lesson'}
        </button>
      </footer>
    </form>
  );
}

function KcaModuleLessonsManager({
  moduleId,
  moduleTitle,
  onClose,
}: {
  moduleId: string;
  moduleTitle: string;
  onClose: () => void;
}) {
  const [lessons, setLessons] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Record<string, unknown> | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listCatalogDomain('kca.lessons', { perPage: 100, scope: CATALOG_GLOBAL_SCOPE });
      stashAdminRecords(result.items as Array<Record<string, unknown>>);
      const filtered = (result.items as Array<Record<string, unknown>>).filter(
        (item) => String(item.module_id ?? '') === moduleId,
      );
      setLessons(filtered);
    } catch (err) {
      setLessons([]);
      setError(formatAdminMutationError(err));
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="kca-module-lessons-manager">
      <article className="card">
        <header className="kca-add-lesson-header">
          <div>
            <h2 className="section-title">Lessons for {moduleTitle}</h2>
            <p className="field-help">Add new lessons or edit saved lesson content, sequence, and day mapping.</p>
          </div>
          <button type="button" className="ghost-button" data-interaction-native="true" onClick={onClose}>Close</button>
        </header>
        {loading ? <p className="maps-settings-lead">Loading lessons…</p> : null}
        {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
        {!loading && lessons.length === 0 ? (
          <p className="maps-settings-lead">No lessons saved for this module yet.</p>
        ) : null}
        {!loading && lessons.length > 0 ? (
          <table className="kca-table" aria-label="Module lessons">
            <thead>
              <tr>
                <th>Lesson</th>
                <th>Code</th>
                <th>Sequence</th>
                <th>Day</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lessons.map((lesson) => {
                const id = String(lesson.id ?? '');
                const title = String(lesson.title ?? 'Lesson');
                return (
                  <tr key={id}>
                    <td><strong>{title}</strong></td>
                    <td>{String(lesson.code ?? '—')}</td>
                    <td>{String(lesson.sequence ?? '—')}</td>
                    <td>{String(lesson.day_index ?? '—')}</td>
                    <td>
                      <button
                        type="button"
                        className="table-action"
                        data-interaction-native="true"
                        onClick={() => {
                          setShowAddForm(false);
                          setEditingLesson(lesson);
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
        <footer className="form-footer">
          <button
            type="button"
            className="ghost-button"
            data-interaction-native="true"
            onClick={() => {
              setEditingLesson(null);
              setShowAddForm((value) => !value);
            }}
          >
            {showAddForm ? 'Hide add form' : '+ Add lesson'}
          </button>
        </footer>
      </article>
      {editingLesson ? (
        <KcaLessonForm
          moduleId={moduleId}
          moduleTitle={moduleTitle}
          lessonId={String(editingLesson.id ?? '')}
          initialValues={lessonFormValuesFromRecord(editingLesson)}
          onCancel={() => setEditingLesson(null)}
          onSaved={() => {
            setEditingLesson(null);
            void refresh();
          }}
        />
      ) : null}
      {showAddForm && !editingLesson ? (
        <KcaLessonForm
          key={`add-lesson-${lessons.length}-${lessons.map((lesson) => String(lesson.id ?? '')).join('-')}`}
          moduleId={moduleId}
          moduleTitle={moduleTitle}
          initialValues={nextLessonFormDefaults(lessons)}
          onCancel={() => setShowAddForm(false)}
          onSaved={() => {
            setShowAddForm(false);
            void refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function KcaLessonsPanel({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const columns = screen.columns ?? [];
  const columnKey = columns.join('\0');
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState(t('common.loadingCatalog', { defaultMessage: 'Loading catalog…' }));
  const [error, setError] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Record<string, unknown> | null>(null);
  const entityKey = resolveEntityKey(screen.route, screen.id);

  const refresh = useCallback(async () => {
    setError(null);
    setMessage(t('common.loadingCatalog', { defaultMessage: 'Loading catalog…' }));
    try {
      const mappedColumns = columnKey ? columnKey.split('\0') : [];
      const result = await listCatalogDomain('kca.lessons', { perPage: 100, scope: CATALOG_GLOBAL_SCOPE });
      stashAdminRecords(result.items as Array<Record<string, unknown>>);
      setRows(catalogRecordsToRows(result.items as Record<string, unknown>[], mappedColumns) as Row[]);
      setTotal(result.pagination.total);
      setMessage(
        result.pagination.total === 0
          ? t('errors.noCatalogRecords', { defaultMessage: 'No catalog records in this scope.' })
          : t('common.showingOfRecords', { defaultMessage: 'Showing {visible} of {total} records', vars: { visible: result.items.length, total: result.pagination.total } }),
      );
    } catch (err) {
      setRows([]);
      setError(catalogErrorMessage(err, t('errors.unableToLoadDomainCatalog', { defaultMessage: 'Unable to load domain catalog.' })));
      setMessage(t('errors.liveCatalogUnavailable', { defaultMessage: 'Live catalog unavailable' }));
    }
  }, [columnKey, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const titleColumn = columns[0] ?? 'Lesson';

  return (
    <div className="kca-managed-table kca-lessons-panel">
      <p className="maps-settings-lead" role="status">{error ?? message}</p>
      {editingLesson ? (
        <KcaLessonForm
          moduleId={String(editingLesson.module_id ?? editingLesson.kca_module_id ?? '')}
          moduleTitle={String(editingLesson.module_title ?? 'Module')}
          lessonId={String(editingLesson.id ?? '')}
          initialValues={lessonFormValuesFromRecord(editingLesson)}
          onCancel={() => setEditingLesson(null)}
          onSaved={() => {
            setEditingLesson(null);
            void refresh();
          }}
        />
      ) : null}
      <KcaTable
        screen={screen}
        rows={rows}
        columns={columns}
        total={total || rows.length}
        renderActions={(row) => {
          const record = formatRowActionRecord(row[titleColumn], row.__id);
          const lessonId = String(row.__id ?? extractUlid(record) ?? '');
          return (
            <div className="row-actions kca-row-actions">
              <button
                type="button"
                className="table-action"
                data-interaction-native="true"
                onClick={() => {
                  const cached = getAdminRecordDetails(lessonId);
                  setEditingLesson({
                    id: lessonId,
                    module_id: cached?.module_id ?? cached?.kca_module_id,
                    module_title: cached?.module_title ?? cached?.kca_module_id_label,
                    code: cached?.code ?? row[columns[1] ?? 'Code'],
                    title: cached?.title ?? row[titleColumn],
                    sequence: cached?.sequence,
                    day_index: cached?.day_index,
                    lesson_type: cached?.lesson_type ?? row.Type,
                    summary: cached?.summary,
                    body: cached?.body,
                    content_url: cached?.content_url,
                  });
                }}
              >
                {t('common.edit', { defaultMessage: 'Edit' })}
              </button>
              <TableRowActions
                record={record}
                entityKey={entityKey}
                canEdit={false}
                canDelete={false}
                reviewLabel={undefined}
                className="row-actions kca-row-actions"
              />
            </div>
          );
        }}
      />
    </div>
  );
}

async function runKcaModuleAction(moduleId: string, label: string): Promise<void> {
  await executeAdminAction({
    route: `/admin/kca/modules/${moduleId}`,
    label,
    recordId: moduleId,
    payload: { kca_module_id: moduleId, module_id: moduleId },
    scope: CATALOG_GLOBAL_SCOPE,
  });
}

function KcaModuleRowActions({
  row,
  titleColumn,
  entityKey,
  onAddLesson,
  onManageLessons,
  onActionComplete,
}: {
  row: Row;
  titleColumn: string;
  entityKey?: string;
  onAddLesson: (row: Row) => void;
  onManageLessons: (row: Row) => void;
  onActionComplete: () => void;
}) {
  const { t } = useLocale();
  const record = formatRowActionRecord(row[titleColumn], row.__id);
  const moduleId = String(row.__id ?? extractUlid(record) ?? '');
  const status = String(row.Status ?? '').toLowerCase();
  const isPublished = status.includes('publish');
  const shared = { 'data-record': record, ...(entityKey ? { 'data-entity': entityKey } : {}) };

  return (
    <div className="row-actions kca-row-actions kca-module-row-actions">
      <button type="button" className="table-action" data-interaction-native="true" onClick={() => onManageLessons(row)}>
        {t('member.kca.manageLessons', { defaultMessage: 'Manage lessons' })}
      </button>
      <button type="button" className="table-action" data-interaction-native="true" onClick={() => onAddLesson(row)}>
        {t('member.kca.addLesson', { defaultMessage: 'Add lesson' })}
      </button>
      <button
        type="button"
        className="table-action"
        data-interaction-native="true"
        onClick={() => {
          void runKcaModuleAction(moduleId, 'Map learning days')
            .then(() => onActionComplete())
            .catch((err) => window.alert(formatAdminMutationError(err)));
        }}
      >
        {t('member.kca.mapDays', { defaultMessage: 'Map days' })}
      </button>
      {!isPublished ? (
        <button
          type="button"
          className="table-action"
          data-interaction-native="true"
          onClick={() => {
            if (!window.confirm('Publish this module? Lessons must be mapped to learning days first.')) return;
            void runKcaModuleAction(moduleId, 'Publish module')
              .then(() => onActionComplete())
              .catch((err) => window.alert(formatAdminMutationError(err)));
          }}
        >
          {t('member.kca.publish', { defaultMessage: 'Publish' })}
        </button>
      ) : null}
      <button type="button" className="table-action" data-admin-action="edit" {...shared}>
        {t('common.edit', { defaultMessage: 'Edit' })}
      </button>
    </div>
  );
}

function KcaModulesPanel({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const columns = screen.columns ?? [];
  const columnKey = columns.join('\0');
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState(t('common.loadingCatalog', { defaultMessage: 'Loading catalog…' }));
  const [error, setError] = useState<string | null>(null);
  const [lessonTarget, setLessonTarget] = useState<{ id: string; title: string } | null>(null);
  const [lessonsTarget, setLessonsTarget] = useState<{ id: string; title: string } | null>(null);
  const entityKey = resolveEntityKey(screen.route, screen.id);

  const refresh = useCallback(async () => {
    setError(null);
    setMessage(t('common.loadingCatalog', { defaultMessage: 'Loading catalog…' }));
    try {
      const mappedColumns = columnKey ? columnKey.split('\0') : [];
      const result = await listCatalogDomain('kca.modules', { perPage: 50, scope: CATALOG_GLOBAL_SCOPE });
      stashAdminRecords(result.items as Array<Record<string, unknown>>);
      setRows(catalogRecordsToRows(result.items as Record<string, unknown>[], mappedColumns) as Row[]);
      setTotal(result.pagination.total);
      setMessage(
        result.pagination.total === 0
          ? t('errors.noCatalogRecords', { defaultMessage: 'No catalog records in this scope.' })
          : t('common.showingOfRecords', { defaultMessage: 'Showing {visible} of {total} records', vars: { visible: result.items.length, total: result.pagination.total } }),
      );
    } catch (err) {
      setRows([]);
      setError(catalogErrorMessage(err, t('errors.unableToLoadDomainCatalog', { defaultMessage: 'Unable to load domain catalog.' })));
      setMessage(t('errors.liveCatalogUnavailable', { defaultMessage: 'Live catalog unavailable' }));
    }
  }, [columnKey, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const titleColumn = columns[0] ?? 'Title';

  return (
    <div className="kca-managed-table kca-modules-panel">
      <div className="kca-modules-toolbar">
        <p className="maps-settings-lead" role="status">{error ?? message}</p>
        <Link className="primary-button link-button" href="/admin/kca/modules/new">+ Create Module</Link>
      </div>
      {lessonsTarget ? (
        <KcaModuleLessonsManager
          moduleId={lessonsTarget.id}
          moduleTitle={lessonsTarget.title}
          onClose={() => setLessonsTarget(null)}
        />
      ) : null}
      {lessonTarget ? (
        <KcaLessonForm
          moduleId={lessonTarget.id}
          moduleTitle={lessonTarget.title}
          onCancel={() => setLessonTarget(null)}
          onSaved={() => {
            setLessonTarget(null);
            void refresh();
          }}
        />
      ) : null}
      <KcaTable
        screen={screen}
        rows={rows}
        columns={columns}
        total={total || rows.length}
        renderActions={(row) => (
          <KcaModuleRowActions
            row={row}
            titleColumn={titleColumn}
            entityKey={entityKey}
            onAddLesson={(target) => {
              const id = String(target.__id ?? '');
              if (!id) return;
              setLessonsTarget(null);
              setLessonTarget({ id, title: String(target[titleColumn] ?? 'Module') });
            }}
            onManageLessons={(target) => {
              const id = String(target.__id ?? '');
              if (!id) return;
              setLessonTarget(null);
              setLessonsTarget({ id, title: String(target[titleColumn] ?? 'Module') });
            }}
            onActionComplete={() => void refresh()}
          />
        )}
      />
    </div>
  );
}

function KcaManagedTable({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const columns = screen.columns ?? [];
  const columnKey = columns.join('\0');
  const dataset = resolveCatalogDataset(screen);
  const live = !shouldUseDesignFixtures() && shouldUseCatalogLiveData() && dataset !== null;
  const [rows, setRows] = useState<Row[]>(live ? [] : (screen.rows ?? []));
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState(live ? t('common.loadingCatalog', { defaultMessage: 'Loading catalog…' }) : '');
  const [error, setError] = useState<string | null>(null);
  const reviewLabel = dataset === 'kca.applications' ? 'Review' : undefined;

  useEffect(() => {
    if (!live || !dataset) return;
    const mappedColumns = columnKey ? columnKey.split('\0') : [];
    let cancelled = false;
    void (async () => {
      setError(null);
      setMessage(t('common.loadingCatalog', { defaultMessage: 'Loading catalog…' }));
      try {
        const result = await listCatalogDomain(dataset, { perPage: 25 });
        if (cancelled) return;
        stashAdminRecords(result.items as Array<Record<string, unknown>>);
        setRows(catalogRecordsToRows(result.items as Record<string, unknown>[], mappedColumns) as Row[]);
        setTotal(result.pagination.total);
        setMessage(
          result.pagination.total === 0
            ? t('errors.noCatalogRecords', { defaultMessage: 'No catalog records in this scope.' })
            : t('common.showingOfRecords', { defaultMessage: 'Showing {visible} of {total} records', vars: { visible: result.items.length, total: result.pagination.total } }),
        );
      } catch (err) {
        if (cancelled) return;
        setRows([]);
        setError(catalogErrorMessage(err, t('errors.unableToLoadDomainCatalog', { defaultMessage: 'Unable to load domain catalog.' })));
        setMessage(t('errors.liveCatalogUnavailable', { defaultMessage: 'Live catalog unavailable' }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [columnKey, dataset, live, t]);

  if (!shouldUseDesignFixtures() && !live) {
    return (
      <div className="kca-managed-table">
        <p className="maps-settings-lead" role="status">
          {t('errors.noLiveListApiWired', { defaultMessage: 'No live list API is wired for this screen. Design fixtures are disabled.' })}
        </p>
        <article className="card kca-table-card">
          <p>{t('errors.liveDataUnavailableForRoute', { defaultMessage: 'Live data unavailable for this route.' })}</p>
        </article>
      </div>
    );
  }

  return (
    <div className="kca-managed-table">
      {screen.metrics && !live ? <KcaMetrics metrics={screen.metrics} /> : null}
      {live && screen.id === 'H-01' ? (
        <div className="kca-students-toolbar">
          <KcaMetrics
            metrics={[
              { label: 'Enrolled', value: String(total || rows.length) },
              { label: 'On this page', value: String(rows.length) },
            ]}
          />
          <Link className="primary-button link-button" href="/admin/kca/students/register">+ Register KCA student</Link>
        </div>
      ) : null}
      {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
      {live && !error ? <p className="maps-settings-lead" role="status">{message}</p> : null}
      <KcaTable screen={screen} rows={rows} reviewLabel={reviewLabel} total={total || rows.length} />
    </div>
  );
}

export function KcaScreenContent({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  if (!shouldUseDesignFixtures() && screen.route === '/admin/kca/orientation/create') {
    return <KcaOrientationCreateForm screen={screen} />;
  }
  if (!shouldUseDesignFixtures() && /^\/admin\/kca\/orientation\/[0-7][0-9A-HJKMNP-TV-Z]{25}$/i.test(screen.route)) {
    return <KcaOrientationDetailPanel screen={screen} />;
  }
  if (!shouldUseDesignFixtures() && /^\/admin\/kca\/applications\/[0-7][0-9A-HJKMNP-TV-Z]{25}\/admission-letter$/i.test(screen.route)) {
    return <KcaLetter screen={screen} />;
  }

  switch (screen.id) {
    case 'G-01': return <KcaDashboard screen={screen} requestedScope={requestedScope} />;
    case 'G-03': return <KcaApplicantOverview screen={screen}/>;
    case 'G-04': case 'G-05': case 'G-06': case 'G-07': case 'G-08': case 'G-09': return <KcaApplicationForm screen={screen}/>;
    case 'G-10': return <KcaLeadershipRecommendationAdmin screen={screen}/>;
    case 'G-12': return <KcaDecision screen={screen}/>;
    case 'G-13': case 'G-14': case 'G-15': case 'G-18': return <KcaOutcome screen={screen}/>;
    case 'G-16': return <KcaLetter screen={screen}/>;
    case 'G-17': return <KcaOrientation screen={screen}/>;
    case 'H-01': return <KcaManagedTable screen={screen} />;
    case 'H-01b': return <KcaStudentRegistration screen={screen} />;
    case 'H-02': case 'H-06': case 'H-08': return <KcaEntityDetail screen={screen}/>;
    case 'H-03':
    case 'H-04':
      return <KcaManagedTable screen={screen} />;
    case 'H-09': return <KcaModulesPanel screen={screen} />;
    case 'H-10': return <KcaModuleBuilder screen={screen}/>;
    case 'H-11': return <KcaPrerequisites screen={screen}/>;
    case 'H-12': return <KcaLessonsPanel screen={screen} />;
    case 'H-13': return <KcaAttendance screen={screen}/>;
    case 'H-17': return <KcaAssessment screen={screen} />;
    case 'H-19': return <KcaCertificate screen={screen}/>;
    case 'H-20': return <KcaAlumni screen={screen} />;
    default: return <KcaManagedTable screen={screen}/>;
  }
}
