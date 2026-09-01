'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';

import { AdminWizardFooter, AdminWizardStepper } from './admin-wizard-chrome';
import { useAdminWizardStep } from '../lib/use-admin-wizard-step';

import type { AdminScreen } from '../lib/admin-routes';
import {
  archiveAdminRole,
  archiveAdminWorkItem,
  createAdminRole,
  createAdminUser,
  createAdminWorkItem,
  defaultAdminScope,
  exportAdminAuditCsv,
  formatTimestamp,
  getAdminRole,
  getAdminUser,
  identityErrorMessage,
  listAdminAuditEvents,
  listAdminRoles,
  listAdminSecuritySessions,
  listAdminUsers,
  listAdminWorkItems,
  requestAdminUserPasswordReset,
  updateAdminUser,
  updateAdminWorkItem,
  type AdminAuditEvent,
  type AdminRole,
  type AdminUser,
  type AdminWorkItem,
} from '../lib/admin-identity-api';
import { listCatalogDomain, catalogErrorMessage, shouldUseCatalogLiveData, CATALOG_GLOBAL_SCOPE } from '../lib/admin-catalog-api';
import { listCountriesPage, organizationErrorMessage } from '../lib/admin-organization-api';
import { apiRequest } from '../lib/api-client';
import { fetchUserCapabilities, fetchUserNotifications, markAllUserNotificationsRead, markUserNotificationRead, type UserNotification } from '../lib/user-api';
import { platformErrorMessage, queryPlatformSearch, type PlatformSearchHit, PLATFORM_GLOBAL_SCOPE } from '../lib/admin-platform-api';

type ScopeProps = { screen: AdminScreen; requestedScope?: string };

function Status({ error, message, onRetry }: { error?: string | null; message?: string | null; onRetry?: () => void }) {
  if (!error && !message) return null;
  return (
    <p className="maps-settings-lead" role={error ? 'alert' : 'status'} style={error ? { color: '#dc2626' } : undefined}>
      {error ?? message}
      {error && onRetry ? (
        <button type="button" className="ghost-button" data-interaction-native="true" onClick={onRetry} style={{ marginLeft: 12 }}>Retry</button>
      ) : null}
    </p>
  );
}

function ScopePicker({ requestedScope }: { requestedScope?: string }) {
  const current = requestedScope && requestedScope !== 'assigned' ? requestedScope : 'global';
  const [message, setMessage] = useState('Loading allowed scopes…');
  const [error, setError] = useState<string | null>(null);
  const [scopes, setScopes] = useState<Array<{ token: string; label: string; copy: string }>>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [capabilities, countries] = await Promise.all([
        fetchUserCapabilities(),
        listCountriesPage({ perPage: 50 }).catch(() => ({ items: [] as Array<{ id: string; name: string; iso_code: string }> })),
      ]);
      const allowed = new Set(capabilities.scopes.map((scope) => `${scope.type}:${scope.key}`));
      const hasGlobal = capabilities.scopes.some((scope) => scope.type === 'global') || capabilities.permissions.includes('*');
      const next: Array<{ token: string; label: string; copy: string }> = [];
      if (hasGlobal) next.push({ token: 'global', label: 'Global', copy: 'All countries and data' });
      for (const country of countries.items ?? []) {
        const token = `country:${country.id}`;
        if (hasGlobal || allowed.has(token) || allowed.has(`country:${country.iso_code}`)) {
          next.push({ token, label: country.name, copy: country.iso_code });
        }
      }
      for (const scope of capabilities.scopes) {
        const token = `${scope.type}:${scope.key}`;
        if (!next.some((item) => item.token === token) && scope.type !== 'global') {
          next.push({ token, label: `${scope.type} ${scope.key}`, copy: 'Assigned scope' });
        }
      }
      setScopes(next);
      setMessage(next.length === 0 ? 'No scopes are assigned to this account.' : `Select a scope. Current: ${current}`);
    } catch (err) {
      setError(identityErrorMessage(err) || organizationErrorMessage(err));
      setMessage('Live scopes unavailable');
    }
  }, [current]);

  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <Status error={error} message={message} onRetry={() => void load()} />
      <div className="scope-current">Current Scope <strong>{current}</strong></div>
      <div className="scope-grid">
        {scopes.map((scope) => (
          <Link
            href={`/admin/scope?scope=${encodeURIComponent(scope.token)}`}
            className="card scope-card"
            key={scope.token}
            onClick={() => { window.localStorage.setItem('fhc-admin-scope', scope.token); }}
          >
            <span className="scope-icon">◉</span>
            <strong>{scope.label}</strong>
            <small>{scope.copy}</small>
          </Link>
        ))}
      </div>
    </>
  );
}

