import type { AdminScreen } from './admin-routes';

export type AccessContext = {
  authenticated: boolean;
  mfaVerified: boolean;
  permissions: string[];
  scopes: string[];
};

export type AccessDecision = { allowed: true } | { allowed: false; reason: 'unauthenticated' | 'mfa-required' | 'permission-denied' | 'scope-denied' };

export function evaluateAccess(screen: AdminScreen, context: AccessContext, requestedScope = 'global'): AccessDecision {
  if (screen.permission === 'public') return { allowed: true };
  if (!context.authenticated) return { allowed: false, reason: 'unauthenticated' };
  if (!context.mfaVerified) return { allowed: false, reason: 'mfa-required' };
  if (!context.permissions.includes('*') && !context.permissions.includes(screen.permission)) return { allowed: false, reason: 'permission-denied' };
  if (screen.scope === 'global' && !context.scopes.includes('global')) return { allowed: false, reason: 'scope-denied' };
  if (screen.scope === 'assigned' && !context.scopes.includes('global') && !context.scopes.includes(requestedScope)) return { allowed: false, reason: 'scope-denied' };
  return { allowed: true };
}
