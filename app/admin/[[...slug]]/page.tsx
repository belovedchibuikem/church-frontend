import { notFound, redirect } from 'next/navigation';
import { AdminScreenIndex, AdminScreenView } from '../../../components/admin-ui';
import { evaluateAccess, resolveAdminGuestLoginRedirect } from '../../../lib/access-control';
import { getAdminScreen, normalizeAdminRoute } from '../../../lib/admin-routes';
import { getServerAccessContext } from '../../../lib/server-access';

export const dynamic = 'force-dynamic';

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ scope?: string; returnTo?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const route = normalizeAdminRoute(slug);
  const context = await getServerAccessContext();

  if (route === '/admin/screens') {
    const guestLogin = resolveAdminGuestLoginRedirect({
      authenticated: context.authenticated,
      route,
      screenKind: 'index',
      decision: { allowed: true },
    });
    if (guestLogin) redirect(guestLogin);
    return <AdminScreenIndex />;
  }

  const screen = getAdminScreen(route);
  if (!screen) notFound();

  const requestedScope = query.scope
    ?? (context.scopes.includes('global') || screen.scope === 'global' ? 'global' : (context.scopes[0] ?? 'global'));
  const decision = evaluateAccess(screen, context, requestedScope);
  const guestLogin = resolveAdminGuestLoginRedirect({
    authenticated: context.authenticated,
    route,
    screenKind: screen.kind,
    decision,
    returnTo: query.returnTo,
    scope: query.scope,
  });
  if (guestLogin) redirect(guestLogin);

  return <AdminScreenView screen={screen} decision={decision} requestedScope={requestedScope} returnTo={query.returnTo} />;
}