function CommandCentre() {
  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<PlatformSearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      setRecent(JSON.parse(window.localStorage.getItem('fhc-admin-recent-commands') ?? '[]'));
    } catch {
      setRecent([]);
    }
  }, []);

  const runSearch = useCallback(async (nextTerm: string, resourceType: string) => {
    const clean = nextTerm.trim();
    if (clean.length < 2) {
      setHits([]);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const results = await queryPlatformSearch(clean, {
        resourceTypes: resourceType === 'all' ? [] : [resourceType.toLowerCase()],
        limit: 20,
        scope: PLATFORM_GLOBAL_SCOPE,
      });
      setHits(results);
      setActive(0);
    } catch (err) {
      setHits([]);
      setError(platformErrorMessage(err, 'Platform search failed.'));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => { void runSearch(term, filter); }, 280);
    return () => window.clearTimeout(handle);
  }, [term, filter, runSearch]);

  const commands = [
    { label: 'Approve Home Church', href: '/admin/home-churches/applications', copy: 'Review and decide' },
    { label: 'View Country Report', href: '/admin/reports/country-performance', copy: 'Open performance' },
    { label: 'Create Announcement', href: '/admin/communications', copy: 'Draft a message' },
    { label: 'Manage Users', href: '/admin/users', copy: 'Directory' },
    { label: 'Audit log', href: '/admin/audit', copy: 'Immutable history' },
    { label: 'Tasks', href: '/admin/tasks', copy: 'Work queue' },
  ];

  function remember(label: string) {
    const next = [label, ...recent.filter((item) => item !== label)].slice(0, 8);
    setRecent(next);
    window.localStorage.setItem('fhc-admin-recent-commands', JSON.stringify(next));
  }

  function onKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, Math.max(hits.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && hits[active]) {
      remember(hits[active]!.title);
    }
  }

  return (
    <>
      <label className="command-search">
        <span>⌕</span>
        <input aria-label="Command search" placeholder="Search churches, members, events…" value={term} data-interaction-native="true" onChange={(event) => setTerm(event.target.value)} onKeyDown={onKey} />
        <button type="button" className="primary-button" data-interaction-native="true" disabled={busy} onClick={() => void runSearch(term, filter)}>{busy ? 'Searching…' : 'Search'}</button>
      </label>
      <div className="chip-row">
        {['all', 'Church', 'Member', 'Event', 'User'].map((item) => (
          <button key={item} type="button" data-interaction-native="true" className={filter === item ? 'is-active' : undefined} onClick={() => setFilter(item)}>{item === 'all' ? 'All' : item}</button>
        ))}
      </div>
      <Status error={error} message={term.trim().length < 2 ? 'Type at least two characters. Results come from live platform search.' : busy ? 'Searching…' : hits.length === 0 ? 'No matching records.' : `Found ${hits.length} result(s).`} />
      {recent.length > 0 ? <p className="maps-settings-lead">Recent: {recent.join(' · ')}</p> : null}
      {hits.length > 0 ? (
        <div className="card table-card">
          <table>
            <thead><tr><th>Title</th><th>Type</th><th>Summary</th></tr></thead>
            <tbody>
              {hits.map((hit, index) => (
                <tr key={`${hit.resource_type}-${hit.resource_id}`} className={index === active ? 'is-active' : undefined}>
                  <td>{hit.title}</td>
                  <td>{hit.resource_type}</td>
                  <td>{hit.summary ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <h2 className="section-title">Popular Commands</h2>
      <div className="action-grid">
        {commands.map((item) => (
          <Link className="card action-card" key={item.label} href={item.href} onClick={() => remember(item.label)}>
            <span>⌘</span>
            <strong>{item.label}</strong>
            <small>{item.copy}</small>
          </Link>
        ))}
      </div>
    </>
  );
}

function AlertsCentre({ screen }: { screen: AdminScreen }) {
  const rules = screen.route.endsWith('/rules');
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('Loading…');
  const [severity, setSeverity] = useState('all');
  const [status, setStatus] = useState('all');

  const refresh = useCallback(async () => {
    if (!shouldUseCatalogLiveData()) {
      setMessage('Catalog API is not configured.');
      return;
    }
    setError(null);
    try {
      const result = await listCatalogDomain(rules ? 'reporting.alert_rules' : 'reporting.alert_occurrences', {
        perPage: 50,
        status: status === 'all' ? undefined : status,
      });
      let items = result.items as Array<Record<string, unknown>>;
      if (!rules && severity !== 'all') {
        items = items.filter((item) => String(item.severity ?? item.detail ?? '').toLowerCase().includes(severity));
      }
      setRows(items);
      setMessage(items.length === 0 ? 'No alerts in this filter.' : `Showing ${items.length} of ${result.pagination.total}`);
    } catch (err) {
      setRows([]);
      setError(catalogErrorMessage(err, 'Unable to load alerts.'));
    }
  }, [rules, severity, status]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function mutate(path: string) {
    try {
      await apiRequest(path, { method: 'POST', scope: CATALOG_GLOBAL_SCOPE, body: path.includes('resolution') ? JSON.stringify({ reason_code: 'resolved' }) : undefined });
      await refresh();
    } catch (err) {
      setError(catalogErrorMessage(err, 'Alert mutation failed.'));
    }
  }

  return (
    <>
      <Status error={error} message={message} onRetry={() => void refresh()} />
      {!rules ? (
        <div className="chip-row" style={{ marginBottom: 12 }}>
          {['all', 'critical', 'warning', 'info'].map((item) => (
            <button key={item} type="button" data-interaction-native="true" className={severity === item ? 'is-active' : undefined} onClick={() => setSeverity(item)}>{item}</button>
          ))}
          {['all', 'open', 'acknowledged', 'resolved'].map((item) => (
            <button key={item} type="button" data-interaction-native="true" className={status === item ? 'is-active' : undefined} onClick={() => setStatus(item)}>{item}</button>
          ))}
          <Link href="/admin/alerts/rules">Alert rules</Link>
        </div>
      ) : <p className="maps-settings-lead"><Link href="/admin/alerts">Back to occurrences</Link></p>}
      <div className="card feed-card">
        {rows.map((row) => {
          const id = String(row.id ?? '');
          const title = String(row.title ?? row.name ?? row.code ?? 'Alert');
          const state = String(row.status ?? 'open');
          return (
            <article className="feed-item" key={id}>
              <span className={`feed-icon tone-${state === 'open' ? 0 : 1}`}>!</span>
              <div>
                <strong>{title}</strong>
                <p>{state} · {String(row.opened_at ?? row.updated_at ?? '')}</p>
              </div>
              {!rules && state !== 'resolved' ? (
                <div className="row-actions">
                  {state === 'open' ? <button type="button" data-interaction-native="true" onClick={() => void mutate(`admin/reporting/alert-occurrences/${id}/acknowledgement`)}>Acknowledge</button> : null}
                  <button type="button" data-interaction-native="true" onClick={() => void mutate(`admin/reporting/alert-occurrences/${id}/resolution`)}>Resolve</button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </>
  );
}

function NotificationsInbox() {
  const [items, setItems] = useState<UserNotification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'unread'>('all');

  const refresh = useCallback(async () => {
    try {
      setItems(await fetchUserNotifications());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load notifications.');
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const unread = items.filter((item) => !item.read_at);
  const visible = tab === 'unread' ? unread : items;

  return (
    <>
      <Status error={error} message={`${unread.length} unread of ${items.length}`} onRetry={() => void refresh()} />
      <div className="chip-row" style={{ marginBottom: 12 }}>
        <button type="button" data-interaction-native="true" className={tab === 'all' ? 'is-active' : undefined} onClick={() => setTab('all')}>All</button>
        <button type="button" data-interaction-native="true" className={tab === 'unread' ? 'is-active' : undefined} onClick={() => setTab('unread')}>Unread ({unread.length})</button>
        <button type="button" data-interaction-native="true" onClick={() => void markAllUserNotificationsRead().then(setItems)}>Mark all read</button>
      </div>
      <div className="card feed-card">
        {visible.length === 0 ? <p className="maps-settings-lead">No notifications.</p> : visible.map((item) => (
          <article className="feed-item" key={item.id}>
            <span className="feed-icon">•</span>
            <div>
              <strong>{item.title || 'Notification'}</strong>
              <p>{item.body || '—'}</p>
            </div>
            <time>{formatTimestamp(item.created_at)}</time>
            {!item.read_at && item.id ? (
              <button type="button" data-interaction-native="true" onClick={() => void markUserNotificationRead(item.id!).then(() => refresh())}>Mark read</button>
            ) : null}
          </article>
        ))}
      </div>
    </>
  );
}

function ActivityFeed({ requestedScope }: { requestedScope?: string }) {
  const [rows, setRows] = useState<AdminAuditEvent[]>([]);
  const [action, setAction] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const result = await listAdminAuditEvents({
        scope: defaultAdminScope(requestedScope),
        perPage: 25,
        action: action.trim() || undefined,
      });
      setRows(result.data);
      setTotal(result.pagination.total);
      setError(null);
    } catch (err) {
      setError(identityErrorMessage(err));
    }
  }, [action, requestedScope]);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <>
      <Status error={error} message={`Showing ${rows.length} of ${total} events`} onRetry={() => void refresh()} />
      <label>Action filter <input value={action} onChange={(event) => setAction(event.target.value)} placeholder="identity.user.suspended" /></label>
      <div className="card table-card">
        <table>
          <thead><tr><th>Occurred</th><th>Actor</th><th>Action</th><th>Target</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{formatTimestamp(row.occurred_at)}</td>
                <td>{row.actor_user_id ?? '—'}</td>
                <td><code>{row.action}</code></td>
                <td>{row.target_type ? `${row.target_type}:${row.target_id ?? ''}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TasksBoard({ requestedScope }: { requestedScope?: string }) {
  const scope = useMemo(() => defaultAdminScope(requestedScope), [requestedScope]);
  const [items, setItems] = useState<AdminWorkItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [tab, setTab] = useState('open');

  const refresh = useCallback(async () => {
    try {
      const result = await listAdminWorkItems({ scope, perPage: 50, status: tab === 'all' ? undefined : tab });
      setItems(result.data);
      setError(null);
    } catch (err) {
      setError(identityErrorMessage(err));
    }
  }, [scope, tab]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    try {
      await createAdminWorkItem({ title: title.trim(), priority: 'normal' }, scope);
      setTitle('');
      await refresh();
    } catch (err) {
      setError(identityErrorMessage(err));
    }
  }

  return (
    <>
      <Status error={error} message="Administrative work items. Follow-up church tasks remain on ministry queues." onRetry={() => void refresh()} />
      <form onSubmit={(event) => void onCreate(event)} className="table-toolbar">
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="New task title" required />
        <button type="submit" className="primary-button" data-interaction-native="true">Create</button>
      </form>
      <div className="chip-row" style={{ marginBottom: 12 }}>
        {['open', 'in_progress', 'completed', 'archived', 'all'].map((item) => (
          <button key={item} type="button" data-interaction-native="true" className={tab === item ? 'is-active' : undefined} onClick={() => setTab(item)}>{item}</button>
        ))}
      </div>
      <div className="card task-list">
        {items.length === 0 ? <p className="maps-settings-lead">No tasks in this filter.</p> : items.map((item) => (
          <div className="task-item" key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
            <div>
              <strong>{item.title}</strong>
              <small style={{ display: 'block' }}>{item.status} · {item.priority} · {item.assigned_to?.name ?? 'Unassigned'}</small>
              <time>{item.due_at ? formatTimestamp(item.due_at) : 'No due date'}</time>
            </div>
            <div className="row-actions">
              {item.status !== 'completed' && item.status !== 'archived' ? (
                <button type="button" data-interaction-native="true" onClick={() => void updateAdminWorkItem(item.id, { status: 'completed' }, scope).then(refresh)}>Complete</button>
              ) : null}
              {item.status !== 'archived' ? (
                <button type="button" className="table-action is-danger" data-interaction-native="true" onClick={() => {
                  if (window.confirm(`Archive ${item.title}? The record is retained.`)) void archiveAdminWorkItem(item.id, scope).then(refresh);
                }}>Archive</button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function QuickActionsLive() {
  const items = [
    { label: 'Create Announcement', href: '/admin/communications', copy: 'Open communications' },
    { label: 'Add New Church', href: '/admin/churches/create', copy: 'Register a church' },
    { label: 'Approve Requests', href: '/admin/approvals', copy: 'Approval inbox' },
    { label: 'Create Event', href: '/admin/events', copy: 'Events catalogue' },
    { label: 'Generate Report', href: '/admin/reports', copy: 'Reports home' },
    { label: 'Manage Users', href: '/admin/users', copy: 'User directory' },
    { label: 'System Settings', href: '/admin/settings/platform', copy: 'Platform configuration' },
    { label: 'Audit', href: '/admin/audit', copy: 'Compliance log' },
  ];
  return (
    <div className="quick-grid">
      {items.map((item) => (
        <Link className="card quick-card" key={item.label} href={item.href}>
          <span>⌘</span>
          <strong>{item.label}</strong>
          <small>{item.copy}</small>
        </Link>
      ))}
    </div>
  );
}

function UserDetail({ screen, requestedScope }: ScopeProps) {
  const id = screen.route.split('/')[3] ?? '';
  const isEdit = screen.route.endsWith('/edit');
  const isSessions = screen.route.endsWith('/sessions');
  const scope = useMemo(() => defaultAdminScope(requestedScope), [requestedScope]);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Array<{ id: string; device?: string | null; status?: string | null; started_at?: string | null }>>([]);

  const load = useCallback(async () => {
    if (!id || id === 'create' || id === 'suspended') return;
    try {
      const record = await getAdminUser(id, scope);
      setUser(record);
      if (isSessions) {
        const listed = await listAdminSecuritySessions({ scope, actorId: id, perPage: 25 });
        setSessions(listed.data);
      }
      setError(null);
    } catch (err) {
      setError(identityErrorMessage(err));
    }
  }, [id, isSessions, scope]);

  useEffect(() => { void load(); }, [load]);

  if (error) return <Status error={error} onRetry={() => void load()} />;
  if (!user) return <p className="maps-settings-lead" role="status">Loading user…</p>;

  if (isSessions) {
    return (
      <div className="card table-card">
        <table>
          <thead><tr><th>Device</th><th>Status</th><th>Started</th></tr></thead>
          <tbody>
            {sessions.length === 0 ? <tr><td colSpan={3}>No sessions for this user.</td></tr> : sessions.map((row) => (
              <tr key={row.id}><td>{row.device ?? '—'}</td><td>{row.status}</td><td>{formatTimestamp(row.started_at)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (isEdit) {
    return (
      <form
        className="card form-card"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void updateAdminUser(user.id, {
            name: String(form.get('name') ?? ''),
            profile: {
              given_name: String(form.get('given_name') ?? ''),
              family_name: String(form.get('family_name') ?? ''),
              preferred_name: String(form.get('preferred_name') ?? '') || null,
            },
          }, scope).then(setUser).catch((err) => setError(identityErrorMessage(err)));
        }}
      >
        <Status error={error} />
        <div className="form-grid">
          <label className="full">
            <span>Display name</span>
            <input name="name" defaultValue={user.name} required />
          </label>
          <label>
            <span>Given name *</span>
            <input name="given_name" defaultValue={user.profile?.given_name ?? ''} required />
          </label>
          <label>
            <span>Family name *</span>
            <input name="family_name" defaultValue={user.profile?.family_name ?? ''} required />
          </label>
          <label>
            <span>Preferred name</span>
            <input name="preferred_name" defaultValue={user.profile?.preferred_name ?? ''} />
          </label>
        </div>
        <footer className="form-footer">
          <Link className="ghost-button link-button" href={`/admin/users/${user.id}`}>Cancel</Link>
          <button className="primary-button" type="submit" data-interaction-native="true">Save changes</button>
        </footer>
      </form>
    );
  }

  return (
    <div className="detail-grid">
      <article className="card identity-card">
        <h2>{user.name}</h2>
        <p>{user.email}</p>
        <p>{user.account_status}</p>
        <div className="row-actions">
          <Link className="ghost-button" href={`/admin/users/${user.id}/edit`}>Edit</Link>
          <Link className="ghost-button" href={`/admin/users/${user.id}/sessions`}>Sessions</Link>
          <button type="button" data-interaction-native="true" onClick={() => {
            if (window.confirm(`Send a password reset email to ${user.email}?`)) {
              void requestAdminUserPasswordReset(user.id, scope).then(() => setError(null)).catch((err) => setError(identityErrorMessage(err)));
            }
          }}>Send password reset</button>
        </div>
      </article>
      <article className="card details-card">
        <h2 className="card-title">Roles</h2>
        {(user.roles ?? []).length === 0 ? <p>No roles assigned.</p> : user.roles?.map((role) => (
          <div className="rank-row" key={role.assignment_id}><span>{role.name}</span><strong>{role.code}</strong></div>
        ))}
        <Link href="/admin/access/user-role-assignment">Assign roles</Link>
      </article>
      <Status error={error} />
    </div>
  );
}

function CreateUserForm({ screen, requestedScope }: ScopeProps) {
  const scope = useMemo(() => defaultAdminScope(requestedScope), [requestedScope]);
  const steps = screen.tabs ?? ['Details', 'Roles & Permissions', 'Church / Scope', 'Review'];
  const wizard = useAdminWizardStep(steps);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [createdUser, setCreatedUser] = useState<AdminUser | null>(null);
  const [draft, setDraft] = useState({
    given_name: '',
    family_name: '',
    preferred_name: '',
    email: '',
    role_id: '',
  });

  useEffect(() => {
    void listAdminRoles({ scope, perPage: 50 }).then((result) => setRoles(result.data)).catch(() => setRoles([]));
  }, [scope]);

  function updateDraft(field: keyof typeof draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function validateStep(step: number): string | null {
    if (step === 0) {
      if (!draft.given_name.trim()) return 'Given name is required.';
      if (!draft.family_name.trim()) return 'Family name is required.';
      if (!draft.email.trim()) return 'Email is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) return 'Enter a valid email address.';
    }
    return null;
  }

  async function submit() {
    const validationError = validateStep(0);
    if (validationError) {
      setError(validationError);
      wizard.goToStep(0);
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const user = await createAdminUser({
        email: draft.email.trim(),
        profile: {
          given_name: draft.given_name.trim(),
          family_name: draft.family_name.trim(),
          preferred_name: draft.preferred_name.trim() || null,
        },
        role_id: draft.role_id || null,
      }, scope);
      setCreatedUser(user);
      setMessage(`Created ${user.name}. A password setup email was sent to ${user.email}.`);
    } catch (err) {
      setError(identityErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const selectedRole = roles.find((role) => role.id === draft.role_id);
  const displayName = [draft.given_name, draft.family_name].filter(Boolean).join(' ').trim() || 'New user';

  if (createdUser) {
    return (
      <div className="create-user-wizard" data-admin-wizard="true">
        <header className="page-header create-user-header">
          <div>
            <h1 className="page-title">User created</h1>
            <p className="page-subtitle">The account is ready. The user can sign in after setting a password from the email we sent.</p>
          </div>
        </header>
        <article className="card form-card create-user-success">
          <div className="interaction-confirm-summary">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>{createdUser.name}</strong>
              <p>{createdUser.email}</p>
            </div>
          </div>
          <dl className="wizard-review-summary">
            <div><dt>User ID</dt><dd><code>{createdUser.id}</code></dd></div>
            <div><dt>Status</dt><dd>{createdUser.account_status}</dd></div>
            {selectedRole ? <div><dt>Initial role</dt><dd>{selectedRole.name}</dd></div> : null}
          </dl>
          <footer className="form-footer">
            <Link className="ghost-button link-button" href="/admin/users">Back to users</Link>
            <Link className="primary-button link-button" href={`/admin/users/${createdUser.id}`}>View user</Link>
          </footer>
        </article>
      </div>
    );
  }

  return (
    <div className="create-user-wizard" data-admin-wizard="true">
      <header className="page-header create-user-header">
        <div>
          <h1 className="page-title">{screen.title}</h1>
          <p className="page-subtitle">{screen.subtitle}</p>
        </div>
        <div className="header-actions">
          <Link className="ghost-button link-button" href="/admin/users">Cancel</Link>
        </div>
      </header>

      <AdminWizardStepper steps={steps} currentStep={wizard.currentStep} />

      <form
        className="card form-card"
        onSubmit={(event) => {
          event.preventDefault();
          if (wizard.isLast) void submit();
        }}
      >
        <Status error={error} message={message} />

        {wizard.currentStep === 0 && (
          <>
            <h2 className="section-title">Personal details</h2>
            <p className="field-help full create-user-lead">Enter the user&apos;s legal name and work email. They will receive a message to set their password.</p>
            <div className="form-grid">
              <label>
                <span>Given name *</span>
                <input
                  name="given_name"
                  type="text"
                  autoComplete="given-name"
                  placeholder="e.g. Grace"
                  value={draft.given_name}
                  onChange={(event) => updateDraft('given_name', event.target.value)}
                  required
                />
              </label>
              <label>
                <span>Family name *</span>
                <input
                  name="family_name"
                  type="text"
                  autoComplete="family-name"
                  placeholder="e.g. Ezekiel"
                  value={draft.family_name}
                  onChange={(event) => updateDraft('family_name', event.target.value)}
                  required
                />
              </label>
              <label>
                <span>Preferred name</span>
                <input
                  name="preferred_name"
                  type="text"
                  autoComplete="nickname"
                  placeholder="Optional display name"
                  value={draft.preferred_name}
                  onChange={(event) => updateDraft('preferred_name', event.target.value)}
                />
              </label>
              <label>
                <span>Email *</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@organization.org"
                  value={draft.email}
                  onChange={(event) => updateDraft('email', event.target.value)}
                  required
                />
              </label>
            </div>
          </>
        )}

        {wizard.currentStep === 1 && (
          <>
            <h2 className="section-title">Roles &amp; permissions</h2>
            <p className="field-help full create-user-lead">Optionally assign an initial role now. You can add more roles and fine-grained permissions after the account is created.</p>
            <div className="form-grid">
              <label className="full">
                <span>Initial role</span>
                <select
                  name="role_id"
                  value={draft.role_id}
                  onChange={(event) => updateDraft('role_id', event.target.value)}
                >
                  <option value="">No role yet — assign later</option>
                  {roles.filter((role) => !role.is_system || role.code !== 'super_administrator').map((role) => (
                    <option key={role.id} value={role.id}>{role.name} ({role.code})</option>
                  ))}
                </select>
              </label>
            </div>
            {selectedRole ? (
              <p className="field-help full" role="status">
                {selectedRole.assignment_count ?? 0} users currently have this role.
              </p>
            ) : null}
          </>
        )}

        {wizard.currentStep === 2 && (
          <>
            <h2 className="section-title">Church / scope</h2>
            <p className="field-help full create-user-lead">
              New users inherit access from roles and scoped assignments. After creation, use{' '}
              <Link href="/admin/access/user-role-assignment">User role assignment</Link> to attach church, home church, or country scope.
            </p>
            <dl className="wizard-review-summary">
              <div><dt>Creating from scope</dt><dd>{scope === 'global' ? 'Global' : scope}</dd></div>
              <div><dt>User preview</dt><dd>{displayName}</dd></div>
              <div><dt>Email</dt><dd>{draft.email || '—'}</dd></div>
            </dl>
          </>
        )}

        {wizard.currentStep >= 3 && (
          <>
            <h2 className="section-title">Review &amp; create</h2>
            <p className="field-help full create-user-lead">Confirm the details below. Creating the user sends a password setup email immediately.</p>
            <dl className="wizard-review-summary">
              <div><dt>Full name</dt><dd>{displayName}</dd></div>
              {draft.preferred_name ? <div><dt>Preferred name</dt><dd>{draft.preferred_name}</dd></div> : null}
              <div><dt>Email</dt><dd>{draft.email}</dd></div>
              <div><dt>Initial role</dt><dd>{selectedRole?.name ?? 'None — assign after creation'}</dd></div>
              <div><dt>Admin scope</dt><dd>{scope === 'global' ? 'Global' : scope}</dd></div>
            </dl>
          </>
        )}

        <AdminWizardFooter
          wizard={wizard}
          finishLabel={busy ? 'Creating…' : 'Create user'}
          onBeforeAdvance={() => {
            const validationError = validateStep(wizard.currentStep);
            if (validationError) {
              setError(validationError);
              return false;
            }
            setError(null);
            return true;
          }}
          onFinish={() => {
            if (!busy) void submit();
          }}
        />
      </form>
    </div>
  );
}

function RoleDetail({ screen, requestedScope }: ScopeProps) {
  const id = screen.route.split('/')[3] ?? '';
  const scope = useMemo(() => defaultAdminScope(requestedScope), [requestedScope]);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || id === 'create') return;
    void getAdminRole(id, scope).then(setRole).catch((err) => setError(identityErrorMessage(err)));
  }, [id, scope]);

  if (error) return <Status error={error} />;
  if (!role) return <p className="maps-settings-lead">Loading role…</p>;

  return (
    <div className="detail-grid">
      <article className="card details-card">
        <h2>{role.name}</h2>
        <p><code>{role.code}</code> · {role.is_system ? 'System role' : 'Custom role'} · {role.assignment_count ?? 0} assignments</p>
        <h3>Permissions</h3>
        {(role.permissions ?? []).map((permission) => <div className="rank-row" key={permission.id}><span>{permission.code}</span></div>)}
        {role.is_system ? <p className="maps-settings-lead">System roles cannot be deleted.</p> : (
          <button type="button" className="danger-button" data-interaction-native="true" onClick={() => {
            if (window.confirm(`Archive ${role.name}? Users must be reassigned first.`)) {
              void archiveAdminRole(role.id, scope).then(() => { window.location.href = '/admin/roles'; }).catch((err) => setError(identityErrorMessage(err)));
            }
          }}>Archive role</button>
        )}
      </article>
    </div>
  );
}

function CreateRoleForm({ requestedScope }: { requestedScope?: string }) {
  const scope = useMemo(() => defaultAdminScope(requestedScope), [requestedScope]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form className="card form-card" onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      void createAdminRole({ code: String(form.get('code') ?? ''), name: String(form.get('name') ?? '') }, scope)
        .then((role) => setMessage(`Created ${role.name}`))
        .catch((err) => setError(identityErrorMessage(err)));
    }}>
      <Status error={error} message={message} />
      <label>Code *<input name="code" placeholder="custom.coordinator" required /></label>
      <label>Name *<input name="name" required /></label>
      <button className="primary-button" type="submit" data-interaction-native="true">Create role</button>
    </form>
  );
}

function ImpersonationPolicy() {
  return (
    <div className="warning-card">
      <strong>Interactive impersonation is disabled.</strong>
      <p>The platform does not issue support sessions that assume another identity. Use audit events and scoped user detail for troubleshooting. All access checks remain server-authoritative.</p>
      <Link href="/admin/audit">Open audit log</Link>
    </div>
  );
}

export function AdministrationAuditExport({ requestedScope }: { requestedScope?: string }) {
  return (
    <button
      type="button"
      className="ghost-button"
      data-interaction-native="true"
      onClick={() => {
        void exportAdminAuditCsv(defaultAdminScope(requestedScope)).then((blob) => {
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = 'audit-events.csv';
          anchor.click();
          URL.revokeObjectURL(url);
        });
      }}
    >
      Export CSV
    </button>
  );
}

export function AdministrationScreenContent({ screen, requestedScope }: ScopeProps) {
  const route = screen.route;
  if (route === '/admin/scope') return <ScopePicker requestedScope={requestedScope} />;
  if (route === '/admin/command') return <CommandCentre />;
  if (route === '/admin/alerts' || route === '/admin/alerts/rules') return <AlertsCentre screen={screen} />;
  if (route === '/admin/notifications') return <NotificationsInbox />;
  if (route === '/admin/activity') return <ActivityFeed requestedScope={requestedScope} />;
  if (route === '/admin/tasks') return <TasksBoard requestedScope={requestedScope} />;
  if (route === '/admin/quick-actions') return <QuickActionsLive />;
  if (route === '/admin/users/create') return <CreateUserForm screen={screen} requestedScope={requestedScope} />;
  if (route === '/admin/roles/create') return <CreateRoleForm requestedScope={requestedScope} />;
  if (route === '/admin/access/impersonation') return <ImpersonationPolicy />;
  if (/^\/admin\/users\/[0-7][0-9A-HJKMNP-TV-Z]{25}/i.test(route)) return <UserDetail screen={screen} requestedScope={requestedScope} />;
  if (/^\/admin\/roles\/[0-7][0-9A-HJKMNP-TV-Z]{25}/i.test(route)) return <RoleDetail screen={screen} requestedScope={requestedScope} />;
  return null;
}
