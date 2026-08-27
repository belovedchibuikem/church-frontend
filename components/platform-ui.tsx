'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import type { AdminScreen, Metric, Row } from '../lib/admin-routes.ts';
import {
  catalogErrorMessage,
  catalogRecordsToRows,
  listCatalogDomain,
  resolveCatalogDataset,
  shouldUseCatalogLiveData,
} from '../lib/admin-catalog-api';
import {
  defaultAdminScope,
  formatTimestamp,
  listAdminAccessDecisions,
  listAdminAuditEvents,
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
} from '../lib/admin-platform-api.ts';
import type { JsonValue } from '../lib/api-types.ts';
import { resolveEntityKey } from '../lib/admin-form-schemas';
import { useAdminWizardStep } from '../lib/use-admin-wizard-step';
import { AdminWizardFooter, AdminWizardStepper } from './admin-wizard-chrome';
import { MapsSettingsPanel } from './maps-settings-panel';
import { BrandingSettingsPanel } from './branding-settings-panel';
import { TableRowActions } from './table-row-actions';

function tone(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function Badge({ value }: { value: string }) {
  return <span className={`platform-badge is-${tone(value)}`}>{value}</span>;
}

function Metrics({ metrics = [] }: { metrics?: Metric[] }) {
  return <div className={`platform-metrics count-${Math.min(metrics.length, 5)}`}>{metrics.map((metric,index)=><article className="platform-card platform-metric" key={metric.label}><span>{metric.label}</span><div><strong>{metric.value}</strong>{metric.trend&&<small className={metric.trend.includes('-')?'down':''}>{metric.trend}</small>}</div><i style={{width:`${48+(index*11)%45}%`}}/></article>)}</div>;
}

function Bars({ compact = false }: { compact?: boolean }) {
  const values = [32,54,45,71,63,88,56,76,91,68,82,96];
  return <div className={`platform-bars ${compact?'compact':''}`} role="img" aria-label="Performance trend chart">{values.map((height,index)=><i style={{height:`${height}%`}} key={index}/>)}</div>;
}

function Donut({ value = '12,842' }: { value?: string }) {
  return <div className="platform-donut" role="img" aria-label={`Category distribution total ${value}`}><div><strong>{value}</strong><span>Total</span></div></div>;
}

function FilterBar({ screen }: { screen: AdminScreen }) {
  return <div className="platform-filter-bar"><button type="button">All Status⌄</button><button type="button">All Categories⌄</button><label><span aria-hidden="true">⌕</span><input aria-label={`Search ${screen.title}`} placeholder={`Search ${screen.title.toLowerCase()}...`}/></label><button type="button">☷ Filters</button></div>;
}

function PlatformTabs({ tabs = [] }: { tabs?: string[] }) {
  return <div className="platform-tabs" role="tablist" aria-label="Page sections">{tabs.map((tab,index)=><button type="button" role="tab" aria-selected={index===0} className={index===0?'active':''} key={tab}>{tab}</button>)}</div>;
}

function FixtureDenseTable({ screen, rows = screen.rows ?? [], columns = screen.columns ?? [] }: { screen: AdminScreen; rows?: Row[]; columns?: string[] }) {
  const entityKey = resolveEntityKey(screen.route, screen.id);
  return <article className="platform-card platform-table-card"><FilterBar screen={screen}/><div className="platform-table-scroll"><table aria-label={`${screen.title} records`}><thead><tr>{columns.map(column=><th scope="col" key={column}>{column}</th>)}<th scope="col">Actions</th></tr></thead><tbody>{rows.map((row,index)=><tr key={`${screen.id}-${index}`}>{columns.map((column,columnIndex)=>{const value=row[column]??'—';return <td key={column}>{columnIndex===0?<span className="platform-leading"><i>{value.slice(0,2).toUpperCase()}</i><b>{value}</b></span>:/status|priority/i.test(column)?<Badge value={value}/>:value}</td>})}<td><TableRowActions record={String(row[columns[0]]??'record')} entityKey={entityKey} className="row-actions platform-row-actions" /></td></tr>)}</tbody></table></div><footer><span>Showing 1 to {rows.length} of {rows.length>5?'256':rows.length} records</span><nav aria-label={`${screen.title} pagination`}><button type="button" aria-label="Previous page">‹</button><button className="active" type="button" aria-label="Page 1" aria-current="page">1</button><button type="button" aria-label="Page 2">2</button><button type="button" aria-label="Page 3">3</button><button type="button" aria-label="Next page">›</button></nav></footer></article>;
}

const CATALOG_FEED_COLUMNS = ['Item', 'Detail', 'Time'];
const CATALOG_NAME_COLUMNS = ['Name', 'Status', 'Updated'];
const CATALOG_ASSET_COLUMNS = ['Name', 'Type', 'Status', 'Updated'];

function CatalogLiveTable({ screen }: { screen: AdminScreen }) {
  const columns = screen.columns ?? [];
  const columnKey = columns.join('\0');
  const dataset = resolveCatalogDataset(screen);
  const entityKey = resolveEntityKey(screen.route, screen.id);
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [message, setMessage] = useState('Loading catalog…');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataset) return;
    const mappedColumns = columnKey ? columnKey.split('\0') : [];
    let cancelled = false;
    void (async () => {
      setError(null);
      setMessage('Loading catalog…');
      try {
        const result = await listCatalogDomain(dataset, { perPage: 25 });
        if (cancelled) return;
        setRows(catalogRecordsToRows(result.items as Record<string, unknown>[], mappedColumns));
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
  }, [columnKey, dataset]);

  return (
    <article className="platform-card platform-table-card">
      <FilterBar screen={screen} />
      {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
      <div className="platform-table-scroll">
        <table aria-label={`${screen.title} records`}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th scope="col" key={column}>{column}</th>
              ))}
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1}>{error ? 'Unable to load records.' : message}</td>
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
                      record={String(row[columns[0]] ?? row.__id)}
                      entityKey={entityKey}
                      className="row-actions platform-row-actions"
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
}: {
  screen: AdminScreen;
  kind: 'audit' | 'access-decisions';
}) {
  const columns = screen.columns ?? [];
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [message, setMessage] = useState('Loading security records…');
  const [error, setError] = useState<string | null>(null);
  const entityKey = resolveEntityKey(screen.route, screen.id);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setError(null);
      try {
        if (kind === 'audit') {
          const result = await listAdminAuditEvents({ scope: defaultAdminScope(), perPage: 25 });
          if (cancelled) return;
          setRows(
            result.data.map((event: AdminAuditEvent) => {
              const mapped: Record<string, string> = {};
              for (const column of columns) {
                if (column === 'Date & Time') mapped[column] = formatTimestamp(event.occurred_at);
                else if (column === 'User') mapped[column] = event.actor_user_id ?? '—';
                else if (column === 'Module') mapped[column] = event.target_type ?? '—';
                else if (column === 'Action') mapped[column] = event.action;
                else if (column === 'Status') mapped[column] = 'Recorded';
                else if (column === 'IP Address') mapped[column] = event.correlation_id ?? '—';
                else mapped[column] = '—';
              }
              mapped.__id = event.id;
              return mapped;
            }),
          );
          setMessage(`Showing ${result.data.length} of ${result.pagination.total} audit events`);
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
                else if (column === 'Status') mapped[column] = decision.allowed ? 'Allowed' : 'Denied';
                else if (column === 'Date' || column === 'Date & Time') {
                  mapped[column] = formatTimestamp(decision.decided_at);
                } else mapped[column] = '—';
              }
              mapped.__id = decision.id;
              return mapped;
            }),
          );
          setMessage(`Showing ${result.data.length} of ${result.pagination.total} access decisions`);
        }
      } catch (err) {
        if (cancelled) return;
        setRows([]);
        setError(err instanceof Error ? err.message : 'Unable to load security records.');
        setMessage('Live security data unavailable');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [columns, kind]);

  return (
    <article className="platform-card platform-table-card">
      <FilterBar screen={screen} />
      {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
      <div className="platform-table-scroll">
        <table aria-label={`${screen.title} records`}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th scope="col" key={column}>{column}</th>
              ))}
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1}>{error ? 'Unable to load records.' : message}</td>
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
                      record={String(row[columns[0]] ?? row.__id)}
                      entityKey={entityKey}
                      className="row-actions platform-row-actions"
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
  if (!shouldUseDesignFixtures()) {
    if (screen.route === '/admin/security/audit-logs') {
      return <IdentitySecurityLiveTable screen={screen} kind="audit" />;
    }
    if (screen.route === '/admin/security/access-decisions') {
      return <IdentitySecurityLiveTable screen={screen} kind="access-decisions" />;
    }
    if (shouldUseCatalogLiveData() && resolveCatalogDataset(screen)) {
      return <CatalogLiveTable screen={screen} />;
    }
    return (
      <article className="platform-card platform-table-card">
        <p className="maps-settings-lead" role="status">
          No live list API is wired for this screen. Design fixtures are disabled.
        </p>
        <div className="platform-table-scroll">
          <table aria-label={`${screen.title} records`}>
            <thead>
              <tr>{columns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={Math.max(columns.length, 1)}>Live data unavailable for this route.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    );
  }
  return <FixtureDenseTable screen={screen} rows={rows} columns={columns} />;
}

