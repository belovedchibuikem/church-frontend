'use client';

import Link from 'next/link';
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import type { AdminScreen } from '../lib/admin-routes';
import {
  archivePerson,
  assignPrayerRequest,
  completeFollowUpTask,
  createConvert,
  createFollowUpTask,
  createPastoralNeed,
  createPerson,
  createPrayerRequest,
  defaultOpsScope,
  getCounsellingCase,
  getPerson,
  listConverts,
  listCounsellingCases,
  listDisciples,
  listFirstTimers,
  listFollowUpTasks,
  listLeaders,
  listPastoralNeeds,
  listPeopleDirectory,
  listPrayerRequests,
  listSafeguardingIncidents,
  listTestimonies,
  listWorkers,
  matchPeople,
  mergePeople,
  mutateMinistryRecord,
  operationsErrorMessage,
  registerFirstTimer,
  transitionPastoralNeed,
  transitionPrayerRequest,
  updatePersonPhone,
  type AdminScope,
} from '../lib/admin-operations-api';
import { EntitySearchSelect } from './entity-search-select';
import { fetchUserCapabilities } from '../lib/user-api';
import { ChurchSettingsPanel } from './church-settings-panel';

type ScopeProps = { screen: AdminScreen; requestedScope?: string };

function useScope(requestedScope?: string) {
  return useMemo(() => defaultOpsScope(requestedScope), [requestedScope]);
}

function cell(value: unknown) {
  if (value == null || value === '' || value === '—') return 'Not provided';
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString();
  }
  return text;
}

function missing(value?: string | null) {
  return cell(value);
}

function personIdFromRoute(route: string) {
  const match = route.match(/^\/admin\/people\/([0-7][0-9A-HJKMNP-TV-Z]{25})/i);
  return match?.[1] ?? '';
}

function StatusLine({ error, onRetry }: { error?: string | null; onRetry?: () => void }) {
  if (!error) return null;
  return (
    <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>
      {error}
      {onRetry ? <button type="button" className="ghost-button" onClick={onRetry} style={{ marginLeft: 12 }}>Retry</button> : null}
    </p>
  );
}

