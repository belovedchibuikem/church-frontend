import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Family House Connect — Admin Portal',
  description: 'Permission-aware administration for the global Family House Connect ministry.',
  openGraph: {
    title: 'Family House Connect — Admin Portal',
    description: 'Global ministry administration with permission-aware access and scope governance.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Family House Connect Global Ministry Administration' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Family House Connect — Admin Portal',
    description: 'Global ministry administration with permission-aware access and scope governance.',
    images: ['/og.png'],
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
