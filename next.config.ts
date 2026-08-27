import type { NextConfig } from 'next';
import { laravelDevProxyOrigin } from './lib/laravel-dev-proxy';

const laravelOrigin = laravelDevProxyOrigin(process.env.FHC_LARAVEL_API_URL);

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/kca/enroll', destination: '/kca/enrol', permanent: true },
      { source: '/kca/verify', destination: '/kca/certificates/verify', permanent: true },
      { source: '/kca/modules', destination: '/account/kca/modules', permanent: true },
      { source: '/kca/module/:id', destination: '/account/kca/modules/:id', permanent: true },
      { source: '/kca/assignments', destination: '/account/kca/assignments', permanent: true },
      { source: '/kca/assignment/:id', destination: '/account/kca/assignments/:id', permanent: true },
      { source: '/kca/attendance', destination: '/account/kca/attendance', permanent: true },
      { source: '/kca/mentor', destination: '/account/kca/mentor', permanent: true },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${laravelOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
