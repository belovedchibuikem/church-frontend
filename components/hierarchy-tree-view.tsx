'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  createCountry,
  createLevel,
  createLocation,
  createUnit,
  isOrganizationApiConfigured,
  loadOrganizationHierarchy,
  moveUnit,
  organizationErrorMessage,
  shouldUseOrganizationFixtures,
  type OrganizationHierarchySnapshot,
} from '../lib/admin-organization-api';
import {
  buildOrganizationHierarchyTree,
  collectExpandableIds,
  collectMovableUnitOptions,
  findHierarchyNode,
  fixtureHierarchyTreeForRoute,
  isAdminOrganizationHierarchyRoute,
  type HierarchyNode,
} from '../lib/hierarchy-trees';
import { SearchSelect, type SearchSelectOption } from './search-select';
import { useLocale } from '@/components/locale-provider';

type Props = {
  route: string;
  title: string;
};

type LoadState = 'idle' | 'loading' | 'ready' | 'error' | 'empty';

function TreeBranch({
  node,
  depth,
  expanded,
  selectedId,
  onToggle,
  onSelect,
}: {
  node: HierarchyNode;
  depth: number;
  expanded: Set<string>;
  selectedId: string;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const { t } = useLocale();
  const hasChildren = Boolean(node.children?.length);
  const isOpen = expanded.has(node.id);
  const isSelected = selectedId === node.id;
  const collapseLabel = t('admin.hierarchy.collapseNode', { vars: { label: node.label }, defaultMessage: `Collapse ${node.label}` });
  const expandLabel = t('admin.hierarchy.expandNode', { vars: { label: node.label }, defaultMessage: `Expand ${node.label}` });

  return (
    <div className={`tree-branch ${isOpen ? 'expanded' : ''}`}>
      <button
        type="button"
        className={`tree-node level-${Math.min(depth, 5)} ${isSelected ? 'selected' : ''} ${isOpen ? 'expanded' : ''}`}
        onClick={() => onSelect(node.id)}
        aria-current={isSelected ? 'true' : undefined}
      >
        {hasChildren ? (
          <span
            className="tree-toggle"
            role="button"
            tabIndex={0}
            aria-label={isOpen ? collapseLabel : expandLabel}
            aria-expanded={isOpen}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(node.id);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                onToggle(node.id);
              }
            }}
          >
            {isOpen ? '▾' : '▸'}
          </span>
        ) : (
          <span className="tree-leaf">•</span>
        )}
        <span className="tree-label">{node.label}</span>
        <small>{node.level}</small>
      </button>
      {hasChildren && isOpen
        ? node.children!.map((child) => (
            <TreeBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selectedId={selectedId}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))
        : null}
    </div>
  );
}

function HierarchyStatus({
  state,
  message,
  onRetry,
}: {
  state: LoadState;
  message: string;
  onRetry?: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="card tree-card hierarchy-status">
      <p className="maps-settings-lead">{message}</p>
      {state === 'error' && onRetry ? (
        <button type="button" className="ghost-button" onClick={onRetry}>
          {t('common.retry', { defaultMessage: 'Retry' })}
        </button>
      ) : null}
    </div>
  );
}

