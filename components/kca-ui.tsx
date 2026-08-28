'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { AdminScreen, Metric, Row } from '../lib/admin-routes.ts';
import {
  catalogErrorMessage,
  catalogRecordsToRows,
  listCatalogDomain,
  resolveCatalogDataset,
  shouldUseCatalogLiveData,
} from '../lib/admin-catalog-api';
import { shouldUseDesignFixtures } from '../lib/admin-identity-api';
import { AdminFormFields } from './admin-form-fields';
import { AdminWizardFooter, AdminWizardStepper } from './admin-wizard-chrome';
import { useAdminWizardStep } from '../lib/use-admin-wizard-step';
import { fieldsForEntity, normalizeDetailValues, resolveEntityKey } from '../lib/admin-form-schemas';
import { TableRowActions } from './table-row-actions';

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

function KcaFilters({ search = 'Search records...', compact = false, labels = ['All Status', 'All Cohorts', 'All Regions'] }: { search?: string; compact?: boolean; labels?: string[] }) {
  return <div className={`kca-filters ${compact ? 'is-compact' : ''}`}>
    {labels.map(label => <button type="button" aria-label={`Filter by ${label.replace(/^All /, '').toLowerCase()}`} key={label}>{label}⌄</button>)}
    <label><span aria-hidden="true">⌕</span><input aria-label={search} placeholder={search} /></label>
    <button className="kca-filter-button" type="button" aria-label="Open additional filters">☷ Filters</button>
  </div>;
}