function PeopleDirectory({ requestedScope }: { requestedScope?: string }) {
  const scope = useScope(requestedScope);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await listPeopleDirectory({ search: debounced || undefined, page, perPage: 25, scope });
      setItems(result.items);
      setTotal(result.pagination.total);
    } catch (err) {
      setItems([]);
      setError(operationsErrorMessage(err, 'Unable to load people.'));
    }
  }, [debounced, page, scope]);

  useEffect(() => { void load(); }, [load]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const payload = {
      given_name: String(form.get('given_name')),
      family_name: String(form.get('family_name')),
      preferred_name: String(form.get('preferred_name') || ''),
      email: String(form.get('email') || ''),
      phone: String(form.get('phone') || ''),
    };
    setBusy(true);
    setError(null);
    try {
      const found = await matchPeople(payload, scope);
      if (found.matches.length > 0 && matches.length === 0) {
        setMatches(found.matches);
        setBusy(false);
        return;
      }
      await createPerson({ ...payload, confirm_new: true }, scope);
      setOpen(false);
      setMatches([]);
      formEl.reset();
      await load();
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to create person.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="maps-settings-lead">Each row is one canonical person. Roles are badges, not duplicate records. Total {total} distinct people in this scope.</p>
      <div className="table-toolbar">
        <label className="search-box"><span>⌕</span><input aria-label="Search people" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
        <button type="button" className="primary-button" data-interaction-native="true" onClick={() => { setOpen((value) => !value); setMatches([]); }}>+ Add person</button>
      </div>
      <StatusLine error={error} onRetry={() => void load()} />
      {open ? (
        <form className="card settings-card" onSubmit={(event) => void onCreate(event)}>
          <div className="form-grid">
            <label><span>Given name *</span><input name="given_name" required /></label>
            <label><span>Family name *</span><input name="family_name" required /></label>
            <label><span>Preferred name</span><input name="preferred_name" /></label>
            <label><span>Email</span><input name="email" type="email" /></label>
            <label><span>Phone</span><input name="phone" /></label>
          </div>
          {matches.length > 0 ? (
            <p className="maps-settings-lead" role="status">Possible matches — review before creating another person:
              {matches.map((item) => <Link key={String(item.id)} href={`/admin/people/${item.id}`} style={{ marginLeft: 8 }}>{String(item.name)} ({String(item.match_reason)})</Link>)}
            </p>
          ) : null}
          <div className="form-footer"><button className="primary-button" disabled={busy} type="submit">{matches.length ? 'Create anyway' : 'Create'}</button></div>
        </form>
      ) : null}
      <div className="card table-card">
        <table>
          <thead><tr><th>Name</th><th>ID</th><th>Roles</th><th>Church</th><th>Status</th><th>Last contact</th><th></th></tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={7}>{error ? 'Unable to load people.' : 'No people in this scope.'}</td></tr> : items.map((row) => (
              <tr key={String(row.id)}>
                <td>{missing(String(row.name ?? ''))}</td>
                <td>{String(row.id)}</td>
                <td>{String(row.type ?? row.roles ?? 'Person')}</td>
                <td>{row.church_name ? String(row.church_name) : 'Not assigned'}</td>
                <td>{String(row.status ?? 'active')}</td>
                <td>{row.last_contact ? new Date(String(row.last_contact)).toLocaleDateString() : 'Not provided'}</td>
                <td className="actions-cell">
                  <Link className="table-action" href={`/admin/people/${row.id}`}>View</Link>
                  <Link className="table-action" href={`/admin/people/${row.id}/edit`}>Edit</Link>
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

function Person360({ screen, requestedScope }: ScopeProps) {
  const scope = useScope(requestedScope);
  const id = personIdFromRoute(screen.route);
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(screen.route.endsWith('/edit'));
  const [counsellingAccess, setCounsellingAccess] = useState(false);
  const [safeguardingAccess, setSafeguardingAccess] = useState(false);
  const [mergeId, setMergeId] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      setRecord(await getPerson(id, scope));
    } catch (err) {
      setRecord(null);
      setError(operationsErrorMessage(err, 'Unable to load person.'));
    }
  }, [id, scope]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    void fetchUserCapabilities().then((snapshot) => {
      const perms = snapshot.permissions;
      setCounsellingAccess(perms.includes('church.follow_up.complete'));
      setSafeguardingAccess(perms.includes('safeguarding.incidents.report'));
    }).catch(() => {
      setCounsellingAccess(false);
      setSafeguardingAccess(false);
    });
  }, []);

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      setRecord(await updatePersonPhone(id, {
        given_name: String(form.get('given_name')),
        family_name: String(form.get('family_name')),
        phone: String(form.get('phone') || ''),
      }, scope) as Record<string, unknown>);
      setEditing(false);
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to save person.'));
    } finally {
      setBusy(false);
    }
  }

  const memberships = (record?.memberships as Array<Record<string, unknown>> | undefined) ?? [];
  const roles = (record?.role_assignments as Array<Record<string, unknown>> | undefined) ?? [];
  const firstTimers = (record?.first_timers as Array<Record<string, unknown>> | undefined) ?? [];
  const converts = (record?.converts as Array<Record<string, unknown>> | undefined) ?? [];

  return (
    <>
      <nav className="tabs" role="tablist" aria-label="Person 360">
        <Link className="tab" href={`/admin/people/${id}`}>Overview</Link>
        <Link className="tab" href={`/admin/people/${id}/edit`}>Edit</Link>
        {counsellingAccess ? <Link className="tab" href="/admin/people/counselling">Counselling</Link> : null}
        {safeguardingAccess ? <Link className="tab" href="/admin/people/safeguarding">Safeguarding</Link> : null}
      </nav>
      <StatusLine error={error} onRetry={() => void load()} />
      {record ? (
        <article className="card person-summary">
          <div className="portrait">{String(record.name ?? 'P').split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
          <div>
            <h2>{missing(String(record.name ?? ''))}</h2>
            <p>{String(record.type ?? 'Person')}</p>
            <p>ID {String(record.id)} · Church {record.church_name ? String(record.church_name) : 'Not assigned'}</p>
            {record.church_name ? null : <Link className="ghost-button link-button" href="/admin/church/members">Assign church membership</Link>}
          </div>
        </article>
      ) : null}
      {record && editing ? (
        <form className="card settings-card" onSubmit={(event) => void onSave(event)}>
          <div className="form-grid">
            <label><span>Given name *</span><input name="given_name" defaultValue={String(record.given_name ?? '')} required /></label>
            <label><span>Family name *</span><input name="family_name" defaultValue={String(record.family_name ?? '')} required /></label>
            <label><span>Phone</span><input name="phone" defaultValue={String(record.phone ?? '')} /></label>
          </div>
          <div className="form-footer"><button className="primary-button" disabled={busy} type="submit">Save</button></div>
        </form>
      ) : record ? (
        <article className="card details-card">
          <dl>
            <div><dt>Email</dt><dd>{missing(record.email as string)}</dd></div>
            <div><dt>Phone</dt><dd>{missing(record.phone as string)}</dd></div>
            <div><dt>Preferred name</dt><dd>{missing(record.preferred_name as string)}</dd></div>
            <div><dt>Status</dt><dd>{String(record.status ?? 'active')}</dd></div>
          </dl>
        </article>
      ) : null}
      {record ? (
        <>
          <article className="card"><h2 className="card-title">Church & membership</h2>
            {memberships.length === 0 ? <p>Not assigned. <Link href="/admin/church/members">Add membership</Link></p> : memberships.map((item) => <p key={String(item.id)}>{String(item.church_name)} · {String(item.status)} · {String(item.joined_at ?? '')}</p>)}
          </article>
          <article className="card"><h2 className="card-title">Kingdom / ministry journey</h2>
            {firstTimers.map((item) => <p key={String(item.id)}>First timer · {String(item.church_name)}</p>)}
            {converts.map((item) => <p key={String(item.id)}>Convert · {String(item.church_name)}</p>)}
            {roles.map((item) => <p key={String(item.id)}>{String(item.role_type)} · {String(item.title ?? '')} · {String(item.church_name)}</p>)}
            {firstTimers.length + converts.length + roles.length === 0 ? <p>No journey stages recorded.</p> : null}
          </article>
          <form className="card settings-card" onSubmit={(event) => {
            event.preventDefault();
            if (!window.confirm(`Merge ${mergeId} into ${id}? History is kept; the source person is archived.`)) return;
            setBusy(true);
            void mergePeople(id, mergeId, scope).then(setRecord).catch((err) => setError(operationsErrorMessage(err, 'Merge failed.'))).finally(() => setBusy(false));
          }}>
            <label><span>Merge duplicate person</span><EntitySearchSelect name="source_person_id" required value={mergeId} onValueChange={setMergeId} /></label>
            <button className="danger-button" disabled={busy} type="submit">Review merge</button>
          </form>
          <button type="button" className="danger-button" disabled={busy} onClick={() => {
            const reason = window.prompt(`Archive ${record.name}? Person records with history are not hard-deleted.`, 'duplicate_or_inactive');
            if (!reason) return;
            setBusy(true);
            void archivePerson(id, reason, scope).then(setRecord).catch((err) => setError(operationsErrorMessage(err, 'Archive failed.'))).finally(() => setBusy(false));
          }}>Archive</button>
        </>
      ) : null}
    </>
  );
}

