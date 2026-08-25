import Link from 'next/link';
import Image from 'next/image';
import type { AccessDecision } from '../lib/access-control';
import { adminScreens, type AdminScreen, type Metric } from '../lib/admin-routes';
import { KcaScreenContent } from './kca-ui';
import { MissionScreenContent } from './mission-ui';

const navByBatch = {
  A: [
    ['dashboard', '⌂', 'Dashboard', '/admin'], ['scope', '◎', 'Global Scope', '/admin/scope'], ['command', '⌕', 'Command Centre', '/admin/command'],
    ['approvals', '✓', 'Approvals', '/admin/approvals'], ['alerts', '!', 'Alerts', '/admin/alerts'], ['notifications', '•', 'Notifications', '/admin/notifications'],
    ['activity', '↻', 'Activity', '/admin/activity'], ['audit', '▦', 'Audit', '/admin/audit'], ['tasks', '□', 'Tasks', '/admin/tasks'],
    ['reports', '▣', 'Reports', '/admin/kpi'], ['settings', '◇', 'Settings', '/admin/geography/settings'],
  ],
  B: [
    ['dashboard', '⌂', 'Dashboard', '/admin'], ['scope', '◎', 'Global Scope', '/admin/scope'], ['command', '⌕', 'Command Centre', '/admin/command'],
    ['users', '♙', 'Users', '/admin/users'], ['access', '◉', 'Roles & Permissions', '/admin/roles'], ['approvals', '✓', 'Approvals', '/admin/approvals'],
    ['activity', '▤', 'Content', '/admin/activity'], ['geography', '□', 'Churches', '/admin/geography/church-hierarchy'], ['tasks', '□', 'Events', '/admin/tasks'],
    ['reports', '▣', 'Giving', '/admin/kpi'], ['reports', '▣', 'Reports', '/admin/reports/country-performance'], ['settings', '◇', 'Settings', '/admin/geography/settings'],
  ],
  C: [
    ['dashboard', '⌂', 'Dashboard', '/admin'], ['users', '♙', 'Users', '/admin/users'], ['access', '◉', 'Roles & Permissions', '/admin/roles'],
    ['geography', '◎', 'Geography', '/admin/geography'], ['geography', '↳', 'Global Dashboard', '/admin/geography'], ['geography', '·', 'Countries', '/admin/geography/countries'],
    ['geography', '·', 'Regions / States', '/admin/geography/countries/nigeria/regions'], ['geography', '·', 'Local Areas', '/admin/geography/countries/nigeria/regions/lagos/local-areas'],
    ['geography', '·', 'Hierarchy Tree', '/admin/geography/hierarchy'], ['geography', '▦', 'Organizations', '/admin/geography/church-hierarchy'],
    ['geography', '◊', 'Church Hierarchy', '/admin/geography/church-hierarchy'], ['geography', '◊', 'Home Church Hierarchy', '/admin/geography/home-church-hierarchy'],
    ['reports', '▣', 'Reports', '/admin/geography/reports'], ['settings', '◇', 'Settings', '/admin/geography/settings'],
  ],
  D: [
    ['dashboard', '⌂', 'Dashboard', '/admin/home-churches/dashboard'], ['applications', '▤', 'Applications', '/admin/home-churches/applications'],
    ['home-churches', '▣', 'Home Churches', '/admin/home-churches'], ['leaders', '♙', 'Leaders', '/admin/home-churches/grace-home-church'],
    ['members', '◉', 'Members', '/admin/home-churches/grace-home-church/members'], ['attendance', '▦', 'Attendance', '/admin/home-churches/grace-home-church/attendance'],
    ['activities', '◇', 'Activities', '/admin/home-churches/grace-home-church/activities'], ['needs', '□', 'Needs', '/admin/home-churches/grace-home-church/needs'],
    ['finance', '₦', 'Finance', '/admin/home-churches/grace-home-church/finance'], ['reports', '▤', 'Reports', '/admin/home-churches/grace-home-church/finance'],
    ['settings', '⚙', 'Settings', '/admin/home-churches/grace-home-church/status'],
  ],
  E: [
    ['dashboard', '⌂', 'Dashboard', '/admin/church/dashboard'], ['churches', '▣', 'Churches', '/admin/churches'],
    ['members', '◉', 'Members', '/admin/churches/the-covenant-place/members'], ['departments', '▦', 'Departments', '/admin/churches/the-covenant-place/departments'],
    ['small-groups', '◎', 'Small Groups', '/admin/churches/the-covenant-place/small-groups'], ['evangelism', '◇', 'Evangelism', '/admin/churches/the-covenant-place/evangelism'],
    ['finance', '₦', 'Finance', '/admin/churches/the-covenant-place/finance'], ['reports', '▤', 'Reports', '/admin/churches/the-covenant-place/reports'],
    ['settings', '⚙', 'Settings', '/admin/churches/the-covenant-place/settings'],
  ],
  F: [
    ['dashboard', '⌂', 'Dashboard', '/admin'], ['people', '◉', 'People', '/admin/people'], ['first-timers', '◇', 'First Timers', '/admin/people/first-timers'],
    ['follow-up', '↻', 'Follow-Up', '/admin/people/follow-up'], ['converts', '✓', 'Converts', '/admin/people/converts/mary-okafor'],
    ['discipleship', '◎', 'Discipleship', '/admin/people/journeys/membership/john-emmanuel'], ['membership', '▦', 'Membership', '/admin/people/journeys/membership/john-emmanuel'],
    ['workers', '♙', 'Workers', '/admin/people/journeys/worker/blessing-friday'], ['leaders', '♛', 'Leaders', '/admin/people/journeys/leadership/peter-okafor'],
    ['ministry-history', '▤', 'Ministry History', '/admin/people/ministry-history'], ['prayer', '◇', 'Prayer', '/admin/people/prayer-requests/healing-for-my-mother/assign'],
    ['needs', '□', 'Needs', '/admin/people/needs'], ['counselling', '◌', 'Counselling', '/admin/people/counselling'],
    ['testimonies', '✦', 'Testimonies', '/admin/people/testimonies'], ['safeguarding', '!', 'Safeguarding', '/admin/people/safeguarding/escalation'],
    ['reports', '▣', 'Reports', '/admin/reports/country-performance'], ['settings', '⚙', 'Settings', '/admin/geography/settings'],
  ],
  G: [
    ['dashboard', '⌂', 'Dashboard', '/admin/kca'], ['kca-applications', '▤', 'Applications', '/admin/kca/applications'],
    ['kca-review', '↻', 'Review Queue', '/admin/kca/review-queue'], ['kca-decisions', '✓', 'Decisions', '/admin/kca/applications/samuel-david/decision'],
    ['kca-students', '♙', 'Students', '/admin/kca/students'], ['kca-cohorts', '◎', 'Cohorts', '/admin/kca/cohorts'],
    ['kca-mentors', '♛', 'Mentors', '/admin/kca/mentors'], ['kca-lecturers', '▦', 'Lecturers', '/admin/kca/lecturers'],
    ['kca-modules', '◇', 'Modules', '/admin/kca/modules'], ['kca-learning', '▣', 'Learning', '/admin/kca/attendance'],
    ['kca-assessments', '□', 'Assessments', '/admin/kca/assessments/final'], ['kca-certification', '✓', 'Certifications', '/admin/kca/certificates'],
    ['kca-alumni', '♙', 'Alumni', '/admin/kca/alumni'], ['settings', '⚙', 'Settings', '/admin/geography/settings'],
  ],
  H: [
    ['dashboard', '⌂', 'Dashboard', '/admin/kca'], ['kca-students', '♙', 'Students', '/admin/kca/students'],
    ['kca-cohorts', '◎', 'Cohorts', '/admin/kca/cohorts'], ['kca-years', '▥', 'KCA Years', '/admin/kca/years'],
    ['kca-mentors', '♛', 'Mentors', '/admin/kca/mentors'], ['kca-lecturers', '▦', 'Lecturers', '/admin/kca/lecturers'],
    ['kca-modules', '◇', 'Modules', '/admin/kca/modules'], ['kca-learning', '▣', 'Learning', '/admin/kca/attendance'],
    ['kca-assessments', '□', 'Assessments', '/admin/kca/assessments/final'], ['kca-certification', '✓', 'Certification', '/admin/kca/certificates'],
    ['kca-alumni', '♙', 'Alumni', '/admin/kca/alumni'], ['settings', '⚙', 'Settings', '/admin/geography/settings'],
  ],
  I: [
    ['dashboard', '⌂', 'Dashboard', '/admin'], ['mission', '◇', 'Mission', '/admin/mission'],
    ['crusades', '▣', 'Crusades', '/admin/mission/crusades'], ['souls', '♙', 'Souls', '/admin/mission/souls'],
    ['mission-follow-up', '↻', 'Follow-Up', '/admin/mission/follow-up'], ['partners', '◎', 'Partners', '/admin/mission/partners'],
    ['reports', '▤', 'Reports', '/admin/mission/reports'], ['ai-assistant', '✦', 'AI Assistant', '/admin/mission/ai-assistant'],
    ['settings', '⚙', 'Settings', '/admin/geography/settings'],
  ],
} as const;

