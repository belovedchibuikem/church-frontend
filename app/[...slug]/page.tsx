import { redirect, notFound } from 'next/navigation';
import { LogoutScreen } from '@/components/auth-ui';
import { SiteScreen } from '@/components/site-ui';
import { evaluateMemberAccess } from '@/lib/access-control';
import { getServerAccessContext } from '@/lib/server-access';
import { findSiteRoute } from '@/lib/site-routes';

export const dynamic = 'force-dynamic';

export default async function PublicMemberPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = `/${slug.join('/')}`;

  // Live logout (POST /auth/logout) — not a catalogue route.
  if (path === '/logout') {
    return <LogoutScreen />;
  }

  const route = findSiteRoute(path);
  if (!route) notFound();

  if (route.surface === 'member') {
    const context = await getServerAccessContext();
    const decision = evaluateMemberAccess(context);
    if (!decision.allowed) {
      redirect(`/login?returnTo=${encodeURIComponent(path)}`);
    }
  }

  return <SiteScreen route={route} />;
}