function KcaTable({ screen, rows = screen.rows ?? [], columns = screen.columns ?? [], showAction = true, filterLabels, toolbarAction }: { screen: AdminScreen; rows?: Row[]; columns?: string[]; showAction?: boolean; filterLabels?: string[]; toolbarAction?: string }) {
  const entityKey = resolveEntityKey(screen.route, screen.id);
  return <article className={`card kca-table-card ${toolbarAction ? 'kca-prerequisites' : ''}`}>
    {toolbarAction && <header><div><h2>Orientation Sessions</h2><p>Manage upcoming orientation sessions and student attendance.</p></div><button className="primary-button" type="button">{toolbarAction}</button></header>}
    <KcaFilters search={`Search ${screen.title.toLowerCase()}...`} labels={filterLabels} />
    <div className="kca-table-scroll">
      <table className="kca-table" aria-label={`${screen.title} records`}>
        <thead><tr>{columns.map(column => <th scope="col" key={column}>{column}</th>)}{showAction && <th scope="col">Actions</th>}</tr></thead>
        <tbody>{rows.map((row, rowIndex) => <tr key={`${screen.id}-${rowIndex}`}>
          {columns.map((column, columnIndex) => {
            const value = row[column] ?? '—';
            const isStatus = /status|priority|progress|issued/i.test(column);
            return <td key={column}>{columnIndex === 0 ? <div className="kca-person-cell"><span className="kca-mini-avatar">{value.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><strong>{value}</strong></div> : isStatus ? <KcaBadge value={value} /> : value}</td>;
          })}
          {showAction && <td><TableRowActions record={`${row[columns[0]] ?? ''} ${row.__id ?? ''}`.trim()} entityKey={entityKey} className="row-actions kca-row-actions" canEdit={false} canDelete={false} /></td>}
        </tr>)}</tbody>
      </table>
    </div>
    <footer className="kca-table-footer"><span>Showing 1 to {rows.length} of {rows.length > 6 ? '246' : rows.length} records</span><div role="navigation" aria-label={`${screen.title} pagination`}><button type="button" aria-label="Previous page">‹</button><button className="active" type="button" aria-label="Page 1" aria-current="page">1</button><button type="button" aria-label="Page 2">2</button><button type="button" aria-label="Page 3">3</button><button type="button" aria-label="Next page">›</button></div></footer>
  </article>;
}

function KcaDonut({ value, label = 'Total', segments = ['#4c11b5', '#16a467', '#e7a11d', '#ea4d4d'] }: { value: string; label?: string; segments?: string[] }) {
  const gradient = `conic-gradient(${segments[0]} 0 42%, ${segments[1]} 42% 66%, ${segments[2]} 66% 82%, ${segments[3]} 82% 100%)`;
  return <div className="kca-donut" style={{ background: gradient }} role="img" aria-label={`${label}: ${value}`}><div><strong>{value}</strong><span>{label}</span></div></div>;
}

function KcaLineChart({ title = 'Application Trend (Last 6 Months)' }: { title?: string }) {
  return <article className="card kca-chart-card">
    <header><h2>{title}</h2><button type="button">This Year⌄</button></header>
    <div className="kca-line-chart">
      <span className="axis y-one">900</span><span className="axis y-two">600</span><span className="axis y-three">300</span>
      <svg viewBox="0 0 620 190" role="img" aria-label={`${title}: values trend upward from December through June`}><defs><linearGradient id="kca-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#6d35d9" stopOpacity=".24"/><stop offset="1" stopColor="#6d35d9" stopOpacity="0"/></linearGradient></defs><path className="area" d="M20 157 L112 116 L205 75 L298 103 L391 56 L484 48 L600 25 L600 180 L20 180 Z"/><path className="line" d="M20 157 L112 116 L205 75 L298 103 L391 56 L484 48 L600 25"/>{[[20,157],[112,116],[205,75],[298,103],[391,56],[484,48],[600,25]].map(([cx,cy]) => <circle cx={cx} cy={cy} r="5" key={`${cx}-${cy}`}/>)}</svg>
      <div className="kca-chart-labels">{['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map(item => <span key={item}>{item}</span>)}</div>
    </div>
  </article>;
}

function KcaDashboard({ screen }: { screen: AdminScreen }) {
  const statusItems = screen.items ?? [];
  return <div className="kca-dashboard">
    <KcaMetrics metrics={screen.metrics} />
    <div className="kca-dashboard-main">
      <KcaLineChart />
      <article className="card kca-status-card"><header><h2>By Status</h2><button type="button" aria-label="Application status chart options">•••</button></header><div className="kca-status-visual"><KcaDonut value="2,458" label="Applications"/><ul>{statusItems.slice(0, 5).map((item, index) => { const [label, value] = item.split(' — '); return <li key={item}><i aria-hidden="true" className={`tone-${index + 1}`}/><span>{label}</span><strong>{value}</strong></li>; })}</ul></div></article>
    </div>
    <div className="kca-dashboard-bottom">
      <article className="card kca-recent"><header><h2>Recent Applications</h2><Link href="/admin/kca/applications">View all</Link></header>{(screen.rows ?? []).map((row, index) => <div className="kca-recent-row" key={`${row.Applicant}-${index}`}><span className="kca-mini-avatar">{row.Applicant?.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><div><strong>{row.Applicant}</strong><small>{row.Church}</small></div><time>{row.Submitted}</time><KcaBadge value={row.Status}/></div>)}</article>
      <article className="card kca-quick-actions"><h2>Quick Actions</h2>{['View Review Queue', 'Create Orientation Batch', 'Generate Reports', 'Admission Settings'].map((item, index) => <button type="button" key={item}><span>{['▣', '◇', '▤', '⚙'][index]}</span>{item}</button>)}</article>
    </div>
  </div>;
}

function KcaApplicantOverview({ screen }: { screen: AdminScreen }) {
  const details = screen.details ?? {};
  return <div className="kca-entity-page">
    <article className="card kca-identity-banner"><div className="kca-avatar large">SD</div><div><span className="kca-overline">Applicant profile</span><h2>Samuel David <KcaBadge value="Under Review"/></h2><p>{screen.subtitle}</p><div className="kca-contact-line"><span>☎ {details.Phone}</span><span>✉ {details.Email}</span><span>⌖ {details.Location}</span></div></div></article>
    <nav className="kca-entity-tabs" aria-label="Application sections">{(screen.tabs ?? []).map((tab,index) => <button className={index === 0 ? 'active' : ''} aria-current={index === 0 ? 'page' : undefined} type="button" key={tab}>{tab}</button>)}</nav>
    <div className="kca-overview-grid">
      <article className="card kca-detail-panel"><h2>Application Summary</h2><dl>{Object.entries(details).slice(0, 7).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></article>
      <article className="card kca-detail-panel"><h2>Status</h2><dl>{Object.entries(details).slice(7).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{label === 'Current Status' ? <KcaBadge value={value}/> : value}</dd></div>)}</dl><div className="kca-progress"><header><span>Progress</span><strong>78%</strong></header><i role="progressbar" aria-label="Application completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={78}><b style={{ width: '78%' }}/></i><small>7 of 9 sections completed</small></div></article>
    </div>
    <article className="card kca-section-progress"><h2>Application Journey</h2><div>{(screen.items ?? []).map((item, index) => { const [label, state] = item.split(' — '); return <div key={item}><span className={index < 7 ? 'complete' : 'current'}>{index < 7 ? '✓' : index + 1}</span><small>{label}</small><KcaBadge value={state}/></div>; })}</div></article>
  </div>;
}

function KcaStepRail({ current }: { current: string }) {
  const currentIndex = Math.max(applicationSteps.findIndex(step => current.toLowerCase().includes(step.toLowerCase().replace('parent consent', 'parent'))), 0);
  return <nav className="kca-step-rail" aria-label="Application progress"><h3 aria-level={2}>Application</h3>{applicationSteps.map((step, index) => <div aria-current={index === currentIndex ? 'step' : undefined} className={index < currentIndex ? 'complete' : index === currentIndex ? 'current' : ''} key={step}><span aria-hidden="true">{index < currentIndex ? '✓' : index + 1}</span><b>{step}</b></div>)}</nav>;
}

function KcaApplicationForm({ screen }: { screen: AdminScreen }) {
  const entries = Object.entries(screen.details ?? {});
  const longValue = (label: string, value: string) => value.length > 48 || /address|motivation|hope|challenge|consent|recommendation|manage time/i.test(label);
  const isRequired = (label: string) => !/optional|signature/i.test(label);
  return <div className="kca-flow-layout">
    <KcaStepRail current={screen.title}/>
    <article className="card kca-form-card">
      <header><div><span className="kca-overline">KCA application</span><h2>{screen.title}</h2><p>{screen.subtitle}</p></div><KcaBadge value="In progress"/></header>
      <div className="kca-form-grid">{entries.map(([label, value]) => <label className={longValue(label, value) ? 'wide' : ''} key={label}><span>{label}</span>{longValue(label, value) ? <textarea required={isRequired(label)} defaultValue={value}/> : /date/i.test(label) ? <input required={isRequired(label)} type="text" defaultValue={value}/> : /gender|relationship|year|frequency|agree|recommend|commit|attend|decision time/i.test(label) ? <select required={isRequired(label)} defaultValue={value}><option>{value}</option></select> : <input required={isRequired(label)} defaultValue={value}/>}</label>)}</div>
      {/Signature/.test(entries.map(([key]) => key).join(' ')) && <div className="kca-signature-line"><span>Signed digitally by</span><strong>{screen.details?.Signature}</strong></div>}
      <footer><button className="ghost-button" type="button">Back</button><div><button className="ghost-button" type="button">Save Draft</button><button className="primary-button" type="button">{screen.action}</button></div></footer>
    </article>
  </div>;
}

function KcaDecision({ screen }: { screen: AdminScreen }) {
  return <div className="kca-decision-layout">
    <aside className="card kca-review-summary"><div className="kca-avatar">SD</div><h2>Samuel David</h2><small>KCA-2024-000124</small><div>{(screen.items ?? []).slice(0, 8).map((item, index) => <p key={item}><span className={index < 7 ? 'done' : ''}>{index < 7 ? '✓' : '•'}</span>{item.split(' — ')[0]}<KcaBadge value={item.split(' — ')[1]}/></p>)}</div></aside>
    <article className="card kca-decision-card"><span className="kca-overline">Final review</span><h2>Select an admission decision</h2><p>Choose the appropriate outcome for Samuel David after reviewing all application sections.</p><div className="kca-decision-options"><button className="accept" type="button"><span>✓</span><strong>Provisionally Accept</strong><small>Applicant meets the requirements.</small></button><button className="defer" type="button"><span>◷</span><strong>Defer</strong><small>More information is required.</small></button><button className="reject" type="button"><span>×</span><strong>Not Accepted</strong><small>Applicant does not meet requirements.</small></button></div><label><span>Admission Notes (Optional)</span><textarea placeholder="Write your private notes here..."/></label><footer><button className="ghost-button" type="button">Back</button><button className="primary-button" type="button">{screen.action}</button></footer></article>
  </div>;
}

function KcaOutcome({ screen }: { screen: AdminScreen }) {
  const tone = screen.id === 'G-14' ? 'defer' : screen.id === 'G-15' ? 'reject' : 'accept';
  const symbol = tone === 'accept' ? '✓' : tone === 'defer' ? '◷' : '×';
  const isDestructive = tone === 'defer' || tone === 'reject';
  return <article className={`card kca-outcome is-${tone}`}><div className="kca-outcome-symbol" aria-hidden="true">{symbol}</div><h2>{screen.title}</h2><p>{screen.subtitle}</p><dl>{Object.entries(screen.details ?? {}).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{key === 'Status' ? <KcaBadge value={value}/> : value}</dd></div>)}</dl><div className="kca-outcome-actions"><button className={isDestructive ? 'danger-button' : 'primary-button'} type="button">{screen.action}</button>{screen.items?.[1] && <button className="ghost-button" type="button">{screen.items[1]}</button>}</div></article>;
}

function KcaLetter({ screen }: { screen: AdminScreen }) {
  const details = screen.details ?? {};
  return <div className="kca-document-layout" style={{ display: 'block' }}><article className="card kca-letter" style={{ maxWidth: 780, margin: '0 auto' }} aria-labelledby="admission-letter-title"><header><div className="kca-seal" aria-hidden="true">KCA</div><div><strong>KINGDOM CITIZENS ACADEMY</strong><small>Family House Connect</small></div></header><h1 id="admission-letter-title" aria-level={2}>ADMISSION LETTER</h1><div className="kca-letter-meta"><span>Date: {details.Date}</span><span>Ref: KCA/ADM/2024/0124</span></div><p>Dear <strong>{details.To}</strong>,</p><p>We are pleased to inform you that you have been provisionally accepted into the Kingdom Citizens Academy for Batch 2024-06.</p><p>Your admission reflects our confidence in your potential, character, and commitment to Christian leadership.</p><h3>Next Steps</h3><ol>{details['Next Steps']?.split(' · ').slice(0, 3).map(item => <li key={item}>{item}</li>)}</ol><p>Congratulations and welcome to KCA.</p><div className="kca-letter-signature"><strong>Pastor Daniel David</strong><span>KCA Admissions Team</span></div></article></div>;
}

function KcaOrientation({ screen }: { screen: AdminScreen }) {
  return <section className="kca-managed-table" aria-label="Orientation sessions">
    <KcaMetrics metrics={screen.metrics}/>
    <KcaTable screen={screen} filterLabels={['All Batches', 'All Venues', 'All Statuses']} toolbarAction={screen.action}/>
  </section>;
}

function KcaEntityDetail({ screen }: { screen: AdminScreen }) {
  const isStudent = screen.id === 'H-02';
  return <div className="kca-entity-page"><article className="card kca-identity-banner"><div className="kca-avatar large">{screen.title.split(' ').map(part => part[0]).slice(0,2).join('')}</div><div><span className="kca-overline">{isStudent ? 'Student profile' : screen.subtitle}</span><h2>{screen.title} <KcaBadge value="Active"/></h2><p>{isStudent ? 'KCA-2024-0001 · 2024 Cohort A' : 'Lagos, Nigeria'}</p><div className="kca-contact-line"><span>✉ {screen.title.toLowerCase().replaceAll(' ', '.')}@kca.org</span><span>☎ +234 803 111 2222</span></div></div></article><div className="kca-overview-grid"><article className="card kca-detail-panel"><h2>{isStudent ? 'Personal Information' : 'Profile Overview'}</h2><dl>{Object.entries(screen.details ?? {}).map(([key,value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></article><article className="card kca-detail-panel kca-performance-panel"><h2>{isStudent ? 'Progress Overview' : 'Performance'}</h2>{(screen.items ?? []).map((item,index) => { const [label,value] = item.split(' — '); const progress = Number(value?.match(/\d+/)?.[0] ?? (86 - index * 9)); return <div className="kca-performance-row" key={item}><header><span>{label}</span><strong>{value}</strong></header><i role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(progress,100)}><b style={{ width: `${Math.min(progress,100)}%` }}/></i></div>; })}</article></div></div>;
}

function KcaCohorts({ screen }: { screen: AdminScreen }) {
  return <div className="kca-cohort-view"><div className="kca-cohort-cards">{(screen.items ?? []).map((item, index) => { const [name, summary] = item.split(' — '); return <article className="card" key={item}><span className="kca-cohort-icon">{String(index + 1).padStart(2,'0')}</span><h2>{name}</h2><p>{summary}</p><footer><KcaBadge value={summary.includes('Completed') ? 'Completed' : 'Active'}/><button type="button">View cohort →</button></footer></article>; })}</div><KcaTable screen={screen}/></div>;
}

function KcaYears({ screen }: { screen: AdminScreen }) {
  return <div className="kca-years-view"><KcaTable screen={screen}/><article className="card kca-year-chart"><h2>Year Progress Overview</h2><div className="kca-bars" role="img" aria-label={`Year progress: ${(screen.items ?? []).join(', ')}`}>{(screen.items ?? []).map((item,index) => { const [label,value] = item.split(' — '); const height = [92,72,58,4,4][index] ?? 40; return <div key={item}><span>{value}</span><i aria-hidden="true" style={{ height: `${height}%` }}/><b>{label}</b></div>; })}</div></article></div>;
}

function KcaModuleBuilder({ screen }: { screen: AdminScreen }) {
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
            <span className="kca-overline">{wizard.isFirst ? 'New module' : `Step ${wizard.currentStep + 1} of ${steps.length}`}</span>
            <h2>{wizard.currentLabel || 'Basic Information'}</h2>
            <p>
              {wizard.currentStep === 0 && 'Define the module students will learn. Fields map to kca_modules columns.'}
              {wizard.currentStep === 1 && 'Add lessons and learning content for this module.'}
              {wizard.currentStep === 2 && 'Set prerequisites students must complete before starting.'}
              {wizard.currentStep === 3 && 'Configure evidence and assessment requirements.'}
              {wizard.currentStep >= 4 && 'Review module details before publishing.'}
            </p>
          </div>
        </header>

        {wizard.currentStep === 0 && <AdminFormFields fields={fields} values={values} />}

        {wizard.currentStep === 1 && (
          <div className="kca-form-grid">
            <label className="wide"><span>Lesson plan notes</span><textarea placeholder="Outline videos, readings, and assignments for this module..." rows={5} defaultValue="8 lessons planned: identity foundations, adoption, new creation, authority, and daily walk." /></label>
            <label><span>Content format</span><select defaultValue="Mixed"><option>Mixed</option><option>Video-led</option><option>Reading-led</option></select></label>
            <label><span>Estimated lessons</span><input type="number" defaultValue="8" min={1} /></label>
          </div>
        )}

        {wizard.currentStep === 2 && (
          <div className="kca-prerequisite-list">
            {['Bible Survey (Year 1)', 'Walk With Christ', 'Basic Bible Knowledge'].map((item, index) => (
              <div className="kca-prerequisite-row" key={item}>
                <span className="kca-drag" aria-hidden="true">⋮⋮</span>
                <span className="kca-prerequisite-icon" aria-hidden="true">{index < 2 ? '▣' : '◇'}</span>
                <strong>{item}</strong>
                <KcaBadge value={index < 2 ? 'Required' : 'Optional'} />
              </div>
            ))}
            <button className="ghost-button" type="button" data-interaction-native="true">+ Add prerequisite</button>
          </div>
        )}

        {wizard.currentStep === 3 && (
          <div className="kca-form-grid">
            <label><span>Evidence type</span><select defaultValue="Written + Practical"><option>Written + Practical</option><option>Written only</option><option>Practical only</option></select></label>
            <label><span>Minimum submissions</span><input type="number" defaultValue="3" min={0} /></label>
            <label className="wide"><span>Evidence instructions</span><textarea rows={4} placeholder="Describe what students must submit..." defaultValue="Students submit reflection essays and a practical application assignment reviewed by their mentor." /></label>
          </div>
        )}

        {wizard.currentStep >= 4 && (
          <dl className="kca-review-summary">
            {Object.entries(values).map(([key, value]) => (
              <div key={key}><dt>{key.replace(/_/g, ' ')}</dt><dd>{value}</dd></div>
            ))}
            <div><dt>Lessons</dt><dd>8 planned</dd></div>
            <div><dt>Prerequisites</dt><dd>3 configured</dd></div>
          </dl>
        )}

        <AdminWizardFooter wizard={wizard} nextLabel={screen.action} finishLabel="Create module" secondaryClassName="ghost-button" primaryClassName="primary-button" />
      </article>
    </div>
  );
}

function KcaPrerequisites({ screen }: { screen: AdminScreen }) {
  return <article className="card kca-prerequisites"><header><div><h2>Module prerequisites</h2><p>Students must complete these requirements before starting this module.</p></div><button className="primary-button" type="button">{screen.action}</button></header><KcaFilters compact search="Search prerequisites..."/><div>{(screen.items ?? []).map((item,index) => { const [name,status] = item.split(' — '); return <div className="kca-prerequisite-row" key={item}><span className="kca-drag" aria-hidden="true">⋮⋮</span><span className="kca-prerequisite-icon" aria-hidden="true">{index < 3 ? '▣' : '◇'}</span><strong>{name}</strong><KcaBadge value={status}/><button type="button" aria-label={`More actions for ${name}`}>•••</button></div>; })}</div></article>;
}

function KcaAttendance({ screen }: { screen: AdminScreen }) {
  return <div className="kca-attendance"><KcaMetrics metrics={screen.metrics}/><article className="card"><KcaFilters search="Search students..."/><div className="kca-attendance-list">{(screen.items ?? []).map((item,index) => { const [name,value] = item.split(' — '); const numericValue = Number(value.replace(/[^0-9.]/g, '')); return <div key={item}><span className="kca-mini-avatar">{name.split(' ').map(part=>part[0]).join('').slice(0,2)}</span><strong>{name}</strong><i role="progressbar" aria-label={`${name} attendance`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number.isFinite(numericValue) ? numericValue : 0}><b style={{width:value}}/></i><span>{value}</span><small>{['Present','Present','Late','Absent'][index]}</small></div>; })}</div></article></div>;
}

function KcaCertificate({ screen }: { screen: AdminScreen }) {
  const details = screen.details ?? {};
  return <div className="kca-document-layout"><article className="card kca-certificate"><div className="kca-certificate-border"><div className="kca-seal large">KCA</div><span>KINGDOM CITIZENS ACADEMY</span><h1 aria-level={2}>Certificate of Completion</h1><p>This is to certify that</p><h2>{details.Student}</h2><p>has successfully completed all the requirements for</p><h3>{details.Year}</h3><small>Issued on {details['Issue Date']}</small><div className="kca-certificate-signatures"><span><b>Pastor Daniel David</b>Academy Director</span><span className="kca-qr" aria-label="Certificate verification QR code">▦</span><span><b>Mary Okoro</b>Registrar</span></div></div></article><aside className="card kca-document-meta"><h2>Certificate Details</h2><dl>{Object.entries(details).map(([key,value]) => <div key={key}><dt>{key}</dt><dd>{key === 'Status' ? <KcaBadge value={value}/> : value}</dd></div>)}</dl><button className="primary-button" type="button">{screen.action}</button></aside></div>;
}

function KcaManagedTable({ screen }: { screen: AdminScreen }) {
  const columns = screen.columns ?? [];
  const columnKey = columns.join('\0');
  const dataset = resolveCatalogDataset(screen);
  const live = !shouldUseDesignFixtures() && shouldUseCatalogLiveData() && dataset !== null;
  const [rows, setRows] = useState<Row[]>(live ? [] : (screen.rows ?? []));
  const [message, setMessage] = useState(live ? 'Loading catalog…' : '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!live || !dataset) return;
    const mappedColumns = columnKey ? columnKey.split('\0') : [];
    let cancelled = false;
    void (async () => {
      setError(null);
      setMessage('Loading catalog…');
      try {
        const result = await listCatalogDomain(dataset, { perPage: 25 });
        if (cancelled) return;
        setRows(catalogRecordsToRows(result.items as Record<string, unknown>[], mappedColumns) as Row[]);
        setMessage(
          result.pagination.total === 0
            ? 'No catalog records in this scope.'
            : `Showing ${result.items.length} of ${result.pagination.total} records`,
        );
      } catch (err) {
        if (cancelled) return;
        setRows([]);
        setError(catalogErrorMessage(err, 'Unable to load domain catalog.'));
        setMessage('Live catalog unavailable');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [columnKey, dataset, live]);

  if (!shouldUseDesignFixtures() && !live) {
    return (
      <div className="kca-managed-table">
        <p className="maps-settings-lead" role="status">
          No live list API is wired for this screen. Design fixtures are disabled.
        </p>
        <article className="card kca-table-card">
          <p>Live data unavailable for this route.</p>
        </article>
      </div>
    );
  }

  return (
    <div className="kca-managed-table">
      {screen.metrics && <KcaMetrics metrics={screen.metrics} />}
      {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
      {live && !error ? <p className="maps-settings-lead" role="status">{message}</p> : null}
      <KcaTable screen={screen} rows={rows} />
    </div>
  );
}

export function KcaScreenContent({ screen }: { screen: AdminScreen }) {
  switch (screen.id) {
    case 'G-01': return <KcaDashboard screen={screen}/>;
    case 'G-03': return <KcaApplicantOverview screen={screen}/>;
    case 'G-04': case 'G-05': case 'G-06': case 'G-07': case 'G-08': case 'G-09': case 'G-10': return <KcaApplicationForm screen={screen}/>;
    case 'G-12': return <KcaDecision screen={screen}/>;
    case 'G-13': case 'G-14': case 'G-15': case 'G-18': return <KcaOutcome screen={screen}/>;
    case 'G-16': return <KcaLetter screen={screen}/>;
    case 'G-17': return <KcaOrientation screen={screen}/>;
    case 'H-02': case 'H-06': case 'H-08': return <KcaEntityDetail screen={screen}/>;
    case 'H-03': return <KcaCohorts screen={screen}/>;
    case 'H-04': return <KcaYears screen={screen}/>;
    case 'H-10': return <KcaModuleBuilder screen={screen}/>;
    case 'H-11': return <KcaPrerequisites screen={screen}/>;
    case 'H-13': return <KcaAttendance screen={screen}/>;
    case 'H-19': return <KcaCertificate screen={screen}/>;
    default: return <KcaManagedTable screen={screen}/>;
  }
}
