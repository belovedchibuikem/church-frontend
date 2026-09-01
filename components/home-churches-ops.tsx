'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { AdminScreen } from '../lib/admin-routes';
import { stashAdminRecords } from '../lib/admin-record-cache';
import { EntitySearchSelect } from './entity-search-select';
import { listAdminAuditEvents } from '../lib/admin-identity-api';
import {
  createHomeChurch,
  createHomeChurchApplication,
  defaultOpsScope,
  endMembership,
  getHomeChurch,
  getHomeChurchApplication,
  listAttendance,
  listEvangelismActivities,
  listHomeChurchApplications,
  listHomeChurches,
  listMemberships,
  listPastoralNeeds,
  mutateMinistryRecord,
  operationsErrorMessage,
  startMembership,
  transitionHomeChurchApplication,
  transitionPastoralNeed,
  updateHomeChurch,
  updateHomeChurchStatus,
  type HomeChurchApplicationRecord,
  type HomeChurchRecord,
  type MembershipRecord,
  type PastoralNeedRecord,
} from '../lib/admin-operations-api';

type ScopeProps = { screen: AdminScreen; requestedScope?: string };

function useScope(requestedScope?: string) {
  return useMemo(() => defaultOpsScope(requestedScope), [requestedScope]);
}

function homeChurchIdFromRoute(route: string): string {
  const match = route.match(/^\/admin\/home-churches\/([0-7][0-9A-HJKMNP-TV-Z]{25})/i);
  return match?.[1] ?? '';
}

function applicationIdFromRoute(route: string): string {
  const match = route.match(/^\/admin\/home-churches\/applications\/([0-7][0-9A-HJKMNP-TV-Z]{25})/i);
  return match?.[1] ?? '';
}

function StatusLine({ error, message, onRetry }: { error?: string | null; message?: string | null; onRetry?: () => void }) {
  if (!error && !message) return null;
  return (
    <p className="maps-settings-lead" role={error ? 'alert' : 'status'} style={error ? { color: '#dc2626' } : undefined}>
      {error ?? message}
      {error && onRetry ? <button type="button" className="ghost-button" onClick={onRetry} style={{ marginLeft: 12 }}>Retry</button> : null}
    </p>
  );
}

const HOME_CHURCH_SECTIONS = [
  { suffix: '', label: 'Overview' },
  { suffix: '/members', label: 'Members' },
  { suffix: '/attendance', label: 'Attendance' },
  { suffix: '/activities', label: 'Activities' },
  { suffix: '/needs', label: 'Needs' },
  { suffix: '/finance', label: 'Reports' },
  { suffix: '/status', label: 'Suspend / Close' },
] as const;