function Dashboard({ screen }: { screen: AdminScreen }) {
  return <div className="platform-dashboard"><Metrics metrics={screen.metrics}/><div className="platform-dashboard-grid"><article className="platform-card platform-chart"><header><h2>{screen.batch==='K'?'Income Overview':screen.batch==='M'?'Delivery Overview':screen.batch==='O'?'Sign-in Overview':'Performance Over Time'}</h2><button type="button">This Month⌄</button></header><Bars/></article><article className="platform-card platform-chart platform-donut-card"><h2>{screen.batch==='M'?'By Channel':screen.batch==='O'?'Alerts by Severity':'By Category'}</h2><div><Donut value={screen.metrics?.[0]?.value}/><ul>{(screen.items??[]).slice(0,5).map((item,index)=><li key={item}><i className={`tone-${index}`}/><span>{item.split(' — ')[0]}</span><strong>{item.split(' — ')[1]}</strong></li>)}</ul></div></article></div><div className="platform-bottom-grid"><article className="platform-card platform-list"><header><h2>{screen.batch==='M'?'Recent Campaigns':screen.batch==='O'?'Recent Security Alerts':'Top Results'}</h2><button type="button">View all</button></header>{(screen.items??[]).slice(0,6).map((item,index)=><div key={item}><span className="platform-list-icon">{index+1}</span><b>{item.split(' — ')[0]}</b><strong>{item.split(' — ')[1]}</strong></div>)}</article><article className="platform-card platform-actions"><h2>Quick Actions</h2>{['Create Record','Open Queue','Generate Report','View Analytics'].map((item,index)=><button type="button" key={item}><span>{['＋','▣','▤','◇'][index]}</span>{item}</button>)}</article></div></div>;
}

