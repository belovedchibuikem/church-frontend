'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import {
  defaultOpsScope,
  listChurches,
  listHomeChurches,
  listPastoralNeeds,
  mutateMinistryRecord,
  operationsErrorMessage,
  transitionPastoralNeed,
  type PastoralNeedRecord,
} from '../lib/admin-operations-api';
import { EntitySearchSelect } from './entity-search-select';

type ScopeOption = { value: string; label: string };

type MinistryNeedsPanelProps = {
  requestedScope?: string;
  churchId?: string;
  homeChurchId?: string;
  lead?: string;
};

function StatusLine({ error, onRetry }: { error?: string | null; onRetry?: () => void }) {
  if (!error) return null;
  return (
    <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>
      {error}
      {onRetry ? <button type="button" className="ghost-button" onClick={onRetry} style={{ marginLeft: 12 }}>Retry</button> : null}
    </p>
  );
}

export function MinistryNeedsPanel({ requestedScope, churchId = '', homeChurchId = '', lead }: MinistryNeedsPanelProps) {
  const scope = useMemo(() => defaultOpsScope(requestedScope), [requestedScope]);
  const [rows, setRows] = useState<PastoralNeedRecord[]>([]);
  const [churches, setChurches] = useState<ScopeOption[]>([]);
  const [homeChurches, setHomeChurches] = useState<ScopeOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scopeKind, setScopeKind] = useState<'home_church' | 'church'>('home_church');
  const fixedScope = churchId ? 'church' : homeChurchId ? 'home_church' : 'listing';

  const load = useCallback(async () => {
    setError(null);
    try {
      const filter: Record<string, string> = {};
      if (churchId) filter.church_id = churchId;
      if (homeChurchId) filter.home_church_id = homeChurchId;
      if (!churchId && !homeChurchId) filter.organizational = '1';

      const [needs, churchList, homeList] = await Promise.all([
        listPastoralNeeds({ scope, perPage: 50, filter: Object.keys(filter).length ? filter : undefined }),
        fixedScope === 'listing' ? listChurches({ scope, perPage: 100 }) : Promise.resolve({ items: [] }),
        fixedScope === 'listing' ? listHomeChurches({ scope, perPage: 100 }) : Promise.resolve({ items: [] }),
      ]);
      setRows(needs.items);
      setChurches(churchList.items.map((item) => ({ value: item.id, label: item.name })));
      setHomeChurches(homeList.items.map((item) => ({ value: item.id, label: item.name })));
    } catch (err) {
      setRows([]);
      setError(operationsErrorMessage(err, 'Unable to load needs.'));
    }
  }, [churchId, fixedScope, homeChurchId, scope]);

  useEffect(() => { void load(); }, [load]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, string | null> = {
        category: String(form.get('category')),
        summary: String(form.get('summary')),
        person_id: String(form.get('person_id') || '') || null,
      };
      if (homeChurchId) {
        payload.home_church_id = homeChurchId;
      } else if (churchId) {
        payload.church_id = churchId;
      } else {
        const scopeKind = String(form.get('scope_kind') || '');
        if (scopeKind === 'home_church') {
          payload.home_church_id = String(form.get('home_church_id'));
        } else {
          payload.church_id = String(form.get('church_id'));
        }
      }

      await mutateMinistryRecord('admin/church/pastoral-needs', 'POST', payload, scope);
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to submit need.'));
    } finally {
      setBusy(false);
    }
  }

  const defaultLead = churchId
    ? 'Record material, facility, or ministry needs for this church. Titles identify church-level requests.'
    : homeChurchId
      ? 'Record needs for this home church. Titles identify home-church-level requests.'
      : 'Church and home church needs in the current scope. Titles specify whether each need belongs to a church or home church.';

  return (
    <>
      <StatusLine error={error} onRetry={() => void load()} />
      <p className="maps-settings-lead">{lead ?? defaultLead}</p>
      <form className="card settings-card" onSubmit={(event) => void onCreate(event)}>
        <div className="form-grid">
          {fixedScope === 'listing' ? (
            <>
              <label>
                <span>Need belongs to *</span>
                <select name="scope_kind" value={scopeKind} onChange={(event) => setScopeKind(event.target.value as 'home_church' | 'church')} required>
                  <option value="home_church">Home church</option>
                  <option value="church">Church</option>
                </select>
              </label>
              {scopeKind === 'home_church' ? (
                <label>
                  <span>Home church *</span>
                  <EntitySearchSelect name="home_church_id" required placeholder="Search home church" options={homeChurches} />
                </label>
              ) : (
                <label>
                  <span>Church *</span>
                  <EntitySearchSelect name="church_id" required placeholder="Search church" options={churches} />
                </label>
              )}
            </>
          ) : null}
          <label><span>Category *</span><input name="category" required placeholder="e.g. Equipment, Materials" /></label>
          <label className="full"><span>Summary *</span><textarea name="summary" required placeholder="Describe the need" /></label>
          <label className="full"><span>Contact person (optional)</span><EntitySearchSelect name="person_id" catalog="person" placeholder="Search person to follow up with" /></label>
        </div>
        <div className="form-footer"><button className="primary-button" disabled={busy} type="submit">{busy ? 'Saving…' : 'Submit need'}</button></div>
      </form>
      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Scope</th>
              <th>Category</th>
              <th>Contact</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6}>No needs in this scope.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id}>
                <td>{row.title ?? row.summary}</td>
                <td>{row.scope_label ?? row.scope_type ?? '—'}</td>
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
