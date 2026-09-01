import { isBrowserRuntime } from './api-config.ts';
import { serializeForwardedCookies } from './laravel-dev-proxy.ts';

/**
 * Forward incoming cookies on RSC/server fetches.
 *
 * `next/headers` must not be a static (or bundled) import from client
 * components. Vinext SSR of SiteScreen pulled it into the public client graph
 * and crashed every public route with 500 while /admin (no SiteScreen) stayed up.
 */
export async function serverSessionHeaders(): Promise<HeadersInit | undefined> {
  if (isBrowserRuntime()) return undefined;
  try {
    const { cookies } = await import(/* @vite-ignore */ 'next/headers');
    const jar = await cookies();
    const pairs = jar.getAll();
    if (pairs.length === 0) return undefined;
    return { Cookie: serializeForwardedCookies(pairs) };
  } catch {
    return undefined;
  }
}

export async function hasIncomingCookie(name: string): Promise<boolean> {
  if (isBrowserRuntime()) {
    return typeof document !== 'undefined' && document.cookie.includes(`${name}=`);
  }
  try {
    const { cookies } = await import(/* @vite-ignore */ 'next/headers');
    return (await cookies()).get(name) !== undefined;
  } catch {
    return false;
  }
}
