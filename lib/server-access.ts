import { headers } from 'next/headers';
import type { AccessContext } from './access-control';

function splitHeader(value: string | null): string[] {
  return value?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
}

export async function getServerAccessContext(): Promise<AccessContext> {
  const requestHeaders = await headers();
  const fhcUser = requestHeaders.get('x-fhc-user-id');

  // This project is a front-end design prototype. Unless an explicit FHC
  // access context is supplied, render every static design with fixture data.
  if (!fhcUser) {
    return { authenticated: true, mfaVerified: true, permissions: ['*'], scopes: ['global', 'country:nigeria', 'region:lagos', 'local:ikeja'] };
  }

  return {
    authenticated: true,
    mfaVerified: requestHeaders.get('x-fhc-mfa-verified') === 'true',
    permissions: splitHeader(requestHeaders.get('x-fhc-permissions')),
    scopes: splitHeader(requestHeaders.get('x-fhc-scopes')),
  };
}
