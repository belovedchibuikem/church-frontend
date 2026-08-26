import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'Family House Connect', template: '%s | Family House Connect' },
  description: 'One family. One mission. Connect, grow, worship, learn, serve, and give with Family House Connect.',
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
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
