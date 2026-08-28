import type { NextConfig } from 'next';

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
  // Local Laravel proxying is handled by vite.config.ts `server.proxy` during
  // `vinext dev` so Set-Cookie / session forwarding matches Vite's cookie rewrite.
};

export default nextConfig;