function HomeChurchTabs({ id }: { id: string }) {
  const pathname = usePathname() ?? '';
  if (!id) return null;
  const base = `/admin/home-churches/${id}`;
  return (
    <nav className="home-church-section-nav" aria-label="Home church sections">
      {HOME_CHURCH_SECTIONS.map((section) => {
        const href = `${base}${section.suffix}`;
        const active = section.suffix === '' ? pathname === base : pathname === href;
        return (
          <Link
            key={href}
            className={active ? 'tab active' : 'tab'}
            href={href}
            aria-current={active ? 'page' : undefined}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}

function HomeChurchWorkspace({
  id,
  requestedScope,
  children,
}: {
  id: string;
  requestedScope?: string;
  children: ReactNode;
}) {
  const scope = useScope(requestedScope);
  const [record, setRecord] = useState<HomeChurchRecord | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void getHomeChurch(id, scope)
      .then((next) => {
        if (cancelled) return;
        setRecord(next);
        stashAdminRecords([next as unknown as Record<string, unknown>]);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id, scope]);

  return (
    <div className="home-church-workspace">
      <header className="page-header home-church-workspace-header">
        <div>
          <h1 className="page-title">{record?.name ?? 'Home church'}</h1>
          <p className="page-subtitle">
            {record ? `${record.status.replaceAll('_', ' ')} · ${id}` : id}
          </p>
        </div>
      </header>
      <HomeChurchTabs id={id} />
      {children}
    </div>
  );
}

function PersonPicker({ name, required, defaultValue, defaultLabel }: { name: string; required?: boolean; defaultValue?: string; defaultLabel?: string }) {
  return (
    <EntitySearchSelect
      name={name}
      catalog="person"
      placeholder="Search people"
      required={required}
      defaultValue={defaultValue}
      defaultLabel={defaultLabel}
    />
  );
}

function attendanceHeadcount(row: Record<string, unknown>): number {
  return Number(row.adults ?? 0) + Number(row.children ?? 0) + Number(row.first_timers ?? 0);
}

function ApplicationsTable({ requestedScope }: { requestedScope?: string }) {
  const scope = useScope(requestedScope);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<HomeChurchApplicationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await listHomeChurchApplications({
        search: debounced || undefined,
        status: status || undefined,
        page,
        perPage: 25,
        scope,
      });
      setItems(result.items);
      setTotal(result.pagination.total);
      setLastPage(result.pagination.last_page);
    } catch (err) {
      setItems([]);
      setError(operationsErrorMessage(err, 'Unable to load applications.'));
    }
  }, [debounced, page, scope, status]);

  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <div className="table-toolbar">
        <label className="search-box"><span>⌕</span><input aria-label="Search applications" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
        <select aria-label="Filter status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {['draft', 'submitted', 'under_review', 'information_required', 'interview_orientation', 'deferred', 'approved', 'active', 'rejected', 'withdrawn', 'suspended', 'closed'].map((value) => (
            <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>
          ))}
        </select>
        <Link className="primary-button link-button" href="/admin/home-churches/applications/new">+ New Application</Link>
      </div>
      <StatusLine error={error} onRetry={() => void load()} />
      <div className="card table-card">
        <table>
          <thead><tr><th>Applicant</th><th>Proposed name</th><th>Church</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={6}>{error ? 'Unable to load applications.' : 'No applications in this scope.'}</td></tr> : items.map((row) => (
              <tr key={row.id}>
                <td>{row.applicant_name ?? '—'}</td>
                <td>{row.proposed_name}</td>
                <td>{row.church_name ?? '—'}</td>
                <td>{row.status.replaceAll('_', ' ')}</td>
                <td>{row.status_changed_at ? new Date(row.status_changed_at).toLocaleString() : '—'}</td>
                <td className="actions-cell">
                  <Link className="table-action" href={`/admin/home-churches/applications/${row.id}`}>View</Link>
                  <Link className="table-action" href={`/admin/home-churches/applications/${row.id}/review`}>Review</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination">
          <span>Showing {items.length} of {total}</span>
          {lastPage > 1 ? (
            <nav>
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>‹</button>
              <button type="button" disabled={page >= lastPage} onClick={() => setPage((value) => value + 1)}>›</button>
            </nav>
          ) : null}
        </div>
      </div>
    </>
  );
}