function SimpleQueue({
  title, loader, columns, children,
}: {
  title: string;
  loader: (scope: AdminScope) => Promise<{ items: Array<Record<string, unknown>> }>;
  columns: string[];
  children?: (row: Record<string, unknown>, reload: () => void) => ReactNode;
}) {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const scope = useScope();
  const load = useCallback(async () => {
    setError(null);
    try { setItems((await loader(scope)).items); } catch (err) { setItems([]); setError(operationsErrorMessage(err, `Unable to load ${title}.`)); }
  }, [loader, scope, title]);
  useEffect(() => { void load(); }, [load]);
  return (
    <>
      <StatusLine error={error} onRetry={() => void load()} />
      <div className="card table-card">
        <table>
          <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={columns.length}>No {title.toLowerCase()}.</td></tr> : items.map((row) => (
              <tr key={String(row.id)}>
                {columns.slice(0, -1).map((column) => <td key={column}>{cell(row[column])}</td>)}
                <td>{children ? children(row, () => void load()) : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FollowUpPanel({ requestedScope }: { requestedScope?: string }) {
  const scope = useScope(requestedScope);
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try { setItems((await listFollowUpTasks({ scope, perPage: 50 })).items as Array<Record<string, unknown>>); } catch (err) {
      setItems([]); setError(operationsErrorMessage(err, 'Unable to load follow-up.'));
    }
  }, [scope]);
  useEffect(() => { void load(); }, [load]);
  return (
    <>
      <StatusLine error={error} onRetry={() => void load()} />
      <form className="card settings-card" onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void createFollowUpTask({ first_timer_id: String(form.get('first_timer_id')), assigned_to_person_id: String(form.get('assigned_to_person_id') || ''), due_at: String(form.get('due_at') || '') }, scope)
          .then(() => load()).catch((err) => setError(operationsErrorMessage(err, 'Unable to assign follow-up.')));
      }}>
        <div className="form-grid">
          <label><span>First timer *</span><EntitySearchSelect name="first_timer_id" required /></label>
          <label><span>Assignee</span><EntitySearchSelect name="assigned_to_person_id" /></label>
          <label><span>Due</span><input name="due_at" type="datetime-local" /></label>
        </div>
        <button className="primary-button" type="submit">Assign</button>
      </form>
      <div className="card table-card">
        <table>
          <thead><tr><th>Person</th><th>Assignee</th><th>Due</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={5}>No follow-up tasks.</td></tr> : items.map((row) => (
              <tr key={String(row.id)}>
                <td>{String(row.person_name ?? '—')}</td>
                <td>{String(row.assigned_to_name ?? 'Unassigned')}</td>
                <td>{row.due_at ? new Date(String(row.due_at)).toLocaleString() : 'Not provided'}</td>
                <td>{String(row.status)}</td>
                <td>{row.status === 'pending' ? <button type="button" className="ghost-button" onClick={() => void completeFollowUpTask(String(row.id), 'contacted_successfully', scope).then(load).catch((err) => setError(operationsErrorMessage(err, 'Complete failed.')))}>Complete</button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function RoleQueue({ list, title }: { title: string; list: typeof listLeaders }) {
  const scope = useScope();
  const loader = useCallback((next: AdminScope) => list({ scope: next, perPage: 50 }), [list]);
  return <SimpleQueue title={title} loader={loader} columns={['person_name', 'church_name', 'title', 'status', '']} />;
}

export function PeopleScreenContent({ screen, requestedScope }: ScopeProps) {
  const route = screen.route;
  const scope = useScope(requestedScope);
  if (route === '/admin/people') return <PeopleDirectory requestedScope={requestedScope} />;
  if (/^\/admin\/people\/[0-7][0-9A-HJKMNP-TV-Z]{25}/i.test(route)) return <Person360 screen={screen} requestedScope={requestedScope} />;
  if (route === '/admin/people/first-timers' || route.includes('/first-timers/')) {
    return (
      <>
        <form className="card settings-card" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void registerFirstTimer({ person_id: String(form.get('person_id')), church_id: String(form.get('church_id')) }, scope)
            .then(() => window.location.reload())
            .catch((err) => window.alert(operationsErrorMessage(err, 'Unable to register first timer.')));
        }}>
          <div className="form-grid">
            <label><span>Existing person *</span><EntitySearchSelect name="person_id" required /></label>
            <label><span>Church *</span><EntitySearchSelect name="church_id" required /></label>
          </div>
          <button className="primary-button" type="submit">Register first timer</button>
        </form>
        <SimpleQueue title="First timers" loader={(next) => listFirstTimers({ scope: next, perPage: 50 })} columns={['person_name', 'church_name', 'registered_at', '']} />
      </>
    );
  }
  if (route === '/admin/people/follow-up') return <FollowUpPanel requestedScope={requestedScope} />;
  if (route.startsWith('/admin/people/converts')) {
    return (
      <>
        <form className="card settings-card" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void createConvert({ person_id: String(form.get('person_id')), church_id: String(form.get('church_id')), converted_at: String(form.get('converted_at') || '') }, scope)
            .then(() => window.location.reload())
            .catch((err) => window.alert(operationsErrorMessage(err, 'Unable to record conversion.')));
        }}>
          <div className="form-grid">
            <label><span>Person *</span><EntitySearchSelect name="person_id" required /></label>
            <label><span>Church *</span><EntitySearchSelect name="church_id" required /></label>
            <label><span>Converted on</span><input name="converted_at" type="date" /></label>
          </div>
          <button className="primary-button" type="submit">Record conversion</button>
        </form>
        <SimpleQueue title="Converts" loader={(next) => listConverts({ scope: next, perPage: 50 })} columns={['person_name', 'church_name', 'converted_at', 'status', '']} />
      </>
    );
  }
  if (route.includes('/disciples') || route.includes('/journeys/membership')) return <RoleQueue title="Disciples" list={listDisciples} />;
  if (route.includes('/journeys/worker') || route === '/admin/people/workers') return <RoleQueue title="Workers" list={listWorkers} />;
  if (route.includes('/journeys/leadership') || route === '/admin/people/leaders') return <RoleQueue title="Leaders" list={listLeaders} />;
  if (route === '/admin/people/ministry-history') {
    return <SimpleQueue title="History" loader={async (next) => {
      const [members, workers, leaders] = await Promise.all([listFirstTimers({ scope: next, perPage: 25 }), listWorkers({ scope: next, perPage: 25 }), listLeaders({ scope: next, perPage: 25 })]);
      return { items: [...members.items, ...workers.items, ...leaders.items] as Array<Record<string, unknown>> };
    }} columns={['person_name', 'church_name', 'status', '']} />;
  }
  if (route.startsWith('/admin/people/prayer-requests')) {
    return (
      <>
        <form className="card settings-card" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void createPrayerRequest({ person_id: String(form.get('person_id')), subject: String(form.get('subject')), body: String(form.get('body')) }, scope)
            .then(() => window.location.reload())
            .catch((err) => window.alert(operationsErrorMessage(err, 'Unable to submit prayer request.')));
        }}>
          <div className="form-grid">
            <label><span>Person *</span><EntitySearchSelect name="person_id" required /></label>
            <label><span>Subject *</span><input name="subject" required /></label>
            <label className="full"><span>Private request *</span><textarea name="body" required /></label>
          </div>
          <button className="primary-button" type="submit">Submit</button>
        </form>
        <SimpleQueue title="Prayer requests" loader={(next) => listPrayerRequests({ scope: next, perPage: 50 })} columns={['subject', 'person_name', 'status', '']} >
          {(row, reload) => (
            <>
              <form
                className="row-assign-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const assignee = String(form.get('assigned_to_person_id') || '');
                  if (!assignee) return;
                  void assignPrayerRequest(String(row.id), { assigned_to_person_id: assignee }, scope).then(reload);
                }}
              >
                <EntitySearchSelect name="assigned_to_person_id" required placeholder="Search assignee" />
                <button type="submit" className="ghost-button">Assign</button>
              </form>
              <button type="button" className="ghost-button" onClick={() => void transitionPrayerRequest(String(row.id), 'answered', scope).then(reload)}>Close</button>
            </>
          )}
        </SimpleQueue>
      </>
    );
  }
  if (route.startsWith('/admin/people/needs')) {
    return (
      <>
        <form className="card settings-card" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void createPastoralNeed({ person_id: String(form.get('person_id')), category: String(form.get('category')), summary: String(form.get('summary')) }, scope)
            .then(() => window.location.reload())
            .catch((err) => window.alert(operationsErrorMessage(err, 'Unable to submit need.')));
        }}>
          <div className="form-grid">
            <label><span>Person *</span><EntitySearchSelect name="person_id" required /></label>
            <label><span>Category *</span><input name="category" required /></label>
            <label className="full"><span>Summary *</span><textarea name="summary" required /></label>
          </div>
          <button className="primary-button" type="submit">Submit need</button>
        </form>
        <SimpleQueue title="Needs" loader={(next) => listPastoralNeeds({ scope: next, perPage: 50 })} columns={['category', 'person_name', 'status', '']} >
          {(row, reload) => <button type="button" className="ghost-button" onClick={() => void transitionPastoralNeed(String(row.id), 'approved', scope).then(reload)}>Approve</button>}
        </SimpleQueue>
      </>
    );
  }
  if (route.startsWith('/admin/people/counselling')) {
    const caseId = route.match(/\/counselling\/([0-7][0-9A-HJKMNP-TV-Z]{25})/i)?.[1];
    if (caseId) return <CounsellingDetail id={caseId} scope={scope} />;
    return <SimpleQueue title="Counselling cases" loader={(next) => listCounsellingCases({ scope: next, perPage: 50 })} columns={['id', 'case_type', 'client_label', 'status', '']} >
      {(row) => <Link className="table-action" href={`/admin/people/counselling/${row.id}`}>Open</Link>}
    </SimpleQueue>;
  }
  if (route === '/admin/people/testimonies') {
    return (
      <>
        <form className="card settings-card" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void mutateMinistryRecord('admin/church/testimonies', 'POST', {
            person_id: String(form.get('person_id')),
            church_id: String(form.get('church_id')),
            title: String(form.get('title')),
            body: String(form.get('body')),
          }, scope).then(() => window.location.reload()).catch((err) => window.alert(operationsErrorMessage(err, 'Unable to submit testimony.')));
        }}>
          <div className="form-grid">
            <label><span>Person *</span><EntitySearchSelect name="person_id" required /></label>
            <label><span>Church *</span><EntitySearchSelect name="church_id" required /></label>
            <label><span>Title *</span><input name="title" required /></label>
            <label className="full"><span>Body *</span><textarea name="body" required /></label>
          </div>
          <button className="primary-button" type="submit">Submit</button>
        </form>
        <SimpleQueue title="Testimonies" loader={(next) => listTestimonies({ scope: next, perPage: 50 })} columns={['title', 'person_name', 'status', '']} />
      </>
    );
  }
  if (route.startsWith('/admin/people/safeguarding')) {
    return (
      <>
        <form className="card settings-card" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void mutateMinistryRecord('admin/safeguarding/incidents', 'POST', {
            concern_type: String(form.get('concern_type')),
            severity: String(form.get('severity')),
            restricted_summary: String(form.get('restricted_summary')),
            subject_person_id: String(form.get('subject_person_id') || '') || null,
          }, scope).then(() => window.location.reload()).catch((err) => window.alert(operationsErrorMessage(err, 'Unable to report incident.')));
        }}>
          <div className="form-grid">
            <label><span>Concern type *</span><input name="concern_type" required /></label>
            <label><span>Severity *</span><select name="severity" required><option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="critical">critical</option></select></label>
            <label><span>Subject</span><EntitySearchSelect name="subject_person_id" /></label>
            <label className="full"><span>Restricted summary *</span><textarea name="restricted_summary" required /></label>
          </div>
          <button className="danger-button" type="submit">Escalate now</button>
        </form>
        <SimpleQueue title="Safeguarding incidents" loader={(next) => listSafeguardingIncidents({ scope: next, perPage: 50 })} columns={['reference_code', 'concern_type', 'severity', 'status', '']} />
      </>
    );
  }
  if (route === '/admin/people/reports') {
    return <PeopleReports requestedScope={requestedScope} />;
  }
  if (route === '/admin/people/settings') return <ChurchSettingsPanel />;
  return <PeopleDirectory requestedScope={requestedScope} />;
}

