'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { InteractiveMap, type MapMarker } from './interactive-map';
import { HierarchyTreeView } from './hierarchy-tree-view';
import type { AdminScreen } from '../lib/admin-routes';
import { defaultAdminScope } from '../lib/admin-identity-api';
import {
  createCountry,
  createLevel,
  createUnit,
  getCountry,
  getLocation,
  getUnit,
  listCountriesPage,
  listLevels,
  listLocationsPage,
  listMapLocations,
  listTerritoryReport,
  listUnitsPage,
  organizationErrorMessage,
  updateCountry,
  updateLocation,
  updateUnit,
  type AdminAdministrativeLevel,
  type AdminAdministrativeUnit,
  type AdminCountry,
  type AdminCountryDetail,
  type AdminLocation,
  type AdminLocationDetail,
  type AdminUnitDetail,
  type GeographyStats,
  type PaginationMeta,
} from '../lib/admin-organization-api';
import {
  createChurch,
  defaultOpsScope,
  deleteChurch,
  getChurch,
  listChurches,
  updateChurch,
  type ChurchRecord,
} from '../lib/admin-operations-api';
import { listConfigurations, upsertConfiguration } from '../lib/admin-platform-api';

type ScopeProps = { screen: AdminScreen; requestedScope?: string };

function useScope(requestedScope?: string) {
  return useMemo(() => defaultAdminScope(requestedScope), [requestedScope]);
}

function formatCount(value?: number | null) {
  return typeof value === 'number' ? value.toLocaleString() : '0';
}

