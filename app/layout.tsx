import type { Metadata } from 'next';
import { BrandingProvider } from '../components/branding-provider';
import { LocaleProvider } from '../components/locale-provider';
import { loadPublicBranding } from '../lib/branding';
import { localeDirection } from '../lib/i18n.ts';
import { readRequestLocale } from '../lib/i18n/server.ts';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const branding = await loadPublicBranding();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    title: { default: branding.app_name, template: `%s | ${branding.app_name}` },
    description: `One family. One mission. Connect, grow, worship, learn, serve, and give with ${branding.app_name}.`,
    icons: branding.favicon_url ? { icon: [{ url: branding.favicon_url }] } : undefined,
    openGraph: {
      title: branding.app_name,
      description: `One family. One mission. Connect, grow, worship, learn, serve, and give with ${branding.app_name}.`,
      images: [{ url: '/og.png', width: 1200, height: 630, alt: branding.app_name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: branding.app_name,
      description: `One family. One mission. Connect, grow, worship, learn, serve, and give with ${branding.app_name}.`,
      images: ['/og.png'],
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [branding, locale] = await Promise.all([loadPublicBranding(), readRequestLocale()]);
  return (
    <html lang={locale} dir={localeDirection(locale)}>
      <body>
        <BrandingProvider initial={branding}>
          <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
