import Link from 'next/link';
import Image from 'next/image';
import type { AccessDecision } from '../lib/access-control';
import type { AdminScreen, Metric } from '../lib/admin-routes';

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
  return <header className="topbar"><button className="top-icon" aria-label="Notifications">♧</button><button className="top-icon" aria-label="Unread alerts">♧<span className="dot" /></button><Link href="/admin/profile" className="avatar" aria-label="Admin profile">JD</Link></header>;
}

function StatusBadge({ value }: { value: string }) {
  const tone = /active|current|approved|yes|\+/.test(value.toLowerCase()) ? 'success' : /suspend|locked|reject|critical/.test(value.toLowerCase()) ? 'danger' : 'neutral';
  return <span className={`status-badge ${tone}`}>{value}</span>;
}

function PageHeader({ screen }: { screen: AdminScreen }) {
  const showNigeriaFlag = screen.id === 'C-03' || screen.id === 'C-11';
  return <><div className="page-header"><div><h1 className="page-title">{showNigeriaFlag && <span className="flag-ng" aria-label="Nigeria flag" />}{screen.title}</h1><p className="page-subtitle">{screen.subtitle}</p></div><div className="header-actions">{screen.action && <button className={screen.action.includes('Export') ? 'ghost-button' : 'primary-button'}>{screen.action}</button>}<button className="more-button" aria-label="More options">•••</button></div></div>{screen.tabs && <Tabs tabs={screen.tabs} />}</>;
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
  return <><MetricCards metrics={screen.metrics} /><div className="table-toolbar"><SearchBar placeholder={screen.batch === 'C' ? 'Search records...' : undefined} /></div><div className="card table-card"><table><thead><tr>{columns.map(column=><th key={column}>{column}</th>)}<th>Actions</th></tr></thead><tbody>{(screen.rows ?? []).map((row,index)=><tr key={index}>{columns.map(column=><td key={column}>{column === 'Status' || column === 'Growth' || column === 'Required' ? <StatusBadge value={row[column]} /> : <>{column === 'User' && <span className="mini-avatar">{row[column].split(' ').map(part=>part[0]).slice(0,2).join('')}</span>}{row[column]}</>}</td>)}<td className="actions-cell">⊙　⋯</td></tr>)}</tbody></table><div className="pagination"><span>Showing 1 to {(screen.rows ?? []).length} of {screen.metrics?.[0]?.value ?? (screen.rows ?? []).length} records</span><span>‹　<b>1</b>　2　3　›</span></div></div></>;
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
  return <div className="detail-grid"><article className="card identity-card"><div className="portrait">{screen.title.split(' ').map(part=>part[0]).slice(0,2).join('')}</div><h2>{screen.title}</h2><StatusBadge value="Active" /><button className="ghost-button">Change Photo</button></article><article className="card details-card"><h2 className="card-title">{screen.batch === 'C' ? 'Information' : 'Details'}</h2><dl>{entries.map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></article><article className="card details-card"><h2 className="card-title">{screen.batch === 'C' ? 'Statistics' : 'Roles'}</h2>{(screen.items ?? []).map(item=><div className="rank-row" key={item}><span>{item.split(' — ')[0]}</span><strong>{item.split(' — ')[1] ?? 'Member'}</strong></div>)}</article><ChartCard title="Growth (Last 12 Months)" /></div>;
}

const formFields = ['First Name *','Last Name *','Email Address *','Phone Number *','Gender','Date of Birth','Username','Status','Scope Type','Assign Country'];
function FormFields() {
  return <div className="form-grid">{formFields.map((field,index)=><label key={field}><span>{field}</span>{index===5?<input type="date" defaultValue="1992-06-12" />:index===4||index===7||index>=8?<select defaultValue=""><option value="" disabled>Select {field.replace(' *','')}</option><option>Nigeria</option><option>Active</option></select>:<input defaultValue={index===0?'Grace':index===1?'Ezekiel':index===2?'grace.ezekiel@email.com':index===3?'+234 803 545 6789':''} />}</label>)}</div>;
}

function WizardView({ screen }: { screen: AdminScreen }) {
  return <><div className="stepper">{(screen.tabs ?? []).map((step,index)=><div className={`step ${index===0?'active':''}`} key={step}><span>{index+1}</span><strong>{step}</strong></div>)}</div><div className="card form-card"><h2 className="section-title">{screen.title.includes('Role')?'Role Information':'Personal Information'}</h2><FormFields /><div className="form-footer"><button className="ghost-button">Cancel</button><button className="primary-button">{screen.action}</button></div></div></>;
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
    case 'forbidden': return <ForbiddenView/>;
    default: return null;
  }
}

export function AdminScreenView({ screen, decision, requestedScope }: { screen: AdminScreen; decision: AccessDecision; requestedScope: string }) {
  if(screen.kind==='login'||screen.kind==='mfa') return <AuthView screen={screen}/>;
  return <div className="admin-shell"><Sidebar screen={screen}/><main className="admin-main"><Topbar/>{decision.allowed?<section className={`page batch-${screen.batch.toLowerCase()}`}><PageHeader screen={screen}/><ScreenContent screen={screen}/></section>:<ForbiddenView scope={requestedScope} reason={decision.reason}/>}</main></div>;
}
