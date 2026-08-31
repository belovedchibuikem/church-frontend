'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import type { AdminScreen } from '../lib/admin-routes';
import {
  createChurch,
  createConvert,
  defaultOpsScope,
  deleteChurch,
  endMembership,
  getChurch,
  listAttendance,
  listChurchGroups,
  listHomeChurches,
  listChurches,
  listConverts,
  listDepartments,
  listDisciples,
  listEvangelismActivities,
  listFirstTimers,
  listLeaders,
  listMemberships,
  listWorkers,
  mutateMinistryRecord,
  operationsErrorMessage,
  registerFirstTimer,
  startMembership,
  updateChurch,
  updateChurchStatus,
  type ChurchRecord,
  type FirstTimerRecord,
  type MembershipRecord,
} from '../lib/admin-operations-api';
import { listLocationsPage, listUnitsPage } from '../lib/admin-organization-api';
import { ChurchSettingsPanel } from './church-settings-panel';

type ScopeProps = { screen: AdminScreen; requestedScope?: string };

function useScope(requestedScope?: string) {
  return useMemo(() => defaultOpsScope(requestedScope), [requestedScope]);
}

function churchIdFromRoute(route: string): string {
  const match = route.match(/^\/admin\/churches\/([0-7][0-9A-HJKMNP-TV-Z]{25})/i);
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

function ChurchTabs({ id }: { id: string }) {
  if (!id) return null;
  const href = `/admin/churches/${id}`;
  return (
    <nav className="tabs" role="tablist" aria-label="Church sections">
      <Link className="tab" href={href}>Overview</Link>
      <Link className="tab" href={`${href}/leadership`}>Leadership</Link>
      <Link className="tab" href={`${href}/members`}>Members</Link>
      <Link className="tab" href={`${href}/first-timers`}>First Timers</Link>
      <Link className="tab" href={`${href}/converts`}>Converts</Link>
      <Link className="tab" href={`${href}/disciples`}>Disciples</Link>
      <Link className="tab" href={`${href}/workers`}>Workers</Link>
      <Link className="tab" href={`${href}/departments`}>Departments</Link>
      <Link className="tab" href={`${href}/small-groups`}>Groups</Link>
      <Link className="tab" href={`${href}/evangelism`}>Evangelism</Link>
      <Link className="tab" href={`${href}/attendance`}>Attendance</Link>
      <Link className="tab" href={`${href}/reports`}>Reports</Link>
      <Link className="tab" href={`${href}/finance`}>Finance</Link>
      <Link className="tab" href={`${href}/settings`}>Settings</Link>
    </nav>
  );
}

function ChurchesTable({ requestedScope }: { requestedScope?: string }) {
  const scope = useScope(requestedScope);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ChurchRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [units, setUnits] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await listChurches({ search: debounced || undefined, page, perPage: 25, scope });
      setItems(result.items);
      setTotal(result.pagination.total);
    } catch (err) {
      setItems([]);
      setError(operationsErrorMessage(err, 'Unable to load churches.'));
    }
  }, [debounced, page, scope]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    void (async () => {
      try {
        const [locationPage, unitPage] = await Promise.all([
          listLocationsPage({ perPage: 100, sort: 'name' }, { scope }),
          listUnitsPage({ perPage: 100, sort: 'name' }, { scope }),
        ]);
        setLocations(locationPage.items);
        setUnits(unitPage.items);
      } catch {
        /* options load independently */
      }
    })();
  }, [scope]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await createChurch({
        name: String(form.get('name')),
        location_id: String(form.get('location_id')),
        administrative_unit_id: String(form.get('administrative_unit_id')),
      }, scope);
      setOpen(false);
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to create church.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="table-toolbar">
        <label className="search-box"><span>⌕</span><input aria-label="Search churches" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
        <button type="button" className="primary-button" onClick={() => setOpen((value) => !value)}>+ Add Church</button>
      </div>
      <StatusLine error={error} onRetry={() => void load()} />
      {open ? (
        <form className="card settings-card" onSubmit={(event) => void onCreate(event)}>
          <div className="form-grid">
            <label><span>Canonical name *</span><input name="name" required /></label>
            <label><span>Location *</span><select name="location_id" required><option value="">Select</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label><span>Region / local area *</span><select name="administrative_unit_id" required><option value="">Select</option>{units.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          </div>
          <div className="form-footer"><button className="primary-button" disabled={busy} type="submit">{busy ? 'Saving…' : 'Create'}</button></div>
        </form>
      ) : null}
      <div className="card table-card">
        <table>
          <thead><tr><th>Church</th><th>Location</th><th>Coverage</th><th>Members</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={6}>{error ? 'Unable to load churches.' : 'No churches in this scope.'}</td></tr> : items.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.location_name ?? 'Not provided'}</td>
                <td>{row.administrative_unit_name ?? 'Not provided'}</td>
                <td>{row.memberships_count ?? 0}</td>
                <td>{row.status ?? '—'}</td>
                <td className="actions-cell"><Link className="table-action" href={`/admin/churches/${row.id}`}>View</Link></td>
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