function CounsellingDetail({ id, scope }: { id: string; scope: AdminScope }) {
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void getCounsellingCase(id, scope).then(setRecord).catch((err) => setError(operationsErrorMessage(err, 'Restricted case unavailable.')));
  }, [id, scope]);
  return (
    <>
      <StatusLine error={error} />
      {record ? (
        <article className="card">
          <h2>Case {String(record.id)}</h2>
          <p>Type {String(record.case_type)} · {String(record.status)}</p>
          <p>Client {String(record.person_name ?? 'Restricted')}</p>
          <p>Notes are access-logged. {String(record.summary ?? '')}</p>
        </article>
      ) : null}
    </>
  );
}

function PeopleReports({ requestedScope }: { requestedScope?: string }) {
  const scope = useScope(requestedScope);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const [people, first, converts, follow] = await Promise.all([
        listPeopleDirectory({ scope, perPage: 1 }),
        listFirstTimers({ scope, perPage: 1 }),
        listConverts({ scope, perPage: 1 }),
        listFollowUpTasks({ scope, perPage: 1 }),
      ]);
      setCounts({ People: people.pagination.total, 'First timers': first.pagination.total, Converts: converts.pagination.total, 'Follow-up': follow.pagination.total });
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to load reports.'));
    }
  }, [scope]);
  useEffect(() => { void load(); }, [load]);
  return (
    <>
      <StatusLine error={error} onRetry={() => void load()} />
      <div className="metric-grid">{Object.entries(counts).map(([label, value]) => <article className="card" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
    </>
  );
}
