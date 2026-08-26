import { SiteScreen } from '@/components/site-ui';
import { findSiteRoute } from '@/lib/site-routes';

export default function Home() {
  return <SiteScreen route={findSiteRoute('/')!} />;
}