function ApplicationWorkspace({ screen, requestedScope }: ScopeProps) {
  const scope = useScope(requestedScope);
  const id = applicationIdFromRoute(screen.route);
  const [record, setRecord] = useState<HomeChurchApplicationRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('review_started');

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      setRecord(await getHomeChurchApplication(id, scope));
    } catch (err) {
      setRecord(null);
      setError(operationsErrorMessage(err, 'Unable to load application.'));
    }
  }, [id, scope]);

  useEffect(() => { void load(); }, [load]);

  async function decide(status: string) {
    if (!record) return;
    setBusy(true);
    setError(null);
    try {
      const next = await transitionHomeChurchApplication(record.id, {
        status,
        reason_code: reason.trim() || 'status_changed',
        notes: notes.trim() || null,
        expected_status: record.status,
      }, scope);
      setRecord(next);
      setNotes('');
    } catch (err) {
      setError(operationsErrorMessage(err, 'Transition failed.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <StatusLine error={error} onRetry={() => void load()} />
      {!record && !error ? <p className="maps-settings-lead">Loading application…</p> : null}
      {record ? (
        <div className="workflow-layout">
          <article className="card workflow-card">
            <h2>{record.proposed_name}</h2>
            <p className="page-subtitle">Status: {record.status.replaceAll('_', ' ')} · Reference {record.id}</p>
            <dl>
              <div><dt>Applicant</dt><dd>{record.applicant_name ?? '—'}</dd></div>
              <div><dt>Sponsoring church</dt><dd>{record.church_name ?? '—'}</dd></div>
              <div><dt>Location</dt><dd>{record.location_name ?? '—'}</dd></div>
              <div><dt>Administrative unit</dt><dd>{record.administrative_unit_name ?? '—'}</dd></div>
              <div><dt>Meeting</dt><dd>{record.meeting_day ?? '—'} {record.meeting_time ?? ''}</dd></div>
              <div><dt>Expected participants</dt><dd>{record.expected_participants ?? '—'}</dd></div>
              <div><dt>Linked home church</dt><dd>{record.home_church_id ? <Link href={`/admin/home-churches/${record.home_church_id}`}>{record.home_church_id}</Link> : 'Not activated'}</dd></div>
            </dl>
            <label className="full"><span>Reason code *</span><input value={reason} onChange={(event) => setReason(event.target.value)} required /></label>
            <label className="full"><span>Notes (required for reject, defer, request information, suspend, close, withdraw)</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} /></label>
            <div className="form-footer" style={{ flexWrap: 'wrap', gap: 8 }}>
              {(record.allowed_actions ?? []).map((action) => (
                <button
                  key={action.status}
                  type="button"
                  className={action.tone === 'danger' ? 'danger-button' : 'primary-button'}
                  disabled={busy}
                  onClick={() => {
                    if (action.tone === 'danger' && !window.confirm(`${action.label} this application?`)) return;
                    void decide(action.status);
                  }}
                >
                  {action.label}
                </button>
              ))}
              {(record.allowed_actions ?? []).length === 0 ? <p className="maps-settings-lead">No further transitions are allowed from this status.</p> : null}
            </div>
          </article>
          <aside className="card">
            <h2>History</h2>
            {(record.history ?? []).length === 0 ? <p>No transitions yet.</p> : (
              <ol>
                {(record.history ?? []).map((item) => (
                  <li key={item.id}>{item.from_status} → {item.to_status} · {item.reason_code} · {item.occurred_at ? new Date(item.occurred_at).toLocaleString() : ''}</li>
                ))}
              </ol>
            )}
          </aside>
        </div>
      ) : null}
    </>
  );
}

function NewApplicationForm({ requestedScope }: { requestedScope?: string }) {
  const scope = useScope(requestedScope);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const created = await createHomeChurchApplication({
        applicant_person_id: String(form.get('applicant_person_id')),
        church_id: String(form.get('church_id')),
        location_id: String(form.get('location_id')),
        administrative_unit_id: String(form.get('administrative_unit_id')),
        proposed_name: String(form.get('proposed_name')),
        expected_participants: Number(form.get('expected_participants')),
        meeting_day: String(form.get('meeting_day')),
        meeting_time: String(form.get('meeting_time')),
        contact_email: String(form.get('contact_email')),
        contact_phone: String(form.get('contact_phone')),
        guidelines_agreed_at: new Date().toISOString(),
      }, scope);
      setMessage(`Draft saved. Reference ${created.id}. Review workspace is next.`);
      window.location.assign(`/admin/home-churches/applications/${created.id}/review`);
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to create application.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card settings-card" onSubmit={(event) => void onSubmit(event)}>
      <StatusLine error={error} message={message} />
      <div className="form-grid">
        <label><span>Applicant *</span><EntitySearchSelect name="applicant_person_id" required /></label>
        <label><span>Sponsoring church *</span><EntitySearchSelect name="church_id" required /></label>
        <label><span>Proposed name *</span><input name="proposed_name" required /></label>
        <label><span>Expected participants *</span><input name="expected_participants" type="number" min={1} required /></label>
        <label><span>Country / location *</span><EntitySearchSelect name="location_id" required /></label>
        <label><span>Region / local area *</span><EntitySearchSelect name="administrative_unit_id" required /></label>
        <label><span>Meeting day *</span><select name="meeting_day" required><option value="sunday">Sunday</option><option value="monday">Monday</option><option value="tuesday">Tuesday</option><option value="wednesday">Wednesday</option><option value="thursday">Thursday</option><option value="friday">Friday</option><option value="saturday">Saturday</option></select></label>
        <label><span>Meeting time *</span><input name="meeting_time" type="time" required /></label>
        <label><span>Contact email *</span><input name="contact_email" type="email" required /></label>
        <label><span>Contact phone *</span><input name="contact_phone" required /></label>
      </div>
      <p className="maps-settings-lead">Guidelines consent is recorded at submit time. The application is created as a draft; use Review to submit and decide.</p>
      <div className="form-footer"><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save draft'}</button></div>
    </form>
  );
}