function Brand({ dark = true }: { dark?: boolean }) {
  return <div className={`brand ${dark ? '' : 'brand-light'}`}><span className="brand-mark">◆</span><span className="brand-copy">Family House<br />Connect</span></div>;
}

function Sidebar({ screen }: { screen: AdminScreen }) {
  return <aside className="admin-sidebar"><Brand /><nav className="nav-list" aria-label="Administration">{navByBatch[screen.batch].map(([key, icon, label, href], index) => {
    const nested = screen.batch === 'C' && index >= 4 && index <= 8;
    const active = screen.batch === 'C' ? index !== 3 && screen.route === href : screen.nav === key;
    return <Link className={`nav-item ${nested ? 'nav-nested' : ''} ${active ? 'active' : ''}`} href={href} key={`${href}-${index}`}><span className="nav-icon">{icon}</span><span className="nav-label">{label}</span></Link>;
  })}</nav></aside>;
}

function Topbar() {
  return <header className="topbar"><Link href="/admin/screens" className="screen-index-link" aria-label="All designed screens" title="All designed screens">▦</Link><button className="top-icon" aria-label="Notifications">♧</button><button className="top-icon" aria-label="Unread alerts">♧<span className="dot" /></button><Link href="/admin/profile" className="avatar" aria-label="Admin profile">JD</Link></header>;
}

function StatusBadge({ value }: { value: string }) {
  const tone = /active|current|approved|yes|\+/.test(value.toLowerCase()) ? 'success' : /suspend|locked|reject|critical/.test(value.toLowerCase()) ? 'danger' : 'neutral';
  return <span className={`status-badge ${tone}`}>{value}</span>;
}

function PageHeader({ screen }: { screen: AdminScreen }) {
  const showNigeriaFlag = screen.id === 'C-03' || screen.id === 'C-11';
  const showHeaderAction = ['G','H','I'].includes(screen.batch) || !['D','E','F'].includes(screen.batch) || ['table','operations','finance'].includes(screen.kind);
  return <><div className="page-header"><div><h1 className="page-title">{showNigeriaFlag && <span className="flag-ng" aria-label="Nigeria flag" />}{screen.title}</h1><p className="page-subtitle">{screen.subtitle}</p></div><div className="header-actions">{screen.action && showHeaderAction && <button className={screen.action.includes('Export') ? 'ghost-button' : 'primary-button'}>{screen.action}</button>}<button className="more-button" aria-label="More options">•••</button></div></div>{screen.tabs && <Tabs tabs={screen.tabs} />}</>;
}

