import type { AdminScreen, Metric, Row } from '../lib/admin-routes';

const missionPalette = ['#4318ff', '#6f52ed', '#0ea36c', '#f59e0b', '#ef4444'];

function MissionStatus({ value }: { value: string }) {
  const state = value.toLowerCase().replaceAll(' ', '-').replaceAll('(', '').replaceAll(')', '');
  return <span className={`mission-status mission-status-${state}`}>{value}</span>;
}

function MissionMetrics({ metrics = [] }: { metrics?: Metric[] }) {
  return <div className="mission-metrics">{metrics.map((metric, index) => <article className="mission-metric-card" key={metric.label}>
    <div className={`mission-metric-icon mission-metric-icon-${index % 4}`} aria-hidden="true">{['✦', '◇', '↗', '◎'][index % 4]}</div>
    <div><span>{metric.label}</span><strong>{metric.value}</strong></div>
    {metric.trend && <em>{metric.trend}</em>}
  </article>)}</div>;
}

function MissionTabs({ tabs = [], active = 0 }: { tabs?: string[]; active?: number }) {
  return <nav className="mission-tabs" aria-label="Screen sections" role="tablist">{tabs.map((tab, index) => <button className={index === active ? 'active' : ''} type="button" role="tab" aria-selected={index === active} tabIndex={index === active ? 0 : -1} key={tab}>{tab}</button>)}</nav>;
}

function MissionToolbar({ action, tabs }: { action?: string; tabs?: string[] }) {
  return <div className="mission-toolbar">
    <div className="mission-filter-set">{(tabs ?? ['All Statuses', 'All Locations']).slice(0, 3).map(item => <button type="button" aria-label={`Filter by ${item}`} key={item}>{item}<span aria-hidden="true">⌄</span></button>)}</div>
    <label className="mission-search"><span aria-hidden="true">⌕</span><input aria-label="Search records" placeholder="Search..." /></label>
    {action && <button className="mission-primary-button" type="button">{action}</button>}
  </div>;
}

function MissionTable({ screen }: { screen: AdminScreen }) {
  const rows = screen.rows ?? [];
  const columns = screen.columns ?? Object.keys(rows[0] ?? {});
  return <section className="mission-table-card">
    <MissionToolbar action={screen.action} tabs={screen.tabs}/>
    <div className="mission-table-scroll"><table className="mission-table" aria-label={`${screen.title} records`}>
      <thead><tr>{columns.map(column => <th scope="col" key={column}>{column}</th>)}<th scope="col">Actions</th></tr></thead>
      <tbody>{rows.map((row, rowIndex) => <tr key={`${screen.id}-${rowIndex}`}>{columns.map((column, columnIndex) => <td key={column}>{columnIndex === 0 ? <span className="mission-primary-cell"><i aria-hidden="true">{String(row[column] ?? '?').slice(0, 1)}</i><b>{row[column]}</b></span> : column.toLowerCase().includes('status') ? <MissionStatus value={row[column] ?? 'Active'}/> : row[column]}</td>)}<td><button className="mission-row-action" type="button" aria-label={`View ${String(row[columns[0]] ?? 'record')}`}>View</button></td></tr>)}</tbody>
    </table></div>
    <footer className="mission-table-footer"><span>Showing 1 to {rows.length} of {Math.max(rows.length, 24)} records</span><div role="navigation" aria-label={`${screen.title} pagination`}><button type="button" aria-label="Previous page">‹</button><button className="active" type="button" aria-label="Page 1" aria-current="page">1</button><button type="button" aria-label="Page 2">2</button><button type="button" aria-label="Page 3">3</button><button type="button" aria-label="Next page">›</button></div></footer>
  </section>;
}