function HomeChurchesTable({ requestedScope, leadersOnly }: { requestedScope?: string; leadersOnly?: boolean }) {
  const scope = useScope(requestedScope);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<HomeChurchRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await listHomeChurches({ search: debounced || undefined, status: status || undefined, page, perPage: 25, scope });
      setItems(result.items);
      setTotal(result.pagination.total);
      stashAdminRecords(result.items as unknown as Array<Record<string, unknown>>);
    } catch (err) {
      setItems([]);
      setError(operationsErrorMessage(err, 'Unable to load home churches.'));
    }
  }, [debounced, page, scope, status]);

  useEffect(() => { void load(); }, [load]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await createHomeChurch({
        church_id: String(form.get('church_id')),
        leader_person_id: String(form.get('leader_person_id')),
        location_id: String(form.get('location_id')),
        administrative_unit_id: String(form.get('administrative_unit_id')),
        name: String(form.get('name')),
      }, scope);
      setOpen(false);
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to create home church.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="table-toolbar">
        <label className="search-box"><span>⌕</span><input aria-label="Search home churches" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
        <select aria-label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="active">active</option>
          <option value="suspended">suspended</option>
          <option value="closed">closed</option>
        </select>
        {!leadersOnly ? <button type="button" className="primary-button" onClick={() => setOpen((value) => !value)}>+ Add Home Church</button> : null}
      </div>
      <StatusLine error={error} onRetry={() => void load()} />
      {open ? (
        <form className="card settings-card" onSubmit={(event) => void onCreate(event)}>
          <div className="form-grid">
            <label><span>Name *</span><input name="name" required /></label>
            <label><span>Church *</span><EntitySearchSelect name="church_id" required /></label>
            <label><span>Leader *</span><EntitySearchSelect name="leader_person_id" required /></label>
            <label><span>Location *</span><EntitySearchSelect name="location_id" required /></label>
            <label><span>Administrative unit *</span><EntitySearchSelect name="administrative_unit_id" required /></label>
          </div>
          <div className="form-footer"><button className="primary-button" disabled={busy} type="submit">{busy ? 'Saving…' : 'Create'}</button></div>
        </form>
      ) : null}
      <div className="card table-card">
        <table>
          <thead><tr><th>Home Church</th><th>Leader</th><th>Church</th><th>Members</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={6}>{error ? 'Unable to load home churches.' : 'No home churches in this scope.'}</td></tr> : items.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.leader_name ?? '—'}</td>
                <td>{row.church_name ?? '—'}</td>
                <td>{row.members_count ?? 0}</td>
                <td>{row.status}</td>
                <td className="actions-cell">
                  <Link className="table-action" href={`/admin/home-churches/${row.id}`}>View</Link>
                  <Link className="table-action" href={`/admin/home-churches/${row.id}/members`}>Members</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination"><span>{items.length} of {total}</span>
          <nav>
            <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>‹</button>
            <button type="button" onClick={() => setPage((value) => value + 1)}>›</button>
          </nav>
        </div>
      </div>
    </>
  );
}

