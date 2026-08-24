import { headers } from 'next/headers';
import type { AccessContext } from './access-control';

function splitHeader(value: string | null): string[] {
  return value?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
}

export async function getServerAccessContext(): Promise<AccessContext> {
  const requestHeaders = await headers();
  const fhcUser = requestHeaders.get('x-fhc-user-id');
  const openAiUser = requestHeaders.get('oai-authenticated-user-id');
  const isDesignPreview = process.env.NODE_ENV !== 'production' || process.env.FHC_ENABLE_DESIGN_FIXTURES === 'true';

  if (isDesignPreview && !fhcUser && !openAiUser) {
    return { authenticated: true, mfaVerified: true, permissions: ['*'], scopes: ['global', 'country:nigeria', 'region:lagos', 'local:ikeja'] };
  }

  return {
    authenticated: Boolean(fhcUser || openAiUser),
    mfaVerified: requestHeaders.get('x-fhc-mfa-verified') === 'true',
    permissions: splitHeader(requestHeaders.get('x-fhc-permissions')),
    scopes: splitHeader(requestHeaders.get('x-fhc-scopes')),
  };
}
