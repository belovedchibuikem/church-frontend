'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

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
import { shouldUseDesignFixtures } from '../lib/admin-identity-api';
import { stashAdminRecords } from '../lib/admin-record-cache';
import { executeAdminAction, extractUlid } from '../lib/admin-mutation-dispatcher';
import { AdminFormFields } from './admin-form-fields';
import { AdminWizardFooter, AdminWizardStepper } from './admin-wizard-chrome';
import { useAdminWizardStep } from '../lib/use-admin-wizard-step';
import { fieldsForEntity, normalizeDetailValues, resolveEntityKey } from '../lib/admin-form-schemas';
import { TableRowActions } from './table-row-actions';
import {
  breakdownToItems,
  dashboardModuleForScreen,
} from '../lib/admin-dashboard-api';
import { useAdminDashboard } from '../lib/use-admin-dashboard';

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

function KcaTable({ screen, rows = screen.rows ?? [], columns = screen.columns ?? [], showAction = true, filterLabels, toolbarAction, reviewLabel, total }: { screen: AdminScreen; rows?: Row[]; columns?: string[]; showAction?: boolean; filterLabels?: string[]; toolbarAction?: string; reviewLabel?: string; total?: number }) {
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
          {showAction && <td><TableRowActions record={`${row[columns[0]] ?? ''} ${row.__id ?? ''}`.trim()} entityKey={entityKey} className="row-actions kca-row-actions" reviewLabel={reviewLabel} /></td>}
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

function KcaLineChart({ title }: { title?: string }) {
  const { t } = useLocale();
  const resolvedTitle = title ?? t('member.kca.applicationTrend', { defaultMessage: 'Application Trend (Last 6 Months)' });
  const months = [
    { key: 'member.kca.monthDec', label: 'Dec' },
    { key: 'member.kca.monthJan', label: 'Jan' },
    { key: 'member.kca.monthFeb', label: 'Feb' },
    { key: 'member.kca.monthMar', label: 'Mar' },
    { key: 'member.kca.monthApr', label: 'Apr' },
    { key: 'member.kca.monthMay', label: 'May' },
    { key: 'member.kca.monthJun', label: 'Jun' },
  ];
  return <article className="card kca-chart-card">
    <header><h2>{resolvedTitle}</h2><button type="button">{t('member.kca.thisYear', { defaultMessage: 'This Year' })}⌄</button></header>
    <div className="kca-line-chart">
      <span className="axis y-one">900</span><span className="axis y-two">600</span><span className="axis y-three">300</span>
      <svg viewBox="0 0 620 190" role="img" aria-label={t('member.kca.trendAria', { defaultMessage: '{title}: values trend upward from December through June', vars: { title: resolvedTitle } })}><defs><linearGradient id="kca-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#6d35d9" stopOpacity=".24"/><stop offset="1" stopColor="#6d35d9" stopOpacity="0"/></linearGradient></defs><path className="area" d="M20 157 L112 116 L205 75 L298 103 L391 56 L484 48 L600 25 L600 180 L20 180 Z"/><path className="line" d="M20 157 L112 116 L205 75 L298 103 L391 56 L484 48 L600 25"/>{[[20,157],[112,116],[205,75],[298,103],[391,56],[484,48],[600,25]].map(([cx,cy]) => <circle cx={cx} cy={cy} r="5" key={`${cx}-${cy}`}/>)}</svg>
      <div className="kca-chart-labels">{months.map(item => <span key={item.label}>{t(item.key, { defaultMessage: item.label })}</span>)}</div>
    </div>
  </article>;
}

function KcaDashboard({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  const { t } = useLocale();
  const dashboard = useAdminDashboard(dashboardModuleForScreen(screen.id), requestedScope);
  const metrics = dashboard.live ? dashboard.metrics : screen.metrics;
  const statusItems = dashboard.live ? breakdownToItems(dashboard.data?.breakdown) : (screen.items ?? []);
  const recentRows = dashboard.live ? (dashboard.data?.recent_rows ?? []) : (screen.rows ?? []);
  const donut = dashboard.data?.donut;

  return <div className="kca-dashboard">
    {dashboard.loading ? <p className="maps-settings-lead" role="status">Loading live dashboard data…</p> : null}
    {dashboard.error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{dashboard.error}</p> : null}
    <KcaMetrics metrics={metrics} />
    <div className="kca-dashboard-main">
      <KcaLineChart />
      <article className="card kca-status-card"><header><h2>{t('member.kca.byStatus', { defaultMessage: 'By Status' })}</h2><button type="button" aria-label={t('member.kca.statusChartOptions', { defaultMessage: 'Application status chart options' })}>•••</button></header><div className="kca-status-visual"><KcaDonut value={donut?.value ?? '2,458'} label={donut?.label ?? t('member.kca.applications', { defaultMessage: 'Applications' })}/><ul>{statusItems.slice(0, 5).map((item, index) => { const [label, value] = item.split(' — '); return <li key={item}><i aria-hidden="true" className={`tone-${index + 1}`}/><span>{label}</span><strong>{value}</strong></li>; })}</ul></div></article>
    </div>
    <div className="kca-dashboard-bottom">
      <article className="card kca-recent"><header><h2>{t('member.kca.recentApplications', { defaultMessage: 'Recent Applications' })}</h2><Link href="/admin/kca/applications">{t('member.kca.viewAll', { defaultMessage: 'View all' })}</Link></header>{recentRows.map((row, index) => <div className="kca-recent-row" key={`${row.Applicant}-${index}`}><span className="kca-mini-avatar">{row.Applicant?.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><div><strong>{row.Applicant}</strong><small>{row.Church}</small></div><time>{row.Submitted}</time><KcaBadge value={row.Status}/></div>)}</article>
      <article className="card kca-quick-actions"><h2>{t('member.kca.quickActions', { defaultMessage: 'Quick Actions' })}</h2>{[
        { key: 'member.kca.viewReviewQueue', label: 'View Review Queue' },
        { key: 'member.kca.createOrientationBatch', label: 'Create Orientation Batch' },
        { key: 'member.kca.generateReports', label: 'Generate Reports' },
        { key: 'member.kca.admissionSettings', label: 'Admission Settings' },
      ].map((item, index) => <button type="button" key={item.key}><span>{['▣', '◇', '▤', '⚙'][index]}</span>{t(item.key, { defaultMessage: item.label })}</button>)}</article>
    </div>
  </div>;
}

function KcaApplicantOverview({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
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

  async function submitDecision(status: string, label: string) {
    if (!applicationId) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await executeAdminAction({
        route: screen.route,
        label,
        payload: { status, reason_code: notes.trim() || `${status}_by_admin`, notes },
        recordId: applicationId,
        scope: CATALOG_GLOBAL_SCOPE,
      });
      setMessage(`Decision recorded: ${status.replaceAll('_', ' ')}.`);
      const result = await listCatalogDomain('kca.applications', { perPage: 100, scope: CATALOG_GLOBAL_SCOPE });
      setApplication((result.items.find((item) => String(item.id) === applicationId) as Record<string, unknown>) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decision submission failed.');
    } finally {
      setBusy(false);
    }
  }

  if (live && applicationId) {
    const personName = String(application?.person_name ?? 'Applicant');
    const initials = personName.split(' ').map((part) => part[0]).slice(0, 2).join('') || '?';
    const status = String(application?.status ?? 'received');
    return (
      <div className="kca-decision-layout">
        <aside className="card kca-review-summary">
          <div className="kca-avatar">{initials}</div>
          <h2>{personName}</h2>
          <small>{applicationId}</small>
          <p><KcaBadge value={status} /></p>
          <p>{application?.received_at ? `Received ${String(application.received_at)}` : null}</p>
        </aside>
        <article className="card kca-decision-card">
          <span className="kca-overline">{t('member.kca.finalReview', { defaultMessage: 'Final review' })}</span>
          <h2>{t('member.kca.selectAdmissionDecision', { defaultMessage: 'Select an admission decision' })}</h2>
          <p>{t('member.kca.decisionCopy', { defaultMessage: 'Choose the appropriate outcome for {name} after reviewing all application sections.', vars: { name: personName } })}</p>
          {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
          {message ? <p className="maps-settings-lead" role="status">{message}</p> : null}
          <div className="kca-decision-options">
            <button className="accept" type="button" data-interaction-native="true" disabled={busy} onClick={() => void submitDecision('provisionally_accepted', 'Provisionally Accept')}>
              <span>✓</span><strong>{t('member.kca.provisionallyAccept', { defaultMessage: 'Provisionally Accept' })}</strong>
            </button>
            <button className="defer" type="button" data-interaction-native="true" disabled={busy} onClick={() => void submitDecision('deferred', 'Defer')}>
              <span>◷</span><strong>{t('member.kca.defer', { defaultMessage: 'Defer' })}</strong>
            </button>
            <button className="reject" type="button" data-interaction-native="true" disabled={busy} onClick={() => void submitDecision('not_accepted', 'Not Accepted')}>
              <span>×</span><strong>{t('member.kca.notAccepted', { defaultMessage: 'Not Accepted' })}</strong>
            </button>
          </div>
          <label><span>{t('member.kca.admissionNotesOptional', { defaultMessage: 'Admission Notes (Optional)' })}</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={t('member.kca.privateNotesPlaceholder', { defaultMessage: 'Write your private notes here...' })} /></label>
          <footer><Link className="ghost-button" href="/admin/kca/applications">{t('common.back', { defaultMessage: 'Back' })}</Link></footer>
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
  const details = screen.details ?? {};
  return <div className="kca-document-layout" style={{ display: 'block' }}><article className="card kca-letter" style={{ maxWidth: 780, margin: '0 auto' }} aria-labelledby="admission-letter-title"><header><div className="kca-seal" aria-hidden="true">{t('member.kca', { defaultMessage: 'KCA' })}</div><div><strong>{t('member.kca.academyName', { defaultMessage: 'KINGDOM CITIZENS ACADEMY' })}</strong><small>{t('member.kca.familyHouseConnect', { defaultMessage: 'Family House Connect' })}</small></div></header><h1 id="admission-letter-title" aria-level={2}>{t('member.kca.admissionLetter', { defaultMessage: 'ADMISSION LETTER' })}</h1><div className="kca-letter-meta"><span>{t('member.kca.letterDate', { defaultMessage: 'Date: {date}', vars: { date: details.Date ?? '' } })}</span><span>{t('member.kca.letterRef', { defaultMessage: 'Ref: {ref}', vars: { ref: 'KCA/ADM/2024/0124' } })}</span></div><p>{t('member.kca.dear', { defaultMessage: 'Dear' })} <strong>{details.To}</strong>,</p><p>{t('member.kca.letterAccepted', { defaultMessage: 'We are pleased to inform you that you have been provisionally accepted into the Kingdom Citizens Academy for Batch 2024-06.' })}</p><p>{t('member.kca.letterConfidence', { defaultMessage: 'Your admission reflects our confidence in your potential, character, and commitment to Christian leadership.' })}</p><h3>{t('member.kca.nextSteps', { defaultMessage: 'Next Steps' })}</h3><ol>{details['Next Steps']?.split(' · ').slice(0, 3).map(item => <li key={item}>{item}</li>)}</ol><p>{t('member.kca.letterWelcome', { defaultMessage: 'Congratulations and welcome to KCA.' })}</p><div className="kca-letter-signature"><strong>Pastor Daniel David</strong><span>{t('member.kca.admissionsTeam', { defaultMessage: 'KCA Admissions Team' })}</span></div></article></div>;
}

function KcaOrientation({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  return <section className="kca-managed-table" aria-label={t('member.kca.orientationSessionsAria', { defaultMessage: 'Orientation sessions' })}>
    <KcaMetrics metrics={screen.metrics}/>
    <KcaTable screen={screen} filterLabels={['All Batches', 'All Venues', 'All Statuses']} toolbarAction={screen.action}/>
  </section>;
}

function KcaEntityDetail({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const isStudent = screen.id === 'H-02';
  return <div className="kca-entity-page"><article className="card kca-identity-banner"><div className="kca-avatar large">{screen.title.split(' ').map(part => part[0]).slice(0,2).join('')}</div><div><span className="kca-overline">{isStudent ? t('member.kca.studentProfile', { defaultMessage: 'Student profile' }) : screen.subtitle}</span><h2>{screen.title} <KcaBadge value={t('member.kca.active', { defaultMessage: 'Active' })}/></h2><p>{isStudent ? t('member.kca.studentCohortMeta', { defaultMessage: 'KCA-2024-0001 · 2024 Cohort A' }) : t('member.kca.lagosNigeria', { defaultMessage: 'Lagos, Nigeria' })}</p><div className="kca-contact-line"><span>✉ {screen.title.toLowerCase().replaceAll(' ', '.')}@kca.org</span><span>☎ +234 803 111 2222</span></div></div></article><div className="kca-overview-grid"><article className="card kca-detail-panel"><h2>{isStudent ? t('member.kca.personalInformation', { defaultMessage: 'Personal Information' }) : t('member.kca.profileOverview', { defaultMessage: 'Profile Overview' })}</h2><dl>{Object.entries(screen.details ?? {}).map(([key,value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></article><article className="card kca-detail-panel kca-performance-panel"><h2>{isStudent ? t('member.kca.progressOverview', { defaultMessage: 'Progress Overview' }) : t('member.kca.performance', { defaultMessage: 'Performance' })}</h2>{(screen.items ?? []).map((item,index) => { const [label,value] = item.split(' — '); const progress = Number(value?.match(/\d+/)?.[0] ?? (86 - index * 9)); return <div className="kca-performance-row" key={item}><header><span>{label}</span><strong>{value}</strong></header><i role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(progress,100)}><b style={{ width: `${Math.min(progress,100)}%` }}/></i></div>; })}</article></div></div>;
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
  const values = normalizeDetailValues(screen.details ?? {});
  const steps = screen.tabs ?? [];
  const wizard = useAdminWizardStep(steps);

  return (
    <div className="kca-builder" data-admin-wizard="true">
      <AdminWizardStepper steps={steps} currentStep={wizard.currentStep} className="kca-builder-steps" itemClassName="" activeClassName="current" />
      <article className="card kca-form-card">
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
            <label className="wide"><span>{t('member.kca.lessonPlanNotes', { defaultMessage: 'Lesson plan notes' })}</span><textarea placeholder={t('member.kca.lessonPlanPlaceholder', { defaultMessage: 'Outline videos, readings, and assignments for this module...' })} rows={5} defaultValue={t('member.kca.lessonPlanDefault', { defaultMessage: '8 lessons planned: identity foundations, adoption, new creation, authority, and daily walk.' })} /></label>
            <label><span>{t('member.kca.contentFormat', { defaultMessage: 'Content format' })}</span><select defaultValue="Mixed"><option value="Mixed">{t('member.kca.formatMixed', { defaultMessage: 'Mixed' })}</option><option value="Video-led">{t('member.kca.formatVideoLed', { defaultMessage: 'Video-led' })}</option><option value="Reading-led">{t('member.kca.formatReadingLed', { defaultMessage: 'Reading-led' })}</option></select></label>
            <label><span>{t('member.kca.estimatedLessons', { defaultMessage: 'Estimated lessons' })}</span><input type="number" defaultValue="8" min={1} /></label>
          </div>
        )}

        {wizard.currentStep === 2 && (
          <div className="kca-prerequisite-list">
            {[
              { key: 'member.kca.prereqBibleSurvey', label: 'Bible Survey (Year 1)' },
              { key: 'member.kca.walkWithChrist', label: 'Walk With Christ' },
              { key: 'member.kca.prereqBasicBibleKnowledge', label: 'Basic Bible Knowledge' },
            ].map((item, index) => (
              <div className="kca-prerequisite-row" key={item.key}>
                <span className="kca-drag" aria-hidden="true">⋮⋮</span>
                <span className="kca-prerequisite-icon" aria-hidden="true">{index < 2 ? '▣' : '◇'}</span>
                <strong>{t(item.key, { defaultMessage: item.label })}</strong>
                <KcaBadge value={index < 2 ? t('common.required', { defaultMessage: 'Required' }) : t('common.optional', { defaultMessage: 'Optional' })} />
              </div>
            ))}
            <button className="ghost-button" type="button" data-interaction-native="true">{t('member.kca.addPrerequisite', { defaultMessage: '+ Add prerequisite' })}</button>
          </div>
        )}

        {wizard.currentStep === 3 && (
          <div className="kca-form-grid">
            <label><span>{t('member.kca.evidenceType', { defaultMessage: 'Evidence type' })}</span><select defaultValue="Written + Practical"><option value="Written + Practical">{t('member.kca.evidenceWrittenPractical', { defaultMessage: 'Written + Practical' })}</option><option value="Written only">{t('member.kca.evidenceWrittenOnly', { defaultMessage: 'Written only' })}</option><option value="Practical only">{t('member.kca.evidencePracticalOnly', { defaultMessage: 'Practical only' })}</option></select></label>
            <label><span>{t('member.kca.minimumSubmissions', { defaultMessage: 'Minimum submissions' })}</span><input type="number" defaultValue="3" min={0} /></label>
            <label className="wide"><span>{t('member.kca.evidenceInstructions', { defaultMessage: 'Evidence instructions' })}</span><textarea rows={4} placeholder={t('member.kca.evidencePlaceholder', { defaultMessage: 'Describe what students must submit...' })} defaultValue={t('member.kca.evidenceDefault', { defaultMessage: 'Students submit reflection essays and a practical application assignment reviewed by their mentor.' })} /></label>
          </div>
        )}

        {wizard.currentStep >= 4 && (
          <dl className="kca-review-summary">
            {Object.entries(values).map(([key, value]) => (
              <div key={key}><dt>{key.replace(/_/g, ' ')}</dt><dd>{value}</dd></div>
            ))}
            <div><dt>{t('member.kca.lessons', { defaultMessage: 'Lessons' })}</dt><dd>{t('member.kca.eightPlanned', { defaultMessage: '8 planned' })}</dd></div>
            <div><dt>{t('member.kca.prerequisites', { defaultMessage: 'Prerequisites' })}</dt><dd>{t('member.kca.threeConfigured', { defaultMessage: '3 configured' })}</dd></div>
          </dl>
        )}

        <AdminWizardFooter wizard={wizard} nextLabel={translateAction(t, screen.action)} finishLabel={t('member.kca.createModule', { defaultMessage: 'Create module' })} secondaryClassName="ghost-button" primaryClassName="primary-button" />
      </article>
    </div>
  );
}

function KcaPrerequisites({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  return <article className="card kca-prerequisites"><header><div><h2>{t('member.kca.modulePrerequisites', { defaultMessage: 'Module prerequisites' })}</h2><p>{t('member.kca.modulePrerequisitesCopy', { defaultMessage: 'Students must complete these requirements before starting this module.' })}</p></div><button className="primary-button" type="button">{translateAction(t, screen.action)}</button></header><KcaFilters compact search={t('member.kca.searchPrerequisites', { defaultMessage: 'Search prerequisites...' })}/><div>{(screen.items ?? []).map((item,index) => { const [name,status] = item.split(' — '); return <div className="kca-prerequisite-row" key={item}><span className="kca-drag" aria-hidden="true">⋮⋮</span><span className="kca-prerequisite-icon" aria-hidden="true">{index < 3 ? '▣' : '◇'}</span><strong>{name}</strong><KcaBadge value={status}/><button type="button" aria-label={t('member.kca.moreActionsFor', { defaultMessage: 'More actions for {name}', vars: { name } })}>•••</button></div>; })}</div></article>;
}

function KcaAttendance({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const attendanceStatuses = [
    t('member.kca.present', { defaultMessage: 'Present' }),
    t('member.kca.present', { defaultMessage: 'Present' }),
    t('member.kca.late', { defaultMessage: 'Late' }),
    t('member.kca.absent', { defaultMessage: 'Absent' }),
  ];
  return <div className="kca-attendance"><KcaMetrics metrics={screen.metrics}/><article className="card"><KcaFilters search={t('member.kca.searchStudents', { defaultMessage: 'Search students...' })}/><div className="kca-attendance-list">{(screen.items ?? []).map((item,index) => { const [name,value] = item.split(' — '); const numericValue = Number(value.replace(/[^0-9.]/g, '')); return <div key={item}><span className="kca-mini-avatar">{name.split(' ').map(part=>part[0]).join('').slice(0,2)}</span><strong>{name}</strong><i role="progressbar" aria-label={t('member.kca.attendanceAria', { defaultMessage: '{name} attendance', vars: { name } })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number.isFinite(numericValue) ? numericValue : 0}><b style={{width:value}}/></i><span>{value}</span><small>{attendanceStatuses[index]}</small></div>; })}</div></article></div>;
}

function KcaCertificate({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const details = screen.details ?? {};
  return <div className="kca-document-layout"><article className="card kca-certificate"><div className="kca-certificate-border"><div className="kca-seal large">{t('member.kca', { defaultMessage: 'KCA' })}</div><span>{t('member.kca.academyName', { defaultMessage: 'KINGDOM CITIZENS ACADEMY' })}</span><h1 aria-level={2}>{t('member.kca.certificateOfCompletion', { defaultMessage: 'Certificate of Completion' })}</h1><p>{t('member.kca.certifyThat', { defaultMessage: 'This is to certify that' })}</p><h2>{details.Student}</h2><p>{t('member.kca.completedRequirementsFor', { defaultMessage: 'has successfully completed all the requirements for' })}</p><h3>{details.Year}</h3><small>{t('member.kca.issuedOn', { defaultMessage: 'Issued on {date}', vars: { date: details['Issue Date'] ?? '' } })}</small><div className="kca-certificate-signatures"><span><b>Pastor Daniel David</b>{t('member.kca.academyDirector', { defaultMessage: 'Academy Director' })}</span><span className="kca-qr" aria-label={t('member.kca.certificateQrAria', { defaultMessage: 'Certificate verification QR code' })}>▦</span><span><b>Mary Okoro</b>{t('member.kca.registrar', { defaultMessage: 'Registrar' })}</span></div></div></article><aside className="card kca-document-meta"><h2>{t('member.kca.certificateDetails', { defaultMessage: 'Certificate Details' })}</h2><dl>{Object.entries(details).map(([key,value]) => <div key={key}><dt>{key}</dt><dd>{key === 'Status' ? <KcaBadge value={value}/> : value}</dd></div>)}</dl><button className="primary-button" type="button">{translateAction(t, screen.action)}</button></aside></div>;
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
      {screen.metrics && <KcaMetrics metrics={screen.metrics} />}
      {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
      {live && !error ? <p className="maps-settings-lead" role="status">{message}</p> : null}
      <KcaTable screen={screen} rows={rows} reviewLabel={reviewLabel} total={total || rows.length} />
    </div>
  );
}

export function KcaScreenContent({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  switch (screen.id) {
    case 'G-01': return <KcaDashboard screen={screen} requestedScope={requestedScope} />;
    case 'G-03': return <KcaApplicantOverview screen={screen}/>;
    case 'G-04': case 'G-05': case 'G-06': case 'G-07': case 'G-08': case 'G-09': case 'G-10': return <KcaApplicationForm screen={screen}/>;
    case 'G-12': return <KcaDecision screen={screen}/>;
    case 'G-13': case 'G-14': case 'G-15': case 'G-18': return <KcaOutcome screen={screen}/>;
    case 'G-16': return <KcaLetter screen={screen}/>;
    case 'G-17': return <KcaOrientation screen={screen}/>;
    case 'H-02': case 'H-06': case 'H-08': return <KcaEntityDetail screen={screen}/>;
    case 'H-03':
    case 'H-04':
      return <KcaManagedTable screen={screen} />;
    case 'H-10': return <KcaModuleBuilder screen={screen}/>;
    case 'H-11': return <KcaPrerequisites screen={screen}/>;
    case 'H-13': return <KcaAttendance screen={screen}/>;
    case 'H-19': return <KcaCertificate screen={screen}/>;
    default: return <KcaManagedTable screen={screen}/>;
  }
}
