'use client';

import { useEffect, useState } from 'react';

export const ADMIN_SCREEN_TAB_EVENT = 'fhc-admin-screen-tab';

export function adminTabSlug(label: string): string {
  return label
    .replace(/\([^)]*\)/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function resolveAdminScreenTab(tabs: string[], requested?: string | null): string {
  if (tabs.length === 0) return '';
  if (!requested) return tabs[0] ?? '';
  const match = tabs.find((tab) => adminTabSlug(tab) === requested);
  return match ?? tabs[0] ?? '';
}

function readActiveTab(tabs: string[]): string {
  if (typeof window === 'undefined' || tabs.length === 0) return tabs[0] ?? '';
  const requested = new URL(window.location.href).searchParams.get('tab');
  return resolveAdminScreenTab(tabs, requested);
}

/** Syncs detail-screen tab panels with `?tab=` URL state updated by AdminInteractionShell. */
export function useAdminScreenTab(tabs: string[] = []) {
  const [activeTab, setActiveTab] = useState(() => readActiveTab(tabs));

  useEffect(() => {
    setActiveTab(readActiveTab(tabs));
  }, [tabs]);

  useEffect(() => {
    const sync = () => setActiveTab(readActiveTab(tabs));
    window.addEventListener('popstate', sync);
    window.addEventListener(ADMIN_SCREEN_TAB_EVENT, sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(ADMIN_SCREEN_TAB_EVENT, sync);
    };
  }, [tabs]);

  return {
    activeTab,
    tabKey: adminTabSlug(activeTab),
  };
}