function Detail({ screen }: { screen: AdminScreen }) {
  const publication = screen.batch==='J';
  return <div className="platform-detail"><article className="platform-card platform-detail-hero">{publication&&<div className="publication-cover small"><span>WALKING IN</span><strong>DOMINION</strong></div>}<div><span className="platform-overline">{publication?'Publication':'Record'} detail</span><h2>{screen.title}</h2><p>{screen.subtitle}</p><Badge value={screen.details?.Status??'Active'}/></div></article>{screen.tabs&&<PlatformTabs tabs={screen.tabs}/>}<div className="platform-detail-grid"><article className="platform-card platform-definition"><h3>Information</h3><dl>{Object.entries(screen.details??{}).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{key==='Status'?<Badge value={value}/>:value}</dd></div>)}</dl></article><article className="platform-card platform-detail-chart"><h3>Summary</h3>{screen.metrics&&<Metrics metrics={screen.metrics}/>}<Bars compact/><button className="platform-primary" type="button">{screen.action??'View Report'}</button></article></div></div>;
}

function Workflow({ screen }: { screen: AdminScreen }) {
  return <div className="platform-workflow"><aside className="platform-card platform-workflow-rail" aria-label="Publication workflow">{(screen.tabs??[]).map((tab,index)=><div className={tab===screen.title?'active':index<2?'done':''} key={tab}><span>{index<2?'✓':index+1}</span><b>{tab}</b></div>)}</aside><article className="platform-card platform-review"><header><div><span className="platform-overline">Review notes</span><h2>{screen.title}</h2><p>{screen.subtitle}</p></div><button type="button">Download Manuscript</button></header><div className="platform-review-score"><span>Overall Assessment</span><strong>★★★★★</strong></div>{Object.entries(screen.details??{}).map(([key,value])=><div className="platform-review-row" key={key}><span>{key}</span><b>{value}</b></div>)}<label><span>Comments</span><textarea defaultValue="The work is clear, accurate and ready to continue to the next publication stage."/></label><footer><button type="button">Request Revisions</button><button className="platform-primary" type="button">{screen.action}</button></footer></article></div>;
}