function HomeChurchDetail({ screen, requestedScope }: ScopeProps) {
  const scope = useScope(requestedScope);
  const id = homeChurchIdFromRoute(screen.route);
  const [record, setRecord] = useState<HomeChurchRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [leaderId, setLeaderId] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const next = await getHomeChurch(id, scope);
      setRecord(next);
      setName(next.name);
      setLeaderId(next.leader_person_id ?? '');
      stashAdminRecords([next as unknown as Record<string, unknown>]);
    } catch (err) {
      setRecord(null);
      setError(operationsErrorMessage(err, 'Unable to load home church.'));
    }
  }, [id, scope]);

  useEffect(() => { void load(); }, [load]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!record) return;
    const form = event.currentTarget as HTMLFormElement;
    const leader = String(new FormData(form).get('leader_person_id') || leaderId);
    setBusy(true);
    setError(null);
    try {
      const next = await updateHomeChurch(record.id, { name, leader_person_id: leader }, scope);
      setRecord(next);
      setLeaderId(next.leader_person_id ?? leader);
      stashAdminRecords([next as unknown as Record<string, unknown>]);
      setEditing(false);
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to save home church.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <StatusLine error={error} onRetry={() => void load()} />
      {record ? (
        <article className="card entity-overview-card">
          {editing ? (
            <form onSubmit={(event) => void onSave(event)}>
              <div className="form-grid">
                <label><span>Name *</span><input value={name} onChange={(event) => setName(event.target.value)} required /></label>
                <label>
                  <span>Leader *</span>
                  <PersonPicker name="leader_person_id" required defaultValue={leaderId} defaultLabel={record.leader_name ?? undefined} />
                </label>
              </div>
              <p className="maps-settings-lead">Parent church, location, and coverage are set when the home church is created. Status is changed from Suspend / Close.</p>
              <div className="form-footer">
                <button type="button" className="ghost-button" onClick={() => setEditing(false)}>Cancel</button>
                <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          ) : (
            <>
              <dl className="entity-definition-list">
                <div><dt>Name</dt><dd>{record.name}</dd></div>
                <div><dt>Status</dt><dd>{record.status.replaceAll('_', ' ')}</dd></div>
                <div><dt>Leader</dt><dd>{record.leader_name ?? '—'}</dd></div>
                <div><dt>Parent church</dt><dd>{record.church_name ?? '—'}</dd></div>
                <div><dt>Location</dt><dd>{record.location_name ?? '—'}</dd></div>
                <div><dt>Coverage</dt><dd>{record.administrative_unit_name ?? '—'}</dd></div>
                <div><dt>Members</dt><dd>{record.members_count ?? 0}</dd></div>
                <div><dt>Record ID</dt><dd>{record.id}</dd></div>
              </dl>
              <div className="overview-actions">
                <button type="button" className="primary-button" onClick={() => setEditing(true)}>Edit details</button>
                <Link className="ghost-button link-button" href={`/admin/home-churches/${id}/members`}>View members</Link>
              </div>
            </>
          )}
        </article>
      ) : !error ? <p className="maps-settings-lead">Loading home church…</p> : null}
    </>
  );
}