function OrganizationCreateForms({
  snapshot,
  busy,
  onCreated,
}: {
  snapshot: OrganizationHierarchySnapshot;
  busy: boolean;
  onCreated: () => void;
}) {
  const { t } = useLocale();
  const [message, setMessage] = useState(
    t('admin.hierarchy.createLead', {
      defaultMessage: 'Create countries, levels, units, and locations against live Laravel APIs.',
    }),
  );
  const [countryId, setCountryId] = useState(snapshot.countries[0]?.id ?? '');
  const levels = snapshot.levelsByCountry[countryId] ?? [];

  useEffect(() => {
    if (!countryId && snapshot.countries[0]?.id) setCountryId(snapshot.countries[0].id);
  }, [countryId, snapshot.countries]);

  const countryOptions: SearchSelectOption[] = snapshot.countries.map((country) => ({
    value: country.id,
    label: country.name,
    meta: country.iso_code,
  }));
  const levelOptions: SearchSelectOption[] = levels.map((level) => ({
    value: level.id,
    label: level.name,
    meta: level.code,
  }));
  const unitOptions: SearchSelectOption[] = snapshot.units
    .filter((unit) => !countryId || unit.country?.id === countryId)
    .map((unit) => ({
      value: unit.id,
      label: unit.name,
      meta: unit.administrative_level?.name,
    }));

  async function submitCountry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await createCountry({
        iso_code: String(form.get('iso_code') ?? '').trim().toUpperCase(),
        name: String(form.get('name') ?? '').trim(),
      });
      event.currentTarget.reset();
      setMessage(t('admin.hierarchy.countryCreated', { defaultMessage: 'Country created.' }));
      onCreated();
    } catch (error) {
      setMessage(organizationErrorMessage(error));
    }
  }

  async function submitLevel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!countryId) {
      setMessage(t('admin.hierarchy.selectCountryFirst', { defaultMessage: 'Select a country before adding a level.' }));
      return;
    }
    const form = new FormData(event.currentTarget);
    try {
      await createLevel(countryId, {
        code: String(form.get('code') ?? '').trim(),
        name: String(form.get('name') ?? '').trim(),
        sort_order: Number(form.get('sort_order') ?? 1),
      });
      event.currentTarget.reset();
      setMessage(t('admin.hierarchy.levelCreated', { defaultMessage: 'Administrative level created.' }));
      onCreated();
    } catch (error) {
      setMessage(organizationErrorMessage(error));
    }
  }

  async function submitUnit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selectedCountry = String(form.get('country_id') || countryId);
    const levelId = String(form.get('administrative_level_id') ?? '');
    const parentValue = String(form.get('parent_id') ?? '').trim();
    try {
      await createUnit({
        country_id: selectedCountry,
        administrative_level_id: levelId,
        name: String(form.get('name') ?? '').trim(),
        parent_id: parentValue || null,
        reference_code: String(form.get('reference_code') ?? '').trim() || null,
      });
      event.currentTarget.reset();
      setMessage(t('admin.hierarchy.unitCreated', { defaultMessage: 'Administrative unit created.' }));
      onCreated();
    } catch (error) {
      setMessage(organizationErrorMessage(error));
    }
  }

  async function submitLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selectedCountry = String(form.get('country_id') || countryId);
    const unitId = String(form.get('administrative_unit_id') ?? '').trim();
    const lat = String(form.get('latitude') ?? '').trim();
    const lng = String(form.get('longitude') ?? '').trim();
    try {
      await createLocation({
        country_id: selectedCountry,
        name: String(form.get('name') ?? '').trim(),
        timezone: String(form.get('timezone') ?? '').trim(),
        administrative_unit_id: unitId || null,
        address_line_one: String(form.get('address_line_one') ?? '').trim() || null,
        latitude: lat ? Number(lat) : null,
        longitude: lng ? Number(lng) : null,
      });
      event.currentTarget.reset();
      setMessage(t('admin.hierarchy.locationCreated', { defaultMessage: 'Location created.' }));
      onCreated();
    } catch (error) {
      setMessage(organizationErrorMessage(error));
    }
  }

  return (
    <div className="card settings-card ministry-settings hierarchy-create-panel">
      <p className="maps-settings-lead">{message}</p>
      <div className="form-grid">
        <form className="full hierarchy-create-form" onSubmit={submitCountry}>
          <strong>Add country</strong>
          <label>
            <span>ISO code *</span>
            <input name="iso_code" maxLength={2} required placeholder="NG" disabled={busy} />
          </label>
          <label>
            <span>Name *</span>
            <input name="name" required placeholder="Nigeria" disabled={busy} />
          </label>
          <button className="primary-button" type="submit" disabled={busy}>
            Create country
          </button>
        </form>

        <form className="full hierarchy-create-form" onSubmit={submitLevel}>
          <strong>Add level</strong>
          <label>
            <span>Country *</span>
            <SearchSelect
              name="country_picker"
              options={countryOptions}
              value={countryId}
              placeholder="Search country"
              onValueChange={setCountryId}
              disabled={busy || countryOptions.length === 0}
            />
          </label>
          <label>
            <span>Code *</span>
            <input name="code" required placeholder="region" disabled={busy} />
          </label>
          <label>
            <span>Name *</span>
            <input name="name" required placeholder="Region / State" disabled={busy} />
          </label>
          <label>
            <span>Sort order *</span>
            <input name="sort_order" type="number" min={1} defaultValue={levels.length + 1} required disabled={busy} />
          </label>
          <button className="primary-button" type="submit" disabled={busy || !countryId}>
            Create level
          </button>
        </form>

        <form className="full hierarchy-create-form" onSubmit={submitUnit}>
          <strong>Add unit</strong>
          <label>
            <span>Country *</span>
            <SearchSelect
              name="country_id"
              options={countryOptions}
              value={countryId}
              placeholder="Search country"
              onValueChange={setCountryId}
              required
              disabled={busy || countryOptions.length === 0}
            />
          </label>
          <label>
            <span>Level *</span>
            <SearchSelect
              name="administrative_level_id"
              options={levelOptions}
              placeholder="Search level"
              required
              disabled={busy || levelOptions.length === 0}
            />
          </label>
          <label>
            <span>Parent unit</span>
            <SearchSelect name="parent_id" options={unitOptions} placeholder="Optional parent" disabled={busy} />
          </label>
          <label>
            <span>Name *</span>
            <input name="name" required placeholder="Lagos State" disabled={busy} />
          </label>
          <label>
            <span>Reference code</span>
            <input name="reference_code" placeholder="NG-LA" disabled={busy} />
          </label>
          <button className="primary-button" type="submit" disabled={busy || levelOptions.length === 0}>
            Create unit
          </button>
        </form>

        <form className="full hierarchy-create-form" onSubmit={submitLocation}>
          <strong>Add location</strong>
          <label>
            <span>Country *</span>
            <SearchSelect
              name="country_id"
              options={countryOptions}
              value={countryId}
              placeholder="Search country"
              required
              disabled={busy || countryOptions.length === 0}
            />
          </label>
          <label>
            <span>Administrative unit</span>
            <SearchSelect name="administrative_unit_id" options={unitOptions} placeholder="Optional unit" disabled={busy} />
          </label>
          <label>
            <span>Name *</span>
            <input name="name" required placeholder="Campus / venue" disabled={busy} />
          </label>
          <label>
            <span>Timezone *</span>
            <input name="timezone" required placeholder="Africa/Lagos" disabled={busy} />
          </label>
          <label>
            <span>Address line</span>
            <input name="address_line_one" placeholder="Street address" disabled={busy} />
          </label>
          <label>
            <span>Latitude</span>
            <input name="latitude" type="number" step="any" disabled={busy} />
          </label>
          <label>
            <span>Longitude</span>
            <input name="longitude" type="number" step="any" disabled={busy} />
          </label>
          <button className="primary-button" type="submit" disabled={busy || countryOptions.length === 0}>
            Create location
          </button>
        </form>
      </div>
    </div>
  );
}

