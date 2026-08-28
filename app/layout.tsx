import type { Metadata } from 'next';
import { BrandingProvider } from '../components/branding-provider';
import { LocaleProvider } from '../components/locale-provider';
import { DEFAULT_APP_NAME, loadPublicBranding } from '../lib/branding';
import { localeDirection } from '../lib/i18n.ts';
import { readRequestLocale } from '../lib/i18n/server.ts';
import './globals.css';

const SITE_DESCRIPTION = `One family. One mission. Connect, grow, worship, learn, serve, and give with ${DEFAULT_APP_NAME}.`;

/** Static metadata avoids Vinext streaming SSR/client title mismatches during hydration. */
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: DEFAULT_APP_NAME, template: `%s | ${DEFAULT_APP_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: DEFAULT_APP_NAME,
    description: SITE_DESCRIPTION,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: DEFAULT_APP_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_APP_NAME,
    description: SITE_DESCRIPTION,
    images: ['/og.png'],
  },
  robots: { index: true, follow: true },
};

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
