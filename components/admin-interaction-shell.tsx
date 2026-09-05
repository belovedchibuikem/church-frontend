'use client';

import { ADMIN_SCREEN_TAB_EVENT } from '../lib/use-admin-screen-tab';
import type { FormEvent, KeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from '@/components/locale-provider';
import { AdminActionSurface, inferActionSurfaceMode, type ActionSurfaceMode } from './admin-action-surface';
import { resolveEntityKey } from '../lib/admin-form-schemas';
import {
  UNREGISTERED_ADMIN_ACTION_MESSAGE,
  UnregisteredAdminActionError,
  executeAdminAction,
  executeAdmissionLetterDownload,
  extractUlid,
  formatAdminActionSuccess,
  formatAdminMutationError,
  isAdmissionLetterDownloadAction,
  isAdmissionLetterIssueAction,
} from '../lib/admin-mutation-dispatcher';
import { getAdminRecordDetails } from '../lib/admin-record-cache';
import { stripRecordUlid } from '../lib/admin-row-actions';
import { fetchAdminKcaAssignment } from '../lib/admin-catalog-api';
import { WIZARD_ADVANCE_EVENT, isInPageWizardKind } from '../lib/use-admin-wizard-step';
import { adminModules, getAdminModule, getAdminModuleForRoute, isCanonicalAdminPath, isRestorableAdminRoute, moduleReturnStorageKey, sanitizeModuleReturn } from '../lib/admin-modules';
import { sanitizeAdminScopeToken } from '../lib/admin-scope';
import { signOutAdminSession } from '../lib/auth-api';

type Overlay =
  | {
      type: 'drawer' | 'dialog';
      title: string;
      description: string;
      mode: 'filters' | 'profile' | 'modules' | 'action';
      actionMode?: ActionSurfaceMode;
      label?: string;
      record?: string;
      entityKey?: string;
      details?: Record<string, string>;
    }
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

const mutationPattern = /approve|reject|defer|assign|activate|suspend|close|delete|remove|save|submit|publish|send|issue|escalate|reconcile|refund|confirm|register|create|add|new|edit|update|process|request|retry|resolve|deliver|attempt|prepare|record|end membership|end assignment/i;
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
  const churchCreateDrawerOpened = useRef(false);
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
    if (route !== '/admin/churches/new') {
      churchCreateDrawerOpened.current = false;
      return;
    }
    if (churchCreateDrawerOpened.current) return;
    churchCreateDrawerOpened.current = true;
    setOverlay({
      type: 'drawer',
      mode: 'action',
      actionMode: 'create',
      label: '+ Add Church',
      entityKey: 'church',
      title: 'Add Church',
      description: t('admin.workflowDescription', {
        defaultMessage: 'Complete the {entity} workflow for {title}.',
        vars: { entity: 'add church', title },
      }),
    });
  }, [route, t, title]);

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
    if (background) {
      if (overlay && background.contains(document.activeElement) && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      try {
        background.inert = Boolean(overlay);
      } catch {
        background.setAttribute('aria-hidden', overlay ? 'true' : 'false');
      }
    }
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
    const skipScopeCopy = next.pathname === '/admin/profile' || next.pathname === '/admin/login' || next.pathname === '/admin/mfa';
    const selectedScope = skipScopeCopy
      ? undefined
      : sanitizeAdminScopeToken(current.searchParams.get('scope') ?? window.localStorage.getItem('fhc-admin-scope'));
    if (selectedScope && !next.searchParams.has('scope') && !/\/admin\/(login|mfa|profile)/.test(next.pathname)) {
      next.searchParams.set('scope', selectedScope);
    }
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

  const openAction = (
    label: string,
    forcedMode?: ActionSurfaceMode,
    options?: { record?: string; entityKey?: string; details?: Record<string, string> },
  ) => {
    const actionMode = forcedMode ?? inferActionSurfaceMode(label);
    const entity = label.replace(/[＋+]/g, '').trim() || title;
    const recordLabel = normalize(label).replace(/^(view|open|edit|delete|details for|actions for)\s+/, '');
    const selectedRecord = options?.record ?? (recordLabel ? records.find((record) => record.toLowerCase().includes(recordLabel)) : undefined);
    const entityKey = options?.entityKey ?? resolveEntityKey(route);
    const cachedDetails = getAdminRecordDetails(selectedRecord) ?? getAdminRecordDetails(options?.record);
    const actionDetails = options?.details ?? cachedDetails ?? undefined;
    setOverlay({
      type: actionMode === 'confirm' ? 'dialog' : 'drawer',
      mode: 'action',
      actionMode,
      label,
      record: selectedRecord,
      entityKey,
      details: actionDetails,
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
    const mergedPayload = {
      ...(overlay?.details ?? {}),
      ...payload,
    };
    try {
      if (isAdmissionLetterDownloadAction(action, route)) {
        await executeAdmissionLetterDownload({
          route,
          label: action,
          payload: mergedPayload,
          recordId,
          scope,
        });
        setOverlay(null);
        setToast(t('admin.admissionLetterDownloaded', { defaultMessage: 'Admission letter downloaded.' }));
        return;
      }
      const result = await executeAdminAction({
        route,
        label: action,
        payload: mergedPayload,
        recordId,
        scope,
      });
      setOverlay(null);
      setToast(formatAdminActionSuccess(result));
      window.setTimeout(() => {
        window.location.reload();
      }, 500);
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
      const selectedScope = sanitizeAdminScopeToken(url.searchParams.get('scope'));
      if (selectedScope) window.localStorage.setItem('fhc-admin-scope', selectedScope);
      else if (url.searchParams.has('scope')) window.localStorage.removeItem('fhc-admin-scope');
      if (url.origin === window.location.origin && url.pathname.startsWith('/admin')) {
        event.preventDefault();
        setNavigationOpen(false);
        if (url.pathname === '/admin/profile') {
          navigate('/admin/profile', false);
          return;
        }
        navigate(`${url.pathname}${url.search}${url.hash}`);
      }
      return;
    }

    const button = target.closest<HTMLButtonElement>('button');
    if (!button || button.dataset.interactionNative === 'true') return;
    if (screenKind === 'login' || screenKind === 'mfa') return;
    if (button.type === 'submit') return;
    // SearchSelect option rows are buttons; do not treat them as admin page actions
    // (that was replacing Create Church with an "AfghanistanAF" actions drawer).
    if (button.closest('.search-select, .search-select-menu, [role="listbox"]')) return;
    if (button.closest('.table-card, .home-church-workspace, .person-summary')) return;
    if (button.closest('.kca-document-actions, .kca-post-decision-actions, .kca-letter-main')) return;
    if (button.closest('form') && !button.closest('.interaction-overlay')) return;
    const label = (button.getAttribute('aria-label') || button.textContent || '').trim();
    const clean = normalize(label);
    // Toolbar controls stay on-page except church registration, which uses the create drawer.
    if (button.closest('.table-toolbar') && !button.closest('.interaction-overlay') && !/^(add|create) church$/.test(clean)) return;
    if (button.closest('.branding-settings, .maps-settings') && !button.closest('.interaction-overlay')) return;

    if (button.dataset.adminAction) {
      event.preventDefault();
      const record = button.dataset.record ?? '';
      const recordId = extractUlid(record);
      const recordLabel = stripRecordUlid(record);
      const entityKey = button.dataset.entity ?? resolveEntityKey(route);
      const action = button.dataset.adminAction;
      if ((action === 'view' || action === 'edit') && recordId) {
        if (route.includes('/kca/applications') || route === '/admin/kca/review-queue') {
          navigate(`/admin/kca/applications/${recordId}/decision`);
          return;
        }
      }
      if (action === 'view' && recordId) {
        if (route === '/admin/kca/students' || (route.startsWith('/admin/kca/students/') && !route.includes('/register'))) {
          navigate(`/admin/kca/students/${recordId}`);
          return;
        }
        if (route.includes('/home-churches/applications')) {
          navigate(`/admin/home-churches/applications/${recordId}/decision`);
          return;
        }
        if (route === '/admin/security/audit-logs') {
          navigate(`/admin/security/audit-logs/${recordId}`);
          return;
        }
        if (route === '/admin/security/safeguarding/cases') {
          navigate(`/admin/security/safeguarding/cases/${recordId}`);
          return;
        }
        if (route === '/admin/events' || route === '/admin/settings/events' || route.startsWith('/admin/events/')) {
          navigate(`/admin/events/${recordId}`);
          return;
        }
      }
      if (action === 'edit' && recordId) {
        if (route === '/admin/events' || route === '/admin/settings/events' || route.startsWith('/admin/events/')) {
          // Prefer the dedicated event editor (full fields + publish controls).
          navigate(`/admin/events/${recordId}?tab=overview&edit=1`);
          return;
        }
      }
      if ((action === 'view' || action === 'edit' || action === 'delete') && recordId && (route === '/admin/kca/assignments' || route.startsWith('/admin/kca/assignments/'))) {
        void (async () => {
          let details = getAdminRecordDetails(record);
          try {
            details = await fetchAdminKcaAssignment(recordId);
          } catch {
            details = getAdminRecordDetails(record);
          }
          const mode = action === 'view' ? 'preview' : action === 'edit' ? 'edit' : 'confirm';
          const titleKey = action === 'view' ? 'admin.viewRecord' : action === 'edit' ? 'admin.editRecord' : 'admin.deleteRecord';
          const defaultTitle = action === 'view' ? 'View {record}' : action === 'edit' ? 'Edit {record}' : 'Delete {record}';
          openAction(t(titleKey, { defaultMessage: defaultTitle, vars: { record: stripRecordUlid(record) } }), mode, { record, entityKey, details });
        })();
        return;
      }
      if (action === 'view') openAction(t('admin.viewRecord', { defaultMessage: 'View {record}', vars: { record: recordLabel } }), 'preview', { record, entityKey, details: getAdminRecordDetails(record) });
      else if (action === 'edit') openAction(t('admin.editRecord', { defaultMessage: 'Edit {record}', vars: { record: recordLabel } }), 'edit', { record, entityKey, details: getAdminRecordDetails(record) });
      else if (action === 'delete') openAction(t('admin.deleteRecord', { defaultMessage: 'Delete {record}', vars: { record: recordLabel } }), 'confirm', { record, entityKey, details: getAdminRecordDetails(record) });
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
    if (button.dataset.adminIntent === 'logout') {
      event.preventDefault();
      void signOutAdminSession();
      return;
    }
    if (button.dataset.adminIntent === 'profile-menu') {
      event.preventDefault();
      window.location.assign('/admin/profile');
      return;
    }
    if (button.closest('[role="tablist"], .tabs, .kca-entity-tabs, .mission-tabs, .platform-tabs')) {
      event.preventDefault();
      const selected = button.textContent?.trim() ?? '';
      setActiveTab(selected);
      updateUrlState('tab', slug(selected));
      window.dispatchEvent(new Event(ADMIN_SCREEN_TAB_EVENT));
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

    const kcaApplicationId = extractUlid(route);
    if (kcaApplicationId && route.includes('/admin/kca/applications')) {
      if (isAdmissionLetterIssueAction(clean, route)) {
        event.preventDefault();
        navigate(`/admin/kca/applications/${kcaApplicationId}/admission-letter`);
        return;
      }
      if (isAdmissionLetterDownloadAction(clean, route)) {
        event.preventDefault();
        void executeAdmissionLetterDownload({
          route,
          label: clean,
          payload: {},
          recordId: kcaApplicationId,
          scope,
        })
          .then(() => {
            setToast(t('admin.admissionLetterDownloaded', { defaultMessage: 'Admission letter downloaded.' }));
          })
          .catch((error) => {
            setToast(formatAdminMutationError(error));
          });
        return;
      }
    }

    if (/view|open|details|website/i.test(clean) && !/create|add|\+|new/i.test(clean)) {
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
    const record = button.dataset.record;
    const entityKey = button.dataset.entity ?? resolveEntityKey(route);
    openAction(label || 'Action', mutationPattern.test(clean) ? undefined : 'actions', record
      ? { record, entityKey, details: getAdminRecordDetails(record) }
      : { entityKey });
  };

  const handleInput = (event: FormEvent<HTMLDivElement>) => {
    const input = event.target as HTMLInputElement;
    // Ignore comboboxes inside overlays/forms so typing Country etc. does not drive page search.
    if (input.closest('.search-select, .interaction-overlay, .interaction-action-form')) return;
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

  return <div ref={rootRef} className={`interaction-shell ${collapsed ? 'sidebar-collapsed' : ''} ${navigationOpen ? 'navigation-open' : ''}`} data-filtered-matches={matches ?? undefined} onClickCapture={handleClick} onInput={handleInput} onKeyDownCapture={handleRootKeyDown}>
    {children}
    {contextualReturn && contextualModule && <button className="interaction-return-button" type="button" data-interaction-native="true" onClick={() => navigate(contextualReturn, false)}>← Back to {contextualModule.label}</button>}
    {navigationOpen && <button className="interaction-nav-backdrop" type="button" aria-label="Close navigation" data-interaction-native="true" onClick={() => setNavigationOpen(false)}/>} 
    {overlay && <div className="interaction-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeOverlay(); }}>
      <section className={overlay.type === 'drawer' ? 'interaction-drawer' : 'interaction-dialog interaction-dialog-wide'} role="dialog" aria-modal="true" aria-labelledby="interaction-title" aria-describedby="interaction-description" onKeyDown={trapFocus} id={overlay.mode === 'modules' ? 'admin-module-launcher' : undefined}>
        <header><div><span>Family House Connect</span><h2 id="interaction-title">{overlay.title}</h2></div><button type="button" aria-label="Close" data-interaction-native="true" onClick={closeOverlay}>×</button></header>
        <p id="interaction-description">{overlay.description}</p>
        {overlay.type === 'drawer' && overlay.mode === 'filters' && <div className="interaction-filter-form"><label>Status<select defaultValue="all"><option value="all">All statuses</option><option value="active">Active</option><option value="pending">Pending</option></select></label><label>Date range<select defaultValue="month"><option value="month">This month</option><option value="quarter">This quarter</option><option value="year">This year</option></select></label><label>Sort<select defaultValue="recent"><option value="recent">Most recent</option><option value="name">Name</option><option value="status">Status</option></select></label><footer><button type="button">Reset Filters</button><button className="primary-button" type="button">Apply Filters</button></footer></div>}
        {overlay.type === 'drawer' && overlay.mode === 'profile' && <div className="interaction-profile-menu"><button type="button" data-interaction-native="true" onClick={() => { closeOverlay(); window.location.assign('/admin/profile'); }}>Open Admin Profile</button><button type="button" data-interaction-native="true" data-admin-intent="logout" onClick={() => { void signOutAdminSession(); }}>Logout</button></div>}
        {overlay.mode === 'modules' && <div className="interaction-module-grid">{adminModules.map((adminModule) => <button type="button" data-admin-module={adminModule.id} className={adminModule.id === currentModule.id ? 'current' : ''} key={adminModule.id}><span aria-hidden="true">{adminModule.icon}</span><strong>{adminModule.label}</strong><small>{adminModule.description}</small><i>{adminModule.id === currentModule.id ? 'Current module' : 'Open module'} →</i></button>)}</div>}
        {overlay.mode === 'modules' && <div className="interaction-directory-link"><button type="button" data-interaction-native="true" onClick={() => { closeOverlay(); window.location.assign('/admin/screens'); }}>Preview-only screen directory</button></div>}
        {overlay.mode === 'action' && <AdminActionSurface mode={overlay.actionMode ?? 'actions'} label={overlay.label ?? overlay.title} pageTitle={title} permission={permission} scope={scope} entityKey={overlay.entityKey} record={overlay.record} details={overlay.details ?? details} items={items} records={overlay.record ? [overlay.record] : records} onClose={closeOverlay} onSubmit={executeMutation}/>} 
      </section>
    </div>}
    {toast && <div className="interaction-toast" role="status" aria-live="polite">{toast}</div>}
  </div>;
}
