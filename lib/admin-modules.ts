import { adminScreens } from './admin-routes.ts';

export type AdminModuleId = 'dashboard' | 'identity' | 'geography' | 'home-churches' | 'churches' | 'people' | 'kca' | 'mission' | 'press' | 'finance' | 'communications' | 'reports' | 'security' | 'settings';

export type AdminModule = {
  id: AdminModuleId;
  label: string;
  description: string;
  icon: string;
  homeRoute: string;
  prefixes: string[];
};

export const adminModules: AdminModule[] = [
  { id: 'dashboard', label: 'Global Administration', description: 'Command centre, approvals, tasks and global KPIs', icon: '⌂', homeRoute: '/admin', prefixes: ['/admin/command', '/admin/scope', '/admin/approvals', '/admin/alerts', '/admin/notifications', '/admin/activity', '/admin/audit', '/admin/tasks', '/admin/kpi', '/admin/profile'] },
  { id: 'identity', label: 'Identity & Access', description: 'Users, roles, permissions and controlled access', icon: '◉', homeRoute: '/admin/users', prefixes: ['/admin/users', '/admin/roles', '/admin/access', '/admin/sessions'] },
  { id: 'geography', label: 'Geography', description: 'Countries, regions, areas and hierarchy', icon: '◎', homeRoute: '/admin/geography', prefixes: ['/admin/geography'] },
  { id: 'home-churches', label: 'Home Churches', description: 'Applications, leaders, attendance and needs', icon: '◇', homeRoute: '/admin/home-churches/dashboard', prefixes: ['/admin/home-churches'] },
  { id: 'churches', label: 'Church Operations', description: 'Churches, members, departments and groups', icon: '▣', homeRoute: '/admin/church/dashboard', prefixes: ['/admin/church/dashboard', '/admin/churches'] },
  { id: 'people', label: 'People & Ministry Care', description: 'People, journeys, prayer, needs and safeguarding', icon: '♙', homeRoute: '/admin/people', prefixes: ['/admin/people'] },
  { id: 'kca', label: 'KCA', description: 'Admissions, learning, assessment and alumni', icon: '▦', homeRoute: '/admin/kca', prefixes: ['/admin/kca'] },
  { id: 'mission', label: 'Mission', description: 'Crusades, souls, follow-up and partners', icon: '✦', homeRoute: '/admin/mission', prefixes: ['/admin/mission'] },
  { id: 'press', label: 'Kingdom Press', description: 'Publications, manuscripts, distribution and sales', icon: '▤', homeRoute: '/admin/press', prefixes: ['/admin/press'] },
  { id: 'finance', label: 'Finance', description: 'Giving, payments, reconciliation and reports', icon: '₦', homeRoute: '/admin/finance', prefixes: ['/admin/finance'] },
  { id: 'communications', label: 'Communications', description: 'Broadcasts, channels, templates and delivery', icon: '✉', homeRoute: '/admin/communications', prefixes: ['/admin/communications'] },
  { id: 'reports', label: 'Reports & Analytics', description: 'Organization-wide analytics and insights', icon: '▥', homeRoute: '/admin/reports', prefixes: ['/admin/reports'] },
  { id: 'security', label: 'Security & Privacy', description: 'Audit, safeguarding, privacy and access decisions', icon: '!', homeRoute: '/admin/security', prefixes: ['/admin/security'] },
  { id: 'settings', label: 'Platform Settings', description: 'Platform, ministry, media and service configuration', icon: '⚙', homeRoute: '/admin/settings/platform', prefixes: ['/admin/settings'] },
];

const allowedViewState = new Set(['scope', 'tab', 'page', 'filter', 'status', 'date', 'sort']);

export function getAdminModuleForRoute(route: string): AdminModule {
  const pathname = route.split('?')[0];
  const matches = adminModules.filter((module) => module.prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)));
  return matches.sort((left, right) => Math.max(...right.prefixes.map((prefix) => prefix.length)) - Math.max(...left.prefixes.map((prefix) => prefix.length)))[0]
    ?? adminModules[0];
}

export function getAdminModule(id: string): AdminModule | undefined {
  return adminModules.find((module) => module.id === id);
}

export function isRestorableAdminRoute(value: string): boolean {
  const url = new URL(value, 'https://admin.local');
  const screen = adminScreens.find((candidate) => candidate.route === url.pathname);
  if (!screen || ['login', 'mfa', 'wizard', 'form', 'approval', 'restricted', 'escalation'].includes(screen.kind)) return false;
  return !/restricted|safeguarding|pastoral|impersonation/i.test(`${screen.permission} ${screen.route}`);
}

export function sanitizeModuleReturn(moduleId: AdminModuleId, value: string | null): string | undefined {
  if (!value) return undefined;
  const url = new URL(value, 'https://admin.local');
  if (url.origin !== 'https://admin.local' || getAdminModuleForRoute(url.pathname).id !== moduleId || !isRestorableAdminRoute(url.pathname)) return undefined;
  const clean = new URL(url.pathname, 'https://admin.local');
  url.searchParams.forEach((entry, key) => { if (allowedViewState.has(key)) clean.searchParams.set(key, entry); });
  return `${clean.pathname}${clean.search}`;
}

export function moduleReturnStorageKey(moduleId: AdminModuleId, scope: string): string {
  return `fhc-admin-return:${moduleId}:${scope || 'assigned'}`;
}

export function isCanonicalAdminPath(value: string): boolean {
  const url = new URL(value, 'https://admin.local');
  return url.origin === 'https://admin.local' && adminScreens.some((screen) => screen.route === url.pathname);
}