function MissionLineChart({ title = 'Souls Over Time' }: { title?: string }) {
  return <article className="mission-chart-card">
    <header><h3>{title}</h3><span>This Month⌄</span></header>
    <svg className="mission-line-chart" viewBox="0 0 520 210" role="img" aria-label={`${title} chart`}>
      <defs><linearGradient id="mission-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#5530e8" stopOpacity=".22"/><stop offset="1" stopColor="#5530e8" stopOpacity="0"/></linearGradient></defs>
      {[30, 75, 120, 165].map(y => <line x1="28" x2="500" y1={y} y2={y} key={y}/>) }
      <path className="mission-chart-area" d="M28 177 L98 134 L168 142 L238 103 L308 118 L378 90 L448 76 L500 40 L500 190 L28 190 Z" fill="url(#mission-area)"/>
      <polyline points="28,177 98,134 168,142 238,103 308,118 378,90 448,76 500,40"/>
      {[['28','177'],['98','134'],['168','142'],['238','103'],['308','118'],['378','90'],['448','76'],['500','40']].map(([x,y]) => <circle cx={x} cy={y} r="5" key={`${x}-${y}`}/>) }
    </svg>
    <div className="mission-chart-labels"><span>May 1</span><span>May 5</span><span>May 10</span><span>May 15</span><span>May 20</span></div>
  </article>;
}

function MissionDonut({ title, items, center = '12,458' }: { title: string; items: string[]; center?: string }) {
  return <article className="mission-donut-card"><h3>{title}</h3><div className="mission-donut-layout">
    <div className="mission-donut" role="img" aria-label={`${title} donut chart. Total ${center}. ${items.join(', ')}`}><div><strong>{center}</strong><span>Total</span></div></div>
    <ul>{items.map((item, index) => <li key={item}><i style={{ backgroundColor: missionPalette[index % missionPalette.length] }}/><span>{item.split(' — ')[0]}</span><b>{item.split(' — ')[1] ?? `${Math.max(8, 48 - index * 9)}%`}</b></li>)}</ul>
  </div></article>;
}

function MissionDashboard({ screen }: { screen: AdminScreen }) {
  return <div className="mission-dashboard">
    <MissionMetrics metrics={screen.metrics}/>
    <div className="mission-dashboard-charts"><MissionLineChart/><MissionDonut title="Souls by Status" center="12,458" items={['Won — 44%', 'Following Up — 31%', 'Discipled — 19%', 'Other — 6%']}/></div>
    <div className="mission-dashboard-bottom">
      <article className="mission-list-card"><header><h3 aria-level={2}>Top Crusades</h3><button type="button">View all crusades</button></header>{(screen.rows ?? []).map((row, index) => <div className="mission-ranked-row" key={row['Crusade Name']}><span>{index + 1}</span><b>{row['Crusade Name']}</b><strong>{row.Souls}</strong></div>)}</article>
      <article className="mission-action-card"><header><h3 aria-level={2}>Quick Actions</h3></header><div>{(screen.items ?? []).map((item, index) => <button type="button" key={item}><i aria-hidden="true">{['＋', '♙', '✉', '▤'][index]}</i><span>{item}</span></button>)}</div></article>
    </div>
  </div>;
}

function MissionDetailHero({ screen, badge }: { screen: AdminScreen; badge?: string }) {
  return <><section className="mission-detail-hero"><div className="mission-detail-mark">{screen.title.slice(0, 1)}</div><div><div className="mission-title-line"><h2>{screen.title}</h2><MissionStatus value={badge ?? 'Active'}/></div><p>{screen.subtitle}</p></div></section>{screen.tabs && <MissionTabs tabs={screen.tabs}/>}</>;
}