function LiveOrganizationHierarchy({ title }: { title: string }) {
  const { t } = useLocale();
  const [state, setState] = useState<LoadState>('loading');
  const [message, setMessage] = useState(
    t('admin.hierarchy.loading', { defaultMessage: 'Loading organization hierarchy…' }),
  );
  const [snapshot, setSnapshot] = useState<OrganizationHierarchySnapshot | null>(null);
  const [root, setRoot] = useState<HierarchyNode | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState('');
  const [parentId, setParentId] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const refresh = useCallback(async () => {
    setState('loading');
    setMessage(t('admin.hierarchy.loading', { defaultMessage: 'Loading organization hierarchy…' }));
    try {
      const next = await loadOrganizationHierarchy();
      const tree = buildOrganizationHierarchyTree(next);
      setSnapshot(next);
      setRoot(tree);
      if (!tree) {
        setState('empty');
        setMessage(t('admin.hierarchy.empty', { defaultMessage: 'No countries or units yet. Create the first country below.' }));
        setSelectedId('');
        setExpanded(new Set());
        return;
      }
      const expandable = collectExpandableIds(tree);
      setExpanded(new Set(expandable.slice(0, Math.min(4, expandable.length))));
      setSelectedId((current) => (current && findHierarchyNode(tree, current) ? current : tree.id));
      setState('ready');
      setMessage('');
    } catch (error) {
      setSnapshot(null);
      setRoot(null);
      setState('error');
      setMessage(organizationErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const expandableIds = useMemo(() => (root ? collectExpandableIds(root) : []), [root]);
  const selected = root && selectedId ? findHierarchyNode(root, selectedId) ?? root : null;
  const moveOptions = root && selected?.kind === 'unit' ? collectMovableUnitOptions(root, selected.id) : [];

  useEffect(() => {
    setParentId(selected?.parentId ?? '');
  }, [selected?.id, selected?.parentId]);

  const toggle = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  async function onMoveParent(event: FormEvent) {
    event.preventDefault();
    if (!selected || selected.kind !== 'unit') return;
    setBusy(true);
    setActionMessage('');
    try {
      await moveUnit(selected.id, { parent_id: parentId.trim() ? parentId.trim() : null });
      setActionMessage(t('admin.hierarchy.parentUpdated', { defaultMessage: 'Parent updated.' }));
      await refresh();
    } catch (error) {
      setActionMessage(organizationErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (state === 'loading') {
    return <HierarchyStatus state={state} message={message} />;
  }

  if (state === 'error') {
    return (
      <div className="hierarchy-live" data-hierarchy-title={title}>
        <HierarchyStatus state={state} message={message} onRetry={() => void refresh()} />
      </div>
    );
  }

  return (
    <div className="hierarchy-live" data-hierarchy-title={title}>
      {state === 'empty' || !root || !selected ? (
        <HierarchyStatus state="empty" message={message} />
      ) : (
        <div className="tree-layout">
          <div className="card tree-card">
            <div className="tree-toolbar">
              <strong>{t('admin.hierarchy.structure', { defaultMessage: 'Structure' })}</strong>
              <div>
                <button type="button" className="ghost-button" onClick={() => void refresh()} disabled={busy}>
                  {t('common.refresh', { defaultMessage: 'Refresh' })}
                </button>
                <button type="button" className="ghost-button" onClick={() => setExpanded(new Set(expandableIds))}>
                  {t('admin.hierarchy.expandAll', { defaultMessage: 'Expand All' })}
                </button>
                <button type="button" className="ghost-button" onClick={() => setExpanded(new Set())}>
                  {t('admin.hierarchy.collapseAll', { defaultMessage: 'Collapse All' })}
                </button>
              </div>
            </div>
            <TreeBranch
              node={root}
              depth={0}
              expanded={expanded}
              selectedId={selectedId}
              onToggle={toggle}
              onSelect={setSelectedId}
            />
          </div>
          <div className="card tree-detail">
            <h2 className="card-title">{t('admin.hierarchy.selectedNode', { defaultMessage: 'Selected Node' })}</h2>
            <h3>{selected.label}</h3>
            <dl>
              <div>
                <dt>{t('admin.hierarchy.level', { defaultMessage: 'Level' })}</dt>
                <dd>{selected.level}</dd>
              </div>
              <div>
                <dt>{t('admin.hierarchy.code', { defaultMessage: 'Code' })}</dt>
                <dd>{selected.code}</dd>
              </div>
              {selected.parent ? (
                <div>
                  <dt>{t('admin.hierarchy.parent', { defaultMessage: 'Parent' })}</dt>
                  <dd>{selected.parent}</dd>
                </div>
              ) : null}
              {selected.kind ? (
                <div>
                  <dt>{t('admin.hierarchy.kind', { defaultMessage: 'Kind' })}</dt>
                  <dd>{selected.kind}</dd>
                </div>
              ) : null}
            </dl>

            {selected.kind === 'unit' ? (
              <form className="hierarchy-move-form" onSubmit={onMoveParent}>
                <label>
                  <span>{t('admin.hierarchy.moveUnderParent', { defaultMessage: 'Move under parent' })}</span>
                  <select value={parentId} onChange={(event) => setParentId(event.target.value)} disabled={busy}>
                    <option value="">{t('admin.hierarchy.countryRoot', { defaultMessage: 'Country root (no parent)' })}</option>
                    {moveOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label} · {option.level}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="primary-button" type="submit" disabled={busy}>
                  {t('admin.hierarchy.saveParent', { defaultMessage: 'Save parent' })}
                </button>
              </form>
            ) : null}
            {actionMessage ? <p className="maps-settings-lead">{actionMessage}</p> : null}
          </div>
        </div>
      )}

      {snapshot ? <OrganizationCreateForms snapshot={snapshot} busy={busy} onCreated={() => void refresh()} /> : null}
    </div>
  );
}

function FixtureHierarchyTree({ route, title }: Props) {
  const { t } = useLocale();
  const root = useMemo(() => fixtureHierarchyTreeForRoute(route), [route]);
  const expandableIds = useMemo(() => (root ? collectExpandableIds(root) : []), [root]);
  const defaultSelected = useMemo(() => {
    if (!root) return null;
    return (
      findHierarchyNode(root, 'hope') ??
      findHierarchyNode(root, 'covenant') ??
      findHierarchyNode(root, 'ward-a') ??
      root
    );
  }, [root]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (!root || !defaultSelected) {
      setExpanded(new Set());
      setSelectedId('');
      return;
    }
    setExpanded(new Set(expandableIds.slice(0, Math.min(4, expandableIds.length))));
    setSelectedId(defaultSelected.id);
  }, [root, defaultSelected, expandableIds]);

  if (!root || !defaultSelected) {
    return (
      <HierarchyStatus
        state="empty"
        message={t('admin.hierarchy.fixturesDisabled', {
          defaultMessage:
            'Design fixtures are disabled. Enable NEXT_PUBLIC_FHC_ENABLE_DESIGN_FIXTURES=true for prototype trees, or open Administrative Hierarchy for live organization data.',
        })}
      />
    );
  }

  const selected = findHierarchyNode(root, selectedId) ?? root;

  const toggle = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="tree-layout" data-hierarchy-title={title}>
      <div className="card tree-card">
        <div className="tree-toolbar">
          <strong>{t('admin.hierarchy.structure', { defaultMessage: 'Structure' })}</strong>
          <div>
            <button type="button" className="ghost-button" onClick={() => setExpanded(new Set(expandableIds))}>
              {t('admin.hierarchy.expandAll', { defaultMessage: 'Expand All' })}
            </button>
            <button type="button" className="ghost-button" onClick={() => setExpanded(new Set())}>
              {t('admin.hierarchy.collapseAll', { defaultMessage: 'Collapse All' })}
            </button>
          </div>
        </div>
        <TreeBranch
          node={root}
          depth={0}
          expanded={expanded}
          selectedId={selectedId}
          onToggle={toggle}
          onSelect={setSelectedId}
        />
      </div>
      <div className="card tree-detail">
        <h2 className="card-title">{t('admin.hierarchy.selectedNode', { defaultMessage: 'Selected Node' })}</h2>
        <h3>{selected.label}</h3>
        <dl>
          <div>
            <dt>{t('admin.hierarchy.level', { defaultMessage: 'Level' })}</dt>
            <dd>{selected.level}</dd>
          </div>
          <div>
            <dt>{t('admin.hierarchy.code', { defaultMessage: 'Code' })}</dt>
            <dd>{selected.code}</dd>
          </div>
          {selected.parent ? (
            <div>
              <dt>{t('admin.hierarchy.parent', { defaultMessage: 'Parent' })}</dt>
              <dd>{selected.parent}</dd>
            </div>
          ) : null}
          {typeof selected.churches === 'number' ? (
            <div>
              <dt>Churches</dt>
              <dd>{selected.churches.toLocaleString()}</dd>
            </div>
          ) : null}
          {typeof selected.homeChurches === 'number' ? (
            <div>
              <dt>Home Churches</dt>
              <dd>{selected.homeChurches.toLocaleString()}</dd>
            </div>
          ) : null}
          {typeof selected.members === 'number' ? (
            <div>
              <dt>{t('admin.hierarchy.members', { defaultMessage: 'Members' })}</dt>
              <dd>{selected.members.toLocaleString()}</dd>
            </div>
          ) : null}
          {selected.status ? (
            <div>
              <dt>{t('admin.hierarchy.status', { defaultMessage: 'Status' })}</dt>
              <dd>{selected.status}</dd>
            </div>
          ) : null}
        </dl>
        <button type="button" className="ghost-button">
          {t('common.viewDetails', { defaultMessage: 'View Details' })}
        </button>
      </div>
    </div>
  );
}

export function HierarchyTreeView({ route, title }: Props) {
  if (isAdminOrganizationHierarchyRoute(route)) {
    if (shouldUseOrganizationFixtures() && !isOrganizationApiConfigured()) {
      return <FixtureHierarchyTree route={route} title={title} />;
    }
    return <LiveOrganizationHierarchy title={title} />;
  }
  return <FixtureHierarchyTree route={route} title={title} />;
}