function ChurchDetail({ screen, requestedScope }: ScopeProps) {
  const scope = useScope(requestedScope);
  const id = churchIdFromRoute(screen.route);
  const [record, setRecord] = useState<ChurchRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(screen.route.endsWith('/edit'));
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const next = await getChurch(id, scope);
      setRecord(next);
      setName(next.name);
    } catch (err) {
      setRecord(null);
      setError(operationsErrorMessage(err, 'Unable to load church.'));
    }
  }, [id, scope]);

  useEffect(() => { void load(); }, [load]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!record) return;
    setBusy(true);
    setError(null);
    try {
      const next = await updateChurch(record.id, {
        name,
        location_id: record.location_id ?? '',
        administrative_unit_id: record.administrative_unit_id ?? '',
      }, scope);
      setRecord(next);
      setEditing(false);
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to save church.'));
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status: string) {
    if (!record || !reason.trim()) {
      setError('A reason is required.');
      return;
    }
    if (!window.confirm(`Change ${record.name} to ${status}? History is retained.`)) return;
    setBusy(true);
    try {
      setRecord(await updateChurchStatus(record.id, { status, reason: reason.trim() }, scope));
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to change status.'));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!record) return;
    if (!window.confirm(`Delete ${record.name}? This is blocked if members, first-timers or home churches exist.`)) return;
    setBusy(true);
    try {
      await deleteChurch(record.id, scope);
      window.location.assign('/admin/churches');
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to delete church.'));
      setBusy(false);
    }
  }

  const missing = (value?: string | null) => value && value.trim() ? value : 'Not provided';

  return (
    <>
      <ChurchTabs id={id} />
      <StatusLine error={error} onRetry={() => void load()} />
      {record ? (
        <article className="card">
          {editing ? (
            <form onSubmit={(event) => void onSave(event)}>
              <label><span>Canonical name *</span><input value={name} onChange={(event) => setName(event.target.value)} required /></label>
              <p className="maps-settings-lead">Location and coverage stay on the linked geography records. Use Geography to change address or coordinates.</p>
              <div className="form-footer">
                <button type="button" className="ghost-button" onClick={() => setEditing(false)}>Cancel</button>
                <button type="submit" className="primary-button" disabled={busy}>Save</button>
              </div>
            </form>
          ) : (
            <>
              <dl>
                <div><dt>Name</dt><dd>{record.name}</dd></div>
                <div><dt>Church ID</dt><dd>{record.id}</dd></div>
                <div><dt>Status</dt><dd>{record.status ?? 'Not provided'}</dd></div>
                <div><dt>Location</dt><dd>{missing(record.location_name)}</dd></div>
                <div><dt>Address</dt><dd>{missing(record.address_line_one)}</dd></div>
                <div><dt>Coverage</dt><dd>{missing(record.administrative_unit_name)}</dd></div>
                <div><dt>Country</dt><dd>{missing(record.country_name)}</dd></div>
                <div><dt>Timezone</dt><dd>{missing(record.timezone)}</dd></div>
                <div><dt>Members</dt><dd>{record.memberships_count ?? 0}</dd></div>
                <div><dt>First timers</dt><dd>{record.first_timers_count ?? 0}</dd></div>
                <div><dt>Home churches</dt><dd>{record.home_churches_count ?? 0}</dd></div>
                <div><dt>Published</dt><dd>{record.published_at ? new Date(record.published_at).toLocaleString() : 'Not provided'}</dd></div>
              </dl>
              <div className="form-footer">
                <button type="button" className="ghost-button" onClick={() => setEditing(true)}>Edit</button>
                <Link className="ghost-button link-button" href={`${screen.route.replace(/\/edit$/, '')}/edit`}>Open editor</Link>
              </div>
              <label className="full"><span>Status reason *</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label>
              <div className="form-footer">
                {record.status !== 'unpublished' ? <button type="button" className="danger-button" disabled={busy} onClick={() => void changeStatus('unpublished')}>Unpublish / suspend</button> : <button type="button" className="primary-button" disabled={busy} onClick={() => void changeStatus('active')}>Activate</button>}
                <button type="button" className="danger-button" disabled={busy} onClick={() => void onDelete()}>Delete if empty</button>
              </div>
            </>
          )}
        </article>
      ) : null}
    </>
  );
}

