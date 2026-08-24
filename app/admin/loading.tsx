export default function AdminLoading() {
  return <main className="state-page" aria-busy="true" aria-live="polite"><div className="state-skeleton"/><div className="state-skeleton wide"/><div className="state-card-grid">{[1,2,3,4].map(item=><div className="card state-card" key={item}/>)}</div><span>Loading authorized administration data…</span></main>;
}
