import { notFound } from 'next/navigation';
import { AdminScreenIndex, AdminScreenView } from '../../../components/admin-ui';
import { evaluateAccess } from '../../../lib/access-control';
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
  if (route === '/admin/screens') return <AdminScreenIndex />;
  const screen = getAdminScreen(route);
  if (!screen) notFound();

  const context = await getServerAccessContext();
  const requestedScope = query.scope ?? (screen.scope === 'global' ? 'global' : 'country:nigeria');
  const decision = evaluateAccess(screen, context, requestedScope);

  return <AdminScreenView screen={screen} decision={decision} requestedScope={requestedScope} returnTo={query.returnTo} />;
}