function GeographyStatus({ error, message, onRetry }: { error?: string | null; message?: string | null; onRetry?: () => void }) {
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

function StatsGrid({ stats }: { stats?: GeographyStats }) {
  if (!stats) return null;
  const items = [
    ['Units', stats.units ?? stats.children],
    ['Locations', stats.locations],
    ['Churches', stats.churches],
    ['Home Churches', stats.home_churches],
    ['Members', stats.members],
  ].filter(([, value]) => value !== undefined);
  return (
    <div className="metric-grid">
      {items.map(([label, value]) => (
        <article className="card metric-card" key={label}>
          <span className="metric-label">{label}</span>
          <strong className="metric-value">{formatCount(value as number)}</strong>
        </article>
      ))}
    </div>
  );
}

function CountriesTable({ requestedScope }: { requestedScope?: string }) {
  const scope = useScope(requestedScope);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminCountry[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [message, setMessage] = useState('Loading countries…');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setError(null);
    setMessage('Loading countries…');
    try {
      const result = await listCountriesPage({ search: debounced || undefined, page, perPage: 25, sort: 'name' }, { scope });
      setItems(result.items);
      setPagination(result.pagination);
      setMessage(result.pagination.total === 0 ? 'No countries in this scope.' : `Showing ${result.items.length} of ${result.pagination.total} countries`);
    } catch (err) {
      setItems([]);
      setPagination(null);
      setError(organizationErrorMessage(err));
      setMessage('Countries unavailable');
    }
  }, [debounced, page, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await createCountry({
        iso_code: String(form.get('iso_code') ?? '').trim(),
        name: String(form.get('name') ?? '').trim(),
        calling_code: String(form.get('calling_code') ?? '').trim() || null,
        currency_code: String(form.get('currency_code') ?? '').trim() || null,
        default_timezone: String(form.get('default_timezone') ?? '').trim() || null,
        locale: String(form.get('locale') ?? '').trim() || null,
        local_name: String(form.get('local_name') ?? '').trim() || null,
      }, { scope });
      setCreateOpen(false);
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(organizationErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="table-toolbar">
        <label className="search-box">
          <span>⌕</span>
          <input aria-label="Search countries" placeholder="Search by name or ISO code" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        </label>
        <button type="button" className="primary-button" data-interaction-native="true" onClick={() => setCreateOpen((open) => !open)}>+ Add Country</button>
      </div>
      <GeographyStatus error={error} message={error ? null : message} onRetry={() => void load()} />
      {createOpen ? (
        <form className="card settings-card" onSubmit={(event) => void onCreate(event)}>
          <div className="form-grid">
            <label><span>ISO code *</span><input name="iso_code" maxLength={2} required autoComplete="off" /></label>
            <label><span>Name *</span><input name="name" required autoComplete="off" /></label>
            <label><span>Local name</span><input name="local_name" autoComplete="off" /></label>
            <label><span>Calling code</span><input name="calling_code" placeholder="+234" autoComplete="off" /></label>
            <label><span>Currency (ISO)</span><input name="currency_code" maxLength={3} placeholder="NGN" autoComplete="off" /></label>
            <label><span>Default timezone</span><input name="default_timezone" placeholder="Africa/Lagos" autoComplete="off" /></label>
            <label><span>Locale</span><input name="locale" placeholder="en-NG" autoComplete="off" /></label>
          </div>
          <div className="form-footer">
            <button type="button" className="ghost-button" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Create country'}</button>
          </div>
        </form>
      ) : null}
      <div className="card table-card">
        <table>
          <thead>
            <tr><th>Country</th><th>Code</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={4}>{error ? 'Unable to load countries.' : 'No countries yet. Add a country to start the hierarchy.'}</td></tr>
            ) : items.map((country) => (
              <tr key={country.id}>
                <td>{country.name}</td>
                <td>{country.iso_code}</td>
                <td>{country.created_at ? new Date(country.created_at).toLocaleDateString() : '—'}</td>
                <td className="actions-cell">
                  <Link className="table-action" href={`/admin/geography/countries/${country.iso_code}`}>View</Link>
                  <Link className="table-action" href={`/admin/geography/countries/${country.iso_code}?edit=1`}>Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination">
          <span>{message}</span>
          {pagination && pagination.last_page > 1 ? (
            <nav>
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>‹</button>
              <button type="button" disabled={page >= pagination.last_page} onClick={() => setPage((value) => value + 1)}>›</button>
            </nav>
          ) : null}
        </div>
      </div>
    </>
  );
}

function CountryDetail({ screen, requestedScope }: ScopeProps) {
  const scope = useScope(requestedScope);
  const id = screen.route.split('/admin/geography/countries/')[1]?.split('/')[0] ?? '';
  const [country, setCountry] = useState<AdminCountryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('edit') === '1');
  const [name, setName] = useState('');
  const [localName, setLocalName] = useState('');
  const [callingCode, setCallingCode] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');
  const [timezone, setTimezone] = useState('');
  const [locale, setLocale] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const next = await getCountry(id, { scope });
      setCountry(next);
      setName(next.name);
      setLocalName(next.local_name ?? '');
      setCallingCode(next.calling_code ?? '');
      setCurrencyCode(next.currency_code ?? '');
      setTimezone(next.default_timezone ?? next.timezone ?? '');
      setLocale(next.locale ?? '');
    } catch (err) {
      setCountry(null);
      setError(organizationErrorMessage(err));
    }
  }, [id, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!country) return;
    setBusy(true);
    setError(null);
    try {
      const next = await updateCountry(country.id, {
        name,
        local_name: localName || null,
        calling_code: callingCode || null,
        currency_code: currencyCode || null,
        default_timezone: timezone || null,
        locale: locale || null,
      }, { scope });
      setCountry({ ...country, ...next });
      setEditing(false);
    } catch (err) {
      setError(organizationErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const href = country ? `/admin/geography/countries/${country.iso_code}` : screen.route;

  return (
    <>
      <GeographyStatus error={error} onRetry={() => void load()} />
      {!country && !error ? <p className="maps-settings-lead">Loading country…</p> : null}
      {country ? (
        <>
          <StatsGrid stats={country.stats} />
          <nav className="tabs" role="tablist" aria-label="Country sections">
            <Link className="tab active" href={href}>Overview</Link>
            <Link className="tab" href={`${href}/levels`}>Administrative Levels</Link>
            <Link className="tab" href={`${href}/regions`}>Regions / States</Link>
            <Link className="tab" href={`${href}/local-areas`}>Local Areas</Link>
          </nav>
          <article className="card">
            {editing ? (
              <form onSubmit={(event) => void onSave(event)}>
                <div className="form-grid">
                  <label><span>Country name *</span><input value={name} onChange={(event) => setName(event.target.value)} required /></label>
                  <label><span>ISO code</span><input value={country.iso_code} disabled /></label>
                  <label><span>Local name</span><input value={localName} onChange={(event) => setLocalName(event.target.value)} /></label>
                  <label><span>Calling code</span><input value={callingCode} onChange={(event) => setCallingCode(event.target.value)} /></label>
                  <label><span>Currency</span><input value={currencyCode} onChange={(event) => setCurrencyCode(event.target.value)} maxLength={3} /></label>
                  <label><span>Default timezone</span><input value={timezone} onChange={(event) => setTimezone(event.target.value)} /></label>
                  <label><span>Locale</span><input value={locale} onChange={(event) => setLocale(event.target.value)} /></label>
                </div>
                <p className="maps-settings-lead">ISO codes cannot change. Countries are retained for history and cannot be deleted.</p>
                <div className="form-footer">
                  <button type="button" className="ghost-button" onClick={() => setEditing(false)}>Cancel</button>
                  <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save country'}</button>
                </div>
              </form>
            ) : (
              <>
                <dl>
                  <div><dt>Country Name</dt><dd>{country.name}</dd></div>
                  <div><dt>Local Name</dt><dd>{country.local_name ?? '—'}</dd></div>
                  <div><dt>Country Code</dt><dd>{country.iso_code}</dd></div>
                  <div><dt>Calling Code</dt><dd>{country.calling_code ?? '—'}</dd></div>
                  <div><dt>Currency</dt><dd>{country.currency_code ?? '—'}</dd></div>
                  <div><dt>Time Zone</dt><dd>{country.default_timezone ?? country.timezone ?? '—'}</dd></div>
                  <div><dt>Locale</dt><dd>{country.locale ?? '—'}</dd></div>
                  <div><dt>Created</dt><dd>{country.created_at ? new Date(country.created_at).toLocaleString() : '—'}</dd></div>
                </dl>
                <button type="button" className="ghost-button" onClick={() => setEditing(true)}>Edit country</button>
              </>
            )}
          </article>
        </>
      ) : null}
    </>
  );
}

function LevelsTable({ screen, requestedScope }: ScopeProps) {
  const scope = useScope(requestedScope);
  const countryKey = screen.route.split('/admin/geography/countries/')[1]?.split('/')[0] ?? '';
  const [country, setCountry] = useState<AdminCountry | null>(null);
  const [levels, setLevels] = useState<AdminAdministrativeLevel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!countryKey) return;
    setError(null);
    try {
      const nextCountry = await getCountry(countryKey, { scope });
      setCountry(nextCountry);
      setLevels(await listLevels(nextCountry.id, { scope }));
    } catch (err) {
      setError(organizationErrorMessage(err));
    }
  }, [countryKey, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!country) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await createLevel(country.id, {
        code: String(form.get('code') ?? '').trim(),
        name: String(form.get('name') ?? '').trim(),
        sort_order: Number(form.get('sort_order') ?? 1),
      }, { scope });
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(organizationErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <GeographyStatus error={error} onRetry={() => void load()} />
      <form className="card settings-card" onSubmit={(event) => void onCreate(event)}>
        <div className="form-grid">
          <label><span>Level name *</span><input name="name" required /></label>
          <label><span>Level code *</span><input name="code" required /></label>
          <label><span>Order *</span><input name="sort_order" type="number" min={1} defaultValue={levels.length + 1} required /></label>
        </div>
        <div className="form-footer">
          <button type="submit" className="primary-button" disabled={busy || !country}>{busy ? 'Saving…' : 'Add level'}</button>
        </div>
      </form>
      <div className="card table-card">
        <table>
          <thead><tr><th>Level Name</th><th>Code</th><th>Order</th></tr></thead>
          <tbody>
            {levels.length === 0 ? <tr><td colSpan={3}>No administrative levels yet.</td></tr> : levels.map((level) => (
              <tr key={level.id}><td>{level.name}</td><td>{level.code}</td><td>{level.sort_order}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function UnitsTable({ screen, requestedScope, mode }: ScopeProps & { mode: 'root' | 'children' }) {
  const scope = useScope(requestedScope);
  const countryKey = screen.route.match(/\/countries\/([^/]+)/)?.[1];
  const parentId = screen.route.match(/\/units\/([^/]+)\/local-areas/)?.[1];
  const [countries, setCountries] = useState<AdminCountry[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [country, setCountry] = useState<AdminCountry | null>(null);
  const [levels, setLevels] = useState<AdminAdministrativeLevel[]>([]);
  const [parents, setParents] = useState<AdminAdministrativeUnit[]>([]);
  const [items, setItems] = useState<AdminAdministrativeUnit[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setError(null);
    try {
      if (!countryKey) {
        const catalog = await listCountriesPage({ perPage: 100, sort: 'name' }, { scope });
        setCountries(catalog.items);
      }
      const resolvedCountry = countryKey
        ? await getCountry(countryKey, { scope })
        : selectedCountryId
          ? await getCountry(selectedCountryId, { scope })
          : null;
      if (resolvedCountry) {
        setCountry(resolvedCountry);
        setLevels(await listLevels(resolvedCountry.id, { scope }));
        if (mode === 'children' && !parentId) {
          const roots = await listUnitsPage({ countryId: resolvedCountry.id, root: true, perPage: 100, sort: 'name' }, { scope });
          setParents(roots.items);
        }
      }
      const result = await listUnitsPage({
        search: debounced || undefined,
        countryId: resolvedCountry?.id,
        parentId,
        root: mode === 'root',
        nested: mode === 'children' && !parentId,
        page,
        perPage: 25,
        sort: 'name',
      }, { scope });
      setItems(result.items);
      setPagination(result.pagination);
    } catch (err) {
      setItems([]);
      setError(organizationErrorMessage(err));
    }
  }, [countryKey, debounced, mode, page, parentId, scope, selectedCountryId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const countryId = country?.id ?? String(form.get('country_id') ?? '');
    const formParent = String(form.get('parent_id') ?? '').trim() || null;
    setBusy(true);
    setError(null);
    try {
      await createUnit({
        country_id: countryId,
        administrative_level_id: String(form.get('administrative_level_id') ?? ''),
        name: String(form.get('name') ?? '').trim(),
        parent_id: parentId ?? formParent,
        reference_code: String(form.get('reference_code') ?? '').trim() || null,
      }, { scope });
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(organizationErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="table-toolbar">
        <label className="search-box">
          <span>⌕</span>
          <input aria-label="Search units" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search units" />
        </label>
        {!countryKey ? (
          <label>
            <span className="sr-only">Filter by country</span>
            <select aria-label="Filter by country" value={selectedCountryId} onChange={(event) => { setSelectedCountryId(event.target.value); setPage(1); }}>
              <option value="">All countries</option>
              {countries.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
            </select>
          </label>
        ) : null}
      </div>
      <GeographyStatus error={error} onRetry={() => void load()} />
      <form className="card settings-card" onSubmit={(event) => void onCreate(event)}>
        <div className="form-grid">
          {!country ? (
            <label>
              <span>Country *</span>
              <select name="country_id" required onChange={(event) => setSelectedCountryId(event.target.value)}>
                <option value="">Select country</option>
                {countries.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
              </select>
            </label>
          ) : null}
          <label><span>Name *</span><input name="name" required /></label>
          <label>
            <span>Level *</span>
            <select name="administrative_level_id" required>
              <option value="">Select level</option>
              {levels.map((level) => <option value={level.id} key={level.id}>{level.name}</option>)}
            </select>
          </label>
          {mode === 'children' && !parentId ? (
            <label>
              <span>Parent region *</span>
              <select name="parent_id" required>
                <option value="">Select parent</option>
                {parents.map((unit) => <option value={unit.id} key={unit.id}>{unit.name}</option>)}
              </select>
            </label>
          ) : null}
          <label><span>Reference code</span><input name="reference_code" /></label>
        </div>
        <div className="form-footer">
          <button type="submit" className="primary-button" disabled={busy || (!country && countries.length === 0)}>{busy ? 'Saving…' : mode === 'root' ? 'Add region / state' : 'Add local area'}</button>
        </div>
      </form>
      <div className="card table-card">
        <table>
          <thead><tr><th>Name</th><th>Level</th><th>Code</th><th>Parent</th><th>Country</th><th>Actions</th></tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={6}>{error ? 'Unable to load units.' : 'No units in this view.'}</td></tr> : items.map((unit) => (
              <tr key={unit.id}>
                <td>{unit.name}</td>
                <td>{unit.administrative_level?.name ?? '—'}</td>
                <td>{unit.reference_code ?? '—'}</td>
                <td>{unit.parent?.name ?? '—'}</td>
                <td>{unit.country?.name ?? '—'}</td>
                <td className="actions-cell">
                  <Link className="table-action" href={`/admin/geography/units/${unit.id}`}>View</Link>
                  <Link className="table-action" href={`/admin/geography/units/${unit.id}/local-areas`}>Children</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination">
          <span>{pagination ? `Showing ${items.length} of ${pagination.total}` : ''}</span>
          {pagination && pagination.last_page > 1 ? (
            <nav>
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>‹</button>
              <button type="button" disabled={page >= pagination.last_page} onClick={() => setPage((value) => value + 1)}>›</button>
            </nav>
          ) : null}
        </div>
      </div>
    </>
  );
}

function UnitDetail({ screen, requestedScope }: ScopeProps) {
  const scope = useScope(requestedScope);
  const id = screen.route.match(/\/units\/([^/]+)/)?.[1] ?? '';
  const [unit, setUnit] = useState<AdminUnitDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const next = await getUnit(id, { scope });
      setUnit(next);
      setName(next.name);
      setCode(next.reference_code ?? '');
    } catch (err) {
      setError(organizationErrorMessage(err));
    }
  }, [id, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!unit) return;
    setBusy(true);
    setError(null);
    try {
      const next = await updateUnit(unit.id, { name, reference_code: code || null }, { scope });
      setUnit({ ...unit, ...next });
      setEditing(false);
    } catch (err) {
      setError(organizationErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <GeographyStatus error={error} onRetry={() => void load()} />
      {unit ? (
        <>
          <StatsGrid stats={unit.stats} />
          <nav className="tabs" role="tablist">
            <span className="tab active">Overview</span>
            <Link className="tab" href={`/admin/geography/units/${unit.id}/local-areas`}>Local Areas ({formatCount(unit.stats?.children)})</Link>
            {unit.country ? <Link className="tab" href={`/admin/geography/countries/${unit.country.iso_code}`}>Country</Link> : null}
          </nav>
          <article className="card">
            {editing ? (
              <form onSubmit={(event) => void onSave(event)}>
                <div className="form-grid">
                  <label><span>Name *</span><input value={name} onChange={(event) => setName(event.target.value)} required /></label>
                  <label><span>Reference code</span><input value={code} onChange={(event) => setCode(event.target.value)} /></label>
                </div>
                <p className="maps-settings-lead">Units cannot be deleted. Use Hierarchy Tree to change parent.</p>
                <div className="form-footer">
                  <button type="button" className="ghost-button" onClick={() => setEditing(false)}>Cancel</button>
                  <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
                </div>
              </form>
            ) : (
              <>
                <dl>
                  <div><dt>Name</dt><dd>{unit.name}</dd></div>
                  <div><dt>Level</dt><dd>{unit.administrative_level?.name ?? '—'}</dd></div>
                  <div><dt>Code</dt><dd>{unit.reference_code ?? '—'}</dd></div>
                  <div><dt>Parent</dt><dd>{unit.parent?.name ?? '—'}</dd></div>
                  <div><dt>Country</dt><dd>{unit.country?.name ?? '—'}</dd></div>
                </dl>
                <button type="button" className="ghost-button" onClick={() => setEditing(true)}>Edit</button>
              </>
            )}
          </article>
        </>
      ) : null}
    </>
  );
}

function LocationDetail({ screen, requestedScope }: ScopeProps) {
  const scope = useScope(requestedScope);
  const id = screen.route.match(/\/locations\/([^/]+)/)?.[1] ?? '';
  const [location, setLocation] = useState<AdminLocationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setLocation(await getLocation(id, { scope }));
    } catch (err) {
      setError(organizationErrorMessage(err));
    }
  }, [id, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!location?.country) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const next = await updateLocation(location.id, {
        country_id: location.country.id,
        name: String(form.get('name') ?? ''),
        timezone: String(form.get('timezone') ?? ''),
        administrative_unit_id: location.administrative_unit?.id ?? null,
        address_line_one: String(form.get('address_line_one') ?? '') || null,
        locality: String(form.get('locality') ?? '') || null,
        postal_code: String(form.get('postal_code') ?? '') || null,
        latitude: form.get('latitude') ? Number(form.get('latitude')) : null,
        longitude: form.get('longitude') ? Number(form.get('longitude')) : null,
      }, { scope });
      setLocation({ ...location, ...next });
    } catch (err) {
      setError(organizationErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const marker: MapMarker[] = location?.coordinates
    ? [{ id: location.id, name: location.name, latitude: location.coordinates.latitude, longitude: location.coordinates.longitude }]
    : [];

  return (
    <>
      <GeographyStatus error={error} onRetry={() => void load()} />
      {location ? (
        <>
          <StatsGrid stats={location.stats} />
          <form className="card settings-card" onSubmit={(event) => void onSave(event)}>
            <div className="form-grid">
              <label><span>Name *</span><input name="name" defaultValue={location.name} required /></label>
              <label><span>Timezone *</span><input name="timezone" defaultValue={location.timezone} required /></label>
              <label><span>Address</span><input name="address_line_one" defaultValue={location.address?.line_one ?? ''} /></label>
              <label><span>Locality</span><input name="locality" defaultValue={location.address?.locality ?? ''} /></label>
              <label><span>Postal code</span><input name="postal_code" defaultValue={location.address?.postal_code ?? ''} /></label>
              <label><span>Latitude</span><input name="latitude" defaultValue={location.coordinates?.latitude ?? ''} /></label>
              <label><span>Longitude</span><input name="longitude" defaultValue={location.coordinates?.longitude ?? ''} /></label>
            </div>
            <p className="maps-settings-lead">Locations cannot be deleted; update coordinates or the address instead.</p>
            <div className="form-footer">
              <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save location'}</button>
            </div>
          </form>
          <div className="card map-card location-map">
            <InteractiveMap height={420} markers={marker} className="admin-interactive-map" />
          </div>
        </>
      ) : null}
    </>
  );
}

function GeographyMap({ requestedScope }: { requestedScope?: string }) {
  const scope = useScope(requestedScope);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [countryId, setCountryId] = useState('');
  const [countries, setCountries] = useState<AdminCountry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('Loading map locations…');

  const load = useCallback(async () => {
    setError(null);
    try {
      const [countryPage, locationPage] = await Promise.all([
        listCountriesPage({ perPage: 100, sort: 'name' }, { scope }),
        listMapLocations({ countryId: countryId || undefined, perPage: 100 }, { scope }),
      ]);
      setCountries(countryPage.items);
      setMarkers(locationPage.items.flatMap((location) => (
        location.coordinates
          ? [{
              id: location.id,
              name: location.name,
              latitude: location.coordinates.latitude,
              longitude: location.coordinates.longitude,
              href: `/admin/geography/locations/${location.id}`,
            }]
          : []
      )));
      setMessage(locationPage.pagination.total === 0
        ? 'No coordinated locations in this scope. Add latitude and longitude on a location record.'
        : `${locationPage.items.length} mapped locations`);
    } catch (err) {
      setError(organizationErrorMessage(err));
    }
  }, [countryId, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <div className="map-filters">
        <label>
          Country
          <select value={countryId} onChange={(event) => setCountryId(event.target.value)}>
            <option value="">All countries</option>
            {countries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}
          </select>
        </label>
      </div>
      <GeographyStatus error={error} message={error ? null : message} onRetry={() => void load()} />
      <div className="card map-card">
        <InteractiveMap height={520} markers={markers} className="admin-interactive-map" />
      </div>
    </>
  );
}

function TerritoryReports({ requestedScope }: { requestedScope?: string }) {
  const scope = useScope(requestedScope);
  const [rows, setRows] = useState<AdminUnitDetail[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await listTerritoryReport({ search: debounced || undefined, page, perPage: 25 }, { scope });
      setRows(result.items);
      setPagination(result.pagination);
    } catch (err) {
      setRows([]);
      setError(organizationErrorMessage(err));
    }
  }, [debounced, page, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = rows.reduce((acc, row) => ({
    churches: acc.churches + (row.stats?.churches ?? 0),
    home: acc.home + (row.stats?.home_churches ?? 0),
    members: acc.members + (row.stats?.members ?? 0),
  }), { churches: 0, home: 0, members: 0 });

  function exportCsv() {
    const header = 'Unit,Level,Country,Churches,Home Churches,Members\n';
    const body = rows.map((row) => [row.name, row.administrative_level?.name ?? '', row.country?.name ?? '', row.stats?.churches ?? 0, row.stats?.home_churches ?? 0, row.stats?.members ?? 0].join(',')).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'territory-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <StatsGrid stats={{ churches: totals.churches, home_churches: totals.home, members: totals.members, locations: pagination?.total }} />
      <div className="table-toolbar">
        <label className="search-box"><span>⌕</span><input aria-label="Search territory" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
        <button type="button" className="ghost-button" onClick={exportCsv} disabled={rows.length === 0}>Export</button>
      </div>
      <GeographyStatus error={error} onRetry={() => void load()} />
      <div className="card table-card">
        <table>
          <thead><tr><th>Unit</th><th>Level</th><th>Country</th><th>Churches</th><th>Home Churches</th><th>Members</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={7}>No territory rows in this period/scope.</td></tr> : rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.administrative_level?.name ?? '—'}</td>
                <td>{row.country?.name ?? '—'}</td>
                <td>{formatCount(row.stats?.churches)}</td>
                <td>{formatCount(row.stats?.home_churches)}</td>
                <td>{formatCount(row.stats?.members)}</td>
                <td><Link href={`/admin/geography/units/${row.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination">
          {pagination && pagination.last_page > 1 ? (
            <nav>
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>‹</button>
              <button type="button" disabled={page >= pagination.last_page} onClick={() => setPage((value) => value + 1)}>›</button>
            </nav>
          ) : null}
        </div>
      </div>
    </>
  );
}

const GEOGRAPHY_SETTING_KEYS = [
  { key: 'organization.geography.region_label', label: 'Region / state label', fallback: 'Regions / States' },
  { key: 'organization.geography.local_area_label', label: 'Local area label', fallback: 'Local Areas' },
  { key: 'organization.geography.default_timezone', label: 'Default timezone', fallback: 'Africa/Lagos' },
] as const;

function GeographySettings({ requestedScope }: { requestedScope?: string }) {
  const scope = useScope(requestedScope);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('Loading geography settings…');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await listConfigurations({ search: 'organization.geography', per_page: 50 }, scope);
      const next: Record<string, string> = {};
      for (const item of GEOGRAPHY_SETTING_KEYS) {
        next[item.key] = String(result.items.find((row) => row.key === item.key)?.value ?? item.fallback);
      }
      setValues(next);
      setMessage('Settings are stored as platform configuration keys.');
    } catch (err) {
      setError(organizationErrorMessage(err));
    }
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      for (const item of GEOGRAPHY_SETTING_KEYS) {
        await upsertConfiguration({
          key: item.key,
          value_type: 'string',
          classification: 'internal',
          environment: 'production',
          value: values[item.key] ?? item.fallback,
        }, scope);
      }
      setMessage('Geography settings saved.');
    } catch (err) {
      setError(organizationErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card settings-card" onSubmit={(event) => void onSave(event)}>
      <GeographyStatus error={error} message={error ? null : message} onRetry={() => void load()} />
      <div className="form-grid">
        {GEOGRAPHY_SETTING_KEYS.map((item) => (
          <label className="full" key={item.key}>
            <span>{item.label}</span>
            <input value={values[item.key] ?? ''} onChange={(event) => setValues((current) => ({ ...current, [item.key]: event.target.value }))} />
          </label>
        ))}
      </div>
      <div className="form-footer">
        <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
      </div>
    </form>
  );
}

function OrganizationsTable({ requestedScope }: { requestedScope?: string }) {
  const scope = useMemo(() => defaultOpsScope(requestedScope), [requestedScope]);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ChurchRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('Loading organizations…');
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [locations, setLocations] = useState<AdminLocation[]>([]);
  const [units, setUnits] = useState<AdminAdministrativeUnit[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setError(null);
    setMessage('Loading organizations…');
    try {
      const [churches, locationPage, unitPage] = await Promise.all([
        listChurches({ search: debounced || undefined, page, perPage: 25, scope }),
        listLocationsPage({ perPage: 100, sort: 'name' }, { scope }),
        listUnitsPage({ perPage: 100, sort: 'name' }, { scope }),
      ]);
      setItems(churches.items);
      setPagination(churches.pagination);
      setLocations(locationPage.items);
      setUnits(unitPage.items);
      setMessage(churches.pagination.total === 0 ? 'No organizations in this scope.' : `Showing ${churches.items.length} of ${churches.pagination.total} organizations`);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : 'Unable to load organizations.');
      setMessage('Organizations unavailable');
    }
  }, [debounced, page, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await createChurch({
        name: String(form.get('name') ?? '').trim(),
        location_id: String(form.get('location_id') ?? ''),
        administrative_unit_id: String(form.get('administrative_unit_id') ?? ''),
      }, scope);
      setCreateOpen(false);
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create organization.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="maps-settings-lead">Organizations are churches with geographic coverage. Civic locations stay on Countries, Regions, and Local Areas.</p>
      <div className="table-toolbar">
        <label className="search-box">
          <span>⌕</span>
          <input aria-label="Search organizations" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search organizations" />
        </label>
        <button type="button" className="primary-button" data-interaction-native="true" onClick={() => setCreateOpen((open) => !open)}>+ Add Organization</button>
      </div>
      <GeographyStatus error={error} message={error ? null : message} onRetry={() => void load()} />
      {createOpen ? (
        <form className="card settings-card" onSubmit={(event) => void onCreate(event)}>
          <div className="form-grid">
            <label><span>Name *</span><input name="name" required /></label>
            <label>
              <span>Location *</span>
              <select name="location_id" required>
                <option value="">Select location</option>
                {locations.map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}
              </select>
            </label>
            <label>
              <span>Geographic coverage *</span>
              <select name="administrative_unit_id" required>
                <option value="">Select unit</option>
                {units.map((unit) => <option value={unit.id} key={unit.id}>{unit.name}</option>)}
              </select>
            </label>
          </div>
          <div className="form-footer">
            <button type="button" className="ghost-button" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Create organization'}</button>
          </div>
        </form>
      ) : null}
      <div className="card table-card">
        <table>
          <thead><tr><th>Name</th><th>Status</th><th>Coverage</th><th>Country</th><th>Home Churches</th><th>Actions</th></tr></thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6}>{error ? 'Unable to load organizations.' : 'No organizations yet.'}</td></tr>
            ) : items.map((church) => (
              <tr key={church.id}>
                <td>{church.name}</td>
                <td>{church.status ?? (church.published_at ? 'published' : 'unpublished')}</td>
                <td>{church.administrative_unit_name ?? '—'}</td>
                <td>{church.country_name ?? '—'}</td>
                <td>{formatCount(church.home_churches_count)}</td>
                <td className="actions-cell">
                  <Link className="table-action" href={`/admin/geography/organizations/${church.id}`}>View</Link>
                  <Link className="table-action" href={`/admin/geography/church-hierarchy`}>Hierarchy</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination">
          <span>{message}</span>
          {pagination && pagination.last_page > 1 ? (
            <nav>
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>‹</button>
              <button type="button" disabled={page >= pagination.last_page} onClick={() => setPage((value) => value + 1)}>›</button>
            </nav>
          ) : null}
        </div>
      </div>
    </>
  );
}

function OrganizationDetail({ screen, requestedScope }: ScopeProps) {
  const scope = useMemo(() => defaultOpsScope(requestedScope), [requestedScope]);
  const id = screen.route.split('/admin/geography/organizations/')[1] ?? '';
  const [church, setChurch] = useState<ChurchRecord | null>(null);
  const [locations, setLocations] = useState<AdminLocation[]>([]);
  const [units, setUnits] = useState<AdminAdministrativeUnit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [locationId, setLocationId] = useState('');
  const [unitId, setUnitId] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const [next, locationPage, unitPage] = await Promise.all([
        getChurch(id, scope),
        listLocationsPage({ perPage: 100, sort: 'name' }, { scope }),
        listUnitsPage({ perPage: 100, sort: 'name' }, { scope }),
      ]);
      setChurch(next);
      setName(next.name);
      setLocationId(next.location_id ?? '');
      setUnitId(next.administrative_unit_id ?? '');
      setLocations(locationPage.items);
      setUnits(unitPage.items);
    } catch (err) {
      setChurch(null);
      setError(err instanceof Error ? err.message : 'Unable to load organization.');
    }
  }, [id, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!church) return;
    setBusy(true);
    setError(null);
    try {
      const next = await updateChurch(church.id, {
        name,
        location_id: locationId,
        administrative_unit_id: unitId,
      }, scope);
      setChurch(next);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save organization.');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!church) return;
    const linked = (church.home_churches_count ?? 0) + (church.memberships_count ?? 0) + (church.applications_count ?? 0) + (church.first_timers_count ?? 0);
    const confirmed = window.confirm(
      linked > 0
        ? `Cannot safely delete "${church.name}" while it has ${church.home_churches_count ?? 0} home churches, ${church.memberships_count ?? 0} memberships, ${church.applications_count ?? 0} applications, and ${church.first_timers_count ?? 0} first-timers. The API will reject this delete.`
        : `Delete organization "${church.name}"? This is only allowed when no home churches, memberships, applications, or first-timers are linked.`,
    );
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await deleteChurch(church.id, scope);
      window.location.assign('/admin/geography/organizations');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete organization.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <GeographyStatus error={error} onRetry={() => void load()} />
      {!church && !error ? <p className="maps-settings-lead">Loading organization…</p> : null}
      {church ? (
        <>
          <StatsGrid stats={{
            churches: 1,
            home_churches: church.home_churches_count,
            members: church.memberships_count,
            locations: church.location_id ? 1 : 0,
          }} />
          <nav className="tabs" role="tablist">
            <span className="tab active">Overview</span>
            <Link className="tab" href="/admin/geography/church-hierarchy">Church Hierarchy</Link>
            <Link className="tab" href="/admin/geography/home-church-hierarchy">Home Church Hierarchy</Link>
            {church.administrative_unit_id ? <Link className="tab" href={`/admin/geography/units/${church.administrative_unit_id}`}>Coverage unit</Link> : null}
          </nav>
          <article className="card">
            {editing ? (
              <form onSubmit={(event) => void onSave(event)}>
                <div className="form-grid">
                  <label><span>Name *</span><input value={name} onChange={(event) => setName(event.target.value)} required /></label>
                  <label>
                    <span>Location *</span>
                    <select value={locationId} onChange={(event) => setLocationId(event.target.value)} required>
                      <option value="">Select location</option>
                      {locations.map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Geographic coverage *</span>
                    <select value={unitId} onChange={(event) => setUnitId(event.target.value)} required>
                      <option value="">Select unit</option>
                      {units.map((unit) => <option value={unit.id} key={unit.id}>{unit.name}</option>)}
                    </select>
                  </label>
                </div>
                <div className="form-footer">
                  <button type="button" className="ghost-button" onClick={() => setEditing(false)}>Cancel</button>
                  <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save organization'}</button>
                </div>
              </form>
            ) : (
              <>
                <dl>
                  <div><dt>Name</dt><dd>{church.name}</dd></div>
                  <div><dt>Status</dt><dd>{church.status ?? (church.published_at ? 'published' : 'unpublished')}</dd></div>
                  <div><dt>Location</dt><dd>{church.location_name ?? '—'}</dd></div>
                  <div><dt>Coverage</dt><dd>{church.administrative_unit_name ?? '—'}</dd></div>
                  <div><dt>Country</dt><dd>{church.country_name ?? '—'}</dd></div>
                  <div><dt>Home churches</dt><dd>{formatCount(church.home_churches_count)}</dd></div>
                  <div><dt>Memberships</dt><dd>{formatCount(church.memberships_count)}</dd></div>
                  <div><dt>Applications</dt><dd>{formatCount(church.applications_count)}</dd></div>
                  <div><dt>First-timers</dt><dd>{formatCount(church.first_timers_count)}</dd></div>
                </dl>
                <div className="form-footer">
                  <button type="button" className="ghost-button" onClick={() => setEditing(true)}>Edit</button>
                  <button type="button" className="ghost-button" onClick={() => void onDelete()} disabled={busy}>Delete if unused</button>
                </div>
              </>
            )}
          </article>
        </>
      ) : null}
    </>
  );
}

export function GeographyScreenContent({ screen, requestedScope }: ScopeProps) {
  const route = screen.route;
  if (route === '/admin/geography/countries') return <CountriesTable requestedScope={requestedScope} />;
  if (/^\/admin\/geography\/countries\/[^/]+$/.test(route)) return <CountryDetail screen={screen} requestedScope={requestedScope} />;
  if (/\/countries\/[^/]+\/levels$/.test(route)) return <LevelsTable screen={screen} requestedScope={requestedScope} />;
  if (route === '/admin/geography/regions' || /\/countries\/[^/]+\/regions$/.test(route)) {
    return <UnitsTable screen={screen} requestedScope={requestedScope} mode="root" />;
  }
  if (route === '/admin/geography/local-areas' || /\/countries\/[^/]+\/local-areas$/.test(route) || /\/units\/[^/]+\/local-areas$/.test(route)) {
    return <UnitsTable screen={screen} requestedScope={requestedScope} mode="children" />;
  }
  if (/^\/admin\/geography\/units\/[^/]+$/.test(route) || /\/local-areas\/ikeja$/.test(route)) {
    return <UnitDetail screen={screen} requestedScope={requestedScope} />;
  }
  if (route === '/admin/geography/organizations') return <OrganizationsTable requestedScope={requestedScope} />;
  if (/^\/admin\/geography\/organizations\//.test(route)) return <OrganizationDetail screen={screen} requestedScope={requestedScope} />;
  if (route === '/admin/geography/map') return <GeographyMap requestedScope={requestedScope} />;
  if (/^\/admin\/geography\/locations\//.test(route)) return <LocationDetail screen={screen} requestedScope={requestedScope} />;
  if (route === '/admin/geography/reports') return <TerritoryReports requestedScope={requestedScope} />;
  if (route === '/admin/geography/settings') return <GeographySettings requestedScope={requestedScope} />;
  if (route.includes('/geography/hierarchy') || route.includes('church-hierarchy') || route.includes('home-church-hierarchy')) {
    return <HierarchyTreeView route={route} title={screen.title} />;
  }
  if (route.includes('/geography/scope')) {
    return null;
  }
  return <CountriesTable requestedScope={requestedScope} />;
}
