import { notFound } from 'next/navigation';
import { SiteScreen } from '@/components/site-ui';
import { findSiteRoute } from '@/lib/site-routes';

export default async function PublicMemberPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const route = findSiteRoute(`/${slug.join('/')}`);
  if (!route) notFound();
  return <SiteScreen route={route} />;
}
