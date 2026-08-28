'use client';

import Link from 'next/link';
import type { FormEvent, KeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from '@/components/locale-provider';
import { AdminActionSurface, inferActionSurfaceMode, type ActionSurfaceMode } from './admin-action-surface';
import { resolveEntityKey } from '../lib/admin-form-schemas';
import {
  UNREGISTERED_ADMIN_ACTION_MESSAGE,
  UnregisteredAdminActionError,
  executeAdminAction,
  extractUlid,
  formatAdminActionSuccess,
  formatAdminMutationError,
} from '../lib/admin-mutation-dispatcher';
import { WIZARD_ADVANCE_EVENT, isInPageWizardKind } from '../lib/use-admin-wizard-step';
import { adminModules, getAdminModule, getAdminModuleForRoute, isCanonicalAdminPath, isRestorableAdminRoute, moduleReturnStorageKey, sanitizeModuleReturn } from '../lib/admin-modules';

type Overlay =
  | { type: 'drawer' | 'dialog'; title: string; description: string; mode: 'filters' | 'profile' | 'modules' | 'action'; actionMode?: ActionSurfaceMode; label?: string; record?: string; entityKey?: string }
  | null;

type Props = {
  children: ReactNode;
  route: string;
  title: string;
  permission: string;
  scope: string;
  screenKind?: string;
  returnTo?: string;
  tabs?: string[];
  routes: Record<string, string>;
  records?: string[];
  details?: Record<string, string>;
  items?: string[];
};

const mutationPattern = /approve|reject|defer|assign|activate|suspend|close|delete|remove|save|submit|publish|send|issue|escalate|reconcile|refund|confirm|register|create|add|new|edit|update|process|request/i;
const filePattern = /download|export|print|upload|preview pdf|send receipt/i;
const emptyTabs: string[] = [];

function normalize(label: string): string {
  return label.replace(/[＋+→↗⌄⋯•••]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function AdminInteractionShell({ children, route, title, permission, scope, screenKind, returnTo, tabs, routes, records = [], details = {}, items = [] }: Props) {
  const { t } = useLocale();
  const tabItems = tabs ?? emptyTabs;
  const inPageWizard = isInPageWizardKind(screenKind) && tabItems.length > 1;
  const currentModule = getAdminModuleForRoute(route);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const overlayWasOpen = useRef(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState(() => typeof window === 'undefined' ? '' : new URL(window.location.href).searchParams.get('q') ?? '');
  const [matches, setMatches] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState(() => typeof window === 'undefined' ? 'all' : new URL(window.location.href).searchParams.get('status') ?? 'all');
  const [currentPage, setCurrentPage] = useState(() => typeof window === 'undefined' ? 1 : Number(new URL(window.location.href).searchParams.get('page') ?? '1'));
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return tabItems[0] ?? '';
    const requested = new URL(window.location.href).searchParams.get('tab');
    return tabItems.find((tab) => slug(tab) === requested) ?? tabItems[0] ?? '';
  });
  const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem('fhc-admin-sidebar') === 'collapsed');
  const [navigationOpen, setNavigationOpen] = useState(false);
  const matchingRecords = query ? records.filter((record) => record.toLowerCase().includes(query.toLowerCase())) : [];
  const contextualReturn = returnTo && isCanonicalAdminPath(returnTo) ? returnTo : undefined;
  const contextualModule = contextualReturn ? getAdminModuleForRoute(contextualReturn) : undefined;

  useEffect(() => {
    const onPopState = () => {
      const current = new URL(window.location.href);
      const tab = tabItems.find((item) => slug(item) === current.searchParams.get('tab')) ?? tabItems[0] ?? '';
      setActiveTab(tab);
      setQuery(current.searchParams.get('q') ?? '');
      setStatusFilter(current.searchParams.get('status') ?? 'all');
      setCurrentPage(Number(current.searchParams.get('page') ?? '1'));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [tabItems]);

  useEffect(() => {
    if (!isRestorableAdminRoute(route)) return;
    const restorable = sanitizeModuleReturn(currentModule.id, `${window.location.pathname}${window.location.search}`);
    if (restorable) window.sessionStorage.setItem(moduleReturnStorageKey(currentModule.id, scope), restorable);
  }, [currentModule.id, route, scope]);

  useEffect(() => {
    const groups = rootRef.current?.querySelectorAll<HTMLDetailsElement>('details[data-nav-group]');
    if (!groups) return;
    let remembered: string[] = [];
    try { remembered = JSON.parse(window.localStorage.getItem('fhc-admin-nav-groups') ?? '[]') as string[]; } catch { remembered = []; }
    groups.forEach((group) => {
      if (group.dataset.navActive === 'true' || remembered.includes(group.dataset.navGroup ?? '')) group.open = true;
    });
    window.setTimeout(() => rootRef.current?.querySelector<HTMLElement>('#admin-primary-navigation [aria-current="page"]')?.scrollIntoView({ block: 'nearest' }), 0);
  }, [route]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || tabItems.length === 0) return;
    const buttons = root.querySelectorAll<HTMLElement>('.tabs button, .kca-entity-tabs button, .mission-tabs button, .platform-tabs button');
    buttons.forEach((button) => {
      const selected = normalize(button.textContent ?? '') === normalize(activeTab);
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.setAttribute('tabindex', selected ? '0' : '-1');
    });
  }, [activeTab, tabItems.length]);

  const filterVisibleRows = useCallback((value: string, status = statusFilter, page = currentPage) => {
    const root = rootRef.current;
    if (!root) return;
    const rows = root.querySelectorAll<HTMLElement>('tbody tr, .feed-item, .kca-recent-row, .mission-ranked-row, .platform-list > div');
    if (rows.length === 0) {
      setMatches(null);
      return;
    }
    let matched = 0;
    rows.forEach((row) => {
      const content = (row.textContent ?? '').toLowerCase();
      const matchesSearch = !value || content.includes(value.toLowerCase());
      const matchesStatus = !status || status === 'all' || content.includes(status.toLowerCase());
      const candidate = matchesSearch && matchesStatus;
      const show = candidate && matched >= (page - 1) * 5 && matched < page * 5;
      if (candidate) matched += 1;
      row.style.display = show ? '' : 'none';
      row.toggleAttribute('data-interaction-filtered', !show);
    });
    setMatches(value || (status && status !== 'all') ? matched : null);
  }, [currentPage, statusFilter]);

  useEffect(() => {
    filterVisibleRows(query, statusFilter, currentPage);
    rootRef.current?.querySelectorAll<HTMLButtonElement>('[aria-label^="Page "]').forEach((button) => {
      const selected = Number(button.getAttribute('aria-label')?.match(/\d+/)?.[0]) === currentPage;
      button.classList.toggle('active', selected);
      if (selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }, [currentPage, filterVisibleRows, query, route, statusFilter]);

  useEffect(() => {
    document.body.style.overflow = overlay || navigationOpen ? 'hidden' : '';
    rootRef.current?.querySelector('[data-admin-intent="module-launcher"]')?.setAttribute('aria-expanded', String(overlay?.mode === 'modules'));
    rootRef.current?.querySelector('[data-admin-intent="toggle-navigation"]')?.setAttribute('aria-expanded', String(navigationOpen));
    const background = rootRef.current?.querySelector<HTMLElement>('.admin-shell');
    if (background) background.inert = Boolean(overlay);
    if (overlay && !overlayWasOpen.current) {
      lastFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      window.setTimeout(() => rootRef.current?.querySelector<HTMLElement>('.interaction-overlay input, .interaction-overlay select, .interaction-overlay textarea, .interaction-overlay button')?.focus(), 0);
    } else if (!overlay && overlayWasOpen.current) {
      lastFocused.current?.focus();
    }
    overlayWasOpen.current = Boolean(overlay);
    return () => { document.body.style.overflow = ''; };
  }, [overlay, navigationOpen]);

  useEffect(() => {
    if (!toast) return;
    const linger = /failed|error|registered|required|denied|unable|rejected/i.test(toast) ? 6000 : 3200;
    const timer = window.setTimeout(() => setToast(''), linger);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const navigate = (destination: string, preserveReturn = true) => {
    const next = new URL(destination, window.location.origin);
    const current = new URL(window.location.href);
    const selectedScope = current.searchParams.get('scope') ?? window.localStorage.getItem('fhc-admin-scope');
    if (selectedScope && !next.searchParams.has('scope') && !/\/admin\/(login|mfa)/.test(next.pathname)) next.searchParams.set('scope', selectedScope);
    const sourceModule = getAdminModuleForRoute(current.pathname);
    const destinationModule = getAdminModuleForRoute(next.pathname);
    if (preserveReturn && sourceModule.id !== destinationModule.id && isRestorableAdminRoute(current.pathname) && !next.searchParams.has('returnTo')) {
      const safeReturn = sanitizeModuleReturn(sourceModule.id, `${current.pathname}${current.search}`);
      if (safeReturn) next.searchParams.set('returnTo', safeReturn);
    } else if (preserveReturn && sourceModule.id === destinationModule.id && current.searchParams.has('returnTo') && !next.searchParams.has('returnTo')) {
      next.searchParams.set('returnTo', current.searchParams.get('returnTo') ?? '');
    }
    window.location.assign(`${next.pathname}${next.search}${next.hash}`);
  };

  const updateUrlState = (key: string, value?: string, push = true) => {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    window.history[push ? 'pushState' : 'replaceState']({}, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const updateUrlStates = (values: Record<string, string | undefined>) => {
    const url = new URL(window.location.href);
    Object.entries(values).forEach(([key, value]) => value ? url.searchParams.set(key, value) : url.searchParams.delete(key));
    window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const closeOverlay = () => setOverlay(null);

  const handleSearch = (value: string) => {
    setQuery(value);
    filterVisibleRows(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => updateUrlState('q', value || undefined, false), 180);
  };

  const resolveRoute = (label: string): string | undefined => {
    const clean = normalize(label);
    return routes[clean];
  };

  const openAction = (label: string, forcedMode?: ActionSurfaceMode, options?: { record?: string; entityKey?: string }) => {
    const actionMode = forcedMode ?? inferActionSurfaceMode(label);
    const entity = label.replace(/[＋+]/g, '').trim() || title;
    const recordLabel = normalize(label).replace(/^(view|open|edit|delete|details for|actions for)\s+/, '');
    const selectedRecord = options?.record ?? (recordLabel ? records.find((record) => record.toLowerCase().includes(recordLabel)) : undefined);
    const entityKey = options?.entityKey ?? resolveEntityKey(route);
    setOverlay({
      type: actionMode === 'confirm' ? 'dialog' : 'drawer',
      mode: 'action',
      actionMode,
      label,
      record: selectedRecord,
      entityKey,
      title: actionMode === 'create' ? entity : label || t('admin.pageActions', { defaultMessage: 'Page actions' }),
      description: actionMode === 'confirm' ? t('admin.confirmDescription', { defaultMessage: 'Review the scope, permission and supporting notes before continuing.' }) : t('admin.workflowDescription', { defaultMessage: 'Complete the {entity} workflow for {title}.', vars: { entity: entity.toLowerCase(), title } }),
    });
  };

  const openModule = (moduleId: string) => {
    const adminModule = getAdminModule(moduleId);
    if (!adminModule) return;
    const restored = sanitizeModuleReturn(adminModule.id, window.sessionStorage.getItem(moduleReturnStorageKey(adminModule.id, scope)));
    navigate(restored ?? adminModule.homeRoute, false);
  };

  const executeMutation = async (payload: Record<string, string>) => {
    const action = overlay?.label || overlay?.title || 'action';
    const recordId = extractUlid(overlay?.record) ?? extractUlid(payload.id);
    try {
      const result = await executeAdminAction({
        route,
        label: action,
        payload,
        recordId,
        scope,
      });
      setOverlay(null);
      setToast(formatAdminActionSuccess(result));
    } catch (error) {
      if (error instanceof UnregisteredAdminActionError) {
        window.localStorage.setItem(
          `fhc-admin-action:${route}:${slug(action)}`,
          JSON.stringify({ savedAt: new Date().toISOString(), payload, draftOnly: true }),
        );
        setToast(UNREGISTERED_ADMIN_ACTION_MESSAGE);
      } else {
        setToast(formatAdminMutationError(error));
      }
      throw error;
    }
  };

  const handleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const groupSummary = target.closest<HTMLElement>('summary[data-nav-group-summary]');
    if (groupSummary) {
      const group = groupSummary.parentElement as HTMLDetailsElement | null;
      if (!group) return;
      if (collapsed && !window.matchMedia('(max-width: 768px)').matches) {
        event.preventDefault();
        setCollapsed(false);
        window.localStorage.setItem('fhc-admin-sidebar', 'expanded');
        group.open = true;
      }
      window.setTimeout(() => {
        const openGroups = Array.from(rootRef.current?.querySelectorAll<HTMLDetailsElement>('details[data-nav-group][open]') ?? []).map((item) => item.dataset.navGroup).filter(Boolean);
        window.localStorage.setItem('fhc-admin-nav-groups', JSON.stringify(openGroups));
      }, 0);
      return;
    }
    const anchor = target.closest<HTMLAnchorElement>('a');
    if (anchor) {
      const href = anchor.getAttribute('href') ?? '';
      if (href === '#' || href === '') {
        event.preventDefault();
        setOverlay({ type: 'dialog', mode: 'action', actionMode: 'help', label: anchor.textContent?.trim() || t('common.help', { defaultMessage: 'Help' }), title: anchor.textContent?.trim() || t('common.help', { defaultMessage: 'Help' }), description: t('admin.helpDescription', { defaultMessage: 'Review the available support and recovery information.' }) });
        return;
      }
      const url = new URL(anchor.href, window.location.origin);
      const selectedScope = url.searchParams.get('scope');
      if (selectedScope) window.localStorage.setItem('fhc-admin-scope', selectedScope);
      if (url.origin === window.location.origin && url.pathname.startsWith('/admin')) {
        event.preventDefault();
        setNavigationOpen(false);
        navigate(`${url.pathname}${url.search}${url.hash}`);
      }
      return;
    }

    const button = target.closest<HTMLButtonElement>('button');
    if (!button || button.dataset.interactionNative === 'true') return;
    if (screenKind === 'login' || screenKind === 'mfa') return;
    if (button.type === 'submit') return;
    if (button.closest('form') && !button.closest('.interaction-overlay')) return;
    if (button.closest('.branding-settings, .maps-settings') && !button.closest('.interaction-overlay')) return;
    const label = (button.getAttribute('aria-label') || button.textContent || '').trim();
    const clean = normalize(label);

    if (button.dataset.adminAction) {
      event.preventDefault();
      const record = button.dataset.record ?? '';
      const recordId = extractUlid(record);
      const entityKey = button.dataset.entity ?? resolveEntityKey(route);
      const action = button.dataset.adminAction;
      if (action === 'view' && recordId) {
        if (route.includes('/kca/applications') || route === '/admin/kca/review-queue') {
          navigate(`/admin/kca/applications/${recordId}/decision`);
          return;
        }
        if (route.includes('/home-churches/applications')) {
          navigate(`/admin/home-churches/applications/${recordId}/decision`);
          return;
        }
      }
      if (action === 'view') openAction(t('admin.viewRecord', { defaultMessage: 'View {record}', vars: { record } }), 'preview', { record, entityKey });
      else if (action === 'edit') openAction(t('admin.editRecord', { defaultMessage: 'Edit {record}', vars: { record } }), 'edit', { record, entityKey });
      else if (action === 'delete') openAction(t('admin.deleteRecord', { defaultMessage: 'Delete {record}', vars: { record } }), 'confirm', { record, entityKey });
      return;
    }

    if (button.dataset.adminIntent === 'toggle-navigation') {
      event.preventDefault();
      if (window.matchMedia('(max-width: 768px)').matches) setNavigationOpen((value) => !value);
      else setCollapsed((value) => {
        window.localStorage.setItem('fhc-admin-sidebar', value ? 'expanded' : 'collapsed');
        return !value;
      });
      return;
    }
    if (button.dataset.adminIntent === 'module-launcher') {
      event.preventDefault();
      setOverlay({ type: 'drawer', mode: 'modules', title: t('admin.allModules', { defaultMessage: 'All modules' }), description: t('admin.allModulesDescription', { defaultMessage: 'Move between administration modules. Each module reopens at your last safe working page.' }) });
      return;
    }
    if (button.dataset.adminModule) {
      event.preventDefault();
      openModule(button.dataset.adminModule);
      return;
    }
    if (button.dataset.adminIntent === 'profile-menu') {
      event.preventDefault();
      setOverlay({ type: 'drawer', mode: 'profile', title: t('admin.adminAccount', { defaultMessage: 'Admin account' }), description: t('admin.adminAccountDescription', { defaultMessage: 'Manage your profile or securely end the current hosted session.' }) });
      return;
    }
    if (button.closest('[role="tablist"], .tabs, .kca-entity-tabs, .mission-tabs, .platform-tabs')) {
      event.preventDefault();
      const selected = button.textContent?.trim() ?? '';
      setActiveTab(selected);
      updateUrlState('tab', slug(selected));
      return;
    }
    if (/page \d+/i.test(label)) {
      event.preventDefault();
      const page = label.match(/\d+/)?.[0] ?? '1';
      setCurrentPage(Number(page));
      updateUrlState('page', page);
      setToast(t('admin.pageSelected', { defaultMessage: 'Page {page} selected', vars: { page } }));
      return;
    }
    if (/previous page/i.test(label)) {
      event.preventDefault();
      const current = Number(new URL(window.location.href).searchParams.get('page') ?? '1');
      if (current <= 1) setToast(t('admin.firstPage', { defaultMessage: 'Already on the first page' }));
      else { setCurrentPage(current - 1); updateUrlState('page', String(current - 1)); }
      return;
    }
    if (/next page/i.test(label)) {
      event.preventDefault();
      const current = Number(new URL(window.location.href).searchParams.get('page') ?? '1');
      setCurrentPage(current + 1);
      updateUrlState('page', String(current + 1));
      setToast(t('admin.pageSelected', { defaultMessage: 'Page {page} selected', vars: { page: current + 1 } }));
      return;
    }
    if (button.dataset.adminIntent === 'reset-filters' || clean === 'reset filters') {
      event.preventDefault();
      updateUrlStates({ filter: undefined, status: undefined, date: undefined, sort: undefined });
      updateUrlState('page', undefined, false);
      setStatusFilter('all');
      setCurrentPage(1);
      closeOverlay();
      setToast(t('admin.filtersReset', { defaultMessage: 'Filters reset' }));
      return;
    }
    if (button.dataset.adminIntent === 'apply-filters' || clean === 'apply filters') {
      event.preventDefault();
      const values = Array.from(button.closest('.interaction-filter-form')?.querySelectorAll('select') ?? []).map((select) => select.value);
      updateUrlStates({ filter: 'active', status: values[0], date: values[1], sort: values[2] });
      setStatusFilter(values[0] ?? 'all');
      setCurrentPage(1);
      closeOverlay();
      setToast(t('admin.filtersApplied', { defaultMessage: 'Filters applied' }));
      return;
    }
    if (/filter|this month|this year|all status|all statuses|all region|all regions|all church|all churches|all type|all types|all service|all services|all categor|all batch|all venue|all department/i.test(clean) || clean.endsWith('month')) {
      event.preventDefault();
      setOverlay({ type: 'drawer', mode: 'filters', title: t('admin.filters', { defaultMessage: 'Filters' }), description: t('admin.filtersDescription', { defaultMessage: 'Refine the current fixture view. Filter state is preserved in the URL.' }) });
      return;
    }
    if (clean === 'back' || clean === 'cancel') {
      event.preventDefault();
      if (inPageWizard && clean === 'back' && new URL(window.location.href).searchParams.get('step')) {
        window.dispatchEvent(new CustomEvent(WIZARD_ADVANCE_EVENT, { detail: { direction: 'back' } }));
        setToast(t('admin.previousStepOpened', { defaultMessage: 'Previous step opened' }));
        return;
      }
      const requestedReturn = new URL(window.location.href).searchParams.get('returnTo');
      const destination = requestedReturn && isCanonicalAdminPath(requestedReturn) ? requestedReturn : routes[clean] ?? currentModule.homeRoute;
      navigate(destination, false);
      return;
    }
    if (clean === 'save draft') {
      event.preventDefault();
      window.localStorage.setItem(`fhc-admin-draft:${route}`, new Date().toISOString());
      setToast(t('admin.draftPreserved', { defaultMessage: 'Draft preserved on this device' }));
      return;
    }
    if ((clean.startsWith('next') || clean === 'save & next') && !resolveRoute(label)) {
      if (inPageWizard) {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent(WIZARD_ADVANCE_EVENT, { detail: { direction: 'next' } }));
        setToast(t('admin.nextStepOpened', { defaultMessage: 'Next step opened' }));
        return;
      }
      if (tabItems.length > 1) {
        event.preventDefault();
        const currentIndex = Math.max(0, tabItems.indexOf(activeTab));
        const nextTab = tabItems[Math.min(currentIndex + 1, tabItems.length - 1)];
        setActiveTab(nextTab);
        updateUrlState('tab', slug(nextTab));
        setToast(t('admin.tabOpened', { defaultMessage: '{tab} opened', vars: { tab: nextTab } }));
        return;
      }
    }
    if (clean === 'expand all') {
      event.preventDefault();
      rootRef.current?.querySelectorAll<HTMLDetailsElement>('details').forEach((detail) => { detail.open = true; });
      rootRef.current?.querySelectorAll<HTMLElement>('.tree-node,.tree-branch').forEach((node) => node.classList.add('expanded'));
      setToast(t('admin.hierarchyExpanded', { defaultMessage: 'All hierarchy levels expanded' }));
      return;
    }
    if (/mark all as read/i.test(clean)) {
      event.preventDefault();
      rootRef.current?.querySelectorAll('.dot, .unread').forEach((node) => node.remove());
      setToast(t('admin.notificationsMarkedRead', { defaultMessage: 'Notifications marked read on this device' }));
      return;
    }
    if (/more|options|actions for/i.test(clean)) {
      event.preventDefault();
      openAction(t('admin.availableActions', { defaultMessage: 'Available actions' }), 'actions');
      return;
    }

    const destination = resolveRoute(label);
    if (destination) {
      event.preventDefault();
      navigate(destination);
      return;
    }
    if (/view|open|details|cohort|website/i.test(clean)) {
      event.preventDefault();
      openAction(label || t('admin.recordDetails', { defaultMessage: 'Record details' }), 'preview');
      return;
    }
    if (filePattern.test(clean)) {
      event.preventDefault();
      openAction(label || t('admin.fileOperation', { defaultMessage: 'File operation' }), 'file');
      return;
    }

    event.preventDefault();
    openAction(label || 'Action', mutationPattern.test(clean) ? undefined : 'actions');
  };

  const handleInput = (event: FormEvent<HTMLDivElement>) => {
    const input = event.target as HTMLInputElement;
    if (input.matches('input[type="search"], .search-box input, .kca-search input, .mission-search input, .platform-filter-bar input, input[placeholder*="Search" i]')) handleSearch(input.value);
  };

  const trapFocus = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      closeOverlay();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  const handleRootKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return;
    if (overlay) setOverlay(null);
    if (navigationOpen) setNavigationOpen(false);
  };

  const showOverview = () => {
    setActiveTab(tabItems[0] ?? '');
    updateUrlState('tab', undefined);
  };

  return <div ref={rootRef} className={`interaction-shell ${collapsed ? 'sidebar-collapsed' : ''} ${navigationOpen ? 'navigation-open' : ''}`} onClickCapture={handleClick} onInput={handleInput} onKeyDownCapture={handleRootKeyDown}>
    {children}
    {contextualReturn && contextualModule && <button className="interaction-return-button" type="button" data-interaction-native="true" onClick={() => navigate(contextualReturn, false)}>← Back to {contextualModule.label}</button>}
    {!inPageWizard && activeTab && activeTab !== tabItems[0] && <section className="interaction-tab-workspace" role="tabpanel" aria-live="polite"><header><div><span>{currentModule.label}</span><h2>{activeTab}</h2><p>{title} · {scope} scope</p></div><button type="button" data-interaction-native="true" onClick={showOverview}>Back to overview</button></header><div className="interaction-tab-metrics"><article><small>Visible records</small><strong>{records.length || items.length || Object.keys(details).length}</strong></article><article><small>Permission</small><strong>{permission}</strong></article><article><small>Section</small><strong>{activeTab}</strong></article></div><div className="interaction-tab-grid"><article><h3>{activeTab} overview</h3><dl>{Object.entries(details).slice(0, 8).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}{Object.keys(details).length === 0 && <div><dt>Context</dt><dd>Records and actions for {activeTab.toLowerCase()} are shown below.</dd></div>}</dl></article><article><h3>Records</h3>{records.slice(0, 8).map((record, index) => <button type="button" key={`${record}-${index}`} aria-label={`View ${record.split(' · ')[0]}`}><span>{String(index + 1).padStart(2, '0')}</span>{record}</button>)}{records.length === 0 && items.slice(0, 8).map((item, index) => <button type="button" key={item}><span>{String(index + 1).padStart(2, '0')}</span>{item}</button>)}</article></div></section>}
    {query && records.length > 0 && <section className="interaction-search-results" aria-label="Filtered results"><header><strong>{matchingRecords.length} matching record{matchingRecords.length === 1 ? '' : 's'}</strong><span>Search: {query}</span></header>{matchingRecords.slice(0, 5).map((record, index) => <button type="button" key={`${record}-${index}`} aria-label={`View search result ${index + 1}`}>{record}</button>)}{matchingRecords.length === 0 && <p>No records match this search.</p>}</section>}
    {matches !== null && records.length === 0 && <div className="interaction-result-count" role="status">{matches} matching record{matches === 1 ? '' : 's'}</div>}
    {navigationOpen && <button className="interaction-nav-backdrop" type="button" aria-label="Close navigation" data-interaction-native="true" onClick={() => setNavigationOpen(false)}/>} 
    {overlay && <div className="interaction-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeOverlay(); }}>
      <section className={overlay.type === 'drawer' ? 'interaction-drawer' : 'interaction-dialog interaction-dialog-wide'} role="dialog" aria-modal="true" aria-labelledby="interaction-title" aria-describedby="interaction-description" onKeyDown={trapFocus} id={overlay.mode === 'modules' ? 'admin-module-launcher' : undefined}>
        <header><div><span>Family House Connect</span><h2 id="interaction-title">{overlay.title}</h2></div><button type="button" aria-label="Close" data-interaction-native="true" onClick={closeOverlay}>×</button></header>
        <p id="interaction-description">{overlay.description}</p>
        {overlay.type === 'drawer' && overlay.mode === 'filters' && <div className="interaction-filter-form"><label>Status<select defaultValue="all"><option value="all">All statuses</option><option value="active">Active</option><option value="pending">Pending</option></select></label><label>Date range<select defaultValue="month"><option value="month">This month</option><option value="quarter">This quarter</option><option value="year">This year</option></select></label><label>Sort<select defaultValue="recent"><option value="recent">Most recent</option><option value="name">Name</option><option value="status">Status</option></select></label><footer><button type="button">Reset Filters</button><button className="primary-button" type="button">Apply Filters</button></footer></div>}
        {overlay.type === 'drawer' && overlay.mode === 'profile' && <div className="interaction-profile-menu"><Link href="/admin/profile">Open Admin Profile</Link><button type="button" data-interaction-native="true" onClick={() => { window.location.href = window.location.hostname.endsWith('chatgpt.site') ? '/signout-with-chatgpt?return_to=%2Fadmin%2Flogin' : '/admin/login'; }}>Logout securely</button></div>}
        {overlay.mode === 'modules' && <div className="interaction-module-grid">{adminModules.map((adminModule) => <button type="button" data-admin-module={adminModule.id} className={adminModule.id === currentModule.id ? 'current' : ''} key={adminModule.id}><span aria-hidden="true">{adminModule.icon}</span><strong>{adminModule.label}</strong><small>{adminModule.description}</small><i>{adminModule.id === currentModule.id ? 'Current module' : 'Open module'} →</i></button>)}</div>}
        {overlay.mode === 'modules' && <div className="interaction-directory-link"><Link href="/admin/screens">Preview-only screen directory</Link></div>}
        {overlay.mode === 'action' && <AdminActionSurface mode={overlay.actionMode ?? 'actions'} label={overlay.label ?? overlay.title} pageTitle={title} permission={permission} scope={scope} entityKey={overlay.entityKey} record={overlay.record} details={details} items={items} records={overlay.record ? [overlay.record] : records} onClose={closeOverlay} onSubmit={executeMutation}/>} 
      </section>
    </div>}
    {toast && <div className="interaction-toast" role="status" aria-live="polite">{toast}</div>}
  </div>;
}
