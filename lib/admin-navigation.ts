import { adminScreens, getAdminScreen, type AdminScreen } from './admin-routes.ts';

export type AdminBreadcrumb = { label: string; route: string };

const actionDestinations: Record<string, string> = {
  'notifications': '/admin/notifications',
  'alert rules': '/admin/alerts/rules',
  'unread alerts': '/admin/alerts',
  'view review queue': '/admin/kca/review-queue',
  'create orientation batch': '/admin/kca/orientation',
  'generate reports': '/admin/reports',
  'admission settings': '/admin/settings/kca',
  'view all crusades': '/admin/mission/crusades',
  'create crusade': '/admin/mission/crusades/create',
  'approve requests': '/admin/approvals',
  'view approvals': '/admin/approvals',
  'create announcement': '/admin/communications/announcements/create',
  'compose broadcast': '/admin/communications/broadcasts/create',
  'manage users': '/admin/users',
  'system settings': '/admin/settings/platform',
  'view analytics': '/admin/reports',
  'view all reports': '/admin/reports',
  'view all alerts': '/admin/security/alerts',
  'view all notifications': '/admin/notifications',
  'view all activities': '/admin/activity',
  'view all countries': '/admin/geography/countries',
  'view all disputes': '/admin/finance/disputes',
  'view all refunds': '/admin/finance/refunds',
  'view provider settings': '/admin/finance/providers',
  'view detailed reports': '/admin/reports',
  'go to intervention queue': '/admin/kca/interventions',
  'go to translation queue': '/admin/press/translations',
  'back to dashboard': '/admin',
  'open dashboard': '/admin',
};

const primaryWorkflowDestinations: Record<string, string> = {
  'D-03': '/admin/home-churches/applications/grace-home-church/review',
  'D-04': '/admin/home-churches/applications/grace-home-church/decision',
  'G-04': '/admin/kca/applications/samuel-david/church-information',
  'G-05': '/admin/kca/applications/samuel-david/walk-with-christ',
  'G-06': '/admin/kca/applications/samuel-david/motivation-interests',
  'G-07': '/admin/kca/applications/samuel-david/commitment',
  'G-08': '/admin/kca/applications/samuel-david/parent-consent',
  'G-09': '/admin/kca/applications/samuel-david/leadership-recommendation',
  'G-10': '/admin/kca/review-queue',
  'G-13': '/admin/kca/applications/samuel-david/admission-letter',
  'G-18': '/admin/kca/students/samuel-david',
  'I-04': '/admin/mission/crusades/lagos-mega-crusade/planning',
  'I-19': '/admin/mission/reports',
  'J-08': '/admin/press/manuscripts/power-of-covenant/theological-review',
  'J-09': '/admin/press/manuscripts/power-of-covenant/copy-editing',
  'J-10': '/admin/press/manuscripts/power-of-covenant/design',
  'J-11': '/admin/press/manuscripts/power-of-covenant/isbn',
  'J-12': '/admin/press/manuscripts/power-of-covenant/approval',
  'J-13': '/admin/press/publications',
  'M-03': '/admin/communications/audiences/create',
};

export function normalizeInteractionLabel(label: string): string {
  return label
    .replace(/[＋+→↗⌄⋯•••]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function getAdminParent(screen: AdminScreen): AdminScreen | undefined {
  if (screen.route === '/admin') return undefined;
  const candidates = adminScreens.filter((candidate) =>
    candidate.route !== screen.route &&
    candidate.route !== '/admin/login' &&
    candidate.route !== '/admin/mfa' &&
    (screen.route === `${candidate.route}` || screen.route.startsWith(`${candidate.route}/`)),
  );
  return candidates.sort((left, right) => right.route.length - left.route.length)[0]
    ?? adminScreens.find((candidate) => candidate.route === '/admin');
}

export function getAdminBreadcrumbs(screen: AdminScreen): AdminBreadcrumb[] {
  if (screen.route === '/admin/login' || screen.route === '/admin/mfa') return [];
  const chain: AdminScreen[] = [screen];
  const visited = new Set([screen.route]);
  let current = screen;

  while (current.route !== '/admin') {
    const parent = getAdminParent(current);
    if (!parent || visited.has(parent.route)) break;
    chain.unshift(parent);
    visited.add(parent.route);
    current = parent;
  }

  if (chain[0]?.route !== '/admin') {
    const root = adminScreens.find((candidate) => candidate.route === '/admin');
    if (root) chain.unshift(root);
  }

  return chain.map((item, index) => ({
    label: index === 0 && item.route === '/admin' ? 'Admin' : item.title,
    route: item.route,
  }));
}

export function getDefaultChildRoute(screen: AdminScreen): string | undefined {
  const descendants = adminScreens.filter((candidate) =>
    candidate.route.startsWith(`${screen.route}/`) &&
    candidate.route !== screen.route &&
    !['form', 'wizard', 'forbidden'].includes(candidate.kind),
  );
  return descendants.sort((left, right) => left.route.length - right.route.length)[0]?.route;
}

export function getInteractionRouteMap(screen: AdminScreen): Record<string, string> {
  const parent = getAdminParent(screen);
  const child = getDefaultChildRoute(screen);
  const formChild = adminScreens
    .filter((candidate) => candidate.route.startsWith(`${screen.route}/`) && ['form', 'wizard'].includes(candidate.kind))
    .sort((left, right) => left.route.length - right.route.length)[0];
  const actionKey = screen.action ? normalizeInteractionLabel(screen.action) : '';
  const canUseFormChild = Boolean(formChild && actionKey && /create|add|new|next/.test(actionKey) && /\/(create|new)(?:\/|$)/.test(formChild?.route ?? ''));
  const workflowDestination = screen.action ? primaryWorkflowDestinations[screen.id] : undefined;
  const securityDestinations = screen.batch === 'O'
    ? {
        'open queue': screen.id === 'O-08' ? '/admin/security/safeguarding/cases' : '/admin/security/alerts',
        'generate report': '/admin/security/audit-logs',
        'view analytics': screen.id === 'O-01' ? '/admin/security/login-history' : '/admin/security',
        'report incident': '/admin/security/safeguarding/cases',
      }
    : {};
  return {
    ...actionDestinations,
    ...securityDestinations,
    ...(parent ? { back: parent.route, cancel: parent.route } : {}),
    ...(child ? { view: child, open: child, 'view details': child, 'see details': child } : {}),
    ...(canUseFormChild && formChild ? { [actionKey]: formChild.route } : {}),
    ...(workflowDestination ? { [actionKey]: workflowDestination } : {}),
  };
}

export function isCanonicalAdminRoute(route: string): boolean {
  return route === '/admin/screens' || getAdminScreen(route) !== undefined;
}