function Tabs({ tabs }: { tabs: string[] }) {
  return <div className="tabs" role="tablist">{tabs.map((tab, index) => <button className={`tab ${index === 0 ? 'active' : ''}`} role="tab" aria-selected={index === 0} key={tab}>{tab}</button>)}</div>;
}

function MetricCards({ metrics = [] }: { metrics?: Metric[] }) {
  return <div className="metric-grid">{metrics.map((metric, index) => <article className={`card metric-card ${index === 0 ? 'metric-selected' : ''}`} key={metric.label}><span className="metric-label">{metric.label}</span><div className="metric-row"><strong className={`metric-value ${index === 0 ? 'violet' : ''}`}>{metric.value}</strong>{metric.trend && <span className="trend">{metric.trend}</span>}</div></article>)}</div>;
}

function ChartCard({ title, value, green = false, bars = false }: { title: string; value?: string; green?: boolean; bars?: boolean }) {
  return <article className="card chart-card"><h2 className="card-title">{title}</h2>{value && <><span className="chart-kicker">This {title.includes('Giving') ? 'Week' : 'Month'}</span><strong className="chart-value">{value}</strong></>}{bars ? <div className="bar-chart">{[46,78,54,92,63,88,66,96,72,86,70,98].map((height,index)=><i key={index} style={{height:`${height}%`}} />)}</div> : <div className={`chart ${green ? 'green' : ''}`} />}<div className="chart-axis"><span>May 1</span><span>May 7</span><span>May 13</span></div></article>;
}

function DashboardView({ screen }: { screen: AdminScreen }) {
  return <><MetricCards metrics={screen.metrics} /><div className="dashboard-grid"><ChartCard title="New Registrations" value="12,842" /><ChartCard title="Giving (USD)" value="$1,246,830" /><ChartCard title="Active Users" value="95,221" green /></div></>;
}

function SearchBar({ placeholder = 'Search by name, email, phone or ID...' }: { placeholder?: string }) {
  return <div className="search-row"><label className="search-box"><span>⌕</span><input aria-label="Search" placeholder={placeholder} /></label><button className="filter-button">▽ Filters</button></div>;
}

function DataTable({ screen }: { screen: AdminScreen }) {
  const columns = screen.columns ?? [];
  const ministryBatch = ['D','E','F'].includes(screen.batch);
  return <><MetricCards metrics={screen.metrics} /><div className="table-toolbar"><SearchBar placeholder={screen.batch === 'C' ? 'Search records...' : undefined} /></div><div className="card table-card"><table><thead><tr>{columns.map(column=><th key={column}>{column}</th>)}<th>Actions</th></tr></thead><tbody>{(screen.rows ?? []).map((row,index)=><tr key={index}>{columns.map(column=><td key={column}>{column === 'Status' || column === 'Growth' || column === 'Required' ? <StatusBadge value={row[column]} /> : <>{['User','Name','Applicant Name','Home Church','Church Name'].includes(column) && <span className="mini-avatar">{row[column].split(' ').map(part=>part[0]).slice(0,2).join('')}</span>}{row[column]}</>}</td>)}<td className="actions-cell">{ministryBatch ? <button className="table-action">{screen.nav === 'applications' ? 'Review' : 'View'}</button> : <>⊙　⋯</>}</td></tr>)}</tbody></table><div className="pagination"><span>Showing 1 to {(screen.rows ?? []).length} of {screen.metrics?.[0]?.value ?? (screen.rows ?? []).length} records</span><span>‹　<b>1</b>　2　3　›</span></div></div></>;
}

function FeedView({ screen }: { screen: AdminScreen }) {
  return <div className="card feed-card">{(screen.rows ?? []).map((row,index)=><article className="feed-item" key={index}><span className={`feed-icon tone-${index%4}`}>{screen.nav === 'alerts' ? '!' : screen.nav === 'notifications' ? '•' : '✓'}</span><div><strong>{row.Item}</strong><p>{row.Detail}</p></div><time>{row.Time}</time>{screen.nav === 'approvals' && <div className="row-actions"><button>Review</button><button>Reject</button></div>}</article>)}</div>;
}

function ScopeGrid({ screen }: { screen: AdminScreen }) {
  return <><div className="scope-current">Current Scope <strong>Global⌄</strong></div><div className="scope-grid">{(screen.items ?? []).map((item,index)=><Link href={`/admin/scope?scope=${item.toLowerCase()}`} className="card scope-card" key={item}><span className="scope-icon">{['◉','⚑','◇','▥','♧','⌖'][index]}</span><strong>{item}</strong><small>{['All countries and data','View by continent','Select a country','View by region','By denomination/network','By mission location'][index]}</small></Link>)}</div></>;
}

function CommandView({ screen }: { screen: AdminScreen }) {
  return <><label className="command-search"><span>⌕</span><input aria-label="Command search" placeholder="Search churches, members, events, giving, requests..." /></label><div className="chip-row">{['Church','Member','Event','Donation','Mission','User'].map(item=><button key={item}>{item}</button>)}</div><h2 className="section-title">Popular Commands</h2><div className="action-grid">{(screen.items ?? []).map((item,index)=><button className="card action-card" key={item}><span>⌘</span><strong>{item}</strong><small>{['Review and decide','Download scoped data','Open performance','Download scoped data','Draft a message','Create secure report'][index]}</small></button>)}</div></>;
}

function TasksView({ screen }: { screen: AdminScreen }) {
  return <div className="card task-list">{(screen.items ?? []).map((item,index)=><label className="task-item" key={item}><input type="checkbox" /><span>{item}</span><small>Assigned to You</small><time>{index<2?'Today':index===2?'Tomorrow':'May 13, 2024'}</time></label>)}</div>;
}

