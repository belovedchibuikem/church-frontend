/**
 * Dev/BFF helper: browser calls same-origin `/api`, Vite/Next proxies to Laravel.
 * Cookies then belong to the site origin (port 3000), so RSC gating and refresh keep the session.
 */

const API_V1_SUFFIX = /\/api\/v1\/?$/i;

export function laravelDevProxyOrigin(apiV1?: string | null): string {
  const raw = (apiV1 ?? 'http://localhost:8000/api/v1').trim();
  try {
    const originBase = raw.replace(API_V1_SUFFIX, '') || raw;
    return new URL(originBase).origin;
  } catch {
    return 'http://localhost:8000';
  }
}

export function isLoopbackHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

/**
 * Rebuild Cookie header values from Next’s decoded jar so Laravel can decrypt them.
 */
export function serializeForwardedCookies(pairs: Array<{ name: string; value: string }>): string {
  return pairs.map(({ name, value }) => `${name}=${encodeURIComponent(value)}`).join('; ');
}