function RolePanel({ screen, requestedScope, roleType }: ScopeProps & { roleType: 'leader' | 'worker' | 'disciple' }) {
  const scope = useScope(requestedScope);
  const churchId = churchIdFromRoute(screen.route);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const loader = roleType === 'leader' ? listLeaders : roleType === 'worker' ? listWorkers : listDisciples;

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await loader({ scope, perPage: 50, filter: churchId ? { church_id: churchId } : undefined });
      setRows(result.items);
    } catch (err) {
      setRows([]);
      setError(operationsErrorMessage(err, 'Unable to load assignments.'));
    }
  }, [churchId, loader, scope]);

  useEffect(() => { void load(); }, [load]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selectedChurch = churchId || String(form.get('church_id'));
    setBusy(true);
    setError(null);
    try {
      await mutateMinistryRecord('admin/church/role-assignments', 'POST', {
        church_id: selectedChurch,
        person_id: String(form.get('person_id')),
        role_type: roleType,
        title: String(form.get('title')),
        ...(String(form.get('started_at') || '') ? { started_at: String(form.get('started_at')) } : {}),
      }, scope);
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to assign. Duplicate active roles are blocked.'));
    } finally {
      setBusy(false);
    }
  }

  async function onEnd(id: string) {
    if (!window.confirm('End this appointment? History is kept by setting an end date.')) return;
    const row = rows.find((item) => String(item.id) === id);
    setBusy(true);
    try {
      await mutateMinistryRecord(`admin/church/role-assignments/${id}`, 'PUT', {
        church_id: String(row?.church_id ?? churchId),
        person_id: String(row?.person_id ?? ''),
        role_type: roleType,
        title: String(row?.title ?? row?.name ?? roleType),
        status: 'ended',
        ended_at: new Date().toISOString(),
      }, scope);
      await load();
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to end assignment.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {churchId ? <ChurchTabs id={churchId} /> : null}
      <StatusLine error={error} onRetry={() => void load()} />
      <form className="card settings-card" onSubmit={(event) => void onCreate(event)}>
        <div className="form-grid">
          {!churchId ? <label><span>Church id *</span><input name="church_id" required /></label> : null}
          <label><span>Person id *</span><input name="person_id" required /></label>
          <label><span>Title *</span><input name="title" required /></label>
          <label><span>Start date</span><input name="started_at" type="date" /></label>
        </div>
        <div className="form-footer"><button className="primary-button" disabled={busy} type="submit">Assign {roleType}</button></div>
      </form>
      <div className="card table-card">
        <table>
          <thead><tr><th>Person</th><th>Title</th><th>Church</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={5}>No {roleType}s in this scope.</td></tr> : rows.map((row) => (
              <tr key={String(row.id)}>
                <td>{String(row.person_name ?? '—')}</td>
                <td>{String(row.title ?? row.name ?? '—')}</td>
                <td>{String(row.church_name ?? '—')}</td>
                <td>{String(row.status ?? '—')}</td>
                <td>{row.status === 'active' ? <button type="button" className="ghost-button" onClick={() => void onEnd(String(row.id))}>End</button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MembersPanel({ screen, requestedScope }: ScopeProps) {
  const scope = useScope(requestedScope);
  const churchId = churchIdFromRoute(screen.route);
  const [items, setItems] = useState<MembershipRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await listMemberships({ scope, perPage: 50, filter: churchId ? { church_id: churchId } : undefined });
      setItems(result.items);
    } catch (err) {
      setItems([]);
      setError(operationsErrorMessage(err, 'Unable to load members.'));
    }
  }, [churchId, scope]);

  useEffect(() => { void load(); }, [load]);

  async function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await startMembership({
        person_id: String(form.get('person_id')),
        church_id: churchId || String(form.get('church_id')),
      }, scope);
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to add member. Duplicate active memberships are blocked.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {churchId ? <ChurchTabs id={churchId} /> : null}
      <StatusLine error={error} onRetry={() => void load()} />
      <form className="card settings-card" onSubmit={(event) => void onAdd(event)}>
        <div className="form-grid">
          {!churchId ? <label><span>Church id *</span><input name="church_id" required /></label> : null}
          <label><span>Person id *</span><input name="person_id" required /></label>
        </div>
        <div className="form-footer"><button className="primary-button" disabled={busy} type="submit">Add member</button></div>
      </form>
      <div className="card table-card">
        <table>
          <thead><tr><th>Name</th><th>Church</th><th>Status</th><th>Joined</th><th></th></tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={5}>No memberships.</td></tr> : items.map((row) => (
              <tr key={row.id}>
                <td>{row.person_name ?? '—'}</td>
                <td>{row.church_name ?? '—'}</td>
                <td>{row.status}</td>
                <td>{row.joined_at ? new Date(row.joined_at).toLocaleDateString() : '—'}</td>
                <td>{row.status === 'active' ? <button type="button" className="ghost-button" onClick={() => void endMembership(row.id, { reason_code: 'admin_ended' }, scope).then(load).catch((err) => setError(operationsErrorMessage(err, 'Unable to end membership.')))}>End</button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FirstTimersPanel({ screen, requestedScope }: ScopeProps) {
  const scope = useScope(requestedScope);
  const churchId = churchIdFromRoute(screen.route);
  const [rows, setRows] = useState<FirstTimerRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await listFirstTimers({ scope, perPage: 50, filter: churchId ? { church_id: churchId } : undefined });
      setRows(result.items);
    } catch (err) {
      setRows([]);
      setError(operationsErrorMessage(err, 'Unable to load first timers.'));
    }
  }, [churchId, scope]);

  useEffect(() => { void load(); }, [load]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await registerFirstTimer({
        person_id: String(form.get('person_id')),
        church_id: churchId || String(form.get('church_id')),
      }, scope);
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to register first timer. Existing people are reused.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {churchId ? <ChurchTabs id={churchId} /> : null}
      <StatusLine error={error} onRetry={() => void load()} />
      <form className="card settings-card" onSubmit={(event) => void onCreate(event)}>
        <div className="form-grid">
          {!churchId ? <label><span>Church id *</span><input name="church_id" required /></label> : null}
          <label><span>Person id *</span><input name="person_id" required /></label>
        </div>
        <div className="form-footer"><button className="primary-button" disabled={busy} type="submit">Register first timer</button></div>
      </form>
      <div className="card table-card">
        <table>
          <thead><tr><th>Name</th><th>Church</th><th>Visit</th><th>Follow-up</th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={4}>No first timers.</td></tr> : rows.map((row) => (
              <tr key={row.id}>
                <td>{row.person_name ?? '—'}</td>
                <td>{row.church_name ?? '—'}</td>
                <td>{row.registered_at ? new Date(row.registered_at).toLocaleDateString() : '—'}</td>
                <td>{row.contacted_at ? 'Contacted' : 'Pending'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ConvertsPanel({ screen, requestedScope }: ScopeProps) {
  const scope = useScope(requestedScope);
  const churchId = churchIdFromRoute(screen.route);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await listConverts({ scope, perPage: 50, filter: churchId ? { church_id: churchId } : undefined });
      setRows(result.items);
    } catch (err) {
      setRows([]);
      setError(operationsErrorMessage(err, 'Unable to load converts.'));
    }
  }, [churchId, scope]);

  useEffect(() => { void load(); }, [load]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await createConvert({
        person_id: String(form.get('person_id')),
        church_id: churchId || String(form.get('church_id')),
        converted_at: String(form.get('converted_at') || '') || new Date().toISOString(),
        source: String(form.get('source') || '') || null,
      }, scope);
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to record conversion. Duplicate active convert records are blocked.'));
    } finally {
      setBusy(false);
    }
  }

  async function enrolDisciple(row: Record<string, unknown>) {
    setBusy(true);
    try {
      await mutateMinistryRecord('admin/church/role-assignments', 'POST', {
        church_id: String(row.church_id ?? churchId),
        person_id: String(row.person_id ?? ''),
        role_type: 'disciple',
        title: 'Disciple',
      }, scope);
      await load();
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to enrol as disciple (person is reused, not duplicated).'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {churchId ? <ChurchTabs id={churchId} /> : null}
      <StatusLine error={error} onRetry={() => void load()} />
      <form className="card settings-card" onSubmit={(event) => void onCreate(event)}>
        <div className="form-grid">
          {!churchId ? <label><span>Church id *</span><input name="church_id" required /></label> : null}
          <label><span>Person id *</span><input name="person_id" required /></label>
          <label><span>Converted on</span><input name="converted_at" type="date" /></label>
          <label><span>Source</span><input name="source" /></label>
        </div>
        <div className="form-footer"><button className="primary-button" disabled={busy} type="submit">Record convert</button></div>
      </form>
      <div className="card table-card">
        <table>
          <thead><tr><th>Name</th><th>Date</th><th>Source</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={5}>No converts.</td></tr> : rows.map((row) => (
              <tr key={String(row.id)}>
                <td>{String(row.person_name ?? '—')}</td>
                <td>{row.converted_at ? new Date(String(row.converted_at)).toLocaleDateString() : '—'}</td>
                <td>{String(row.source ?? 'Not provided')}</td>
                <td>{String(row.status ?? '—')}</td>
                <td><button type="button" className="ghost-button" onClick={() => void enrolDisciple(row)}>Enrol disciple</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function NamedCrudPanel({
  screen, requestedScope, title, list, path, fields,
}: ScopeProps & { title: string; list: (params: Parameters<typeof listDepartments>[0]) => ReturnType<typeof listDepartments>; path: string; fields: Array<{ name: string; label: string; type?: string; required?: boolean }> }) {
  const scope = useScope(requestedScope);
  const churchId = churchIdFromRoute(screen.route);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await list({ scope, perPage: 50, filter: churchId ? { church_id: churchId } : undefined });
      setRows(result.items);
    } catch (err) {
      setRows([]);
      setError(operationsErrorMessage(err, `Unable to load ${title.toLowerCase()}.`));
    }
  }, [churchId, list, scope, title]);

  useEffect(() => { void load(); }, [load]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: Record<string, string | boolean | number> = { church_id: churchId || String(form.get('church_id')) };
    for (const field of fields) {
      const value = String(form.get(field.name) || '');
      if (value) payload[field.name] = field.type === 'number' ? Number(value) : value;
    }
    setBusy(true);
    setError(null);
    try {
      await mutateMinistryRecord(path, 'POST', payload, scope);
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(operationsErrorMessage(err, `Unable to create ${title.toLowerCase()}.`));
    } finally {
      setBusy(false);
    }
  }

  async function onArchive(id: string) {
    if (!window.confirm(`Archive this ${title.toLowerCase().slice(0, -1)}?`)) return;
    setBusy(true);
    try {
      if (path.includes('groups')) {
        const row = rows.find((item) => String(item.id) === id);
        await mutateMinistryRecord(`${path}/${id}`, 'PUT', { name: String(row?.name ?? ''), is_published: false }, scope);
      } else {
        await mutateMinistryRecord(`${path}/${id}`, 'DELETE', undefined, scope);
      }
      await load();
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to archive. Records with members cannot be hard-deleted.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {churchId ? <ChurchTabs id={churchId} /> : null}
      <StatusLine error={error} onRetry={() => void load()} />
      <form className="card settings-card" onSubmit={(event) => void onCreate(event)}>
        <div className="form-grid">
          {!churchId ? <label><span>Church id *</span><input name="church_id" required /></label> : null}
          {fields.map((field) => (
            <label key={field.name}><span>{field.label}{field.required ? ' *' : ''}</span><input name={field.name} type={field.type ?? 'text'} required={field.required} /></label>
          ))}
        </div>
        <div className="form-footer"><button className="primary-button" disabled={busy} type="submit">Add</button></div>
      </form>
      <div className="card table-card">
        <table>
          <thead><tr><th>Name</th><th>Church</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={4}>No {title.toLowerCase()}.</td></tr> : rows.map((row) => (
              <tr key={String(row.id)}>
                <td>{String(row.name ?? row.title ?? '—')}</td>
                <td>{String(row.church_name ?? '—')}</td>
                <td>{String(row.status ?? '—')}</td>
                <td><button type="button" className="ghost-button" onClick={() => void onArchive(String(row.id))}>Archive</button></td>
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
  const churchId = churchIdFromRoute(screen.route);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [homes, setHomes] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [attendance, homeChurches] = await Promise.all([
        listAttendance({ scope, perPage: 50, filter: churchId ? { church_id: churchId } : undefined }),
        listHomeChurches({ scope, perPage: 100, filter: churchId ? { church_id: churchId } : undefined }),
      ]);
      setRows(attendance.items);
      setHomes(homeChurches.items.map((item) => ({ id: item.id, name: item.name })));
    } catch (err) {
      setRows([]);
      setError(operationsErrorMessage(err, 'Unable to load attendance.'));
    }
  }, [churchId, scope]);

  useEffect(() => { void load(); }, [load]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await mutateMinistryRecord('admin/church/attendance', 'POST', {
        home_church_id: String(form.get('home_church_id')),
        service_date: String(form.get('service_date')),
        adults: Number(form.get('adults') || 0),
        children: Number(form.get('children') || 0),
        first_timers: Number(form.get('first_timers') || 0),
        notes: String(form.get('notes') || ''),
      }, scope);
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to record attendance. Duplicate home church and date is merged, not doubled.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {churchId ? <ChurchTabs id={churchId} /> : null}
      <StatusLine error={error} onRetry={() => void load()} />
      <form className="card settings-card" onSubmit={(event) => void onCreate(event)}>
        <div className="form-grid">
          <label><span>Home church *</span><select name="home_church_id" required><option value="">Select</option>{homes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><span>Service date *</span><input name="service_date" type="date" required /></label>
          <label><span>Adults</span><input name="adults" type="number" min={0} defaultValue={0} /></label>
          <label><span>Children</span><input name="children" type="number" min={0} defaultValue={0} /></label>
          <label><span>First timers</span><input name="first_timers" type="number" min={0} defaultValue={0} /></label>
          <label className="full"><span>Notes</span><input name="notes" /></label>
        </div>
        <div className="form-footer"><button className="primary-button" disabled={busy} type="submit">{busy ? 'Saving…' : 'Record session'}</button></div>
      </form>
      <div className="card table-card">
        <table>
          <thead><tr><th>Home church</th><th>Date</th><th>Adults</th><th>Children</th><th>First timers</th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={5}>No attendance sessions in this scope.</td></tr> : rows.map((row) => (
              <tr key={String(row.id)}>
                <td>{String(row.home_church_name ?? row.home_church_id ?? '—')}</td>
                <td>{String(row.service_date ?? '—')}</td>
                <td>{String(row.adults ?? 0)}</td>
                <td>{String(row.children ?? 0)}</td>
                <td>{String(row.first_timers ?? 0)}</td>
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
  const churchId = churchIdFromRoute(screen.route);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const filter = churchId ? { church_id: churchId } : undefined;
    try {
      const [members, first, converts, workers, departments, groups, evangelism, attendance] = await Promise.all([
        listMemberships({ scope, perPage: 1, filter }),
        listFirstTimers({ scope, perPage: 1, filter }),
        listConverts({ scope, perPage: 1, filter }),
        listWorkers({ scope, perPage: 1, filter }),
        listDepartments({ scope, perPage: 1, filter }),
        listChurchGroups({ scope, perPage: 1, filter }),
        listEvangelismActivities({ scope, perPage: 1, filter }),
        listAttendance({ scope, perPage: 1 }),
      ]);
      setCounts({
        Members: members.pagination.total,
        'First timers': first.pagination.total,
        Converts: converts.pagination.total,
        Workers: workers.pagination.total,
        Departments: departments.pagination.total,
        Groups: groups.pagination.total,
        Evangelism: evangelism.pagination.total,
        Attendance: attendance.pagination.total,
      });
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to load report totals.'));
    }
  }, [churchId, scope]);

  useEffect(() => { void load(); }, [load]);

  return (
    <>
      {churchId ? <ChurchTabs id={churchId} /> : null}
      <StatusLine error={error} onRetry={() => void load()} />
      <div className="metric-grid">
        {Object.entries(counts).map(([label, value]) => (
          <article className="card metric-card" key={label}><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong></article>
        ))}
      </div>
      <p className="maps-settings-lead">Totals come from the same scoped list APIs as the tables. Export authorised finance data from Finance.</p>
    </>
  );
}

function FinancePanel({ screen }: ScopeProps) {
  const churchId = churchIdFromRoute(screen.route);
  return (
    <>
      {churchId ? <ChurchTabs id={churchId} /> : null}
      <article className="card settings-card">
        <p>Church giving, receipts and reconciliation live in the canonical Finance module. This screen does not keep a second ledger.</p>
        <Link className="primary-button link-button" href="/admin/finance">Open Finance</Link>
      </article>
    </>
  );
}

function SettingsPanel({ screen }: ScopeProps) {
  const churchId = churchIdFromRoute(screen.route);
  return (
    <>
      {churchId ? <ChurchTabs id={churchId} /> : null}
      <ChurchSettingsPanel />
    </>
  );
}

export function ChurchScreenContent({ screen, requestedScope }: ScopeProps) {
  const route = screen.route;
  if (route === '/admin/churches' || route === '/admin/churches/new') return <ChurchesTable requestedScope={requestedScope} />;
  if (/\/leadership$/.test(route) || route === '/admin/church/leadership') return <RolePanel screen={screen} requestedScope={requestedScope} roleType="leader" />;
  if (/\/members$/.test(route) || route === '/admin/church/members') return <MembersPanel screen={screen} requestedScope={requestedScope} />;
  if (/\/first-timers$/.test(route) || route === '/admin/church/first-timers') return <FirstTimersPanel screen={screen} requestedScope={requestedScope} />;
  if (/\/converts$/.test(route) || route === '/admin/church/converts') return <ConvertsPanel screen={screen} requestedScope={requestedScope} />;
  if (/\/disciples$/.test(route) || route === '/admin/church/disciples') return <RolePanel screen={screen} requestedScope={requestedScope} roleType="disciple" />;
  if (/\/workers$/.test(route) || route === '/admin/church/workers') return <RolePanel screen={screen} requestedScope={requestedScope} roleType="worker" />;
  if (/\/departments$/.test(route) || route === '/admin/church/departments') {
    return <NamedCrudPanel screen={screen} requestedScope={requestedScope} title="Departments" list={listDepartments} path="admin/church/departments" fields={[{ name: 'name', label: 'Name', required: true }, { name: 'description', label: 'Description' }]} />;
  }
  if (/\/small-groups$/.test(route) || route === '/admin/church/small-groups') {
    return <NamedCrudPanel screen={screen} requestedScope={requestedScope} title="Small groups" list={listChurchGroups} path="admin/church/groups" fields={[{ name: 'name', label: 'Name', required: true }, { name: 'description', label: 'Description' }, { name: 'capacity', label: 'Capacity', type: 'number' }]} />;
  }
  if (/\/evangelism$/.test(route) || route === '/admin/church/evangelism') {
    return <NamedCrudPanel screen={screen} requestedScope={requestedScope} title="Activities" list={listEvangelismActivities} path="admin/church/evangelism-activities" fields={[{ name: 'title', label: 'Title', required: true }, { name: 'activity_type', label: 'Type' }]} />;
  }
  if (/\/attendance$/.test(route) || route === '/admin/church/attendance') return <AttendancePanel screen={screen} requestedScope={requestedScope} />;
  if (/\/reports$/.test(route) || route === '/admin/church/reports') return <ReportsPanel screen={screen} requestedScope={requestedScope} />;
  if (/\/finance$/.test(route) || route === '/admin/church/finance') return <FinancePanel screen={screen} requestedScope={requestedScope} />;
  if (/\/settings$/.test(route) || route === '/admin/church/settings') return <SettingsPanel screen={screen} requestedScope={requestedScope} />;
  if (/^\/admin\/churches\/[0-7][0-9A-HJKMNP-TV-Z]{25}/i.test(route) || route.includes('the-covenant-place')) {
    return <ChurchDetail screen={screen} requestedScope={requestedScope} />;
  }
  return <ChurchesTable requestedScope={requestedScope} />;
}