function KpiView({ screen }: { screen: AdminScreen }) {
  if (screen.batch === 'A') {
    return <><MetricCards metrics={screen.metrics} /><div className="analytics-grid kpi-two">{screen.id === 'A-12' ? <><ChartCard title="Member Growth" /><ChartCard title="Giving Trend (USD)" bars /></> : <><div className="card list-card"><h2 className="card-title">Top Admin Actions</h2>{(screen.items ?? []).map(item=><div className="rank-row" key={item}><span>{item.split(' — ')[0]}</span><strong>{item.split(' — ')[1]}</strong></div>)}</div><ChartCard title="Audit Logs Trend" bars /></>}</div></>;
  }
  return <><MetricCards metrics={screen.metrics} /><div className="analytics-grid"><div className="card list-card"><h2 className="card-title">Organization Overview</h2>{(screen.items ?? ['Active Churches — 24,518','Home Churches — 18,642','Members — 1,638,732','Leaders — 98,431']).map(item=><div className="rank-row" key={item}><span>{item.split(' — ')[0]}</span><strong>{item.split(' — ')[1]}</strong></div>)}</div><ChartCard title="Churches Growth" /><div className="card list-card"><h2 className="card-title">Top Countries by Churches</h2>{['Nigeria — 4,354','Ghana — 2,491','Kenya — 1,637','South Africa — 1,348'].map((item,index)=><div className="bar-rank" key={item}><span>{item.split(' — ')[0]}</span><i style={{width:`${92-index*15}%`}}/><strong>{item.split(' — ')[1]}</strong></div>)}</div><ChartCard title="Giving Trend (USD)" bars /></div></>;
}

