import type { AdminScreen } from './admin-routes';

export type AccessContext = {
  authenticated: boolean;
  mfaVerified: boolean;
  permissions: string[];
  scopes: string[];
};

export type AccessDecision =
  | { allowed: true }
  | { allowed: false; reason: 'unauthenticated' | 'mfa-required' | 'permission-denied' | 'scope-denied' };

export type CapabilityScope = { type: string; key: string };

/** Fail-closed empty context (production: no session). */
export function emptyAccessContext(): AccessContext {
  return { authenticated: false, mfaVerified: false, permissions: [], scopes: [] };
}

/**
 * Design-review full-access fixture. Enabled only when FHC_ENABLE_DESIGN_FIXTURES=true.
 * Never used for production gating.
 */
export function designFixtureAccessContext(): AccessContext {
  return {
    authenticated: true,
    mfaVerified: true,
    permissions: ['*'],
    scopes: ['global', 'country:nigeria', 'region:lagos', 'local:ikeja'],
  };
}

/**
 * Map Laravel capability scope rows to AccessContext scope tokens.
 * - global scopes → `global` (matches evaluateAccess global checks)
 * - all scopes also as `type:key` (e.g. country:nigeria, global:platform)
 */
export function formatCapabilityScope(scope: CapabilityScope): string[] {
  const type = scope.type?.trim();
  const key = scope.key?.trim();
  if (!type || !key) return [];
  const token = `${type}:${key}`;
  return type === 'global' ? ['global', token] : [token];
}

/** Build AccessContext from GET /user/me success + GET /user/capabilities snapshot. */
export function accessContextFromCapabilities(
  snapshot: { permissions: string[]; scopes: CapabilityScope[] },
  options: { mfaVerified?: boolean } = {},
): AccessContext {
  const scopes = Array.from(new Set(snapshot.scopes.flatMap((scope) => formatCapabilityScope(scope))));
  const permissions = [...snapshot.permissions];
  // Live Laravel bundles use API codes (platform.configuration.manage, …) while the
  // admin screen catalog still uses UI codes (admin.dashboard.view, …). Administrators
  // must reach the console; Laravel APIs remain the real authorization gate.
  if (hasAdministratorCapabilities(snapshot) && !permissions.includes('*')) {
    permissions.unshift('*');
  }
  return {
    authenticated: true,
    // /user/capabilities does not expose MFA age; Laravel still enforces EnsureRecentMfa on admin APIs.
    // Until a session probe exists, UI gating treats a live verified session as MFA-ready for navigation.
    // Pass mfaVerified: false explicitly when a caller knows recent MFA is missing.
    mfaVerified: options.mfaVerified ?? true,
    permissions,
    scopes,
  };
}

/**
 * True when the session holds a real administrator bundle permission.
 * Member self-service (sessions, MFA, preferences) is not enough to enter /admin.
 */
export function hasAdministratorCapabilities(snapshot: {
  permissions: string[];
  scopes?: CapabilityScope[];
}): boolean {
  if (snapshot.permissions.includes('*')) return true;
  return ADMINISTRATOR_CAPABILITY_SIGNALS.some((permission) => snapshot.permissions.includes(permission));
}

const ADMINISTRATOR_CAPABILITY_SIGNALS = [
  'identity.users.view',
  'platform.configuration.view',
  'platform.configuration.manage',
  'platform.files.manage',
  'organization.countries.view',
  'church.churches.view',
  'security.audit.view',
] as const;

/** Member `/account/*` surfaces only require an authenticated (verified) session. */
export function evaluateMemberAccess(context: AccessContext): AccessDecision {
  if (!context.authenticated) return { allowed: false, reason: 'unauthenticated' };
  return { allowed: true };
}

export function evaluateAccess(screen: AdminScreen, context: AccessContext, requestedScope = 'global'): AccessDecision {
  if (screen.permission === 'public') return { allowed: true };
  if (!context.authenticated) return { allowed: false, reason: 'unauthenticated' };
  if (!context.mfaVerified) return { allowed: false, reason: 'mfa-required' };
  if (!context.permissions.includes('*') && !context.permissions.includes(screen.permission)) {
    return { allowed: false, reason: 'permission-denied' };
  }
  if (screen.scope === 'global' && !context.scopes.includes('global')) return { allowed: false, reason: 'scope-denied' };
  if (screen.scope === 'assigned' && !context.scopes.includes('global') && !context.scopes.includes(requestedScope)) {
    return { allowed: false, reason: 'scope-denied' };
  }
  return { allowed: true };
}

function safeAdminReturnPath(value: string): string {
  if (!value.startsWith('/admin') || value.startsWith('//') || value.includes('\\')) {
    return '/admin';
  }
  return value;
}

/** Admin login URL used when a guest hits administration. */
export function guestAdminLoginUrl(returnPath = '/admin'): string {
  return `/admin/login?returnTo=${encodeURIComponent(safeAdminReturnPath(returnPath))}`;
}

/**
 * Guests must reach the admin login page — never the member `/login` page,
 * and never the dashboard with an access-denied panel.
 */
export function resolveAdminGuestLoginRedirect(input: {
  authenticated: boolean;
  route: string;
  screenKind: AdminScreen['kind'] | 'index';
  decision: AccessDecision | { allowed: true };
  returnTo?: string;
  scope?: string;
}): string | null {
  if (input.authenticated) return null;
  if (input.screenKind === 'login') return null;

  if (input.screenKind === 'mfa') {
    return guestAdminLoginUrl(input.returnTo ?? '/admin');
  }

  const deniedAsGuest =
    !input.decision.allowed && input.decision.reason === 'unauthenticated';

  if (!deniedAsGuest && input.screenKind !== 'index') {
    return null;
  }

  const returnPath = input.scope
    ? `${input.route}?scope=${encodeURIComponent(input.scope)}`
    : input.route;

  return guestAdminLoginUrl(returnPath);
}