function Form({ screen }: { screen: AdminScreen }) {
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
          <aside className="platform-summary"><h3>Summary</h3>{screen.items.map(item => <p key={item}><span>{item.split(' — ')[0]}</span><strong>{item.split(' — ')[1]}</strong></p>)}</aside>
        )}
        <AdminWizardFooter wizard={wizard} nextLabel={screen.action} finishLabel={screen.action ?? 'Submit'} primaryClassName="platform-primary" secondaryClassName="ghost-button" />
      </article>
    </div>
  );
}

function FixtureSettings({ screen }: { screen: AdminScreen }) {
  return <div className="platform-settings"><aside className="platform-card"><button className="active" type="button">General</button>{(screen.tabs??['Configuration','Policies','Advanced']).slice(1).map(tab=><button type="button" key={tab}>{tab}</button>)}<button type="button">Integrations</button><button type="button">Maintenance</button></aside><article className="platform-card platform-settings-body"><div className="platform-form-grid">{Object.entries(screen.details??{}).map(([label,value])=><label key={label}><span>{label}</span>{/enabled|active/i.test(value)?<span className="platform-toggle"><input type="checkbox" defaultChecked/><i/></span>:<input defaultValue={value}/>}</label>)}</div><h3>Configuration Rules</h3>{(screen.items??[]).map((item,index)=><div className="platform-setting-row" key={item}><span>{item.split(' — ')[0]}</span><b>{item.split(' — ')[1]}</b><span className="platform-toggle"><input aria-label={`Toggle ${item}`} type="checkbox" defaultChecked={index<3}/><i/></span></div>)}<footer><button className="platform-primary" type="button">{screen.action}</button></footer></article></div>;
}

