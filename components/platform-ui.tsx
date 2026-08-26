import type { AdminScreen, Metric, Row } from '../lib/admin-routes.ts';

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

function DenseTable({ screen, rows = screen.rows ?? [], columns = screen.columns ?? [] }: { screen: AdminScreen; rows?: Row[]; columns?: string[] }) {
  return <article className="platform-card platform-table-card"><FilterBar screen={screen}/><div className="platform-table-scroll"><table aria-label={`${screen.title} records`}><thead><tr>{columns.map(column=><th scope="col" key={column}>{column}</th>)}<th scope="col">Action</th></tr></thead><tbody>{rows.map((row,index)=><tr key={`${screen.id}-${index}`}>{columns.map((column,columnIndex)=>{const value=row[column]??'—';return <td key={column}>{columnIndex===0?<span className="platform-leading"><i>{value.slice(0,2).toUpperCase()}</i><b>{value}</b></span>:/status|priority/i.test(column)?<Badge value={value}/>:value}</td>})}<td><button className="platform-row-action" type="button" aria-label={`View ${row[columns[0]]??'record'}`}>View</button></td></tr>)}</tbody></table></div><footer><span>Showing 1 to {rows.length} of {rows.length>5?'256':rows.length} records</span><nav aria-label={`${screen.title} pagination`}><button type="button" aria-label="Previous page">‹</button><button className="active" type="button" aria-label="Page 1" aria-current="page">1</button><button type="button" aria-label="Page 2">2</button><button type="button" aria-label="Page 3">3</button><button type="button" aria-label="Next page">›</button></nav></footer></article>;
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
  const steps=screen.tabs??[];
  return <div className="platform-form-view">{steps.length>0&&<div className="platform-stepper" aria-label="Form progress">{steps.map((step,index)=><div className={index===0?'active':''} key={step}><span>{index+1}</span><b>{step}</b></div>)}</div>}<article className="platform-card platform-form"><div className="platform-form-grid">{Object.entries(screen.details??{}).map(([label,value])=><label className={/message|description/i.test(label)?'wide':''} key={label}><span>{label}</span>{/message|description/i.test(label)?<textarea defaultValue={value}/>:<input defaultValue={value}/>}</label>)}</div>{screen.items&&<aside className="platform-summary"><h3>Summary</h3>{screen.items.map(item=><p key={item}><span>{item.split(' — ')[0]}</span><strong>{item.split(' — ')[1]}</strong></p>)}</aside>}<footer><button type="button">Save Draft</button><button className="platform-primary" type="button">{screen.action}</button></footer></article></div>;
}

function Settings({ screen }: { screen: AdminScreen }) {
  return <div className="platform-settings"><aside className="platform-card"><button className="active" type="button">General</button>{(screen.tabs??['Configuration','Policies','Advanced']).slice(1).map(tab=><button type="button" key={tab}>{tab}</button>)}<button type="button">Integrations</button><button type="button">Maintenance</button></aside><article className="platform-card platform-settings-body"><div className="platform-form-grid">{Object.entries(screen.details??{}).map(([label,value])=><label key={label}><span>{label}</span>{/enabled|active/i.test(value)?<span className="platform-toggle"><input type="checkbox" defaultChecked/><i/></span>:<input defaultValue={value}/>}</label>)}</div><h3>Configuration Rules</h3>{(screen.items??[]).map((item,index)=><div className="platform-setting-row" key={item}><span>{item.split(' — ')[0]}</span><b>{item.split(' — ')[1]}</b><span className="platform-toggle"><input aria-label={`Toggle ${item}`} type="checkbox" defaultChecked={index<3}/><i/></span></div>)}<footer><button className="platform-primary" type="button">{screen.action}</button></footer></article></div>;
}

function Operations({ screen }: { screen: AdminScreen }) {
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
    case 'reports': case 'finance': content=<Analytics screen={screen}/>; break;
    case 'feed': content=<DenseTable screen={{...screen,columns:['Item','Detail','Time']}} rows={screen.rows} columns={['Item','Detail','Time']}/>; break;
    case 'restricted': content=<Restricted screen={screen}/>; break;
    default: content=<Analytics screen={screen}/>;
  }
  const needsTabs = Boolean(screen.tabs?.length && ['operations','feed','restricted','table','reports','finance'].includes(screen.kind));
  return <>{needsTabs&&<PlatformTabs tabs={screen.tabs}/>} {content}</>;
}