function MissionDefinitionList({ details = {} }: { details?: Row }) {
  return <dl className="mission-definition-list">{Object.entries(details).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function CrusadeDetail({ screen }: { screen: AdminScreen }) {
  return <div className="mission-crusade-detail">
    <MissionDetailHero screen={screen} badge="Completed"/>
    <MissionMetrics metrics={screen.metrics}/>
    <div className="mission-detail-grid"><article className="mission-panel"><h3>Crusade Details</h3><MissionDefinitionList details={screen.details}/></article><MissionLineChart title="Soul Trend"/></div>
    <div className="mission-link-grid">{(screen.items ?? []).map((item, index) => <button type="button" key={item}><i aria-hidden="true">{['♙', '↻', '▤', '₦'][index]}</i><span>{item}</span><b aria-hidden="true">→</b></button>)}</div>
  </div>;
}

function MissionWizard({ screen }: { screen: AdminScreen }) {
  const details = Object.entries(screen.details ?? {});
  return <div className="mission-wizard">
    <div className="mission-stepper" role="list" aria-label="Crusade creation progress">{(screen.tabs ?? []).map((tab, index) => <div role="listitem" aria-current={index === 0 ? 'step' : undefined} className={index === 0 ? 'active' : ''} key={tab}><span aria-hidden="true">{index + 1}</span><b>{tab}</b></div>)}</div>
    <section className="mission-form-card"><div className="mission-form-grid">{details.map(([label, value], index) => <label className={index === details.length - 1 ? 'mission-field-wide' : ''} key={label}><span>{label}{index < 8 && <em aria-hidden="true">*</em>}</span>{label === 'Description' ? <textarea required={index < 8} defaultValue={value}/> : /Date/.test(label) ? <input required={index < 8} type="text" defaultValue={value}/> : /Location|Type|Focus/.test(label) ? <select required={index < 8} defaultValue={value}><option>{value}</option></select> : <input required={index < 8} defaultValue={value}/>}</label>)}</div><footer><button className="mission-secondary-button" type="button">Cancel</button><button className="mission-primary-button" type="button">{screen.action}</button></footer></section>
  </div>;
}

function InvitationReview({ screen }: { screen: AdminScreen }) {
  const entries = Object.entries(screen.details ?? {});
  return <div className="mission-invitation-review">
    <div className="mission-review-progress" role="list" aria-label="Invitation review progress"><span role="listitem" className="done" aria-label="Invitation details complete">✓</span><i aria-hidden="true"/><span role="listitem" className="done" aria-label="Invitee message complete">✓</span><i aria-hidden="true"/><span role="listitem" className="active" aria-current="step" aria-label="Step 3, Review">3</span><b>Review</b></div>
    <div className="mission-review-columns">
      <article className="mission-panel"><h3>Invitation Details</h3><MissionDefinitionList details={Object.fromEntries(entries.slice(0, 8))}/><h4>Documents</h4><div className="mission-document-list">{(screen.items ?? []).map(item => <button type="button" key={item}>▧ <span>{item}</span><b>View</b></button>)}</div></article>
      <article className="mission-panel"><h3>Invitee Message</h3><blockquote>{screen.details?.Message}</blockquote><label className="mission-response-field"><span>Response note</span><textarea placeholder="Add an optional note..."/></label></article>
    </div>
    <footer className="mission-review-actions"><button className="mission-danger-outline" type="button">Decline</button><button className="mission-secondary-button" type="button">Request More Info</button><button className="mission-success-button" type="button">{screen.action}</button></footer>
  </div>;
}

function PlanningView({ screen }: { screen: AdminScreen }) {
  const details = Object.entries(screen.details ?? {});
  return <div className="mission-planning"><MissionTabs tabs={screen.tabs}/><div className="mission-planning-grid">
    <article className="mission-panel mission-planning-summary"><span className="mission-progress-ring" role="progressbar" aria-label="Planning completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={100}>100%</span><h3>7 / 7 Steps Complete</h3><p>Planning is complete and ready for execution.</p>{(screen.items ?? []).map(item => <div key={item}><i aria-hidden="true">✓</i><span>{item.split(' — ')[0]}</span><MissionStatus value={item.split(' — ')[1]}/></div>)}</article>
    <article className="mission-panel mission-planning-details"><h3>General Plan</h3>{details.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</article>
  </div></div>;
}

function TeamDetail({ screen }: { screen: AdminScreen }) {
  return <div className="mission-team-detail"><MissionDetailHero screen={screen}/><MissionMetrics metrics={screen.metrics}/><div className="mission-team-grid">
    <article className="mission-panel"><h3>Team Description</h3><p>{screen.details?.Description}</p><div className="mission-team-leader"><span>BD</span><div><small>Team Leader</small><strong>{screen.details?.Leader}</strong></div><MissionStatus value="Leader"/></div></article>
    <article className="mission-panel"><header><h3>Team Members</h3><button type="button">View all members</button></header><div className="mission-member-list">{(screen.items ?? []).map(item => <div key={item}><span>{item.slice(0, 1)}</span><b>{item.split(' — ')[0]}</b><small>{item.split(' — ')[1]}</small></div>)}</div></article>
  </div></div>;
}

function SoulDetail({ screen }: { screen: AdminScreen }) {
  const entries = Object.entries(screen.details ?? {});
  return <div className="mission-soul-detail">
    <MissionDetailHero screen={screen} badge="New"/>
    <div className="mission-soul-layout"><article className="mission-panel mission-person-card"><div className="mission-person-avatar">CO</div><h3>{screen.title}</h3><p>Won at Lagos Mega Crusade</p><MissionStatus value="New Soul"/><div className="mission-person-actions">{(screen.items ?? []).map(item => <button type="button" key={item}>{item}</button>)}</div></article>
      <article className="mission-panel"><h3>Information</h3><dl className="mission-profile-details">{entries.map(([label, value]) => <div className={label === 'Spiritual Information' ? 'wide' : ''} key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><footer><button className="mission-danger-outline" type="button">Declare</button><button className="mission-secondary-button" type="button">Discipleship Status</button><button className="mission-primary-button" type="button">Register</button></footer></article>
    </div>
  </div>;
}

function MissionBars({ items }: { items: string[] }) {
  return <div className="mission-bars">{items.map((item, index) => { const [label, value = `${85 - index * 9}%`] = item.split(' — '); const numericValue = Number(value.replace(/[^0-9.]/g, '')); return <div key={item}><span>{label}</span><i role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number.isFinite(numericValue) ? numericValue : 0}><b style={{ width: value }}/></i><strong>{value}</strong></div>; })}</div>;
}

function DistributionView({ screen }: { screen: AdminScreen }) {
  return <div className="mission-distribution"><MissionMetrics metrics={screen.metrics}/><div className="mission-analytics-grid">
    <MissionDonut title="Distribution by Team" center="245" items={screen.items ?? []}/>
    <article className="mission-panel"><header><h3>Recent Distributions</h3><button type="button">View all</button></header><div className="mission-compact-table">{(screen.rows ?? []).map(row => <div key={row.Crusade}><b>{row.Crusade}</b><span>{row.Mentor}</span><strong>{row.Souls} souls</strong><small>{row.Date}</small></div>)}</div></article>
  </div><button className="mission-primary-button mission-full-action" type="button">{screen.action}</button></div>;
}

function FollowUpView({ screen }: { screen: AdminScreen }) {
  return <div className="mission-follow-up"><MissionMetrics metrics={screen.metrics}/><div className="mission-analytics-grid">
    <MissionDonut title="Follow-Up by Status" center="1,842" items={screen.items ?? []}/>
    <article className="mission-panel mission-overdue"><header><h3>Overdue Follow-Ups</h3><button type="button">View all</button></header>{(screen.rows ?? []).map(row => <div key={row.Name}><span className="mission-mini-avatar">{row.Name?.slice(0, 1)}</span><b>{row.Name}</b><small>{row.Mentor}</small><MissionStatus value={row.Status ?? 'Overdue'}/></div>)}</article>
  </div><button className="mission-primary-button mission-full-action" type="button">{screen.action}</button></div>;
}

function GapDashboard({ screen }: { screen: AdminScreen }) {
  const items = screen.items ?? [];
  const midpoint = Math.ceil(items.length / 2);
  return <div className="mission-gap-dashboard"><MissionMetrics metrics={screen.metrics}/><div className="mission-gap-grid">
    <article className="mission-panel"><h3>{screen.id === 'I-19' ? 'Gap by Crusade' : 'Follow-Up Coverage by Crusade'}</h3><MissionBars items={items.slice(0, midpoint)}/></article>
    <MissionDonut title="Gap by Days" center="768" items={items.slice(midpoint)}/>
  </div>{screen.action && <button className="mission-primary-button mission-full-action" type="button">{screen.action}</button>}</div>;
}

function PartnerDetail({ screen }: { screen: AdminScreen }) {
  const details = Object.entries(screen.details ?? {});
  return <div className="mission-partner-detail"><MissionDetailHero screen={screen}/><div className="mission-partner-grid">
    <article className="mission-panel mission-partner-profile"><div className="mission-partner-logo">BSN</div><h3>{screen.title}</h3><p>Making the Bible available and affordable.</p><button className="mission-secondary-button" type="button">Visit website ↗</button><div><MissionStatus value="Strategic Partner"/></div></article>
    <article className="mission-panel"><h3>Partner Information</h3><MissionDefinitionList details={Object.fromEntries(details.slice(0, 6))}/></article>
    <article className="mission-panel mission-partnership"><h3>About Partner</h3><p>{screen.details?.['About Partner']}</p><h3>Current Partnership</h3><ul>{String(screen.details?.['Current Partnership'] ?? '').split(';').map(item => <li key={item}>✓ {item.trim()}</li>)}</ul></article>
  </div></div>;
}

function ReportsView({ screen }: { screen: AdminScreen }) {
  const items = screen.items ?? [];
  return <div className="mission-reports"><div className="mission-report-grid"><article className="mission-panel"><h3>Popular Reports</h3>{items.slice(0, 7).map(item => <button type="button" key={item}><span>▧</span><b>{item}</b><i>→</i></button>)}</article><article className="mission-panel"><h3>Recent Reports</h3>{items.slice(7).map((item, index) => <div className="mission-report-item" key={item}><span>▤</span><div><b>{item}</b><small>{['May 15, 2024', 'May 13, 2024', 'May 10, 2024', 'May 2, 2024'][index]}</small></div><button type="button">Download</button></div>)}</article></div><button className="mission-primary-button mission-full-action" type="button">{screen.action}</button></div>;
}

function MissionAssistant({ screen }: { screen: AdminScreen }) {
  const suggestions = (screen.items ?? []).slice(0, 4);
  const insight = (screen.items ?? [])[4]?.replace('AI Insight — ', '');
  return <div className="mission-ai">
    <section className="mission-ai-hero"><div className="mission-ai-orb">✦</div><h2>How can I help your mission today?</h2><p>Ask for performance insights, projections, follow-up opportunities, or partner recommendations.</p><div className="mission-ai-chips">{suggestions.map(item => <button type="button" key={item}>{item}</button>)}</div></section>
    <article className="mission-ai-insight"><header><span aria-hidden="true">✦</span><div><small>AI Insight</small><strong>Follow-up opportunity detected</strong></div><MissionStatus value="Live"/></header><p>{insight}</p><div className="mission-ai-numbers"><span><b>312</b> souls overdue</span><span><b>6</b> mentors available</span><span><b>+18%</b> potential lift</span></div><button className="mission-secondary-button" type="button">View Details</button></article>
    <form className="mission-ai-composer" aria-label="Mission AI prompt"><input aria-label="Ask Mission AI" placeholder="Ask anything about missions..."/><button type="submit" aria-label="Send message">↑</button></form>
  </div>;
}

function GenericDetail({ screen }: { screen: AdminScreen }) {
  return <div className="mission-generic-detail"><MissionDetailHero screen={screen}/>{screen.metrics && <MissionMetrics metrics={screen.metrics}/>}<div className="mission-detail-grid"><article className="mission-panel"><h3>Overview</h3><MissionDefinitionList details={screen.details}/></article>{screen.items && <article className="mission-panel"><h3>Related Information</h3><div className="mission-member-list">{screen.items.map(item => <div key={item}><span>◇</span><b>{item}</b><small>View details</small></div>)}</div></article>}</div></div>;
}

export function MissionScreenContent({ screen }: { screen: AdminScreen }) {
  switch (screen.id) {
    case 'I-01': return <MissionDashboard screen={screen}/>;
    case 'I-03': return <CrusadeDetail screen={screen}/>;
    case 'I-04': return <MissionWizard screen={screen}/>;
    case 'I-06': return <InvitationReview screen={screen}/>;
    case 'I-07': return <PlanningView screen={screen}/>;
    case 'I-09': return <TeamDetail screen={screen}/>;
    case 'I-11': return <SoulDetail screen={screen}/>;
    case 'I-12': return <DistributionView screen={screen}/>;
    case 'I-14': return <FollowUpView screen={screen}/>;
    case 'I-15':
    case 'I-19': return <GapDashboard screen={screen}/>;
    case 'I-17': return <PartnerDetail screen={screen}/>;
    case 'I-20': return <ReportsView screen={screen}/>;
    case 'I-21': return <MissionAssistant screen={screen}/>;
    case 'I-02':
    case 'I-05':
    case 'I-08':
    case 'I-10':
    case 'I-13':
    case 'I-16':
    case 'I-18': return <><MissionMetrics metrics={screen.metrics}/><MissionTable screen={screen}/></>;
    default: return <GenericDetail screen={screen}/>;
  }
}