function MembersPanel({ screen, requestedScope }: ScopeProps) {
  const scope = useScope(requestedScope);
  const homeId = homeChurchIdFromRoute(screen.route);
  const [items, setItems] = useState<MembershipRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await listMemberships({ scope, perPage: 50, filter: homeId ? { home_church_id: homeId } : undefined });
      setItems(homeId ? result.items : result.items.filter((row) => Boolean(row.home_church_id)));
    } catch (err) {
      setItems([]);
      setError(operationsErrorMessage(err, 'Unable to load members.'));
    }
  }, [homeId, scope]);

  useEffect(() => { void load(); }, [load]);

  async function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!homeId) {
      setError('Open a home church to add a member.');
      return;
    }
    const form = new FormData(event.currentTarget);
    const church = await getHomeChurch(homeId, scope);
    setBusy(true);
    setError(null);
    try {
      await startMembership({
        person_id: String(form.get('person_id')),
        church_id: church.church_id ?? String(form.get('church_id')),
        home_church_id: homeId,
      }, scope);
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to add member.'));
    } finally {
      setBusy(false);
    }
  }

  async function onEnd(id: string) {
    if (!window.confirm('End this membership? History is retained.')) return;
    setBusy(true);
    try {
      await endMembership(id, { reason_code: 'membership_ended' }, scope);
      await load();
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to end membership.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <StatusLine error={error} onRetry={() => void load()} />
      {homeId ? (
      <form className="card settings-card" onSubmit={(event) => void onAdd(event)}>
        <div className="form-grid">
          <label><span>Person *</span><PersonPicker name="person_id" required /></label>
        </div>
        <div className="form-footer"><button className="primary-button" disabled={busy} type="submit">Add member</button></div>
      </form>
      ) : <p className="maps-settings-lead">Open a home church to add or end memberships. This list shows memberships that include a home church.</p>}
      <div className="card table-card">
        <table>
          <thead><tr><th>Name</th><th>Church</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={5}>No members linked to this home church.</td></tr> : items.map((row) => (
              <tr key={row.id}>
                <td>{row.person_name ?? '—'}</td>
                <td>{row.church_name ?? '—'}</td>
                <td>{row.status}</td>
                <td>{row.joined_at ? new Date(row.joined_at).toLocaleDateString() : '—'}</td>
                <td>{row.status === 'active' ? <button type="button" className="ghost-button" data-interaction-native="true" onClick={() => void onEnd(row.id)}>End membership</button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AttendancePanel({ screen, requestedScope }: ScopeProps) {
  const scope = useScope(requestedScope);
  const homeId = homeChurchIdFromRoute(screen.route);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await listAttendance({ scope, perPage: 50, filter: homeId ? { home_church_id: homeId } : undefined });
      setRows(result.items);
    } catch (err) {
      setRows([]);
      setError(operationsErrorMessage(err, 'Unable to load attendance.'));
    }
  }, [homeId, scope]);

  useEffect(() => { void load(); }, [load]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await mutateMinistryRecord('admin/church/attendance', 'POST', {
        home_church_id: homeId,
        service_date: String(form.get('service_date')),
        adults: Number(form.get('adults') || 0),
        children: Number(form.get('children') || 0),
        first_timers: Number(form.get('first_timers') || 0),
        notes: String(form.get('notes') || '') || null,
      }, scope);
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to save attendance. Duplicate dates update the existing session.'));
    } finally {
      setBusy(false);
    }
  }

  const visibleRows = useMemo(() => {
    const seen = new Set<string>();
    return rows.filter((row) => {
      const key = String(row.id ?? `${row.home_church_id}-${row.service_date}`);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [rows]);
  const totals = visibleRows.reduce((acc, row) => acc + attendanceHeadcount(row), 0);

  return (
    <>
      <StatusLine error={error} onRetry={() => void load()} />
      <p className="maps-settings-lead">
        {homeId ? 'Sessions for this home church. Saving the same date updates that session.' : 'Attendance across home churches in the current scope.'}
        {' '}Sessions: {visibleRows.length}. Headcount (adults + children + guests): {totals}.
      </p>
      {homeId ? (
      <form className="card settings-card" onSubmit={(event) => void onCreate(event)}>
        <div className="form-grid">
          <label><span>Service date *</span><input name="service_date" type="date" required /></label>
          <label><span>Adults</span><input name="adults" type="number" min={0} defaultValue={0} /></label>
          <label><span>Children</span><input name="children" type="number" min={0} defaultValue={0} /></label>
          <label><span>First-timers / guests</span><input name="first_timers" type="number" min={0} defaultValue={0} /></label>
          <label className="full"><span>Notes</span><input name="notes" /></label>
        </div>
        <div className="form-footer"><button className="primary-button" disabled={busy} type="submit">Save session</button></div>
      </form>
      ) : null}
      <div className="card table-card">
        <table>
          <thead><tr>{homeId ? null : <th>Home church</th>}<th>Date</th><th>Adults</th><th>Children</th><th>Guests</th><th>Total</th></tr></thead>
          <tbody>
            {visibleRows.length === 0 ? <tr><td colSpan={homeId ? 5 : 6}>No attendance sessions.</td></tr> : visibleRows.map((row, index) => (
              <tr key={String(row.id ?? `${row.home_church_id}-${row.service_date}-${index}`)}>
                {homeId ? null : <td>{String(row.home_church_name ?? row.church_name ?? '—')}</td>}
                <td>{String(row.service_date ?? '—')}</td>
                <td>{String(row.adults ?? 0)}</td>
                <td>{String(row.children ?? 0)}</td>
                <td>{String(row.first_timers ?? 0)}</td>
                <td>{String(attendanceHeadcount(row))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ActivitiesPanel({ screen, requestedScope }: ScopeProps) {
  const scope = useScope(requestedScope);
  const homeId = homeChurchIdFromRoute(screen.route);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const church = homeId ? await getHomeChurch(homeId, scope) : null;
      const result = await listEvangelismActivities({ scope, perPage: 50, search: church?.name });
      setRows(result.items);
    } catch (err) {
      setRows([]);
      setError(operationsErrorMessage(err, 'Unable to load activities.'));
    }
  }, [homeId, scope]);

  useEffect(() => { void load(); }, [load]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const church = await getHomeChurch(homeId, scope);
    const churchId = church.church_id;
    if (!churchId) {
      setError('This home church has no parent church id.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const occurredAt = String(form.get('occurred_at') || '');
      await mutateMinistryRecord('admin/church/evangelism-activities', 'POST', {
        church_id: churchId,
        title: String(form.get('title')),
        activity_type: String(form.get('activity_type') || 'fellowship'),
        notes: `home_church:${homeId}`,
        ...(occurredAt ? { occurred_at: occurredAt } : {}),
      }, scope);
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to create activity.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <StatusLine error={error} onRetry={() => void load()} />
      <form className="card settings-card" onSubmit={(event) => void onCreate(event)}>
        <div className="form-grid">
          <label><span>Title *</span><input name="title" required /></label>
          <label><span>Type</span><select name="activity_type"><option value="fellowship">Fellowship</option><option value="bible_study">Study Manuals</option><option value="prayer">Prayer</option><option value="outreach">Outreach</option></select></label>
          <label><span>When</span><input name="occurred_at" type="datetime-local" /></label>
        </div>
        <div className="form-footer"><button className="primary-button" disabled={busy} type="submit">Add activity</button></div>
      </form>
      <div className="card table-card">
        <table>
          <thead><tr><th>Title</th><th>Type</th><th>Church</th><th>Status</th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={4}>No activities.</td></tr> : rows.map((row) => (
              <tr key={String(row.id)}><td>{String(row.title ?? row.name ?? '—')}</td><td>{String(row.activity_type ?? '—')}</td><td>{String(row.church_name ?? '—')}</td><td>{String(row.status ?? '—')}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function NeedsPanel({ screen, requestedScope }: ScopeProps) {
  const scope = useScope(requestedScope);
  const homeId = homeChurchIdFromRoute(screen.route);
  const [rows, setRows] = useState<PastoralNeedRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await listPastoralNeeds({ scope, perPage: 50, filter: homeId ? { home_church_id: homeId } : undefined });
      setRows(result.items);
    } catch (err) {
      setRows([]);
      setError(operationsErrorMessage(err, 'Unable to load needs.'));
    }
  }, [homeId, scope]);

  useEffect(() => { void load(); }, [load]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await mutateMinistryRecord('admin/church/pastoral-needs', 'POST', {
        person_id: String(form.get('person_id')),
        category: String(form.get('category')),
        summary: String(form.get('summary')),
      }, scope);
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to submit need.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <StatusLine error={error} onRetry={() => void load()} />
      <form className="card settings-card" onSubmit={(event) => void onCreate(event)}>
        <div className="form-grid">
          <label><span>Person *</span><PersonPicker name="person_id" required /></label>
          <label><span>Category *</span><input name="category" required /></label>
          <label className="full"><span>Summary *</span><textarea name="summary" required /></label>
        </div>
        <div className="form-footer"><button className="primary-button" disabled={busy} type="submit">Submit need</button></div>
      </form>
      <div className="card table-card">
        <table>
          <thead><tr><th>Need</th><th>Category</th><th>Person</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={5}>No needs in this scope.</td></tr> : rows.map((row) => (
              <tr key={row.id}>
                <td>{row.summary}</td>
                <td>{row.category}</td>
                <td>{row.person_name ?? '—'}</td>
                <td>{row.status}</td>
                <td>
                  {row.status === 'open' ? <button type="button" className="ghost-button" data-interaction-native="true" onClick={() => void transitionPastoralNeed(row.id, 'approved', scope).then(load)}>Approve</button> : null}
                  {row.status === 'approved' ? <button type="button" className="ghost-button" data-interaction-native="true" onClick={() => void transitionPastoralNeed(row.id, 'closed', scope).then(load)}>Close</button> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ReportsPanel({ screen, requestedScope }: ScopeProps) {
  const scope = useScope(requestedScope);
  const homeId = homeChurchIdFromRoute(screen.route);
  const [rows, setRows] = useState<Array<{ id: string; action: string; occurred_at?: string | null; metadata?: Record<string, unknown> }>>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await listAdminAuditEvents({
        scope,
        perPage: 50,
        action: 'home_church.report.submitted',
        targetType: 'home_church',
      });
      setRows(result.data.filter((item) => !homeId || item.target_id === homeId).map((item) => ({
        id: item.id,
        action: item.action,
        occurred_at: item.occurred_at,
      })));
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : 'Unable to load reports.');
    }
  }, [homeId, scope]);

  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <StatusLine error={error} onRetry={() => void load()} />
      <p className="maps-settings-lead">Monthly reports are member-submitted snapshots stored as audited `home_church.report.submitted` events. Ledger balances stay in Finance — this view does not create a second ledger.</p>
      <div className="card table-card">
        <table>
          <thead><tr><th>Submitted</th><th>Action</th><th>Summary</th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={3}>No submitted reports for this home church.</td></tr> : rows.map((row) => (
              <tr key={row.id}>
                <td>{row.occurred_at ? new Date(row.occurred_at).toLocaleString() : '—'}</td>
                <td>{row.action}</td>
                <td>{String(row.metadata?.summary ?? '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StatusPanel({ screen, requestedScope }: ScopeProps) {
  const scope = useScope(requestedScope);
  const id = homeChurchIdFromRoute(screen.route);
  const [record, setRecord] = useState<HomeChurchRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setRecord(await getHomeChurch(id, scope));
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to load home church.'));
    }
  }, [id, scope]);

  useEffect(() => { void load(); }, [load]);

  async function change(status: string) {
    if (!record) return;
    if (!reason.trim()) {
      setError('A reason is required.');
      return;
    }
    if (!window.confirm(`Change ${record.name} to ${status}? Members and history are retained.`)) return;
    setBusy(true);
    setError(null);
    try {
      setRecord(await updateHomeChurchStatus(record.id, { status, reason: reason.trim() }, scope));
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to change status.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <StatusLine error={error} onRetry={() => void load()} />
      {record ? (
        <article className="card settings-card">
          <p>{record.name} is currently <strong>{record.status}</strong>. This does not hard-delete the home church.</p>
          <label className="full"><span>Reason *</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} required /></label>
          <div className="form-footer">
            {record.status === 'active' ? <button type="button" className="danger-button" disabled={busy} onClick={() => void change('suspended')}>Suspend</button> : null}
            {record.status === 'suspended' ? <button type="button" className="primary-button" disabled={busy} onClick={() => void change('active')}>Reactivate</button> : null}
            {record.status !== 'closed' ? <button type="button" className="danger-button" disabled={busy} onClick={() => void change('closed')}>Close</button> : null}
            {record.status === 'closed' ? <button type="button" className="primary-button" disabled={busy} onClick={() => void change('active')}>Reopen</button> : null}
          </div>
        </article>
      ) : null}
    </>
  );
}

export function HomeChurchesScreenContent({ screen, requestedScope }: ScopeProps) {
  const route = screen.route;
  const nestedId = homeChurchIdFromRoute(route);
  const wrap = (node: ReactNode) =>
    nestedId ? (
      <HomeChurchWorkspace id={nestedId} requestedScope={requestedScope}>
        {node}
      </HomeChurchWorkspace>
    ) : (
      node
    );

  if (route === '/admin/home-churches/applications') return <ApplicationsTable requestedScope={requestedScope} />;
  if (route === '/admin/home-churches/applications/new') return <NewApplicationForm requestedScope={requestedScope} />;
  if (/\/applications\/[0-7][0-9A-HJKMNP-TV-Z]{25}/i.test(route)) return <ApplicationWorkspace screen={screen} requestedScope={requestedScope} />;
  if (route === '/admin/home-churches') return <HomeChurchesTable requestedScope={requestedScope} />;
  if (route === '/admin/home-churches/leaders') return <HomeChurchesTable requestedScope={requestedScope} leadersOnly />;
  if (/\/members$/.test(route)) return wrap(<MembersPanel screen={screen} requestedScope={requestedScope} />);
  if (/\/attendance$/.test(route)) return wrap(<AttendancePanel screen={screen} requestedScope={requestedScope} />);
  if (/\/activities$/.test(route)) return wrap(<ActivitiesPanel screen={screen} requestedScope={requestedScope} />);
  if (/\/needs$/.test(route)) return wrap(<NeedsPanel screen={screen} requestedScope={requestedScope} />);
  if (/\/finance$/.test(route)) return wrap(<ReportsPanel screen={screen} requestedScope={requestedScope} />);
  if (/\/status$/.test(route)) return wrap(<StatusPanel screen={screen} requestedScope={requestedScope} />);
  if (/^\/admin\/home-churches\/[0-7][0-9A-HJKMNP-TV-Z]{25}$/i.test(route) || route.includes('grace-home-church')) {
    return wrap(<HomeChurchDetail screen={screen} requestedScope={requestedScope} />);
  }
  return <HomeChurchesTable requestedScope={requestedScope} />;
}
