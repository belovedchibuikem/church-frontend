import {
  accessContextFromCapabilities,
  designFixtureAccessContext,
  emptyAccessContext,
  evaluateMemberAccess,
  type AccessContext,
  type AccessDecision,
} from './access-control';
import { ApiError } from './api-client';
import { resolveApiV1BaseUrl } from './api-config';
import { fetchCurrentUser, fetchUserCapabilities } from './user-api';

/**
 * Design fixtures are for static UI review only.
 * - true  → full-access fixture (authenticated *, broad scopes)
 * - false → live Laravel /user/me + /user/capabilities (cookie session); fail closed if no session
 *
 * Set in apps/web/.env: FHC_ENABLE_DESIGN_FIXTURES=true|false
 * Production must keep this false (see .env.example).
 * Only the non-public server flag grants design full-access (fail closed unless explicitly enabled).
 */
export function isDesignFixturesEnabled(): boolean {
  return process.env.FHC_ENABLE_DESIGN_FIXTURES === 'true';
}

/**
 * Server-side access context for admin + member route gating.
 * Consumed by app/admin/[[...slug]]/page.tsx and app/[...slug]/page.tsx → evaluateAccess / evaluateMemberAccess.
 */
export async function getServerAccessContext(): Promise<AccessContext> {
  if (isDesignFixturesEnabled()) {
    return designFixtureAccessContext();
  }

  if (!resolveApiV1BaseUrl()) {
    // Misconfigured production: never invent access.
    return emptyAccessContext();
  }

  try {
    const [me, capabilities] = await Promise.all([fetchCurrentUser(), fetchUserCapabilities()]);
    if (!me) return emptyAccessContext();
    // Live session from /user/me + /user/capabilities (not the design fixture).
    return accessContextFromCapabilities(capabilities);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return emptyAccessContext();
    }
    // Misconfigured API or transport failure: fail closed (no privilege escalation).
    return emptyAccessContext();
  }
}

/** Member `/account/*` gate: design fixtures OR live authenticated session. */
export async function getMemberAccessDecision(): Promise<AccessDecision> {
  const context = await getServerAccessContext();
  return evaluateMemberAccess(context);
}