function KcaSettingsPanel() {
  const tabs = ['General', 'Admissions', 'Curriculum', 'Certificates'];
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [saved, setSaved] = useState(false);

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    window.localStorage.setItem('fhc-admin-kca-settings-draft', JSON.stringify(values));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  return (
    <form className="platform-settings" onSubmit={save}>
      <aside className="platform-card" aria-label="KCA settings sections">
        {tabs.map((tab) => (
          <button className={activeTab === tab ? 'active' : ''} type="button" key={tab} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </aside>
      <article className="platform-card platform-settings-body">
        <header className="platform-settings-heading">
          <span className="platform-overline">KINGDOM CITIZENS ACADEMY</span>
          <h2>{activeTab} Settings</h2>
          <p>Configure the operational defaults used by KCA administrators. Changes are saved as a local draft until a KCA settings API is available.</p>
        </header>

        {activeTab === 'General' && (
          <div className="platform-form-grid">
            <label><span>Academy name</span><input name="academy_name" defaultValue="Kingdom Citizens Academy" required /></label>
            <label><span>Default currency</span><select name="currency" defaultValue="NGN"><option value="NGN">Nigerian Naira (NGN)</option><option value="USD">US Dollar (USD)</option></select></label>
            <label><span>Academic year label</span><input name="academic_year" defaultValue="KCA 2026" required /></label>
            <label><span>Default timezone</span><select name="timezone" defaultValue="Africa/Lagos"><option value="Africa/Lagos">West Africa Time (Africa/Lagos)</option><option value="UTC">UTC</option></select></label>
          </div>
        )}

        {activeTab === 'Admissions' && (
          <div className="platform-form-grid">
            <label><span>Application status</span><select name="admissions_status" defaultValue="Open"><option>Open</option><option>Closed</option><option>Invitation only</option></select></label>
            <label><span>Minimum applicant age</span><input name="minimum_age" type="number" min="1" defaultValue="16" /></label>
            <label><span>Require leader recommendation</span><span className="platform-toggle"><input name="leader_recommendation" type="checkbox" defaultChecked /><i /></span></label>
            <label><span>Require guardian consent for minors</span><span className="platform-toggle"><input name="guardian_consent" type="checkbox" defaultChecked /><i /></span></label>
          </div>
        )}

        {activeTab === 'Curriculum' && (
          <div className="platform-form-grid">
            <label><span>Module completion threshold (%)</span><input name="module_completion_threshold" type="number" min="0" max="100" defaultValue="70" /></label>
            <label><span>Lesson attendance threshold (%)</span><input name="attendance_threshold" type="number" min="0" max="100" defaultValue="75" /></label>
            <label><span>Allow prerequisite overrides</span><span className="platform-toggle"><input name="allow_prerequisite_overrides" type="checkbox" /><i /></span></label>
            <label><span>Show unpublished modules to students</span><span className="platform-toggle"><input name="show_unpublished_modules" type="checkbox" /><i /></span></label>
          </div>
        )}

        {activeTab === 'Certificates' && (
          <div className="platform-form-grid">
            <label><span>Certificate prefix</span><input name="certificate_prefix" defaultValue="KCA" /></label>
            <label><span>Certificate validity period</span><select name="certificate_validity" defaultValue="No expiry"><option>No expiry</option><option>1 year</option><option>2 years</option></select></label>
            <label><span>Require all modules completed</span><span className="platform-toggle"><input name="require_all_modules" type="checkbox" defaultChecked /><i /></span></label>
            <label><span>Require final assessment</span><span className="platform-toggle"><input name="require_final_assessment" type="checkbox" defaultChecked /><i /></span></label>
          </div>
        )}

        <footer className="form-footer">
          <span className="field-help">{saved ? 'KCA settings draft saved in this browser.' : 'No server-side KCA settings endpoint is currently available.'}</span>
          <button className="platform-primary" type="submit">Save local draft</button>
        </footer>
      </article>
    </form>
  );
}

function ConfigurationsSettingsPanel() {
  const [items, setItems] = useState<PlatformConfiguration[]>([]);
  const [message, setMessage] = useState('Loading platform configurations…');
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState('');
  const [valueType, setValueType] = useState<'string' | 'integer' | 'boolean' | 'json'>('string');
  const [classification, setClassification] = useState<'internal' | 'confidential'>('internal');
  const [environment, setEnvironment] = useState('production');
  const [value, setValue] = useState('');

  const refresh = useCallback(async () => {
    if (!platformApiConfigured()) {
      setMessage('Set NEXT_PUBLIC_FHC_API_URL to load platform configurations.');
      return;
    }
    setBusy(true);
    try {
      const result = await listConfigurations({ per_page: 50, sort: 'key' });
      setItems(result.items);
      setMessage(result.items.length ? `Loaded ${result.pagination?.total ?? result.items.length} configuration(s).` : 'No configurations yet. Save one below.');
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Could not load configurations. Confirm session, scope, and recent MFA.'));
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
      setMessage('Configure NEXT_PUBLIC_FHC_API_URL to persist configurations.');
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
      setMessage('Configuration saved.');
      await refresh();
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Save failed. Confirm platform.configuration.manage and recent MFA.'));
      setBusy(false);
    }
  }

  return (
    <form className="card settings-card ministry-settings" onSubmit={onSave}>
      <p className="maps-settings-lead">{message}</p>
      <div className="platform-setting-row" style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        {items.map((item) => (
          <div key={item.id} className="platform-setting-row">
            <span>{item.key}</span>
            <b>
              {item.classification === 'confidential'
                ? item.has_value
                  ? '•••• (confidential)'
                  : '—'
                : String(item.value ?? '—')}
            </b>
            <span>{item.environment} · {item.value_type}</span>
          </div>
        ))}
      </div>
      <div className="form-grid">
        <label className="full"><span>Key</span><input value={key} onChange={(e) => setKey(e.target.value)} placeholder="church.first_timer.follow_up_hours" disabled={busy} required /></label>
        <label><span>Value type</span><select value={valueType} onChange={(e) => setValueType(e.target.value as typeof valueType)} disabled={busy}><option value="string">string</option><option value="integer">integer</option><option value="boolean">boolean</option><option value="json">json</option></select></label>
        <label><span>Classification</span><select value={classification} onChange={(e) => setClassification(e.target.value as typeof classification)} disabled={busy}><option value="internal">internal</option><option value="confidential">confidential</option></select></label>
        <label><span>Environment</span><input value={environment} onChange={(e) => setEnvironment(e.target.value)} disabled={busy} required /></label>
        <label className="full"><span>Value</span><input value={value} onChange={(e) => setValue(e.target.value)} placeholder={valueType === 'boolean' ? 'true / false' : valueType === 'json' ? '{"key":"value"}' : 'Value'} disabled={busy} required={classification === 'internal' || valueType !== 'string'} /></label>
      </div>
      <div className="form-footer">
        <button className="ghost-button" type="button" onClick={() => void refresh()} disabled={busy}>Refresh</button>
        <button className="primary-button" type="submit" disabled={busy}>Save Changes</button>
      </div>
    </form>
  );
}

function FeatureFlagsSettingsPanel() {
  const [items, setItems] = useState<FeatureFlag[]>([]);
  const [message, setMessage] = useState('Loading feature flags…');
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState('');
  const [environment, setEnvironment] = useState('production');
  const [rollout, setRollout] = useState('100');

  const refresh = useCallback(async () => {
    if (!platformApiConfigured()) {
      setMessage('Set NEXT_PUBLIC_FHC_API_URL to load feature flags.');
      return;
    }
    setBusy(true);
    try {
      const result = await listFeatureFlags({ per_page: 50, sort: 'key' });
      setItems(result.items);
      setMessage(result.items.length ? `Loaded ${result.pagination?.total ?? result.items.length} feature flag(s).` : 'No feature flags yet. Save one below.');
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Could not load feature flags. Confirm session, scope, and recent MFA.'));
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
      setMessage('Configure NEXT_PUBLIC_FHC_API_URL to persist feature flags.');
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
      setMessage('Feature flag saved.');
      await refresh();
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Save failed. Confirm platform.feature_flags.manage and recent MFA.'));
      setBusy(false);
    }
  }

  async function toggleFlag(flag: FeatureFlag) {
    if (!platformApiConfigured()) return;
    setBusy(true);
    try {
      const updated = flag.enabled ? await disableFeatureFlag(flag.id) : await enableFeatureFlag(flag.id);
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setMessage(`${updated.key} is now ${updated.enabled ? 'enabled' : 'disabled'}.`);
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Enable/disable failed. Confirm permissions and recent MFA.'));
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
                aria-label={`Toggle ${flag.key}`}
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
        <label className="full"><span>Key</span><input value={key} onChange={(e) => setKey(e.target.value)} placeholder="church.follow_up_alerts" disabled={busy} required /></label>
        <label><span>Environment</span><input value={environment} onChange={(e) => setEnvironment(e.target.value)} disabled={busy} required /></label>
        <label><span>Rollout %</span><input type="number" min={0} max={100} value={rollout} onChange={(e) => setRollout(e.target.value)} disabled={busy} required /></label>
      </div>
      <div className="form-footer">
        <button className="ghost-button" type="button" onClick={() => void refresh()} disabled={busy}>Refresh</button>
        <button className="primary-button" type="submit" disabled={busy}>Save Changes</button>
      </div>
    </form>
  );
}

function ObjectStorageSettingsPanel() {
  const [status, setStatus] = useState<ObjectStorageStatus | null>(null);
  const [message, setMessage] = useState('Loading object storage configuration…');
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

  const refresh = useCallback(async () => {
    if (!platformApiConfigured()) {
      setMessage('Configure the admin API base URL to manage the demo dataset.');
      return;
    }
    try {
      const data = await getDemoDataset();
      setStatus(data);
      setMessage(data.seeded ? 'Demonstration data is currently loaded.' : 'No demonstration dataset is loaded.');
    } catch (error) {
      setStatus(null);
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
      setMessage('Choose an image and enter the record public ID (ULID) to attach it to.');
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
            <select value={attachableType} onChange={(event) => setAttachableType(event.target.value)} disabled={busy}>
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
            <span>Record public ID</span>
            <input value={attachableId} onChange={(event) => setAttachableId(event.target.value)} placeholder="ULID from the record" disabled={busy} />
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

function Settings({ screen }: { screen: AdminScreen }) {
  const fixtures = designFixturesEnabled();
  const route = screen.route;

  if (!fixtures) {
    if (route.includes('/settings/maps')) return <MapsSettingsPanel />;
    if (route.includes('/settings/branding')) return <BrandingSettingsPanel />;
    if (route.includes('/settings/kca')) return <KcaSettingsPanel />;
    if (route.includes('/settings/platform')) {
      return (
        <>
          <BrandingSettingsPanel />
          <DemoDatasetPanel />
          <ConfigurationsSettingsPanel />
        </>
      );
    }
    if (route.includes('/settings/feature-flags')) return <FeatureFlagsSettingsPanel />;
    if (route.includes('/settings/media')) return <MediaLibraryPanel />;
    if (route.includes('/settings/uploads')) return <ObjectStorageSettingsPanel />;
    if (shouldUseCatalogLiveData() && resolveCatalogDataset(screen)) {
      const columns = screen.columns?.length ? screen.columns : CATALOG_NAME_COLUMNS;
      return <DenseTable screen={{ ...screen, columns }} columns={columns} />;
    }
    return (
      <div className="platform-settings">
        <article className="platform-card platform-settings-body">
          <p className="maps-settings-lead" role="status">
            No live platform settings API for this screen. Maps, configurations, feature flags, and object storage are wired; other settings remain unavailable without inventing endpoints.
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

function Analytics({ screen }: { screen: AdminScreen }) {
  const ai=screen.nav==='report-ai';
  if(ai) return <div className="platform-ai"><article className="platform-card platform-ai-sidebar"><span className="platform-ai-orb">✦</span><h2>{screen.title}</h2><p>AI-assisted insights grounded in ministry reporting data.</p>{['Overview','Content AI','Performance AI','Ask AI'].map((item,index)=><button className={index===0?'active':''} type="button" key={item}>{item}</button>)}</article><article className="platform-card platform-ai-body"><h2>Insights</h2><div className="platform-ai-grid">{(screen.items??[]).map((item,index)=><article key={item}><span>{['◎','◇','▤','✦'][index]}</span><h3>{item.split(' — ')[0]}</h3><strong>{['56','18','81%','2,345'][index]}</strong><p>Updated from the latest approved analytics data.</p><button type="button">{item.split(' — ')[1]}</button></article>)}</div><label><input aria-label={`Ask ${screen.title}`} placeholder={`Ask ${screen.title}...`}/><button type="button">↑</button></label></article></div>;
  return <div className="platform-analytics"><Metrics metrics={screen.metrics}/><div className="platform-analytics-grid"><article className="platform-card platform-chart"><h2>Performance Trend</h2><Bars/></article><article className="platform-card platform-chart"><h2>By Category</h2><div className="platform-chart-split"><Donut value={screen.metrics?.[0]?.value}/><ul>{(screen.items??[]).slice(0,5).map((item,index)=><li key={item}><i className={`tone-${index}`}/><span>{item.split(' — ')[0]}</span><b>{item.split(' — ')[1]}</b></li>)}</ul></div></article><article className="platform-card platform-list wide"><h2>Top Results</h2>{(screen.items??[]).map((item,index)=><div key={item}><span>{index+1}</span><b>{item.split(' — ')[0]}</b><strong>{item.split(' — ')[1]}</strong></div>)}</article></div></div>;
}

function Restricted({ screen }: { screen: AdminScreen }) {
  return <div className="platform-restricted"><div className="platform-restricted-banner"><span>🔒</span><div><strong>Restricted information</strong><p>Access is audited and limited to explicitly authorized personnel.</p></div></div>{screen.rows?<DenseTable screen={screen}/>:<Detail screen={screen}/>}</div>;
}

export function PlatformScreenContent({ screen }: { screen: AdminScreen }) {
  let content;
  switch(screen.kind){
    case 'dashboard': content=<Dashboard screen={screen}/>; break;
    case 'table': content=<><Metrics metrics={screen.metrics}/><DenseTable screen={screen}/></>; break;
    case 'detail': case 'profile': return <Detail screen={screen}/>;
    case 'workflow': case 'approval': content=<Workflow screen={screen}/>; break;
    case 'form': case 'wizard': content=<Form screen={screen}/>; break;
    case 'settings': content=<Settings screen={screen}/>; break;
    case 'operations': content=<Operations screen={screen}/>; break;
    case 'reports':
    case 'finance': {
      const catalogLive = !shouldUseDesignFixtures() && shouldUseCatalogLiveData() && resolveCatalogDataset(screen);
      if (catalogLive) {
        const columns = screen.columns?.length ? screen.columns : CATALOG_FEED_COLUMNS;
        content = <><Metrics metrics={screen.metrics}/><DenseTable screen={{...screen, columns}} columns={columns}/></>;
      } else {
        content = <Analytics screen={screen}/>;
      }
      break;
    }
    case 'feed': content=<DenseTable screen={{...screen,columns:CATALOG_FEED_COLUMNS}} rows={screen.rows} columns={CATALOG_FEED_COLUMNS}/>; break;
    case 'restricted': content=<Restricted screen={screen}/>; break;
    default: content=<Analytics screen={screen}/>;
  }
  const needsTabs = Boolean(screen.tabs?.length && ['operations','feed','restricted','table','reports','finance'].includes(screen.kind));
  return <>{needsTabs&&<PlatformTabs tabs={screen.tabs}/>} {content}</>;
}