function DetailView({ screen }: { screen: AdminScreen }) {
  const entries = Object.entries(screen.details ?? {});
  if (['D','E','F'].includes(screen.batch)) {
    const personDetail = screen.batch === 'F';
    return <div className={`ministry-detail ${personDetail ? 'person-detail' : ''}`}>
      {personDetail && <article className="card person-summary"><div className="portrait">{screen.title.split(' ').map(part=>part[0]).slice(0,2).join('')}</div><div><h2>{screen.title}</h2><StatusBadge value={screen.subtitle}/><p>☎ +234 810 123 4487　 ✉ {screen.title.toLowerCase().replaceAll(' ', '.')}@email.com</p></div></article>}
      <article className="card details-card ministry-information"><h2 className="card-title">{personDetail ? 'Personal Information' : 'Information'}</h2><dl>{entries.map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></article>
      <article className="card details-card ministry-about"><h2 className="card-title">{screen.nav === 'applications' ? 'About Us' : personDetail ? 'First Visit Information' : 'About Us'}</h2><p>{screen.nav === 'applications' ? 'We are a group of believers meeting at home for fellowship, worship, and the study of God’s Word. Our heart is to reach our neighbors and make disciples of Jesus Christ.' : personDetail ? 'A complete record of first contact, interests, spiritual decisions and next steps.' : 'A growing community committed to fellowship, discipleship, service and meaningful impact.'}</p>{(screen.items ?? []).map(item=><div className="document-row" key={item}><span>▧　{item.split(' — ')[0]}</span><strong>{item.split(' — ')[1] ?? 'View'}</strong></div>)}</article>
      {!personDetail && <article className="card ministry-stat-strip">{(screen.items ?? ['Total Members — 98','Leaders — 6','Small Groups — 3']).slice(0,4).map(item=><div key={item}><span>{item.split(' — ')[0]}</span><strong>{item.split(' — ')[1]}</strong></div>)}</article>}
      {screen.action && <button className="primary-button ministry-detail-action">{screen.action}</button>}
    </div>;
  }
  return <div className="detail-grid"><article className="card identity-card"><div className="portrait">{screen.title.split(' ').map(part=>part[0]).slice(0,2).join('')}</div><h2>{screen.title}</h2><StatusBadge value="Active" /><button className="ghost-button">Change Photo</button></article><article className="card details-card"><h2 className="card-title">{screen.batch === 'C' ? 'Information' : 'Details'}</h2><dl>{entries.map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></article><article className="card details-card"><h2 className="card-title">{screen.batch === 'C' ? 'Statistics' : 'Roles'}</h2>{(screen.items ?? []).map(item=><div className="rank-row" key={item}><span>{item.split(' — ')[0]}</span><strong>{item.split(' — ')[1] ?? 'Member'}</strong></div>)}</article><ChartCard title="Growth (Last 12 Months)" /></div>;
}

const formFields = ['First Name *','Last Name *','Email Address *','Phone Number *','Gender','Date of Birth','Username','Status','Scope Type','Assign Country'];
function FormFields() {
  return <div className="form-grid">{formFields.map((field,index)=><label key={field}><span>{field}</span>{index===5?<input type="date" defaultValue="1992-06-12" />:index===4||index===7||index>=8?<select defaultValue=""><option value="" disabled>Select {field.replace(' *','')}</option><option>Nigeria</option><option>Active</option></select>:<input defaultValue={index===0?'Grace':index===1?'Ezekiel':index===2?'grace.ezekiel@email.com':index===3?'+234 803 545 6789':''} />}</label>)}</div>;
}

function WizardView({ screen }: { screen: AdminScreen }) {
  const churchFields = ['Church Name','Short Name','Church Type','Denomination (Optional)','Established Date','Region','Administrative Level','Status'];
  return <><div className="stepper">{(screen.tabs ?? []).map((step,index)=><div className={`step ${index===0?'active':''}`} key={step}><span>{index+1}</span><strong>{step}</strong></div>)}</div><div className="card form-card"><h2 className="section-title">{screen.batch === 'E' ? 'Basic Information' : screen.title.includes('Role')?'Role Information':'Personal Information'}</h2>{screen.batch === 'E' ? <div className="form-grid">{churchFields.map((field,index)=><label key={field}><span>{field}{index<1?' *':''}</span>{index>1?<select defaultValue=""><option value="" disabled>Select {field}</option><option>Active</option><option>Nigeria</option></select>:<input placeholder={`Enter ${field.toLowerCase()}`} />}</label>)}</div> : <FormFields />}<div className="form-footer"><button className="ghost-button">Cancel</button><button className="primary-button">{screen.action}</button></div></div></>;
}

function ProfileView({ screen }: { screen: AdminScreen }) {
  return <div className="profile-layout"><article className="card identity-card"><div className="portrait large">{screen.title.includes('360')?'GE':'JD'}</div><h2>{screen.title.includes('360')?'Grace Ezekiel':'John Chinedu Doe'}</h2><StatusBadge value="Active" /><button className="ghost-button">Change Profile Photo</button></article><article className="card details-card profile-details"><dl>{Object.entries(screen.details ?? {}).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></article><article className="card account-card"><h2>Account Status</h2><strong className="trend">Active</strong><p>Last Login<br/><b>May 12, 2024 · 09:24 AM</b></p><p>Member Since<br/><b>Jan 15, 2023</b></p></article>{screen.action&&<button className="primary-button profile-save">{screen.action}</button>}</div>;
}

function PermissionsView({ screen }: { screen: AdminScreen }) {
  const actions=['View','Create','Edit','Delete'];
  return <div className="permission-layout"><aside className="card module-list"><strong>Modules</strong>{(screen.items ?? []).map((item,index)=><button className={index===0?'active':''} key={item}>{item}</button>)}</aside><div className="card permission-table"><div className="permission-head"><strong>Permissions (42)</strong>{actions.map(action=><b key={action}>{action}</b>)}</div>{['View Users','Create Users','Edit Users','Delete Users','Reset Passwords'].map((item,row)=><div className="permission-row" key={item}><span>◉　{item}</span>{actions.map((action,col)=><input aria-label={`${action} ${item}`} type="checkbox" defaultChecked={row<3||col<2} key={action}/>)}</div>)}</div></div>;
}

function MatrixView() {
  const roles=['Global Admin','Country Admin','Church Admin','Home Church Leader','Member'];
  return <div className="card matrix-card"><div className="matrix-row matrix-head"><strong>Permission</strong>{roles.map(role=><b key={role}>{role}</b>)}</div>{['View Churches','Create Church','Edit Church','Delete Church','Approve Church','Assign Church Admin'].map((permission,row)=><div className="matrix-row" key={permission}><span>{permission}</span>{roles.map((role,col)=><i className={col+row<7?'yes':'no'} key={role}>{col+row<7?'●':'○'}</i>)}</div>)}</div>;
}

function FormView({ screen }: { screen: AdminScreen }) {
  return <div className="card settings-card"><div className="form-grid"><label><span>Select User *</span><select><option>John Chinedu Doe</option></select></label><label><span>Scope Type *</span><select><option>Administrative Scope</option></select></label><label className="full"><span>Scope *</span><div className="token-input"><b>Nigeria ×</b><b>Lagos State ×</b><b>Ikeja LGA ×</b></div></label><label className="full"><span>Access Level</span><select><option>Full Access</option></select></label><label className="full switch-row"><input type="checkbox" defaultChecked /><span>Allow Manage Users in this Scope</span></label></div><div className="form-footer"><button className="ghost-button">Cancel</button><button className="primary-button">{screen.action}</button></div></div>;
}

function TreeView({ screen }: { screen: AdminScreen }) {
  return <div className="tree-layout"><div className="card tree-card">{(screen.items ?? []).map((item,index)=><div className={`tree-node level-${Math.min(index,5)}`} key={item}><span>{index<4?'▣':'□'}</span>{item}</div>)}</div><div className="card tree-detail"><h2 className="card-title">Selected Node</h2><h3>{screen.items?.[3]}</h3><dl><div><dt>Level</dt><dd>Ward</dd></div><div><dt>Code</dt><dd>IKEJA_WA</dd></div><div><dt>Parent</dt><dd>Ikeja LGA</dd></div><div><dt>Churches</dt><dd>8</dd></div><div><dt>Members</dt><dd>1,345</dd></div></dl><button className="ghost-button">View Details</button></div></div>;
}

function MapView({ screen }: { screen: AdminScreen }) {
  return <><div className="map-filters"><button>All Countries⌄</button><button>All Levels⌄</button><button>All Status⌄</button><span><i className="high"/>High Activity</span><span><i/>Medium Activity</span><span><i className="low"/>Low Activity</span></div><div className={`card map-card ${screen.details?'location-map':''}`}><Image src={screen.details?'/assets/ikeja-map.png':'/assets/world-map.png'} width={1200} height={680} unoptimized alt={screen.details?'Map of Ikeja Ward A':'World activity map'} />{screen.details&&<aside className="map-info"><h2>Location Information</h2><dl>{Object.entries(screen.details).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></aside>}</div></>;
}

function DonutVisual({ value = '726', label = 'Average' }: { value?: string; label?: string }) {
  return <div className="donut-wrap"><div className="donut-chart"><div><strong>{value}</strong><span>{label}</span></div></div><ul><li><i/>Adults <b>64%</b></li><li><i/>Youth <b>21%</b></li><li><i/>Children <b>15%</b></li></ul></div>;
}

function MinistryDashboardView({ screen }: { screen: AdminScreen }) {
  return <><MetricCards metrics={screen.metrics}/><div className="ministry-dashboard-grid"><ChartCard title={screen.batch === 'D' ? 'Home Churches Growth (6 Months)' : 'Membership Growth'} /><article className="card dashboard-donut"><h2 className="card-title">{screen.batch === 'D' ? 'Application Status' : 'Attendance Overview'}</h2><DonutVisual value={screen.batch === 'D' ? '24' : '726'} label={screen.batch === 'D' ? 'Total' : 'Average'}/></article><article className="card compact-list"><h2 className="card-title">Quick Actions</h2>{(screen.items ?? []).slice(0,4).map((item,index)=><button key={item}><span>{['▣','▦','◇','▤'][index]}</span>{item}</button>)}</article><article className="card compact-list"><h2 className="card-title">Recent Activities</h2>{['New member added','Attendance recorded','Application reviewed','First timer registered'].map((item,index)=><div className="activity-row" key={item}><span>●</span><b>{item}</b><time>{index+1}h ago</time></div>)}</article></div></>;
}

function WorkflowView({ screen }: { screen: AdminScreen }) {
  const decision = screen.details?.Decision;
  return <div className="workflow-layout"><aside className="workflow-steps">{(screen.tabs ?? []).map((step,index)=><div className={`${index === (decision ? 2 : 0) ? 'active' : ''}`} key={step}><span>{index+1}</span><b>{step}</b></div>)}</aside><article className="card workflow-card">{decision ? <><h2>Decision</h2><div className="decision-box danger"><span>⊖</span><div><strong>{decision}</strong><p>This application does not meet the requirements.</p></div></div><div className="workflow-form">{Object.entries(screen.details ?? {}).filter(([key])=>key!=='Decision').map(([key,value])=><label key={key}><span>{key}</span>{key === 'Comments' ? <textarea defaultValue={value}/> : key === 'Notify Applicant' ? <input type="checkbox" defaultChecked/> : <select defaultValue={value}><option>{value}</option></select>}</label>)}</div></> : <><h2>Review Checklist</h2><div className="checklist">{(screen.items ?? []).map((item,index)=><div key={item}><span>{item.split(' — ')[0]}</span><StatusBadge value={item.split(' — ')[1]}/>{index>4&&<i/>}</div>)}</div><label className="comment-label"><span>Comments</span><textarea placeholder="Enter review comments..."/></label></>}<div className="form-footer"><button className="ghost-button">Back</button><button className={decision ? 'danger-button' : 'primary-button'}>{screen.action}</button></div></article></div>;
}

function ActivationView({ screen }: { screen: AdminScreen }) {
  return <div className="card activation-card"><div className="approval-hero"><span>✓</span><h2>Application Approved!</h2><p>The home church has been approved. Activate their ID and grant access.</p></div><dl>{Object.entries(screen.details ?? {}).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{key === 'Access Status' ? <StatusBadge value={value}/> : value}</dd></div>)}</dl><button className="primary-button">{screen.action}</button></div>;
}

function OperationsView({ screen }: { screen: AdminScreen }) {
  const activityMode = screen.id === 'D-11';
  return <><MetricCards metrics={screen.metrics}/>{activityMode ? <div className="card activity-stack">{(screen.items ?? []).map((item,index)=>{const parts=item.split(' — ');return <article key={item}><time><b>{['May 25','May 19','May 12','May 5','Apr 28'][index]}</b></time><div><strong>{parts[0]}</strong><span>{parts[1]}</span></div><b>♙ {parts[2]}</b><StatusBadge value="Completed"/></article>})}<button className="ghost-button">View all activities</button></div> : <div className="operations-grid"><ChartCard title="Attendance Trend"/><article className="card dashboard-donut"><h2 className="card-title">Attendance by Service</h2><DonutVisual value={screen.id === 'D-10' ? '22' : '726'} label="Total"/></article><article className="card list-card operation-ranking"><h2 className="card-title">Top Services by Attendance</h2>{(screen.items ?? []).map(item=><div className="rank-row" key={item}><span>{item.split(' — ')[0]}</span><strong>{item.split(' — ')[1]}</strong></div>)}</article></div>}</>;
}

function JourneyView({ screen }: { screen: AdminScreen }) {
  const details = screen.details ?? {};
  return <><div className="journey-rail">{(screen.items ?? []).map((item,index)=><div className={index<2?'complete':index===2?'active':''} key={item}><span>{index+1}</span><b>{item.split(' — ')[0]}</b></div>)}</div><article className="card journey-card"><header><div className="portrait">{details.Name?.split(' ').map(part=>part[0]).slice(0,2).join('')}</div><div><h2>{details.Name}</h2><p>Current {details.Stage}</p></div><strong>{details.Progress}</strong></header><div className="progress-track"><i style={{width:details.Progress}}/></div><div className="journey-list">{(screen.items ?? []).map((item,index)=><div key={item}><span className={index<2?'done':index===2?'doing':''}>{index<2?'✓':'●'}</span><b>{item.split(' — ')[0]}</b><StatusBadge value={item.split(' — ')[1]}/></div>)}</div><button className="primary-button">View Journey Details</button></article></>;
}

function ApprovalView({ screen }: { screen: AdminScreen }) {
  const entries = Object.entries(screen.details ?? {});
  return <div className="approval-grid"><article className="card approval-details"><h2>{screen.title.includes('Prayer') ? 'Request' : 'Need Details'}</h2>{entries.slice(0,Math.ceil(entries.length/2)).map(([key,value])=><div key={key}><span>{key}</span><strong>{value}</strong></div>)}</article><article className="card approval-review"><h2>{screen.title.includes('Prayer') ? 'Assign To' : 'Review'}</h2>{entries.slice(Math.ceil(entries.length/2)).map(([key,value])=><label key={key}><span>{key}</span>{/Details|Notes/.test(key)?<textarea defaultValue={value}/>:<div className="token-input"><b>{value}</b></div>}</label>)}<div className="form-footer"><button className="danger-button">Reject</button><button className="primary-button">{screen.action}</button></div></article></div>;
}

function SettingsView({ screen }: { screen: AdminScreen }) {
  const destructive = screen.id === 'D-14';
  return <div className="card settings-card ministry-settings"><div className="form-grid">{Object.entries(screen.details ?? {}).map(([key,value],index)=><label className={index>2?'full':''} key={key}><span>{key}</span>{/Notes/.test(key)?<textarea defaultValue={value}/>:key.includes('Allow')||key.includes('Enable')||key.includes('Auto')?<span className="setting-toggle"><input type="checkbox" defaultChecked={value==='Yes'}/><i/></span>:<select defaultValue={value}><option>{value}</option></select>}</label>)}</div><div className="form-footer"><button className="ghost-button">Cancel</button><button className={destructive?'danger-button':'primary-button'}>{screen.action}</button></div></div>;
}

function FinanceView({ screen }: { screen: AdminScreen }) {
  return <><MetricCards metrics={screen.metrics}/><div className="finance-grid"><article className="card dashboard-donut"><h2 className="card-title">Income by Category</h2><DonutVisual value="100%" label="Income"/></article>{screen.batch === 'E' ? <ChartCard title="Income vs Expense" bars/> : <article className="card compact-list"><h2 className="card-title">Recent Transactions</h2>{['Tithes — ₦80,000','Offering — ₦70,000','Seed — ₦10,000','Giving — ₦10,000'].map(item=><div className="rank-row" key={item}><span>{item.split(' — ')[0]}</span><strong>{item.split(' — ')[1]}</strong></div>)}</article>}</div><button className="ghost-button wide-report">View Full Finance Report</button></>;
}

function ReportsView({ screen }: { screen: AdminScreen }) {
  return <div className="reports-grid"><article className="card report-list"><h2>Popular Reports</h2>{(screen.items ?? []).map(item=><button key={item}>▧　{item}</button>)}</article><article className="card report-list"><h2>Recent Reports</h2>{['Membership Report · May 2024','Attendance Report · May 2024','First Timers Report · May 2024','Tithes Report · May 2024'].map(item=><div key={item}><span>▧</span><b>{item}</b></div>)}</article><button className="primary-button">{screen.action}</button></div>;
}

function RestrictedView({ screen }: { screen: AdminScreen }) {
  return <><div className="restricted-heading"><span>Restricted Case</span><StatusBadge value="In Progress"/></div><div className="card restricted-card"><div><h2>Case Information</h2>{Object.entries(screen.details ?? {}).slice(0,5).map(([key,value])=><p key={key}><span>{key}</span><b>{value}</b></p>)}</div><div><h2>Client Information</h2>{Object.entries(screen.details ?? {}).slice(5).map(([key,value])=><p key={key}><span>{key}</span><b>{value}</b></p>)}</div></div><div className="restricted-warning">⊘　This case contains restricted information. Unauthorized access is prohibited and will be logged.</div></>;
}

function EscalationView({ screen }: { screen: AdminScreen }) {
  return <div className="escalation-grid"><article className="card details-card"><h2>Report Details</h2><dl>{Object.entries(screen.details ?? {}).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></article><article className="card escalation-actions"><h2>Actions</h2>{(screen.items ?? []).map(item=><div key={item}><span>◇</span><b>{item.split(' — ')[0]}</b><StatusBadge value={item.split(' — ')[1]}/></div>)}</article><button className="danger-button">{screen.action}</button></div>;
}

function QuickActions({ screen }: { screen: AdminScreen }) {
  return <div className="quick-grid">{(screen.items ?? []).map((item,index)=><button className="card quick-card" key={item}><span>{['✉','▦','✓','□','▤','♙','⚙','?'][index]}</span><strong>{item}</strong><small>{['Send a platform-wide announcement','Register a new church manually','View and approve pending items','Add a new event to the platform','Create custom reports and analytics','Add or manage admin and staff users','Configure platform preferences','Manage connected support tickets'][index]}</small></button>)}</div>;
}

function Impersonation({ screen }: { screen: AdminScreen }) {
  return <><div className="warning-card"><strong>Impersonation is a powerful tool and must be used responsibly.</strong><ul><li>Use only for troubleshooting and support.</li><li>Ensure you have explicit approval.</li><li>All impersonation sessions are logged.</li><li>Do not access sensitive personal information unnecessarily.</li></ul></div><div className="support-grid"><div className="card settings-card"><h2>Request Impersonation Access</h2><FormFields /><button className="primary-button">{screen.action}</button></div><div className="card feed-card"><h2>My Access Requests</h2>{['John Chinedu Doe — Pending','Grace Ezekiel — Pending'].map(item=><div className="feed-item" key={item}><span className="feed-icon">♙</span><strong>{item}</strong><StatusBadge value="Pending" /></div>)}</div></div></>;
}

export function ForbiddenView({ scope = 'Global', reason = 'permission-denied' }: { scope?: string; reason?: string }) {
  return <div className="forbidden-view"><div className="shield-lock">▣</div><h1>Permission Denied</h1><p>You don’t have permission to access this resource<br/>in the current scope.</p><dl><div><dt>Current Scope:</dt><dd>{scope}</dd></div><div><dt>Access Result:</dt><dd>{reason.replace('-', ' ')}</dd></div></dl><Link href="/admin" className="primary-button link-button">Back to Dashboard</Link></div>;
}

function AuthView({ screen }: { screen: AdminScreen }) {
  if(screen.kind==='mfa') return <main className="auth-page"><header className="auth-header"><Brand dark={false}/><span>Admin Portal</span></header><section className="card mfa-card"><div className="mfa-icon">◇</div><h1>{screen.title}</h1><p>{screen.subtitle}</p><div className="otp-row">{'371942'.split('').map((digit,index)=><input aria-label={`Digit ${index+1}`} defaultValue={digit} maxLength={1} key={index}/>)}</div><strong>Code expires in 00:45</strong><div className="auth-links"><button>Can’t access your authenticator?</button><button>Use backup code</button></div><Link href="/admin" className="primary-button link-button">Back to login</Link></section></main>;
  return <main className="login-page"><aside className="login-visual"><Brand/><div className="login-copy"><h1>Admin Portal</h1><p>Kingdom. Connection. Impact.</p><blockquote>“Go and make disciples<br/>of all nations.”<small>Matthew 28:19</small></blockquote></div><div className="city-lights"/></aside><section className="login-form"><div><h1>{screen.title}</h1><p>{screen.subtitle}</p><label>Email Address<input defaultValue="admin@fhconnect.org" /></label><label>Password<input type="password" defaultValue="password" /></label><div className="remember"><label><input type="checkbox" defaultChecked/> Remember me</label><Link href="#">Forgot password?</Link></div><Link href="/admin/mfa" className="primary-button link-button">Sign In</Link><small>Need help? <b>Contact Support</b></small></div></section></main>;
}

function ScreenContent({ screen }: { screen: AdminScreen }) {
  if (screen.batch === 'G' || screen.batch === 'H') return <KcaScreenContent screen={screen}/>;
  if (screen.batch === 'I') return <MissionScreenContent screen={screen}/>;
  switch(screen.kind){
    case 'dashboard': return <DashboardView screen={screen}/>;
    case 'scope-grid': return <ScopeGrid screen={screen}/>;
    case 'command': return <CommandView screen={screen}/>;
    case 'feed': return <FeedView screen={screen}/>;
    case 'tasks': return <TasksView screen={screen}/>;
    case 'kpi': return <KpiView screen={screen}/>;
    case 'table': return <DataTable screen={screen}/>;
    case 'detail': return <DetailView screen={screen}/>;
    case 'wizard': return <WizardView screen={screen}/>;
    case 'profile': return <ProfileView screen={screen}/>;
    case 'permissions': return <PermissionsView screen={screen}/>;
    case 'matrix': return <MatrixView/>;
    case 'form': return <FormView screen={screen}/>;
    case 'tree': return <TreeView screen={screen}/>;
    case 'map': return <MapView screen={screen}/>;
    case 'quick-actions': return <QuickActions screen={screen}/>;
    case 'impersonation': return <Impersonation screen={screen}/>;
    case 'ministry-dashboard': return <MinistryDashboardView screen={screen}/>;
    case 'workflow': return <WorkflowView screen={screen}/>;
    case 'activation': return <ActivationView screen={screen}/>;
    case 'operations': return <OperationsView screen={screen}/>;
    case 'journey': return <JourneyView screen={screen}/>;
    case 'approval': return <ApprovalView screen={screen}/>;
    case 'settings': return <SettingsView screen={screen}/>;
    case 'finance': return <FinanceView screen={screen}/>;
    case 'reports': return <ReportsView screen={screen}/>;
    case 'restricted': return <RestrictedView screen={screen}/>;
    case 'escalation': return <EscalationView screen={screen}/>;
    case 'forbidden': return <ForbiddenView/>;
    default: return null;
  }
}

export function AdminScreenView({ screen, decision, requestedScope }: { screen: AdminScreen; decision: AccessDecision; requestedScope: string }) {
  if(screen.kind==='login'||screen.kind==='mfa') return <AuthView screen={screen}/>;
  const rendererOwnsHeader = new Set(['G-03','G-04','G-05','G-06','G-07','G-08','G-09','G-10','G-12','G-13','G-14','G-15','G-16','G-18','H-02','H-06','H-08','H-10','H-19','I-03','I-04','I-06','I-07','I-09','I-11','I-17']).has(screen.id);
  const rendererNeedsAction = new Set(['G-03','G-16']).has(screen.id);
  return <div className="admin-shell"><Sidebar screen={screen}/><main className="admin-main"><Topbar/>{decision.allowed?<section className={`page batch-${screen.batch.toLowerCase()} ${rendererOwnsHeader ? 'renderer-header' : ''}`}>{!rendererOwnsHeader && <PageHeader screen={screen}/>} {rendererNeedsAction && screen.action && <div className="renderer-action-row"><button className={screen.action.includes('Print') || screen.action.includes('Download') ? 'ghost-button' : 'primary-button'}>{screen.action}</button></div>}<ScreenContent screen={screen}/></section>:<ForbiddenView scope={requestedScope} reason={decision.reason}/>}</main></div>;
}

const batchNames = {
  A: 'Global Administration',
  B: 'Identity & Access',
  C: 'Geography & Organization',
  D: 'Home Church Administration',
  E: 'Church Operations',
  F: 'People & Ministry Care',
  G: 'KCA Admissions',
  H: 'KCA Learning',
  I: 'Mission Operations',
} as const;

export function AdminScreenIndex() {
  const batches = Object.keys(batchNames) as Array<keyof typeof batchNames>;
  return <div className="admin-shell"><main className="screen-library"><header className="screen-library-header"><div><Brand dark={false}/><span className="preview-pill">Static design preview</span></div><Link href="/admin" className="primary-button link-button">Open Dashboard</Link></header><section className="screen-library-intro"><p className="eyebrow">Family House Connect · Admin Portal</p><h1>All Designed Screens</h1><p>Open any of the {adminScreens.length} front-end screens below. Every page uses static fixture data and is available directly from this directory.</p><div className="library-summary"><strong>{adminScreens.length}</strong><span>reference screens</span><strong>{batches.length}</strong><span>design groups</span></div></section>{batches.map(batch => { const screens = adminScreens.filter(screen => screen.batch === batch); return <section className="screen-group" key={batch}><div className="screen-group-title"><span>{batch}</span><div><h2>{batchNames[batch]}</h2><p>{screens.length} screens</p></div></div><div className="screen-card-grid">{screens.map(screen => <Link href={screen.route} className="screen-link-card" key={screen.id}><span className="screen-id">{screen.id}</span><strong>{screen.title}</strong><small>{screen.subtitle}</small><code>{screen.route}</code><i>Open screen →</i></Link>)}</div></section>; })}</main></div>;
}
